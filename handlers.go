package main

import (
	"fmt"
	"log"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"gorm.io/gorm"
)

var userStates = make(map[int64]*UserState)

type UserState struct {
	IsSubmittingExercise bool
}

func getUserOrCreate(from *tgbotapi.User) *User {
	var user User
	result := db.Where("telegram_id = ?", from.ID).First(&user)
	if result.Error == gorm.ErrRecordNotFound {
		// Create new user
		user = User{
			TelegramID:     from.ID,
			Username:       from.UserName,
			FirstName:      from.FirstName,
			LastName:       from.LastName,
			CurrentSession: 1, // Set initial session to 1
		}
		db.Create(&user)

		// Send session 1 info for new users
		var session Session
		if err := db.Where("number = ?", 1).First(&session).Error; err == nil {
			var video Video
			db.Where("session_id = ?", session.ID).First(&video)

			// Create session message
			sessionMsg := fmt.Sprintf("📚 جلسه %d: %s\n\n%s\n\n📺 ویدیو: %s",
				session.Number,
				session.Title,
				session.Description,
				video.VideoLink)

			// Send session thumbnail with message
			if session.ThumbnailURL != "" {
				photo := tgbotapi.NewPhoto(from.ID, tgbotapi.FileURL(session.ThumbnailURL))
				photo.Caption = sessionMsg
				bot.Send(photo)
			} else {
				// If no thumbnail, just send the message
				bot.Send(tgbotapi.NewMessage(from.ID, sessionMsg))
			}
		}
	}
	return &user
}

func processUserInput(text string, user *User) string {
	state, exists := userStates[user.TelegramID]
	if !exists {
		state = &UserState{}
		userStates[user.TelegramID] = state
	}

	switch text {
	case "📚 جلسه فعلی":
		return getCurrentSessionInfo(user)
	case "✅ ارسال تمرین":
		state.IsSubmittingExercise = true
		msg := tgbotapi.NewMessage(user.TelegramID, "لطفا تمرین خود را برای جلسه فعلی ارسال کنید. پاسخ خود را در پیام بعدی بنویسید.")
		msg.ReplyMarkup = getExerciseSubmissionKeyboard()
		bot.Send(msg)
		return ""
	case "📊 پیشرفت":
		state.IsSubmittingExercise = false
		return getProgressInfo(user)
	case "❓ راهنما":
		state.IsSubmittingExercise = false
		return getHelpMessage()
	case "🔙 بازگشت":
		state.IsSubmittingExercise = false
		msg := tgbotapi.NewMessage(user.TelegramID, "به منوی اصلی بازگشتید.")
		msg.ReplyMarkup = getMainMenuKeyboard()
		bot.Send(msg)
		return ""
	default:
		if state.IsSubmittingExercise {
			state.IsSubmittingExercise = false
			msg := tgbotapi.NewMessage(user.TelegramID, handleExerciseSubmission(user, text))
			msg.ReplyMarkup = getMainMenuKeyboard()
			bot.Send(msg)
			return ""
		}
		return "لطفا از دکمه‌های منو استفاده کنید."
	}
}

func getCurrentSessionInfo(user *User) string {
	var session Session
	if err := db.First(&session, user.CurrentSession).Error; err != nil {
		return "خطا در دریافت اطلاعات جلسه. لطفا دوباره تلاش کنید."
	}

	var video Video
	db.Where("session_id = ?", session.ID).First(&video)

	// Create a message with the session thumbnail
	message := fmt.Sprintf("📚 جلسه %d: %s\n\n%s\n\n📺 ویدیو: %s",
		session.Number,
		session.Title,
		session.Description,
		video.VideoLink)

	// Send the thumbnail photo with the message
	photo := tgbotapi.NewPhoto(user.TelegramID, tgbotapi.FileURL(session.ThumbnailURL))
	photo.Caption = message
	bot.Send(photo)

	// Send instruction message
	instructionMsg := "بعد از ارسال تکالیف این جلسه و ارسال تمرین و بررسی جواب شما به ویدیو بعدی منتقل خواهید شد"
	bot.Send(tgbotapi.NewMessage(user.TelegramID, instructionMsg))

	return "" // Return empty string since we're sending the messages directly
}

func getProgressInfo(user *User) string {
	var completedExercises int64
	db.Model(&Exercise{}).Where("user_id = ? AND status = ?", user.ID, "approved").Count(&completedExercises)

	return fmt.Sprintf("📊 پیشرفت شما:\n\n• جلسه فعلی: %d\n• تمرین‌های تکمیل شده: %d\n• وضعیت فعال: %v",
		user.CurrentSession,
		completedExercises,
		user.IsActive)
}

func getHelpMessage() string {
	return `❓ راهنمای استفاده از ربات MonetizeAI:

1. از دکمه‌های منو برای پیمایش استفاده کنید
2. تمرین‌های خود را برای بررسی ارسال کنید
3. بازخورد دریافت کنید و کار خود را بهبود دهید
4. در جلسات دوره پیشرفت کنید

نیاز به کمک بیشتر دارید؟ با پشتیبانی تماس بگیرید.`
}

func handleExerciseSubmission(user *User, content string) string {
	// Create new exercise
	exercise := Exercise{
		UserID:      user.ID,
		SessionID:   uint(user.CurrentSession),
		Content:     content,
		Status:      "approved", // Automatically approve
		Feedback:    "عالی! تمرین شما تایید شد. به جلسه بعدی منتقل خواهید شد.",
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

func getMainMenuKeyboard() tgbotapi.ReplyKeyboardMarkup {
	keyboard := tgbotapi.NewReplyKeyboard(
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("📚 جلسه فعلی"),
			tgbotapi.NewKeyboardButton("✅ ارسال تمرین"),
		),
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("📊 پیشرفت"),
			tgbotapi.NewKeyboardButton("❓ راهنما"),
		),
	)
	keyboard.ResizeKeyboard = true
	return keyboard
}

func getExerciseSubmissionKeyboard() tgbotapi.ReplyKeyboardMarkup {
	keyboard := tgbotapi.NewReplyKeyboard(
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("🔙 بازگشت"),
		),
	)
	keyboard.ResizeKeyboard = true
	return keyboard
}
