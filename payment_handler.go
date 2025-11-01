package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

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

		// نمایش صفحه HTML ناموفق
		h.renderPaymentResultPage(w, r, "failed", "", "", "")
		return
	}

	// 3. بررسی وضعیت OK (اگر Status != "OK" یعنی کاربر پرداخت را لغو کرده)
	if status != "OK" {
		logger.Info("Payment cancelled by user",
			zap.String("authority", authority),
			zap.String("status", status))

		// نمایش صفحه HTML ناموفق
		h.renderPaymentResultPage(w, r, "failed", "", "", "")
		return
	}

	// 4. پیدا کردن تراکنش در دیتابیس
	var transaction PaymentTransaction
	if err := db.Where("authority = ?", authority).First(&transaction).Error; err != nil {
		logger.Error("Transaction not found",
			zap.String("authority", authority),
			zap.Error(err))

		// نمایش صفحه HTML ناموفق
		h.renderPaymentResultPage(w, r, "failed", "", "", "")
		return
	}

	// 5. جلوگیری از پردازش مجدد (Idempotency)
	if transaction.Status == "success" {
		logger.Info("Transaction already processed",
			zap.String("authority", authority))

		// نمایش صفحه HTML موفقیت (حتی اگر قبلاً پردازش شده)
		h.renderPaymentResultPage(w, r, "success",
			transaction.RefID,
			fmt.Sprintf("%d", transaction.Amount),
			transaction.Type)
		return
	}

	// 6. تایید پرداخت با ZarinPal
	verifiedTransaction, err := h.paymentService.VerifyPayment(authority, transaction.Amount)
	if err != nil {
		logger.Error("Payment verification failed",
			zap.String("authority", authority),
			zap.Error(err))

		// نمایش صفحه HTML ناموفق
		h.renderPaymentResultPage(w, r, "failed", "", "", "")
		return
	}

	// 7. بررسی نتیجه تایید
	if verifiedTransaction.Status != "success" {
		logger.Warn("Payment not verified",
			zap.String("authority", authority),
			zap.String("status", verifiedTransaction.Status))

		// نمایش صفحه HTML ناموفق
		h.renderPaymentResultPage(w, r, "failed", "", "", "")
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

	// 10. نمایش صفحه نتیجه پرداخت
	h.renderPaymentResultPage(w, r, "success",
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
			zap.String("transaction_ref_id", transaction.RefID),
			zap.Error(err))
	} else {
		logger.Info("Payment success notification sent to Telegram",
			zap.Int64("telegram_id", user.TelegramID),
			zap.String("transaction_ref_id", transaction.RefID),
			zap.String("plan_type", transaction.Type))
	}

	// ارسال SMS بر اساس نوع اشتراک
	go func(userPtr *User, planType string) {
		smsConfig := GetSMSConfig()
		var patternCode string

		switch planType {
		case "starter":
			patternCode = smsConfig.PatternSubscriptionOneMonth
		case "pro":
			patternCode = smsConfig.PatternSubscriptionSixMonth
		case "ultimate":
			patternCode = smsConfig.PatternSubscriptionUnlimited
		default:
			logger.Warn("Unknown plan type for SMS", zap.String("plan_type", planType))
			return
		}

		if patternCode == "" {
			logger.Warn("SMS pattern code not configured", zap.String("plan_type", planType))
			return
		}

		if userPtr.Phone == "" {
			logger.Warn("User phone is empty, cannot send SMS",
				zap.Int64("user_id", int64(userPtr.TelegramID)),
				zap.String("plan_type", planType))
			return
		}

		// ساخت نام کاربر
		userName := userPtr.FirstName
		if userPtr.LastName != "" {
			userName = fmt.Sprintf("%s %s", userPtr.FirstName, userPtr.LastName)
		}

		logger.Info("Attempting to send subscription SMS",
			zap.Int64("user_id", int64(userPtr.TelegramID)),
			zap.String("phone", userPtr.Phone),
			zap.String("plan_type", planType),
			zap.String("pattern_code", patternCode))

		err := sendPatternSMS(patternCode, userPtr.Phone, map[string]string{
			"name": userName,
		})
		if err != nil {
			logger.Error("Failed to send subscription SMS",
				zap.Int64("user_id", int64(userPtr.TelegramID)),
				zap.String("phone", userPtr.Phone),
				zap.String("plan_type", planType),
				zap.String("pattern_code", patternCode),
				zap.Error(err))
		} else {
			logger.Info("Subscription SMS sent successfully",
				zap.Int64("user_id", int64(userPtr.TelegramID)),
				zap.String("phone", userPtr.Phone),
				zap.String("plan_type", planType),
				zap.String("pattern_code", patternCode))
		}
	}(&user, transaction.Type)
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

// renderPaymentResultPage نمایش صفحه نتیجه پرداخت با تم مینی اپ
func (h *PaymentHandler) renderPaymentResultPage(w http.ResponseWriter, r *http.Request, status, refID, amountStr, planType string) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")

	// Debug logging
	logger.Info("renderPaymentResultPage called",
		zap.String("status", status),
		zap.String("ref_id", refID),
		zap.String("amount", amountStr),
		zap.String("plan_type", planType))

	// تعیین محتوا بر اساس status
	var icon string
	var title string
	var message string
	var cardClass string

	if status == "success" {
		icon = "✅"
		title = "پرداخت موفق!"
		message = "اشتراک شما با موفقیت فعال شد. از خدمات ما لذت ببرید! 🎉"
		cardClass = "success-card"
	} else {
		icon = "❌"
		title = "پرداخت ناموفق"
		message = "متأسفانه پرداخت شما با خطا مواجه شد. لطفاً دوباره تلاش کنید."
		cardClass = "failed-card"
	}

	// Get plan name
	var planName string
	switch planType {
	case "starter":
		planName = "Starter (یک ماهه)"
	case "pro":
		planName = "Pro (شش‌ماهه)"
	case "ultimate":
		planName = "Ultimate (مادام‌العمر)"
	default:
		planName = ""
	}

	// Format amount
	var formattedAmount string
	if amountStr != "" {
		if amt, err := strconv.Atoi(amountStr); err == nil {
			formattedAmount = formatPrice(amt)
		} else {
			formattedAmount = amountStr
		}
	}

	pageContent := fmt.Sprintf(`<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>%s - MonetizeAI</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Vazir:wght@400;500;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Vazir', 'IranSansX', system-ui, sans-serif;
            background: #0e0817;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
            color: white;
        }
        
        .payment-container {
            width: 100%%;
            max-width: 450px;
            position: relative;
        }
        
        .payment-card {
            background: linear-gradient(135deg, rgba(44, 24, 154, 0.95) 0%%, rgba(90, 24, 154, 0.95) 50%%, rgba(114, 34, 242, 0.95) 100%%);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            padding: 32px;
            box-shadow: 0 20px 60px rgba(90, 24, 154, 0.3);
            border: 1px solid rgba(90, 24, 154, 0.3);
            position: relative;
            overflow: hidden;
        }
        
        .payment-card::before {
            content: '';
            position: absolute;
            top: -50%%;
            right: -50%%;
            width: 200%%;
            height: 200%%;
            background: radial-gradient(circle, rgba(114, 34, 242, 0.1) 0%%, transparent 70%%);
            pointer-events: none;
        }
        
        .icon-container {
            display: flex;
            justify-content: center;
            margin-bottom: 24px;
            position: relative;
            z-index: 1;
        }
        
        .icon-circle {
            width: 96px;
            height: 96px;
            border-radius: 50%%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 48px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            position: relative;
        }
        
        .success-card .icon-circle {
            background: linear-gradient(135deg, #10b981 0%%, #059669 100%%);
        }
        
        .failed-card .icon-circle {
            background: linear-gradient(135deg, #ef4444 0%%, #dc2626 100%%);
        }
        
        .icon-circle::after {
            content: '';
            position: absolute;
            inset: -4px;
            border-radius: 50%%;
            padding: 2px;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.3), transparent);
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask-composite: exclude;
            opacity: 0.5;
        }
        
        .title {
            text-align: center;
            font-size: 28px;
            font-weight: 700;
            margin-bottom: 16px;
            position: relative;
            z-index: 1;
        }
        
        .success-card .title {
            color: #10b981;
        }
        
        .failed-card .title {
            color: #ef4444;
        }
        
        .message {
            text-align: center;
            font-size: 16px;
            color: rgba(255, 255, 255, 0.9);
            margin-bottom: 32px;
            line-height: 1.6;
            position: relative;
            z-index: 1;
        }
        
        .details {
            background: rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 32px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
            z-index: 1;
        }
        
        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        .detail-row:last-child {
            border-bottom: none;
        }
        
        .detail-label {
            color: rgba(255, 255, 255, 0.7);
            font-size: 14px;
            font-weight: 500;
        }
        
        .detail-value {
            color: white;
            font-size: 16px;
            font-weight: 700;
            font-family: 'Courier New', monospace;
        }
        
        .detail-value.amount {
            color: #10b981;
        }
        
        .buttons {
            display: flex;
            flex-direction: column;
            gap: 12px;
            position: relative;
            z-index: 1;
        }
        
        .btn {
            width: 100%%;
            padding: 16px 24px;
            border-radius: 16px;
            font-size: 16px;
            font-weight: 700;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: 'Vazir', 'IranSansX', system-ui, sans-serif;
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #2c189a 0%%, #5a189a 100%%);
            color: white;
            box-shadow: 0 8px 24px rgba(90, 24, 154, 0.4);
        }
        
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 32px rgba(90, 24, 154, 0.6);
        }
        
        .btn-secondary {
            background: rgba(255, 255, 255, 0.1);
            color: white;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .btn-secondary:hover {
            background: rgba(255, 255, 255, 0.15);
        }
        
        @media (max-width: 480px) {
            .payment-card {
                padding: 24px;
            }
            
            .title {
                font-size: 24px;
            }
            
            .icon-circle {
                width: 80px;
                height: 80px;
                font-size: 40px;
            }
        }
    </style>
</head>
<body>
    <div class="payment-container">
        <div class="payment-card %s">
            <div class="icon-container">
                <div class="icon-circle">
                    %s
                </div>
            </div>
            
            <h1 class="title">%s</h1>
            <p class="message">%s</p>
            
            %s
            
            <div class="buttons">
                %s
            </div>
        </div>
    </div>
</body>
</html>`, cardClass, icon, title, message,
		func() string {
			if status == "success" && refID != "" {
				return fmt.Sprintf(`<div class="details">
                    %s
                    %s
                    %s
                </div>`,
					func() string {
						if refID != "" {
							return fmt.Sprintf(`<div class="detail-row">
                        <span class="detail-label">شماره تراکنش:</span>
                        <span class="detail-value">%s</span>
                    </div>`, refID)
						}
						return ""
					}(),
					func() string {
						if formattedAmount != "" {
							return fmt.Sprintf(`<div class="detail-row">
                        <span class="detail-label">مبلغ:</span>
                        <span class="detail-value amount">%s تومان</span>
                    </div>`, formattedAmount)
						}
						return ""
					}(),
					func() string {
						if planName != "" {
							return fmt.Sprintf(`<div class="detail-row">
                        <span class="detail-label">نوع اشتراک:</span>
                        <span class="detail-value">%s</span>
                    </div>`, planName)
						}
						return ""
					}())
			}
			return ""
		}(),
		func() string {
			if status == "success" {
				return `<button class="btn btn-primary" onclick="window.close()">بستن</button>`
			} else {
				return `<button class="btn btn-primary" onclick="window.history.back()">تلاش مجدد</button>
                    <button class="btn btn-secondary" onclick="window.close()">بستن</button>`
			}
		}())

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
