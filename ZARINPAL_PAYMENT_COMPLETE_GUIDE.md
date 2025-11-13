# 📚 راهنمای کامل پیاده‌سازی پرداخت آنلاین با زرین‌پال

> **این راهنما به صورت کامل و گام به گام نحوه اتصال وبسایت  به درگاه پرداخت زرین‌پال را شرح می‌دهد**

---

## 📋 فهرست مطالب

1. [معرفی و معماری](#1-معرفی-و-معماری)
2. [پیش‌نیازها](#2-پیشنیازها)
3. [ساختار دیتابیس](#3-ساختار-دیتابیس)
4. [پیاده‌سازی گام به گام](#4-پیادهسازی-گام-به-گام)
5. [تنظیمات SSL و HTTPS](#5-تنظیمات-ssl-و-https)
6. [جریان کامل پرداخت](#6-جریان-کامل-پرداخت)
7. [تست و دبیاگ](#7-تست-و-دبیاگ)
8. [نکات مهم و بهترین روش‌ها](#8-نکات-مهم-و-بهترین-روشها)

---

## 1. معرفی و معماری

### 1.1 چرخه پرداخت زرین‌پال

```
┌─────────────┐
│   کاربر     │
│  (وبسایت) │
└──────┬──────┘
       │
       │ 1. درخواست پرداخت
       ▼
┌─────────────────┐
│   وبسایت    │
│  (Go Backend)   │
└──────┬──────────┘
       │
       │ 2. ایجاد تراکنش در DB
       │ 3. درخواست به ZarinPal API
       ▼
┌─────────────────┐
│  ZarinPal API   │
│  (Payment Gate) │
└──────┬──────────┘
       │
       │ 4. بازگشت Authority
       ▼
┌─────────────────┐
│  کاربر در       │
│  صفحه پرداخت   │
└──────┬──────────┘
       │
       │ 5. پرداخت موفق
       ▼
┌─────────────────┐
│  ZarinPal       │
│  Callback URL   │
└──────┬──────────┘
       │
       │ 6. Verify Payment
       ▼
┌─────────────────┐
│   وبسایت    │
│  (Update User)  │
└─────────────────┘
```

### 1.2 اجزای اصلی سیستم

- **PaymentService**: سرویس اصلی برای ارتباط با ZarinPal
- **PaymentCallbackHandler**: مدیریت callback از زرین‌پال
- **PaymentTransaction**: مدل دیتابیس برای ذخیره تراکنش‌ها
- **HTTP/HTTPS Server**: سرور برای دریافت callback

---

## 2. پیش‌نیازها

### 2.1 موارد مورد نیاز

- ✅ Go 1.21+
- ✅ MySQL 5.7+
- ✅ حساب کاربری فعال در ZarinPal
- ✅ Merchant ID از پنل ZarinPal
- ✅ دامنه با SSL معتبر (برای callback)
- ✅ پورت 443 باز در فایروال

### 2.2 ثبت‌نام در ZarinPal

1. ثبت‌نام در سایت [zarinpal.com](https://zarinpal.com)
2. ورود به پنل کاربری
3. دریافت `Merchant ID`
4. تنظیم `Callback URL` در پنل

---

## 3. ساختار دیتابیس

### 3.1 مدل PaymentTransaction

```go
// models/gamification.go
package models

import (
    "time"
    "gorm.io/gorm"
)

// PaymentTransaction represents a payment transaction
type PaymentTransaction struct {
    ID          uint           `gorm:"primaryKey" json:"id"`
    UserID      uint           `gorm:"not null" json:"user_id"`
    User        User           `gorm:"foreignKey:UserID" json:"user"`
    Type        string         `gorm:"size:50;not null" json:"type"` 
    // Types: "subscription", "roadmap"
    Amount      int            `gorm:"not null" json:"amount"` // تومان
    Authority   string         `gorm:"size:100;uniqueIndex" json:"authority"`
    RefID       string         `gorm:"size:100" json:"ref_id"`
    Status      string         `gorm:"size:20;default:'pending'" json:"status"`
    // Statuses: "pending", "success", "failed"
    Description string         `gorm:"size:500" json:"description"`
    CreatedAt   time.Time      `json:"created_at"`
    UpdatedAt   time.Time      `json:"updated_at"`
    DeletedAt   gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}

func (PaymentTransaction) TableName() string {
    return "payment_transactions"
}
```

### 3.2 فیلدهای User برای پرداخت

```go
// models/user.go
type User struct {
    // ... سایر فیلدها ...
    SubscriptionEnd *time.Time `json:"subscription_end"` // تاریخ انقضای اشتراک
    HasPaidRoadmap  bool       `gorm:"default:false" json:"has_paid_roadmap"`
}
```

### 3.3 Migration

```go
// database/database.go
func InitDB(cfg *config.Config) error {
    // ...
    if err := DB.AutoMigrate(
        &models.User{},
        &models.PaymentTransaction{},
        // ...
    ); err != nil {
        return fmt.Errorf("failed to migrate database: %w", err)
    }
    return nil
}
```

---

## 4. پیاده‌سازی گام به گام

### 4.1 مرحله 1: تنظیمات Configuration

**فایل:** `config/config.go`

```go
package config

type PaymentConfig struct {
    MerchantID        string `mapstructure:"merchant_id"`        // Merchant ID از ZarinPal
    Sandbox           bool   `mapstructure:"sandbox"`             // true = تستی، false = واقعی
    CallbackURL       string `mapstructure:"callback_url"`       // URL callback
    SubscriptionPrice int    `mapstructure:"subscription_price"` // قیمت اشتراک (تومان)
    RoadmapPrice      int    `mapstructure:"roadmap_price"`      // قیمت رودمپ (تومان)
}
```

**فایل:** `config.yaml`

```yaml
payment:
  merchant_id: "fcbfe898-c7bf-4bee-9ac4-e37e79f730f5"  # Merchant ID شما
  sandbox: false  # false برای محیط واقعی
  callback_url: "https://www.yourdomain.com/payment/callback"
  subscription_price: 5000   # 500,000 تومان = 5000 (به تومان)
  roadmap_price: 5000        # 50,000 تومان = 5000
```

### 4.2 مرحله 2: ساخت PaymentService

**فایل:** `services/payment.go`

```go
package services

import (
    "avangard_ai_bot/config"
    "avangard_ai_bot/models"
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "log"
    "net/http"
    "time"
    "gorm.io/gorm"
)

// PaymentService handles payment operations with ZarinPal
type PaymentService struct {
    db     *gorm.DB
    config *config.PaymentConfig
}

// PaymentRequest - ساختار درخواست به ZarinPal
type PaymentRequest struct {
    MerchantID  string `json:"merchant_id"`
    Amount      int    `json:"amount"`
    Currency    string `json:"currency,omitempty"`    // "IRT" برای تومان
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
    Errors []interface{} `json:"errors"`
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
    Errors []interface{} `json:"errors"`
}

// NewPaymentService creates a new payment service
func NewPaymentService(db *gorm.DB, cfg *config.PaymentConfig) *PaymentService {
    return &PaymentService{
        db:     db,
        config: cfg,
    }
}

// CreatePaymentRequest creates a payment request and returns transaction & payment URL
func (s *PaymentService) CreatePaymentRequest(
    userID uint, 
    paymentType string, 
    amount int, 
    description string,
) (*models.PaymentTransaction, string, error) {
    
    // 1. تولید Authority موقت (بعداً از ZarinPal دریافت می‌شود)
    authority := fmt.Sprintf("A%032d", time.Now().UnixNano())

    // 2. ایجاد رکورد تراکنش در دیتابیس
    transaction := models.PaymentTransaction{
        UserID:      userID,
        Type:        paymentType, // "subscription" یا "roadmap"
        Amount:      amount,
        Authority:   authority,
        Status:      "pending",
        Description: description,
    }

    if err := s.db.Create(&transaction).Error; err != nil {
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
    apiURL := "https://payment.zarinpal.com/pg/v4/payment/request.json"
    if s.config.Sandbox {
        apiURL = "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
    }

    // 5. ارسال درخواست به ZarinPal
    response, err := s.sendPaymentRequest(apiURL, paymentReq)
    if err != nil {
        return nil, "", fmt.Errorf("failed to send payment request: %w", err)
    }

    // 6. بررسی پاسخ - Code 100 یعنی موفق
    if response.Data.Code != 100 {
        return nil, "", fmt.Errorf("payment request failed: %s", response.Data.Message)
    }

    // 7. به‌روزرسانی تراکنش با Authority واقعی از ZarinPal
    transaction.Authority = response.Data.Authority
    if err := s.db.Save(&transaction).Error; err != nil {
        return nil, "", fmt.Errorf("failed to update transaction: %w", err)
    }

    // 8. ساخت URL پرداخت برای کاربر
    paymentURL := fmt.Sprintf("https://payment.zarinpal.com/pg/StartPay/%s", response.Data.Authority)
    if s.config.Sandbox {
        paymentURL = fmt.Sprintf("https://sandbox.zarinpal.com/pg/StartPay/%s", response.Data.Authority)
    }

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

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    var response PaymentResponse
    if err := json.Unmarshal(body, &response); err != nil {
        return nil, err
    }

    return &response, nil
}

// VerifyPayment تایید پرداخت با ZarinPal
func (s *PaymentService) VerifyPayment(authority string, amount int) (*models.PaymentTransaction, error) {
    // 1. پیدا کردن تراکنش از دیتابیس
    var transaction models.PaymentTransaction
    if err := s.db.Where("authority = ?", authority).First(&transaction).Error; err != nil {
        return nil, fmt.Errorf("transaction not found: %w", err)
    }

    // 2. ساخت درخواست تایید
    verifyReq := PaymentVerify{
        MerchantID: s.config.MerchantID,
        Amount:     amount,
        Authority:  authority,
    }

    // 3. انتخاب URL
    apiURL := "https://api.zarinpal.com/pg/v4/payment/verify.json"
    if s.config.Sandbox {
        apiURL = "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
    }

    // 4. ارسال درخواست تایید
    response, err := s.sendVerifyRequest(apiURL, verifyReq)
    if err != nil {
        return nil, fmt.Errorf("failed to verify payment: %w", err)
    }

    // 5. بررسی کد پاسخ - 100 یا 101 = موفق
    if response.Data.Code == 100 || response.Data.Code == 101 {
        transaction.Status = "success"
        transaction.RefID = fmt.Sprintf("%d", response.Data.RefID)
    } else {
        transaction.Status = "failed"
    }

    // 6. ذخیره وضعیت نهایی
    if err := s.db.Save(&transaction).Error; err != nil {
        log.Printf("Failed to update transaction status: %v", err)
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

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    var response PaymentVerifyResponse
    if err := json.Unmarshal(body, &response); err != nil {
        return nil, err
    }

    return &response, nil
}

// UpdateUserSubscription به‌روزرسانی اشتراک کاربر پس از پرداخت موفق
func (s *PaymentService) UpdateUserSubscription(userID uint, paymentType string) error {
    var user models.User
    if err := s.db.First(&user, userID).Error; err != nil {
        return err
    }

    switch paymentType {
    case "subscription":
        // افزودن 30 روز به اشتراک
        var subscriptionEnd time.Time
        if user.SubscriptionEnd != nil && user.SubscriptionEnd.After(time.Now()) {
            // تمدید اشتراک فعال
            subscriptionEnd = user.SubscriptionEnd.AddDate(0, 0, 30)
        } else {
            // شروع اشتراک جدید
            subscriptionEnd = time.Now().AddDate(0, 0, 30)
        }
        user.SubscriptionEnd = &subscriptionEnd
        
    case "roadmap":
        // فعال کردن دسترسی رودمپ
        user.HasPaidRoadmap = true
    }

    return s.db.Save(&user).Error
}

// CheckUserSubscription بررسی اشتراک فعال
func (s *PaymentService) CheckUserSubscription(userID uint) bool {
    var user models.User
    if err := s.db.First(&user, userID).Error; err != nil {
        return false
    }

    if user.SubscriptionEnd == nil {
        return false
    }

    return user.SubscriptionEnd.After(time.Now())
}

// GetUserTransactions دریافت تاریخچه تراکنش‌های کاربر
func (s *PaymentService) GetUserTransactions(userID uint) ([]models.PaymentTransaction, error) {
    var transactions []models.PaymentTransaction
    err := s.db.Where("user_id = ?", userID).
        Order("created_at DESC").
        Find(&transactions).Error
    return transactions, err
}
```

### 4.3 مرحله 3: ساخت PaymentCallbackHandler

**فایل:** `handlers/payment_callback.go`

```go
package handlers

import (
    "avangard_ai_bot/keyboards"
    "avangard_ai_bot/messages"
    "avangard_ai_bot/models"
    "avangard_ai_bot/services"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "time"

    tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
    "gorm.io/gorm"
)

// PaymentCallbackHandler handles payment callbacks from ZarinPal
type PaymentCallbackHandler struct {
    bot            *tgbotapi.BotAPI
    db             *gorm.DB
    paymentService *services.PaymentService
}

// NewPaymentCallbackHandler creates a new callback handler
func NewPaymentCallbackHandler(
    bot *tgbotapi.BotAPI,
    db *gorm.DB,
    paymentService *services.PaymentService,
) *PaymentCallbackHandler {
    return &PaymentCallbackHandler{
        bot:            bot,
        db:             db,
        paymentService: paymentService,
    }
}

// HandleCallback processes the ZarinPal callback
func (h *PaymentCallbackHandler) HandleCallback(w http.ResponseWriter, r *http.Request) {
    // 1. دریافت پارامترها از Query String
    authority := r.URL.Query().Get("Authority")
    status := r.URL.Query().Get("Status")

    log.Printf("Payment callback - Authority: %s, Status: %s", authority, status)

    // 2. بررسی وجود Authority
    if authority == "" {
        log.Printf("No authority provided")
        h.renderPaymentPage(w, r, "failed", "کد پیگیری یافت نشد", "NO_AUTHORITY", "", "", "")
        return
    }

    // 3. بررسی وضعیت OK (اگر Status != "OK" یعنی کاربر پرداخت را لغو کرده)
    if status != "OK" {
        log.Printf("Payment cancelled by user: %s", status)
        h.renderPaymentPage(w, r, "failed", "پرداخت لغو شد", "CANCELLED", "", "", "")
        return
    }

    // 4. پیدا کردن تراکنش در دیتابیس
    var transaction models.PaymentTransaction
    if err := h.db.Where("authority = ?", authority).First(&transaction).Error; err != nil {
        log.Printf("Transaction not found: %s", authority)
        h.renderPaymentPage(w, r, "failed", "تراکنش یافت نشد", "NOT_FOUND", "", "", "")
        return
    }

    // 5. جلوگیری از پردازش مجدد (Idempotency)
    if transaction.Status == "success" {
        log.Printf("Transaction already processed: %s", authority)
        h.renderPaymentPage(w, r, "success", 
            "پرداخت قبلاً تأیید شده است", "ALREADY_PROCESSED",
            transaction.RefID, fmt.Sprintf("%d", transaction.Amount), transaction.Type)
        return
    }

    // 6. تایید پرداخت با ZarinPal
    verifiedTransaction, err := h.paymentService.VerifyPayment(authority, transaction.Amount)
    if err != nil {
        log.Printf("Payment verification failed: %v", err)
        h.renderPaymentPage(w, r, "failed", 
            "تأیید پرداخت ناموفق بود", "VERIFICATION_FAILED", "", "", "")
        return
    }

    // 7. بررسی نتیجه تایید
    if verifiedTransaction.Status != "success" {
        log.Printf("Payment not verified: %s", verifiedTransaction.Status)
        h.renderPaymentPage(w, r, "failed", 
            "پرداخت تأیید نشد", "NOT_VERIFIED", "", "", "")
        return
    }

    // 8. به‌روزرسانی اشتراک/دسترسی کاربر
    if err := h.paymentService.UpdateUserSubscription(
        verifiedTransaction.UserID,
        verifiedTransaction.Type,
    ); err != nil {
        log.Printf("Failed to update subscription: %v", err)
        // ادامه می‌دهیم حتی اگر به‌روزرسانی اشتراک خطا داد
    }

    // 9. ارسال پیام موفقیت به کاربر در وبسایت
    h.sendPaymentSuccessNotification(verifiedTransaction.UserID, verifiedTransaction)

    // 10. نمایش صفحه موفقیت
    h.renderPaymentPage(w, r, "success",
        "پرداخت با موفقیت انجام شد", "SUCCESS",
        verifiedTransaction.RefID,
        fmt.Sprintf("%d", verifiedTransaction.Amount),
        verifiedTransaction.Type)
}

// sendPaymentSuccessNotification ارسال پیام موفقیت به کاربر
func (h *PaymentCallbackHandler) sendPaymentSuccessNotification(
    userID uint,
    transaction *models.PaymentTransaction,
) {
    // دریافت اطلاعات کاربر
    var user models.User
    if err := h.db.First(&user, userID).Error; err != nil {
        log.Printf("Error getting user: %v", err)
        return
    }

    // ساخت پیام موفقیت
    var successMessage string
    if transaction.Type == "subscription" {
        // دریافت تاریخ انقضای جدید
        var userWithSub models.User
        if err := h.db.First(&userWithSub, transaction.UserID).Error; err == nil &&
            userWithSub.SubscriptionEnd != nil {
            successMessage = fmt.Sprintf(
                "✅ *پرداخت موفق!*\n\n"+
                    "📋 شماره تراکنش: %s\n"+
                    "💰 مبلغ: %d تومان\n"+
                    "🎁 نوع: اشتراک یک ماهه\n"+
                    "📅 تاریخ انقضای جدید: %s\n\n"+
                    "از خدمات ما لذت ببرید! 🎉",
                transaction.RefID,
                transaction.Amount,
                userWithSub.SubscriptionEnd.Format("2006-01-02 15:04"))
        } else {
            successMessage = fmt.Sprintf(
                "✅ *پرداخت موفق!*\n\n"+
                    "📋 شماره تراکنش: %s\n"+
                    "💰 مبلغ: %d تومان\n"+
                    "🎁 نوع: اشتراک یک ماهه\n\n"+
                    "از خدمات ما لذت ببرید! 🎉",
                transaction.RefID,
                transaction.Amount)
        }
    } else {
        successMessage = fmt.Sprintf(
            "✅ *پرداخت موفق!*\n\n"+
                "📋 شماره تراکنش: %s\n"+
                "💰 مبلغ: %d تومان\n"+
                "🎁 نوع: رودمپ اختصاصی\n\n"+
                "از خدمات ما لذت ببرید! 🎉",
            transaction.RefID,
            transaction.Amount)
    }

    // ارسال پیام
    msg := tgbotapi.NewMessage(int64(user.TelegramID), successMessage)
    msg.ParseMode = "Markdown"
    keyboard := keyboards.MainMenuKeyboard()
    msg.ReplyMarkup = &keyboard

    if _, err := h.bot.Send(msg); err != nil {
        log.Printf("Error sending notification: %v", err)
    }
}

// renderPaymentPage نمایش صفحه نتیجه پرداخت
func (h *PaymentCallbackHandler) renderPaymentPage(
    w http.ResponseWriter,
    r *http.Request,
    status, message, code, refID, amount, paymentType string,
) {
    w.Header().Set("Content-Type", "text/html; charset=utf-8")

    var redirectURL string

    switch status {
    case "success":
        redirectURL = fmt.Sprintf("/payment/success?ref_id=%s&amount=%s&type=%s",
            refID, amount, paymentType)
    case "failed":
        redirectURL = fmt.Sprintf("/payment/failed?error=%s&code=%s", message, code)
    default:
        redirectURL = fmt.Sprintf("/payment/pending?authority=%s", refID)
    }

    http.Redirect(w, r, redirectURL, http.StatusSeeOther)
}

// CheckPaymentStatus بررسی وضعیت پرداخت (API endpoint)
func (h *PaymentCallbackHandler) CheckPaymentStatus(w http.ResponseWriter, r *http.Request) {
    authority := r.URL.Query().Get("authority")
    if authority == "" {
        http.Error(w, "Authority required", http.StatusBadRequest)
        return
    }

    var transaction models.PaymentTransaction
    if err := h.db.Where("authority = ?", authority).First(&transaction).Error; err != nil {
        response := map[string]interface{}{
            "success": false,
            "pending": true,
            "error":   "Transaction not found",
        }
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(response)
        return
    }

    response := map[string]interface{}{
        "success": transaction.Status == "success",
        "failed":  transaction.Status == "failed",
        "pending": transaction.Status == "pending",
        "ref_id":  transaction.RefID,
        "amount":  transaction.Amount,
        "type":    transaction.Type,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}
```

### 4.4 مرحله 4: افزودن هندلرهای ربات

**فایل:** `handlers/handlers.go` (بخش پرداخت)

```go
// handlePaymentButton - نمایش منوی پرداخت
func (h *BotHandler) handlePaymentButton(message *tgbotapi.Message, user *models.User) {
    paymentText := "💳 *مرکز پرداخت*\n\n" +
        "خدمات پولی ربات:\n\n" +
        "🔹 اشتراک ماهیانه: دسترسی کامل\n" +
        "🔹 رودمپ اختصاصی: نقشه راه شخصی\n\n" +
        "یکی از گزینه‌ها را انتخاب کنید:"

    msg := tgbotapi.NewMessage(message.Chat.ID, paymentText)
    msg.ParseMode = "Markdown"
    keyboard := keyboards.PaymentKeyboard()
    msg.ReplyMarkup = &keyboard

    h.bot.Send(msg)
}

// handleSubscriptionPaymentButton - ایجاد درخواست پرداخت اشتراک
func (h *BotHandler) handleSubscriptionPaymentButton(
    message *tgbotapi.Message,
    user *models.User,
) {
    paymentService := services.NewPaymentService(h.db, &h.config.Payment)

    // بررسی اشتراک فعال
    hasActiveSubscription := paymentService.CheckUserSubscription(user.ID)

    amount := h.config.Payment.SubscriptionPrice
    description := "اشتراک ماهیانه ربات آوانگارد"

    if hasActiveSubscription {
        description = "تمدید اشتراک ماهیانه"
    }

    // ایجاد درخواست پرداخت
    _, paymentURL, err := paymentService.CreatePaymentRequest(
        user.ID,
        "subscription",
        amount,
        description,
    )

    if err != nil {
        log.Printf("Error creating payment: %v", err)
        h.sendErrorMessage(message.Chat.ID, "❌ خطا در ایجاد درخواست پرداخت")
        return
    }

    // ارسال لینک پرداخت به کاربر
    paymentText := fmt.Sprintf(
        "💳 *اشتراک ماهیانه*\n\n"+
            "قیمت: %d تومان\n\n"+
            "🔗 *لینک پرداخت:*\n%s\n\n"+
            "⚠️ *توجه:* پرداخت را در کمتر از 15 دقیقه تکمیل کنید.",
        amount, paymentURL)

    msg := tgbotapi.NewMessage(message.Chat.ID, paymentText)
    msg.ParseMode = "Markdown"

    // دکمه‌های اینلاین برای پرداخت
    keyboard := tgbotapi.NewInlineKeyboardMarkup(
        tgbotapi.NewInlineKeyboardRow(
            tgbotapi.NewInlineKeyboardButtonURL("💳 پرداخت", paymentURL),
        ),
    )
    msg.ReplyMarkup = keyboard

    h.bot.Send(msg)
}

// handleRoadmapPaymentButton - ایجاد درخواست پرداخت رودمپ
func (h *BotHandler) handleRoadmapPaymentButton(
    message *tgbotapi.Message,
    user *models.User,
) {
    paymentService := services.NewPaymentService(h.db, &h.config.Payment)

    amount := h.config.Payment.RoadmapPrice
    description := "رودمپ اختصاصی ربات آوانگارد"

    _, paymentURL, err := paymentService.CreatePaymentRequest(
        user.ID,
        "roadmap",
        amount,
        description,
    )

    if err != nil {
        log.Printf("Error creating payment: %v", err)
        h.sendErrorMessage(message.Chat.ID, "❌ خطا در ایجاد درخواست پرداخت")
        return
    }

    paymentText := fmt.Sprintf(
        "🗺️ *رودمپ اختصاصی*\n\n"+
            "قیمت: %d تومان\n\n"+
            "🔗 *لینک پرداخت:*\n%s\n\n"+
            "⚠️ *توجه:* پرداخت را در کمتر از 15 دقیقه تکمیل کنید.",
        amount, paymentURL)

    msg := tgbotapi.NewMessage(message.Chat.ID, paymentText)
    msg.ParseMode = "Markdown"

    keyboard := tgbotapi.NewInlineKeyboardMarkup(
        tgbotapi.NewInlineKeyboardRow(
            tgbotapi.NewInlineKeyboardButtonURL("💳 پرداخت", paymentURL),
        ),
    )
    msg.ReplyMarkup = keyboard

    h.bot.Send(msg)
}

// checkSubscriptionRequirement - بررسی نیاز به اشتراک
func (h *BotHandler) checkSubscriptionRequirement(
    message *tgbotapi.Message,
    user *models.User,
) bool {
    paymentService := services.NewPaymentService(h.db, &h.config.Payment)

    if !paymentService.CheckUserSubscription(user.ID) {
        msg := tgbotapi.NewMessage(
            message.Chat.ID,
            "🔒 *اشتراک منقضی شده!*\n\n"+
                "برای استفاده از این قابلیت، لطفاً اشتراک را تمدید کنید.",
        )
        msg.ParseMode = "Markdown"
        keyboard := keyboards.PaymentKeyboard()
        msg.ReplyMarkup = &keyboard
        h.bot.Send(msg)
        return false
    }

    return true
}
```

### 4.5 مرحله 5: راه‌اندازی HTTP Server

**فایل:** `main.go`

```go
package main

import (
    "avangard_ai_bot/config"
    "avangard_ai_bot/database"
    "avangard_ai_bot/handlers"
    "avangard_ai_bot/services"
    "log"
    "net/http"

    tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

func main() {
    // 1. بارگذاری تنظیمات
    cfg, err := config.LoadConfig()
    if err != nil {
        log.Fatalf("Failed to load config: %v", err)
    }

    // 2. اتصال به دیتابیس
    if err := database.InitDB(cfg); err != nil {
        log.Fatalf("Failed to initialize database: %v", err)
    }

    // 3. ایجاد ربات
    bot, err := tgbotapi.NewBotAPI(cfg.Bot.Token)
    if err != nil {
        log.Fatalf("Failed to create bot: %v", err)
    }

    // 4. ایجاد سرویس پرداخت
    paymentService := services.NewPaymentService(database.GetDB(), &cfg.Payment)

    // 5. ایجاد هندلر کالبک
    paymentCallbackHandler := handlers.NewPaymentCallbackHandler(
        bot,
        database.GetDB(),
        paymentService,
    )

    // 6. تنظیم Routes برای Callback
    http.HandleFunc("/payment/callback", paymentCallbackHandler.HandleCallback)
    http.HandleFunc("/payment/check", paymentCallbackHandler.CheckPaymentStatus)

    // 7. Routes برای صفحات HTML
    http.HandleFunc("/payment/success", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/payment_success.html")
    })
    http.HandleFunc("/payment/failed", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/payment_failed.html")
    })
    http.HandleFunc("/payment/pending", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "static/payment_pending.html")
    })

    // 8. راه‌اندازی سرور HTTP (برای Let's Encrypt)
    go func() {
        log.Printf("Starting HTTP server on port %s", cfg.Server.Port)
        if err := http.ListenAndServe(cfg.Server.Port, nil); err != nil {
            log.Fatalf("Failed to start HTTP server: %v", err)
        }
    }()

    // 9. راه‌اندازی سرور HTTPS (برای ZarinPal callbacks)
    go func() {
        sslService := services.NewSSLService(cfg.Server.Domain)
        if sslService.ValidateSSL() {
            certPath, keyPath := sslService.GetCertificatePath()
            log.Printf("Starting HTTPS server on port 443")
            log.Printf("Callback URL: %s", cfg.Payment.CallbackURL)
            if err := http.ListenAndServeTLS(":443", certPath, keyPath, nil); err != nil {
                log.Printf("Failed to start HTTPS server: %v", err)
            }
        } else {
            log.Printf("⚠️ Warning: SSL not available, callbacks may fail!")
        }
    }()

    // 10. شروع ربات (polling)
    u := tgbotapi.NewUpdate(0)
    u.Timeout = 60
    updates := bot.GetUpdatesChan(u)

    botHandler := handlers.NewBotHandler(bot, nil, cfg)

    for update := range updates {
        go botHandler.HandleUpdate(update)
    }
}
```

---

## 5. تنظیمات SSL و HTTPS

### 5.1 چرا SSL لازم است؟

ZarinPal برای ارسال callback به URL شما نیاز به HTTPS دارد. بدون SSL، callback کار نمی‌کند.

### 5.2 نصب SSL با Let's Encrypt

**روش 1: دستی**

```bash
# نصب certbot
sudo yum install certbot -y

# دریافت گواهینامه
sudo certbot certonly --standalone -d yourdomain.com

# گواهینامه‌ها در این مسیر ذخیره می‌شوند:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

**روش 2: با SSLService (خودکار)**

```go
// در main.go
sslService := services.NewSSLService(cfg.Server.Domain)

if !sslService.ValidateSSL() {
    log.Printf("Installing SSL certificate...")
    if err := sslService.InstallLetsEncrypt(); err != nil {
        log.Printf("Failed to install SSL: %v", err)
    }
}
```

### 5.3 تنظیم Auto-Renewal

```bash
# افزودن به crontab
0 0 * * * certbot renew --quiet --deploy-hook "systemctl restart your-service"
```

---

## 6. جریان کامل پرداخت

### 6.1 فلوی کامل (با مثال)

```
1. کاربر کلیک می‌کند: "💳 اشتراک ماهیانه"
   ↓
2. handleSubscriptionPaymentButton اجرا می‌شود
   ↓
3. CreatePaymentRequest:
   - ایجاد تراکنش در DB (status: "pending")
   - ارسال درخواست به ZarinPal API
   - دریافت Authority
   - بازگشت URL پرداخت
   ↓
4. ارسال URL به کاربر در وبسایت
   ↓
5. کاربر روی لینک کلیک می‌کند و به صفحه پرداخت می‌رود
   ↓
6. کاربر پرداخت را تکمیل می‌کند
   ↓
7. ZarinPal به Callback URL ما درخواست می‌فرستد:
   GET /payment/callback?Authority=A000000...&Status=OK
   ↓
8. HandleCallback اجرا می‌شود:
   - بررسی Authority و Status
   - پیدا کردن تراکنش در DB
   - VerifyPayment با ZarinPal
   - به‌روزرسانی وضعیت تراکنش (success/failed)
   - UpdateUserSubscription
   - ارسال پیام موفقیت به کاربر
   - Redirect به صفحه success
   ↓
9. کاربر به صفحه موفقیت هدایت می‌شود
```

### 6.2 کدهای خطا ZarinPal

| Code | معنی |
|------|------|
| 100 | درخواست پرداخت موفق |
| 101 | پرداخت قبلاً تایید شده |
| -9 | خطای اعتبارسنجی |
| -10 | IP یا مرچنت کد نامعتبر |
| -11 | درگاه فعال نیست |

---

## 7. تست و دبیاگ

### 7.1 تست در حالت Sandbox

```yaml
# config.yaml
payment:
  sandbox: true  # فعال کردن حالت تست
  merchant_id: "your-sandbox-merchant-id"
```

**کارت‌های تست ZarinPal:**
- شماره کارت: `6037-9970-0000-0000`
- CVV2: `123`
- تاریخ انقضا: هر تاریخی در آینده

### 7.2 لاگ‌های مهم

```go
// در PaymentService
log.Printf("Creating payment request - UserID: %d, Type: %s, Amount: %d", 
    userID, paymentType, amount)

log.Printf("ZarinPal response - Code: %d, Authority: %s", 
    response.Data.Code, response.Data.Authority)

// در PaymentCallbackHandler
log.Printf("Callback received - Authority: %s, Status: %s", authority, status)
log.Printf("Transaction verified - Status: %s, RefID: %s", 
    transaction.Status, transaction.RefID)
```

### 7.3 تست Endpoint

```bash
# تست callback
curl "https://yourdomain.com/payment/callback?Authority=A000000&Status=OK"

# بررسی وضعیت
curl "https://yourdomain.com/payment/check?authority=A000000"
```

### 7.4 مشکلات رایج

**مشکل 1: Callback دریافت نمی‌شود**
- ✅ بررسی SSL و HTTPS
- ✅ بررسی Callback URL در پنل ZarinPal
- ✅ بررسی فایروال و پورت 443

**مشکل 2: Transaction Not Found**
- ✅ بررسی Authority در DB
- ✅ بررسی timing (callback ممکن است دیرتر بیاید)

**مشکل 3: Verification Failed**
- ✅ بررسی Amount (باید دقیقاً همان مبلغ باشد)
- ✅ بررسی Merchant ID

---

## 8. نکات مهم و بهترین روش‌ها

### 8.1 امنیت

✅ **همیشه از HTTPS استفاده کنید**
```go
// ❌ بد
callback_url: "http://yourdomain.com/payment/callback"

// ✅ خوب
callback_url: "https://yourdomain.com/payment/callback"
```

✅ **Idempotency - جلوگیری از پردازش مجدد**
```go
if transaction.Status == "success" {
    // قبلاً پردازش شده، پردازش نکن
    return
}
```

✅ **Timeout برای HTTP Requests**
```go
client := &http.Client{Timeout: 30 * time.Second}
```

### 8.2 مدیریت خطا

✅ **لاگ همه خطاها**
```go
log.Printf("Payment failed - UserID: %d, Error: %v", userID, err)
```

✅ **پیام‌های واضح به کاربر**
```go
h.sendErrorMessage(chatID, "❌ خطا در پردازش پرداخت. لطفاً با پشتیبانی تماس بگیرید.")
```

### 8.3 بهینه‌سازی

✅ **ذخیره Authority در DB قبل از ارسال درخواست**
- در صورت خطا در ZarinPal، می‌توانید تراکنش را track کنید

✅ **استفاده از Transaction ID برای OrderID**
```go
Metadata: {
    OrderID: fmt.Sprintf("%d", transaction.ID),
}
```

### 8.4 چک‌لیست قبل از Production

- [ ] SSL نصب شده و معتبر است
- [ ] Callback URL در پنل ZarinPal تنظیم شده
- [ ] Sandbox mode = false
- [ ] Merchant ID صحیح است
- [ ] پورت 443 باز است
- [ ] تست کامل انجام شده
- [ ] Error handling پیاده‌سازی شده
- [ ] Logging فعال است

---

## 📝 خلاصه

### مراحل اصلی:

1. ✅ **ساختار DB**: PaymentTransaction + User fields
2. ✅ **PaymentService**: CreatePaymentRequest + VerifyPayment
3. ✅ **CallbackHandler**: HandleCallback + Notification
4. ✅ **HTTP Routes**: /payment/callback, /payment/success, etc.
5. ✅ **SSL**: نصب و فعال‌سازی HTTPS
6. ✅ **Handlers**: اتصال دکمه‌های ربات به PaymentService

### فایل‌های مهم:

- `services/payment.go` - منطق پرداخت
- `handlers/payment_callback.go` - مدیریت callback
- `handlers/handlers.go` - هندلرهای ربات
- `main.go` - راه‌اندازی سرور
- `config.yaml` - تنظیمات
- `models/gamification.go` - مدل دیتابیس

---

## 🎯 نتیجه

با پیروی از این راهنما، سیستم پرداخت کامل و امن برای وبسایت  شما پیاده‌سازی می‌شود. تمام کدها آماده استفاده هستند و فقط نیاز به جایگزینی Merchant ID و تنظیم دامنه دارند.

**سوال یا مشکلی دارید؟** لاگ‌ها را بررسی کنید و مطمئن شوید همه مراحل به درستی اجرا می‌شوند.

---

**نویسنده:** Cursor AI Assistant  
**تاریخ:** 2025  
**نسخه:** 1.0

