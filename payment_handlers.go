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
	_, paymentURL, err := paymentService.CreatePaymentRequest(user.ID, planType)
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
			"⚠️ *توجه:* پرداخت را در کمتر از 15 دقیقه تکمیل کنید.",
		planName,
		formatPrice(planPrice),
		planPeriod,
		paymentURL)

	msg := tgbotapi.NewMessage(user.TelegramID, paymentText)
	msg.ParseMode = "Markdown"

	// دکمه‌های اینلاین برای پرداخت
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonURL("💳 پرداخت آنلاین", paymentURL),
		),
	)
	msg.ReplyMarkup = keyboard
	bot.Send(msg)

	return ""
}
