package main

import (
	"fmt"
	"net/http"

	"MonetizeeAI_bot/logger"

	"github.com/gin-gonic/gin"
	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"go.uber.org/zap"
)

// handleCreatePaymentRequest creates a payment request for a user
func handleCreatePaymentRequest(c *gin.Context) {
	var requestData struct {
		TelegramID int64  `json:"telegram_id" binding:"required"`
		PlanType   string `json:"plan_type" binding:"required"` // starter, pro, ultimate
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request data",
		})
		return
	}

	// Validate plan type
	if requestData.PlanType != "starter" && requestData.PlanType != "pro" && requestData.PlanType != "ultimate" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid plan type. Must be starter, pro, or ultimate",
		})
		return
	}

	// Find user
	var user User
	if err := db.Where("telegram_id = ?", requestData.TelegramID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Success: false,
			Error:   "User not found",
		})
		return
	}

	// Create payment service and request
	paymentService := NewPaymentService(db)
	transaction, paymentURL, err := paymentService.CreatePaymentRequest(user.ID, requestData.PlanType)
	if err != nil {
		logger.Error("Failed to create payment request",
			zap.Int64("telegram_id", requestData.TelegramID),
			zap.String("plan_type", requestData.PlanType),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Failed to create payment request",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"authority":   transaction.Authority,
			"payment_url": paymentURL,
			"amount":      transaction.Amount,
			"plan_type":   transaction.Type,
		},
	})
}

// handleCheckPaymentStatus checks the status of a payment
func handleCheckPaymentStatus(c *gin.Context) {
	authority := c.Query("authority")
	if authority == "" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Authority is required",
		})
		return
	}

	var transaction PaymentTransaction
	if err := db.Where("authority = ?", authority).First(&transaction).Error; err != nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Success: false,
			Error:   "Transaction not found",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: transaction.Status == "success",
		Data: map[string]interface{}{
			"status":  transaction.Status,
			"ref_id":  transaction.RefID,
			"amount":  transaction.Amount,
			"type":    transaction.Type,
			"success": transaction.Status == "success",
			"failed":  transaction.Status == "failed",
			"pending": transaction.Status == "pending",
		},
	})
}

// handleSubscriptionPaymentButton handles payment button click from Telegram bot
func handleSubscriptionPaymentButton(user *User, planType string) string {
	// Validate plan type
	if planType != "starter" && planType != "pro" && planType != "ultimate" {
		return "❌ نوع اشتراک نامعتبر است."
	}

	// Create payment service and request
	paymentService := NewPaymentService(db)
	transaction, paymentURL, err := paymentService.CreatePaymentRequest(user.ID, planType)
	if err != nil {
		logger.Error("Failed to create payment request from bot",
			zap.Int64("telegram_id", user.TelegramID),
			zap.String("plan_type", planType),
			zap.Error(err))
		return "❌ خطا در ایجاد درخواست پرداخت. لطفا دوباره تلاش کنید."
	}

	// Get plan details
	var planName string
	var planPrice int
	var planPeriod string

	switch planType {
	case "starter":
		planName = "Starter"
		planPrice = paymentService.config.StarterPrice
		planPeriod = "یک ماهه"
	case "pro":
		planName = "Pro"
		planPrice = paymentService.config.ProPrice
		planPeriod = "شش‌ماهه"
	case "ultimate":
		planName = "Ultimate"
		planPrice = paymentService.config.UltimatePrice
		planPeriod = "مادام‌العمر"
	}

	paymentText := fmt.Sprintf(
		"💳 *اشتراک %s*\n\n"+
			"💰 قیمت: %s تومان\n"+
			"📅 مدت: %s\n\n"+
			"🔗 *لینک پرداخت:*\n%s\n\n"+
			"⚠️ *توجه:* پرداخت را در کمتر از 15 دقیقه تکمیل کنید.\n\n"+
			"✅ پرداخت شما بعد از 3 دقیقه خودکار توسط سیستم چک می‌شود، پس پرداخت خود رو با خیال راحت انجام دهید.",
		planName,
		formatPrice(planPrice),
		planPeriod,
		paymentURL)

	msg := tgbotapi.NewMessage(user.TelegramID, paymentText)
	msg.ParseMode = "Markdown"

	// دکمه‌های اینلاین برای پرداخت و چک دستی
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonURL("💳 پرداخت آنلاین", paymentURL),
		),
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("✅ چک کردن پرداخت", fmt.Sprintf("check_payment:%s", transaction.Authority)),
		),
	)

	msg.ReplyMarkup = keyboard
	bot.Send(msg)

	return ""
}

// handleManualPaymentCheck handles manual payment check from user button click
func handleManualPaymentCheck(user *User, authority string) {
	// Find transaction
	var transaction PaymentTransaction
	if err := db.Where("authority = ? AND user_id = ?", authority, user.ID).First(&transaction).Error; err != nil {
		logger.Error("Transaction not found for manual check",
			zap.String("authority", authority),
			zap.Uint("user_id", user.ID),
			zap.Error(err))
		sendMessage(user.TelegramID, "❌ تراکنش یافت نشد. لطفا دوباره تلاش کنید.")
		return
	}

	// Check if already processed
	if transaction.Status != "pending" {
		if transaction.Status == "success" {
			sendMessage(user.TelegramID, "✅ این پرداخت قبلاً با موفقیت انجام شده است.")
		} else {
			sendMessage(user.TelegramID, "❌ این پرداخت ناموفق بوده است. لطفا یک پرداخت جدید انجام دهید.")
		}
		return
	}

	// Send checking message
	sendMessage(user.TelegramID, "⏳ در حال چک کردن پرداخت...")

	// Re-check transaction status from database one more time before verifying
	// This prevents race condition with automatic checker
	var freshTransaction PaymentTransaction
	if err := db.Where("authority = ? AND user_id = ?", authority, user.ID).First(&freshTransaction).Error; err != nil {
		logger.Error("Transaction not found for manual check (re-check)", zap.Error(err))
		sendMessage(user.TelegramID, "❌ تراکنش یافت نشد. لطفا دوباره تلاش کنید.")
		return
	}

	// If status changed to non-pending between checks, skip verification
	if freshTransaction.Status != "pending" {
		if freshTransaction.Status == "success" {
			sendMessage(user.TelegramID, "✅ این پرداخت قبلاً پردازش شده است.")
		} else if freshTransaction.Status == "failed" {
			sendMessage(user.TelegramID, "❌ این پرداخت ناموفق بوده است.")
		} else {
			sendMessage(user.TelegramID, fmt.Sprintf("⚠️ وضعیت تراکنش: %s", freshTransaction.Status))
		}
		return
	}

	// Verify payment
	paymentService := NewPaymentService(db)
	verifiedTransaction, err := paymentService.VerifyPayment(authority, freshTransaction.Amount)
	if err != nil {
		logger.Error("Manual payment verification failed",
			zap.String("authority", authority),
			zap.Uint("user_id", user.ID),
			zap.Error(err))
		sendMessage(user.TelegramID, "❌ خطا در چک کردن پرداخت. لطفا دوباره تلاش کنید یا منتظر چک خودکار سیستم باشید.")
		return
	}

	// Re-check status one final time after verification to ensure no race condition
	// This is the last safety check before updating subscription
	var finalTransaction PaymentTransaction
	if err := db.Where("authority = ?", authority).First(&finalTransaction).Error; err == nil {
		if finalTransaction.Status != "pending" && finalTransaction.Status != verifiedTransaction.Status {
			// Transaction was processed by another goroutine (automatic checker)
			logger.Info("Transaction processed by another process, skipping duplicate processing",
				zap.String("authority", authority),
				zap.String("final_status", finalTransaction.Status))
			if finalTransaction.Status == "success" {
				sendMessage(user.TelegramID, "✅ پرداخت شما با موفقیت پردازش شد!")
			} else {
				sendMessage(user.TelegramID, "❌ پرداخت ناموفق بود.")
			}
			return
		}
	}

	// Check result
	if verifiedTransaction.Status == "success" {
		// Final safety check: Verify that transaction update was actually applied
		// VerifyPayment uses atomic update that only works if status is "pending"
		// If RowsAffected was 0, it means another process already processed it
		var finalStatusCheck PaymentTransaction
		if err := db.Where("authority = ?", authority).First(&finalStatusCheck).Error; err == nil {
			if finalStatusCheck.Status != "success" {
				// Transaction status didn't change, meaning it was already processed by another process
				logger.Info("Transaction was already processed by automatic checker, skipping duplicate subscription update",
					zap.String("authority", authority),
					zap.String("final_status", finalStatusCheck.Status))
				sendMessage(user.TelegramID, "✅ پرداخت شما قبلاً توسط سیستم پردازش شده است!")
				// Clear state anyway
				userStates[user.TelegramID] = ""
				return
			}

			// Additional check: Verify subscription wasn't already updated by automatic checker
			var userCheck User
			if err := db.First(&userCheck, user.ID).Error; err == nil {
				if userCheck.HasActiveSubscription() && userCheck.PlanName == verifiedTransaction.Type {
					// Check if subscription expiry matches what we expect (prevent duplicate extension)
					// This is a safety check - in most cases VerifyPayment atomic update prevents this
					logger.Info("Subscription already active with same plan, verifying no duplicate update",
						zap.String("authority", authority),
						zap.Uint("user_id", user.ID))
				}
			}
		}

		// Update user subscription (only if transaction was successfully updated)
		if err := paymentService.UpdateUserSubscription(user.ID, verifiedTransaction.Type); err != nil {
			logger.Error("Failed to update subscription after manual check",
				zap.Uint("user_id", user.ID),
				zap.String("plan_type", verifiedTransaction.Type),
				zap.Error(err))
			sendMessage(user.TelegramID, "⚠️ پرداخت موفق بود اما خطا در به‌روزرسانی اشتراک. لطفا با پشتیبانی تماس بگیرید.")
			return
		}

		// Send success notifications (SMS and Telegram)
		sendPaymentSuccessNotifications(verifiedTransaction)

		// Clear user state
		userStates[user.TelegramID] = ""

		logger.Info("Manual payment check successful",
			zap.String("authority", authority),
			zap.Uint("user_id", user.ID),
			zap.String("plan_type", verifiedTransaction.Type))
	} else {
		sendMessage(user.TelegramID, "⏳ پرداخت شما هنوز در حال پردازش است. لطفا چند دقیقه صبر کنید یا منتظر چک خودکار سیستم باشید (بعد از 3 دقیقه).")
	}
}
