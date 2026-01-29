package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"time"

	"MonetizeeAI_bot/logger"

	"go.uber.org/zap"
	"gorm.io/gorm"
)

// PaymentConfig holds payment service configuration
type PaymentConfig struct {
	MerchantID    string
	Sandbox       bool
	CallbackURL   string
	StarterPrice  int // تومان
	ProPrice      int // تومان
	UltimatePrice int // تومان
}

// extractZarinpalError tries to parse the flexible `errors` field which may be an object or an array.
// Returns message and code if present; otherwise empty values.
func extractZarinpalError(raw json.RawMessage) (string, int) {
	if len(raw) == 0 {
		return "", 0
	}
	// Trim leading spaces
	i := 0
	for i < len(raw) && (raw[i] == ' ' || raw[i] == '\n' || raw[i] == '\t' || raw[i] == '\r') {
		i++
	}
	if i >= len(raw) {
		return "", 0
	}
	switch raw[i] {
	case '[':
		// errors is an array (often empty); ignore gracefully
		return "", 0
	case '{':
		var obj struct {
			Message     string      `json:"message"`
			Code        int         `json:"code"`
			Validations interface{} `json:"validations"`
		}
		if err := json.Unmarshal(raw, &obj); err == nil {
			return obj.Message, obj.Code
		}
		return "", 0
	default:
		return "", 0
	}
}

// GetPaymentConfig loads payment configuration from environment variables.
// ZARINPAL_MERCHANT_ID is required in production (no hardcoded secrets).
func GetPaymentConfig() PaymentConfig {
	return PaymentConfig{
		// 🔒 SECURITY: Merchant ID is required in production (no hardcoded secrets)
		MerchantID:    getRequiredEnv("ZARINPAL_MERCHANT_ID", "DEMO_MERCHANT_ID"),
		Sandbox:       false,
		CallbackURL:   getEnvOrDefault("ZARINPAL_CALLBACK_URL", "https://sianmarketing.com/payment/callback"),
		StarterPrice:  990000,  // ۹۹۰,۰۰۰ تومان (اشتراک ماهانه)
		ProPrice:      3300000, // ۳,۳۰۰,۰۰۰ تومان (شش‌ماهه)
		UltimatePrice: 7500000, // ۷,۵۰۰,۰۰۰ تومان (مادام‌العمر)
	}
}

// PaymentRequest - ساختار درخواست به ZarinPal
type PaymentRequest struct {
	MerchantID  string `json:"merchant_id"`
	Amount      int    `json:"amount"`
	Currency    string `json:"currency,omitempty"` // "IRT" برای تومان
	Description string `json:"description"`
	CallbackURL string `json:"callback_url"`
	Metadata    struct {
		Mobile  string `json:"mobile,omitempty"`
		Email   string `json:"email,omitempty"`
		OrderID string `json:"order_id,omitempty"`
	} `json:"metadata,omitempty"`
}

// PaymentResponse - پاسخ از ZarinPal
type PaymentResponse struct {
	Data struct {
		Code      int    `json:"code"`
		Message   string `json:"message"`
		Authority string `json:"authority"`
		FeeType   string `json:"fee_type"`
		Fee       int    `json:"fee"`
	} `json:"data"`
	Errors json.RawMessage `json:"errors"`
}

// PaymentVerify - ساختار درخواست تایید
type PaymentVerify struct {
	MerchantID string `json:"merchant_id"`
	Amount     int    `json:"amount"`
	Authority  string `json:"authority"`
}

// PaymentVerifyResponse - پاسخ تایید پرداخت
type PaymentVerifyResponse struct {
	Data struct {
		Code     int    `json:"code"`
		Message  string `json:"message"`
		RefID    int    `json:"ref_id"`
		CardPan  string `json:"card_pan"`
		CardHash string `json:"card_hash"`
		FeeType  string `json:"fee_type"`
		Fee      int    `json:"fee"`
	} `json:"data"`
	Errors json.RawMessage `json:"errors"`
}

// PaymentService handles payment operations with ZarinPal
type PaymentService struct {
	db     *gorm.DB
	config PaymentConfig
}

// NewPaymentService creates a new payment service
func NewPaymentService(db *gorm.DB) *PaymentService {
	return &PaymentService{
		db:     db,
		config: GetPaymentConfig(),
	}
}

// GetPlanPrice returns the price for a specific plan
func (s *PaymentService) GetPlanPrice(planType string) (int, error) {
	switch planType {
	case "starter":
		return s.config.StarterPrice, nil
	case "pro":
		return s.config.ProPrice, nil
	case "ultimate":
		return s.config.UltimatePrice, nil
	default:
		return 0, fmt.Errorf("invalid plan type: %s", planType)
	}
}

// GetPlanDescription returns description for a specific plan
func (s *PaymentService) GetPlanDescription(planType string) string {
	switch planType {
	case "starter":
		return "اشتراک Starter - یک ماهه"
	case "pro":
		return "اشتراک Pro - شش‌ماهه"
	case "ultimate":
		return "اشتراک Ultimate - مادام‌العمر"
	default:
		return "اشتراک MonetizeAI"
	}
}

// CreatePaymentRequest creates a payment request and returns transaction & payment URL
func (s *PaymentService) CreatePaymentRequest(
	userID uint,
	planType string,
) (*PaymentTransaction, string, error) {
	// 1. دریافت قیمت پلن
	amount, err := s.GetPlanPrice(planType)
	if err != nil {
		return nil, "", err
	}

	description := s.GetPlanDescription(planType)

	// 2. ایجاد رکورد تراکنش در دیتابیس
	transaction := PaymentTransaction{
		UserID:      userID,
		Type:        planType,
		Amount:      amount,
		Status:      "pending",
		Description: description,
	}

	if err := s.db.Create(&transaction).Error; err != nil {
		logger.Error("Failed to create payment transaction",
			zap.Uint("user_id", userID),
			zap.String("plan_type", planType),
			zap.Error(err))
		return nil, "", fmt.Errorf("failed to create payment transaction: %w", err)
	}

	// 3. ساخت درخواست JSON برای ZarinPal
	paymentReq := PaymentRequest{
		MerchantID:  s.config.MerchantID,
		Amount:      amount,
		Currency:    "IRT", // تومان
		Description: description,
		CallbackURL: s.config.CallbackURL,
		Metadata: struct {
			Mobile  string `json:"mobile,omitempty"`
			Email   string `json:"email,omitempty"`
			OrderID string `json:"order_id,omitempty"`
		}{
			OrderID: fmt.Sprintf("%d", transaction.ID),
		},
	}

	// 4. انتخاب URL بر اساس Sandbox Mode
	apiURL := "https://api.zarinpal.com/pg/v4/payment/request.json"
	if s.config.Sandbox {
		apiURL = "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
	}

	// 5. ارسال درخواست به ZarinPal
	response, err := s.sendPaymentRequest(apiURL, paymentReq)
	if err != nil {
		logger.Error("Failed to send payment request",
			zap.Uint("user_id", userID),
			zap.String("plan_type", planType),
			zap.Error(err))
		return nil, "", fmt.Errorf("failed to send payment request: %w", err)
	}

	// 6. بررسی پاسخ - Code 100 یعنی موفق
	if response.Data.Code != 100 {
		// Prefer error message from errors.message if data.message is empty
		errMsg := response.Data.Message
		if errMsg == "" {
			if msg, _ := extractZarinpalError(response.Errors); msg != "" {
				errMsg = msg
			}
		}
		logger.Error("Payment request failed",
			zap.Int("code", response.Data.Code),
			zap.String("message", errMsg))
		return nil, "", fmt.Errorf("payment request failed: %s", errMsg)
	}

	// 7. به‌روزرسانی تراکنش با Authority از ZarinPal
	auth := response.Data.Authority
	transaction.Authority = &auth
	if err := s.db.Save(&transaction).Error; err != nil {
		logger.Error("Failed to update transaction",
			zap.Uint("transaction_id", transaction.ID),
			zap.Error(err))
		return nil, "", fmt.Errorf("failed to update transaction: %w", err)
	}

	// 8. ساخت URL پرداخت برای کاربر
	paymentURL := fmt.Sprintf("https://www.zarinpal.com/pg/StartPay/%s", response.Data.Authority)
	if s.config.Sandbox {
		paymentURL = fmt.Sprintf("https://sandbox.zarinpal.com/pg/StartPay/%s", response.Data.Authority)
	}

	logger.Info("Payment request created successfully",
		zap.Uint("user_id", userID),
		zap.String("plan_type", planType),
		zap.String("authority", response.Data.Authority),
		zap.Int("amount", amount))

	return &transaction, paymentURL, nil
}

// sendPaymentRequest ارسال درخواست HTTP POST به ZarinPal
func (s *PaymentService) sendPaymentRequest(url string, req PaymentRequest) (*PaymentResponse, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	logger.Info("ZarinPal payment request response",
		zap.String("url", url),
		zap.Int("status_code", resp.StatusCode),
		zap.String("response", string(body)))

	var response PaymentResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	return &response, nil
}

// VerifyPayment تایید پرداخت با ZarinPal
// این تابع idempotent است - اگر تراکنش قبلاً پردازش شده باشد، وضعیت فعلی را برمی‌گرداند
func (s *PaymentService) VerifyPayment(authority string, amount int) (*PaymentTransaction, error) {
	// 1. پیدا کردن تراکنش از دیتابیس
	var transaction PaymentTransaction
	if err := s.db.Where("authority = ?", authority).First(&transaction).Error; err != nil {
		return nil, fmt.Errorf("transaction not found: %w", err)
	}

	// 2. اگر تراکنش قبلاً پردازش شده (success یا failed)، وضعیت فعلی را برمی‌گردانیم
	// این از پردازش مجدد جلوگیری می‌کند (Idempotency)
	if transaction.Status == "success" || transaction.Status == "failed" {
		logger.Info("Transaction already processed, returning current status",
			zap.String("authority", authority),
			zap.String("status", transaction.Status),
			zap.String("ref_id", transaction.RefID))
		return &transaction, nil
	}

	// 3. ساخت درخواست تایید
	verifyReq := PaymentVerify{
		MerchantID: s.config.MerchantID,
		Amount:     amount,
		Authority:  authority,
	}

	// 4. انتخاب URL
	apiURL := "https://api.zarinpal.com/pg/v4/payment/verify.json"
	if s.config.Sandbox {
		apiURL = "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
	}

	// 5. ارسال درخواست تایید
	response, err := s.sendVerifyRequest(apiURL, verifyReq)
	if err != nil {
		logger.Error("Failed to verify payment",
			zap.String("authority", authority),
			zap.Error(err))
		return nil, fmt.Errorf("failed to verify payment: %w", err)
	}

	// 6. بررسی کد پاسخ - 100 یا 101 = موفق
	if response.Data.Code == 100 || response.Data.Code == 101 {
		transaction.Status = "success"
		transaction.RefID = fmt.Sprintf("%d", response.Data.RefID)
		logger.Info("Payment verified successfully",
			zap.String("authority", authority),
			zap.Int("ref_id", response.Data.RefID))
	} else {
		transaction.Status = "failed"
		logger.Warn("Payment verification failed",
			zap.String("authority", authority),
			zap.Int("code", response.Data.Code),
			zap.String("message", response.Data.Message))
	}

	// 7. ذخیره وضعیت نهایی با atomic update
	// استفاده از WHERE clause برای جلوگیری از race condition
	// این اطمینان می‌دهد که فقط اگر هنوز pending باشد، update شود
	result := s.db.Model(&PaymentTransaction{}).
		Where("authority = ? AND status = ?", authority, "pending").
		Updates(map[string]interface{}{
			"status": transaction.Status,
			"ref_id": transaction.RefID,
		})

	if result.Error != nil {
		logger.Error("Failed to update transaction status",
			zap.Uint("transaction_id", transaction.ID),
			zap.Error(result.Error))
		return nil, fmt.Errorf("failed to update transaction status: %w", result.Error)
	}

	// بررسی اینکه آیا row به‌روزرسانی شد یا نه
	// اگر 0 rows affected باشد، یعنی تراکنش قبلاً توسط process دیگری پردازش شده
	if result.RowsAffected == 0 {
		logger.Info("Transaction already processed by another process, returning current status",
			zap.String("authority", authority))
		// خواندن مجدد تراکنش برای برگرداندن وضعیت فعلی
		var currentTransaction PaymentTransaction
		if err := s.db.Where("authority = ?", authority).First(&currentTransaction).Error; err == nil {
			return &currentTransaction, nil
		}
		return &transaction, nil
	}

	// 8. خواندن مجدد تراکنش برای اطمینان از وضعیت به‌روز
	var updatedTransaction PaymentTransaction
	if err := s.db.Where("authority = ?", authority).First(&updatedTransaction).Error; err == nil {
		return &updatedTransaction, nil
	}

	return &transaction, nil
}

// sendVerifyRequest ارسال درخواست تایید به ZarinPal
func (s *PaymentService) sendVerifyRequest(url string, req PaymentVerify) (*PaymentVerifyResponse, error) {
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	logger.Info("ZarinPal verify response",
		zap.String("url", url),
		zap.Int("status_code", resp.StatusCode),
		zap.String("response", string(body)))

	var response PaymentVerifyResponse
	if err := json.Unmarshal(body, &response); err != nil {
		return nil, err
	}

	return &response, nil
}

// UpdateUserSubscription به‌روزرسانی اشتراک کاربر پس از پرداخت موفق
func (s *PaymentService) UpdateUserSubscription(userID uint, planType string) error {
	var user User
	if err := s.db.First(&user, userID).Error; err != nil {
		return err
	}

	// جلوگیری از خرید برای کاربران ultimate
	if user.PlanName == "ultimate" {
		logger.Warn("User with ultimate plan tried to purchase",
			zap.Uint("user_id", userID),
			zap.String("attempted_plan", planType))
		return fmt.Errorf("کاربر دارای اشتراک مادام‌العمر است و نیاز به خرید مجدد ندارد")
	}

	// تعیین نقطه شروع برای محاسبه انقضا
	var baseTime time.Time
	var keepCurrentPlanName bool = false

	if user.SubscriptionExpiry != nil && user.SubscriptionExpiry.After(time.Now()) {
		// اگر کاربر قبلاً اشتراک داشته و هنوز منقضی نشده، از تاریخ انقضای فعلی ادامه می‌دهیم
		baseTime = *user.SubscriptionExpiry

		// اگر Pro → Starter و هنوز Pro منقضی نشده، اسم رو Pro نگه می‌داریم
		if user.PlanName == "pro" && planType == "starter" {
			keepCurrentPlanName = true
			logger.Info("Pro user buying Starter - extending with Pro name",
				zap.Uint("user_id", userID),
				zap.Time("current_expiry", baseTime),
				zap.String("plan_type", planType))
		} else {
			logger.Info("Extending existing subscription",
				zap.Uint("user_id", userID),
				zap.Time("current_expiry", baseTime),
				zap.String("plan_type", planType))
		}
	} else {
		// اگر اشتراک ندارد یا منقضی شده، از الان شروع می‌کنیم
		baseTime = time.Now()
		logger.Info("Starting new subscription",
			zap.Uint("user_id", userID),
			zap.String("plan_type", planType))
	}

	switch planType {
	case "starter":
		// اشتراک یک ماهه - اضافه کردن به تاریخ پایه
		expiry := baseTime.AddDate(0, 1, 0)
		user.SubscriptionType = "paid"

		// اگر Pro → Starter و منقضی نشده، اسم Pro رو نگه می‌داریم
		if !keepCurrentPlanName {
			user.PlanName = "starter"
		}
		// اگر keepCurrentPlanName = true باشه، PlanName تغییر نمی‌کنه

		user.SubscriptionExpiry = &expiry
		user.IsVerified = true
		// Cancel remaining SMS notifications
		user.FreeTrialDayOneSMSSent = true
		user.FreeTrialDayTwoSMSSent = true
		user.FreeTrialExpireSMSSent = true

	case "pro":
		// اشتراک شش‌ماهه - اضافه کردن به تاریخ پایه
		expiry := baseTime.AddDate(0, 6, 0)
		user.SubscriptionType = "paid"
		user.PlanName = "pro"
		user.SubscriptionExpiry = &expiry
		user.IsVerified = true
		// Cancel remaining SMS notifications
		user.FreeTrialDayOneSMSSent = true
		user.FreeTrialDayTwoSMSSent = true
		user.FreeTrialExpireSMSSent = true

	case "ultimate":
		// اشتراک مادام‌العمر - همیشه بدون انقضا
		user.SubscriptionType = "paid"
		user.PlanName = "ultimate"
		user.SubscriptionExpiry = nil // No expiry for lifetime
		user.IsVerified = true
		// Cancel remaining SMS notifications
		user.FreeTrialDayOneSMSSent = true
		user.FreeTrialDayTwoSMSSent = true
		user.FreeTrialExpireSMSSent = true
	}

	user.IsActive = true

	if err := s.db.Save(&user).Error; err != nil {
		logger.Error("Failed to update user subscription",
			zap.Uint("user_id", userID),
			zap.String("plan_type", planType),
			zap.Error(err))
		return err
	}

	logger.Info("User subscription updated",
		zap.Uint("user_id", userID),
		zap.String("plan_type", planType),
		zap.Time("expiry", func() time.Time {
			if user.SubscriptionExpiry != nil {
				return *user.SubscriptionExpiry
			}
			return time.Time{}
		}()))

	return nil
}

// GetUserTransactions دریافت تاریخچه تراکنش‌های کاربر
func (s *PaymentService) GetUserTransactions(userID uint) ([]PaymentTransaction, error) {
	var transactions []PaymentTransaction
	err := s.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Find(&transactions).Error
	return transactions, err
}
