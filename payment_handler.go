package main

import (
	"encoding/json"
	"fmt"
	"net/http"

	"MonetizeeAI_bot/logger"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"go.uber.org/zap"
)

// PaymentHandler handles payment callbacks from ZarinPal
type PaymentHandler struct {
	paymentService *PaymentService
}

// NewPaymentHandler creates a new payment handler
func NewPaymentHandler() *PaymentHandler {
	return &PaymentHandler{
		paymentService: NewPaymentService(db),
	}
}

// HandleCallback processes the ZarinPal callback
func (h *PaymentHandler) HandleCallback(w http.ResponseWriter, r *http.Request) {
	// 1. دریافت پارامترها از Query String
	authority := r.URL.Query().Get("Authority")
	status := r.URL.Query().Get("Status")

	logger.Info("Payment callback received",
		zap.String("authority", authority),
		zap.String("status", status))

	// 2. بررسی وجود Authority
	if authority == "" {
		logger.Warn("No authority provided in callback")
		h.renderPaymentPage(w, r, "failed", "کد پیگیری یافت نشد", "NO_AUTHORITY", "", "", "")
		return
	}

	// 3. بررسی وضعیت OK (اگر Status != "OK" یعنی کاربر پرداخت را لغو کرده)
	if status != "OK" {
		logger.Info("Payment cancelled by user",
			zap.String("authority", authority),
			zap.String("status", status))
		h.renderPaymentPage(w, r, "failed", "پرداخت لغو شد", "CANCELLED", "", "", "")
		return
	}

	// 4. پیدا کردن تراکنش در دیتابیس
	var transaction PaymentTransaction
	if err := db.Where("authority = ?", authority).First(&transaction).Error; err != nil {
		logger.Error("Transaction not found",
			zap.String("authority", authority),
			zap.Error(err))
		h.renderPaymentPage(w, r, "failed", "تراکنش یافت نشد", "NOT_FOUND", "", "", "")
		return
	}

	// 5. جلوگیری از پردازش مجدد (Idempotency)
	if transaction.Status == "success" {
		logger.Info("Transaction already processed",
			zap.String("authority", authority))
		h.renderPaymentPage(w, r, "success",
			"پرداخت قبلاً تأیید شده است", "ALREADY_PROCESSED",
			transaction.RefID, fmt.Sprintf("%d", transaction.Amount), transaction.Type)
		return
	}

	// 6. تایید پرداخت با ZarinPal
	verifiedTransaction, err := h.paymentService.VerifyPayment(authority, transaction.Amount)
	if err != nil {
		logger.Error("Payment verification failed",
			zap.String("authority", authority),
			zap.Error(err))
		h.renderPaymentPage(w, r, "failed",
			"تأیید پرداخت ناموفق بود", "VERIFICATION_FAILED", "", "", "")
		return
	}

	// 7. بررسی نتیجه تایید
	if verifiedTransaction.Status != "success" {
		logger.Warn("Payment not verified",
			zap.String("authority", authority),
			zap.String("status", verifiedTransaction.Status))
		h.renderPaymentPage(w, r, "failed",
			"پرداخت تأیید نشد", "NOT_VERIFIED", "", "", "")
		return
	}

	// 8. به‌روزرسانی اشتراک/دسترسی کاربر
	if err := h.paymentService.UpdateUserSubscription(
		verifiedTransaction.UserID,
		verifiedTransaction.Type,
	); err != nil {
		logger.Error("Failed to update subscription",
			zap.Uint("user_id", verifiedTransaction.UserID),
			zap.String("plan_type", verifiedTransaction.Type),
			zap.Error(err))
		// ادامه می‌دهیم حتی اگر به‌روزرسانی اشتراک خطا داد
	}

	// 9. ارسال پیام موفقیت به کاربر در تلگرام
	h.sendPaymentSuccessNotification(verifiedTransaction)

	// 10. نمایش صفحه موفقیت
	h.renderPaymentPage(w, r, "success",
		"پرداخت با موفقیت انجام شد", "SUCCESS",
		verifiedTransaction.RefID,
		fmt.Sprintf("%d", verifiedTransaction.Amount),
		verifiedTransaction.Type)
}

// sendPaymentSuccessNotification ارسال پیام موفقیت به کاربر
func (h *PaymentHandler) sendPaymentSuccessNotification(
	transaction *PaymentTransaction,
) {
	// دریافت اطلاعات کاربر
	var user User
	if err := db.First(&user, transaction.UserID).Error; err != nil {
		logger.Error("Error getting user for notification",
			zap.Uint("user_id", transaction.UserID),
			zap.Error(err))
		return
	}

	// ساخت پیام موفقیت
	var successMessage string
	var planName string

	switch transaction.Type {
	case "starter":
		planName = "Starter (یک ماهه)"
	case "pro":
		planName = "Pro (شش‌ماهه)"
	case "ultimate":
		planName = "Ultimate (مادام‌العمر)"
	default:
		planName = "اشتراک"
	}

	if transaction.Type == "ultimate" {
		successMessage = fmt.Sprintf(
			"✅ *پرداخت موفق!*\n\n"+
				"📋 شماره تراکنش: %s\n"+
				"💰 مبلغ: %s تومان\n"+
				"🎁 نوع: %s\n"+
				"📅 مدت: مادام‌العمر\n\n"+
				"از خدمات ما لذت ببرید! 🎉",
			transaction.RefID,
			formatPrice(transaction.Amount),
			planName)
	} else {
		var expiryMsg string
		var userWithSub User
		if err := db.First(&userWithSub, transaction.UserID).Error; err == nil &&
			userWithSub.SubscriptionExpiry != nil {
			expiryMsg = fmt.Sprintf("📅 تاریخ انقضا: %s\n\n",
				userWithSub.SubscriptionExpiry.Format("2006-01-02"))
		}

		successMessage = fmt.Sprintf(
			"✅ *پرداخت موفق!*\n\n"+
				"📋 شماره تراکنش: %s\n"+
				"💰 مبلغ: %s تومان\n"+
				"🎁 نوع: %s\n"+
				"%s"+
				"از خدمات ما لذت ببرید! 🎉",
			transaction.RefID,
			formatPrice(transaction.Amount),
			planName,
			expiryMsg)
	}

	// ارسال پیام
	msg := tgbotapi.NewMessage(int64(user.TelegramID), successMessage)
	msg.ParseMode = "Markdown"
	msg.ReplyMarkup = getMainMenuKeyboard()

	if _, err := bot.Send(msg); err != nil {
		logger.Error("Error sending payment notification",
			zap.Int64("telegram_id", user.TelegramID),
			zap.Error(err))
	}
}

// renderPaymentPage نمایش صفحه نتیجه پرداخت
func (h *PaymentHandler) renderPaymentPage(
	w http.ResponseWriter,
	r *http.Request,
	status, message, code, refID, amount, paymentType string,
) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")

	pageContent := ""
	if status == "success" {
		pageContent = fmt.Sprintf(`
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>پرداخت موفق - MonetizeAI</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
        }
        .success-icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
        h1 {
            color: #2d3748;
            margin-bottom: 10px;
        }
        .message {
            color: #4a5568;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .details {
            background: #f7fafc;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
            text-align: right;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .detail-row:last-child {
            border-bottom: none;
        }
        .detail-label {
            color: #718096;
            font-weight: bold;
        }
        .detail-value {
            color: #2d3748;
        }
        .close-button {
            background: linear-gradient(135deg, #667eea 0%%, #764ba2 100%%);
            color: white;
            border: none;
            padding: 15px 40px;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
        }
        .close-button:hover {
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="success-icon">✅</div>
        <h1>پرداخت موفق!</h1>
        <p class="message">%s</p>
        <div class="details">
            <div class="detail-row">
                <span class="detail-label">شماره تراکنش:</span>
                <span class="detail-value">%s</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">مبلغ:</span>
                <span class="detail-value">%s تومان</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">نوع اشتراک:</span>
                <span class="detail-value">%s</span>
            </div>
        </div>
        <button class="close-button" onclick="window.close()">بستن</button>
    </div>
</body>
</html>`, message, refID, formatPriceString(amount), getPlanTypeName(paymentType))
	} else {
		pageContent = fmt.Sprintf(`
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>پرداخت ناموفق - MonetizeAI</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #f093fb 0%%, #f5576c 100%%);
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            max-width: 500px;
            width: 100%%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
        }
        .error-icon {
            font-size: 80px;
            margin-bottom: 20px;
        }
        h1 {
            color: #2d3748;
            margin-bottom: 10px;
        }
        .message {
            color: #e53e3e;
            margin-bottom: 30px;
            font-size: 16px;
        }
        .close-button {
            background: linear-gradient(135deg, #f093fb 0%%, #f5576c 100%%);
            color: white;
            border: none;
            padding: 15px 40px;
            border-radius: 10px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
        }
        .close-button:hover {
            opacity: 0.9;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">❌</div>
        <h1>پرداخت ناموفق</h1>
        <p class="message">%s</p>
        <button class="close-button" onclick="window.close()">بستن</button>
    </div>
</body>
</html>`, message)
	}

	w.WriteHeader(http.StatusOK)
	w.Write([]byte(pageContent))
}

// CheckPaymentStatus بررسی وضعیت پرداخت (API endpoint)
func (h *PaymentHandler) CheckPaymentStatus(w http.ResponseWriter, r *http.Request) {
	authority := r.URL.Query().Get("authority")
	if authority == "" {
		response := APIResponse{
			Success: false,
			Error:   "Authority required",
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(response)
		return
	}

	var transaction PaymentTransaction
	if err := db.Where("authority = ?", authority).First(&transaction).Error; err != nil {
		response := APIResponse{
			Success: false,
			Data: map[string]interface{}{
				"pending": true,
				"error":   "Transaction not found",
			},
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	response := APIResponse{
		Success: transaction.Status == "success",
		Data: map[string]interface{}{
			"success": transaction.Status == "success",
			"failed":  transaction.Status == "failed",
			"pending": transaction.Status == "pending",
			"ref_id":  transaction.RefID,
			"amount":  transaction.Amount,
			"type":    transaction.Type,
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// formatPrice formats price with thousand separators
func formatPrice(price int) string {
	priceStr := fmt.Sprintf("%d", price)
	if len(priceStr) <= 3 {
		return priceStr
	}

	result := ""
	for i, char := range priceStr {
		if i > 0 && (len(priceStr)-i)%3 == 0 {
			result += ","
		}
		result += string(char)
	}
	return result
}

// formatPriceString formats price string with thousand separators
func formatPriceString(priceStr string) string {
	var price int
	fmt.Sscanf(priceStr, "%d", &price)
	return formatPrice(price)
}

// getPlanTypeName returns Persian name for plan type
func getPlanTypeName(planType string) string {
	switch planType {
	case "starter":
		return "Starter (یک ماهه)"
	case "pro":
		return "Pro (شش‌ماهه)"
	case "ultimate":
		return "Ultimate (مادام‌العمر)"
	default:
		return planType
	}
}
