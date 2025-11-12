package main

import (
	"fmt"

	"MonetizeeAI_bot/logger"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"go.uber.org/zap"
)

const (
	// 📢 Required Channel
	RequiredChannelID       = -1001538785363
	RequiredChannelUsername = "@hoseinabasiian"
	RequiredChannelName     = "حسین عباسیان | دیجیتال مارکتینگ"
)

// checkChannelMembership checks if user is member of required channel
func checkChannelMembership(telegramID int64) bool {
	config := tgbotapi.GetChatMemberConfig{
		ChatConfigWithUser: tgbotapi.ChatConfigWithUser{
			ChatID: RequiredChannelID,
			UserID: telegramID,
		},
	}

	member, err := bot.GetChatMember(config)
	if err != nil {
		logger.Error("Failed to check channel membership",
			zap.Int64("user_id", telegramID),
			zap.Int64("channel_id", RequiredChannelID),
			zap.Error(err))
		return false
	}

	// Check if user is member, administrator, or creator
	status := member.Status
	isMember := status == "member" || status == "administrator" || status == "creator"

	logger.Info("Channel membership check",
		zap.Int64("user_id", telegramID),
		zap.String("status", status),
		zap.Bool("is_member", isMember))

	return isMember
}

// sendJoinChannelMessage sends a message asking user to join channel
func sendJoinChannelMessage(telegramID int64) {
	message := fmt.Sprintf(`🔔 برای استفاده از ربات MonetizeAI، ابتدا باید عضو کانال ما شوید:

📢 کانال: %s
🔗 لینک: https://t.me/%s

پس از عضویت، روی دکمه «✅ عضو شدم» کلیک کنید.`,
		RequiredChannelName,
		RequiredChannelUsername[1:]) // Remove @ from username

	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonURL(
				"📢 عضویت در کانال",
				fmt.Sprintf("https://t.me/%s", RequiredChannelUsername[1:]),
			),
		),
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData(
				"✅ عضو شدم - ادامه",
				"check_membership",
			),
		),
	)

	msg := tgbotapi.NewMessage(telegramID, message)
	msg.ReplyMarkup = keyboard
	msg.ParseMode = "HTML"

	if _, err := bot.Send(msg); err != nil {
		logger.Error("Failed to send join channel message",
			zap.Int64("user_id", telegramID),
			zap.Error(err))
	}
}

// handleMembershipCheckCallback handles the "check membership" callback
func handleMembershipCheckCallback(callbackQuery *tgbotapi.CallbackQuery) {
	telegramID := callbackQuery.From.ID

	// Check membership
	if !checkChannelMembership(telegramID) {
		// Still not a member
		answerCallback := tgbotapi.NewCallback(
			callbackQuery.ID,
			"❌ هنوز عضو کانال نشدید! لطفا ابتدا عضو شوید.",
		)
		bot.Request(answerCallback)

		// Send message again
		sendJoinChannelMessage(telegramID)
		return
	}

	// User is now a member!
	answerCallback := tgbotapi.NewCallback(
		callbackQuery.ID,
		"✅ عضویت شما تایید شد!",
	)
	bot.Request(answerCallback)

	// Delete the join message
	deleteMsg := tgbotapi.NewDeleteMessage(
		callbackQuery.Message.Chat.ID,
		callbackQuery.Message.MessageID,
	)
	bot.Request(deleteMsg)

	// Find or create user
	var user User
	result := db.Where("telegram_id = ?", telegramID).First(&user)

	if result.Error != nil {
		// New user - just verify they joined, don't start registration yet
		logger.Info("New user verified channel membership",
			zap.Int64("telegram_id", telegramID),
			zap.String("username", callbackQuery.From.UserName))

		msg := tgbotapi.NewMessage(telegramID, `✅ عضویت شما تایید شد!

🎉 خوش آمدید به MonetizeAI

برای شروع، دستور /start را ارسال کنید.`)
		bot.Send(msg)
	} else {
		// Existing user
		logger.Info("Existing user verified channel membership",
			zap.Int64("telegram_id", telegramID))

		msg := tgbotapi.NewMessage(telegramID, `✅ عضویت شما تایید شد!

🎉 خوش برگشتید

برای ادامه، دستور /start را ارسال کنید.`)
		bot.Send(msg)
	}
}

// checkChannelMembershipAPI checks channel membership for API calls
// Returns error message if not a member, empty string if member
func checkChannelMembershipAPI(telegramID int64) string {
	if !checkChannelMembership(telegramID) {
		return fmt.Sprintf("شما برای استفاده از این قابلیت باید عضو کانال ما شوید:\n\n📢 کانال: %s\n🔗 https://t.me/%s",
			RequiredChannelName,
			RequiredChannelUsername[1:])
	}
	return ""
}
