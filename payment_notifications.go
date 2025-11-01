package main

import (
	"fmt"

	"MonetizeeAI_bot/logger"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"go.uber.org/zap"
)

// sendPaymentSuccessNotifications sends both Telegram and SMS notifications for successful payments
// This function is called from both payment callback and payment checker
func sendPaymentSuccessNotifications(transaction *PaymentTransaction) {
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

	// ارسال پیام تلگرام
	msg := tgbotapi.NewMessage(int64(user.TelegramID), successMessage)
	msg.ParseMode = "Markdown"
	// Get user from database to pass to getMainMenuKeyboard
	var userForMenu User
	if err := db.First(&userForMenu, transaction.UserID).Error; err == nil {
		msg.ReplyMarkup = getMainMenuKeyboard(&userForMenu)
	}

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
