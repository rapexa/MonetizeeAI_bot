package main

import (
	"fmt"
	"log"
	"strings"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"gorm.io/gorm"
)

func getUserOrCreate(from *tgbotapi.User) *User {
	var user User
	result := db.Where("telegram_id = ?", from.ID).First(&user)
	if result.Error == gorm.ErrRecordNotFound {
		user = User{
			TelegramID: from.ID,
			Username:   from.UserName,
			FirstName:  from.FirstName,
			LastName:   from.LastName,
		}
		db.Create(&user)
	}
	return &user
}

func processUserInput(text string, user *User) string {
	switch text {
	case "📚 Current Session":
		return getCurrentSessionInfo(user)
	case "✅ Submit Exercise":
		return "Please submit your exercise for the current session. Write your answer in the next message."
	case "📊 Progress":
		return getProgressInfo(user)
	case "❓ Help":
		return getHelpMessage()
	default:
		return handleExerciseSubmission(user, text)
	}
}

func getCurrentSessionInfo(user *User) string {
	var session Session
	if err := db.First(&session, user.CurrentSession).Error; err != nil {
		return "Error retrieving session information. Please try again later."
	}

	var video Video
	db.Where("session_id = ?", session.ID).First(&video)

	// Create a message with the session thumbnail
	message := fmt.Sprintf("📚 Session %d: %s\n\n%s\n\n📺 Video: %s",
		session.Number,
		session.Title,
		session.Description,
		video.VideoLink)

	// Send the thumbnail photo with the message
	photo := tgbotapi.NewPhoto(user.TelegramID, tgbotapi.FileURL(session.ThumbnailURL))
	photo.Caption = message
	bot.Send(photo)

	return message
}

func getProgressInfo(user *User) string {
	var completedExercises int64
	db.Model(&Exercise{}).Where("user_id = ? AND status = ?", user.ID, "approved").Count(&completedExercises)

	return fmt.Sprintf("📊 Your Progress:\n\n• Current Session: %d\n• Completed Exercises: %d\n• Active Status: %v",
		user.CurrentSession,
		completedExercises,
		user.IsActive)
}

func getHelpMessage() string {
	return `❓ How to use MonetizeAI Bot:

1. Use the menu buttons to navigate
2. Submit your exercises for review
3. Get feedback and improve your work
4. Progress through the course sessions

Need more help? Contact support.`
}

func handleExerciseSubmission(user *User, content string) string {
	// Create new exercise
	exercise := Exercise{
		UserID:      user.ID,
		SessionID:   uint(user.CurrentSession),
		Content:     content,
		Status:      "approved", // Automatically approve
		Feedback:    "عالی! تمرین شما تایید شد. به جلسه بعدی می‌روید.",
		SubmittedAt: time.Now(),
	}

	// Save exercise
	if err := db.Create(&exercise).Error; err != nil {
		log.Printf("Error saving exercise: %v", err)
		return "متأسفانه در ثبت تمرین مشکلی پیش آمد. لطفاً دوباره تلاش کنید."
	}

	// Move user to next session
	user.CurrentSession++
	if err := db.Save(user).Error; err != nil {
		log.Printf("Error updating user session: %v", err)
		return "تمرین شما ثبت شد، اما در به‌روزرسانی جلسه مشکلی پیش آمد."
	}

	// Get next session info
	var nextSession Session
	if err := db.Where("number = ?", user.CurrentSession).First(&nextSession).Error; err != nil {
		log.Printf("Error getting next session: %v", err)
		return "تمرین شما با موفقیت ثبت شد و به جلسه بعدی منتقل شدید."
	}

	return fmt.Sprintf("🎉 تمرین شما با موفقیت ثبت شد!\n\n📚 جلسه بعدی شما:\n%s\n\n%s", nextSession.Title, nextSession.Description)
}

// sendMessage is a helper function to send messages
func sendMessage(chatID int64, text string) {
	msg := tgbotapi.NewMessage(chatID, text)
	bot.Send(msg)
}

func getAdminKeyboard() tgbotapi.ReplyKeyboardMarkup {
	keyboard := tgbotapi.NewReplyKeyboard(
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("📊 آمار سیستم"),
			tgbotapi.NewKeyboardButton("💾 پشتیبان‌گیری"),
		),
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("👥 مدیریت کاربران"),
			tgbotapi.NewKeyboardButton("📚 مدیریت جلسات"),
		),
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("🎥 مدیریت ویدیوها"),
			tgbotapi.NewKeyboardButton("📝 لاگ‌های سیستم"),
		),
	)
	keyboard.ResizeKeyboard = true
	return keyboard
}

func getActionKeyboard(itemType string, itemID uint) tgbotapi.InlineKeyboardMarkup {
	var keyboard tgbotapi.InlineKeyboardMarkup

	switch itemType {
	case "user":
		keyboard = tgbotapi.NewInlineKeyboardMarkup(
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("🚫 مسدود کردن", fmt.Sprintf("ban_%d", itemID)),
				tgbotapi.NewInlineKeyboardButtonData("✅ آزاد کردن", fmt.Sprintf("unban_%d", itemID)),
			),
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("📊 جزئیات", fmt.Sprintf("details_%d", itemID)),
				tgbotapi.NewInlineKeyboardButtonData("❌ حذف", fmt.Sprintf("delete_%d", itemID)),
			),
		)
	case "session":
		keyboard = tgbotapi.NewInlineKeyboardMarkup(
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("✏️ ویرایش", fmt.Sprintf("edit_%d", itemID)),
				tgbotapi.NewInlineKeyboardButtonData("❌ حذف", fmt.Sprintf("delete_%d", itemID)),
			),
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("📊 آمار", fmt.Sprintf("stats_%d", itemID)),
				tgbotapi.NewInlineKeyboardButtonData("🎥 ویدیوها", fmt.Sprintf("videos_%d", itemID)),
			),
		)
	case "video":
		keyboard = tgbotapi.NewInlineKeyboardMarkup(
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("✏️ ویرایش", fmt.Sprintf("edit_%d", itemID)),
				tgbotapi.NewInlineKeyboardButtonData("❌ حذف", fmt.Sprintf("delete_%d", itemID)),
			),
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("📊 آمار", fmt.Sprintf("stats_%d", itemID)),
				tgbotapi.NewInlineKeyboardButtonData("🔗 لینک", fmt.Sprintf("link_%d", itemID)),
			),
		)
	}

	return keyboard
}

func handleMessage(update *tgbotapi.Update) {
	// Check if user is admin
	if isAdmin(update.Message.From.ID) {
		admin := getAdmin(update.Message.From.ID)
		if admin == nil {
			sendMessage(update.Message.Chat.ID, "❌ خطا در دریافت اطلاعات ادمین")
			return
		}

		// Handle admin commands
		if update.Message.IsCommand() {
			switch update.Message.Command() {
			case "start":
				msg := tgbotapi.NewMessage(update.Message.Chat.ID, "👋 به پنل مدیریت خوش آمدید!\n\nاز منوی زیر برای مدیریت سیستم استفاده کنید:")
				msg.ReplyMarkup = getAdminKeyboard()
				bot.Send(msg)
				return
			default:
				args := strings.Fields(update.Message.CommandArguments())
				response := handleAdminCommand(admin, "/"+update.Message.Command(), args)
				sendMessage(update.Message.Chat.ID, response)
				return
			}
		}

		// Handle admin menu buttons
		switch update.Message.Text {
		case "📊 آمار سیستم":
			response := handleAdminStats(admin, []string{})
			sendMessage(update.Message.Chat.ID, response)
			return
		case "👥 مدیریت کاربران":
			response := handleAdminUsers(admin, []string{})
			sendMessage(update.Message.Chat.ID, response)
			return
		case "📚 مدیریت جلسات":
			response := handleAdminSessions(admin, []string{})
			sendMessage(update.Message.Chat.ID, response)
			return
		case "🎥 مدیریت ویدیوها":
			response := handleAdminVideos(admin, []string{})
			sendMessage(update.Message.Chat.ID, response)
			return
		case "💾 پشتیبان‌گیری":
			response := handleAdminBackup(admin, []string{})
			sendMessage(update.Message.Chat.ID, response)
			return
		case "📝 لاگ‌های سیستم":
			response := handleAdminLogs(admin, []string{})
			sendMessage(update.Message.Chat.ID, response)
			return
		}

		// Send admin keyboard if no command matched
		msg := tgbotapi.NewMessage(update.Message.Chat.ID, "منوی ادمین:")
		msg.ReplyMarkup = getAdminKeyboard()
		bot.Send(msg)
		return
	}

	// Handle regular user commands
	user := getUserOrCreate(update.Message.From)

	// Handle commands
	if update.Message.IsCommand() {
		switch update.Message.Command() {
		case "start":
			msg := tgbotapi.NewMessage(update.Message.Chat.ID, "Welcome to MonetizeAI! I'm your AI assistant for the course. Let's begin your journey to building a successful AI-powered business.")
			msg.ReplyMarkup = getMainMenuKeyboard()
			bot.Send(msg)
			return
		case "help":
			sendMessage(update.Message.Chat.ID, "I'm here to help you with your MonetizeAI course journey. Use the menu buttons to navigate through the course.")
			return
		}
	}

	// Handle regular messages
	response := processUserInput(update.Message.Text, user)
	sendMessage(update.Message.Chat.ID, response)
}
