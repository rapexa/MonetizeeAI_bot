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
			args := strings.Fields(update.Message.CommandArguments())
			response := handleAdminCommand(admin, "/"+update.Message.Command(), args)
			sendMessage(update.Message.Chat.ID, response)
			return
		}
	}

	// Handle regular user commands
	user := getUserOrCreate(update.Message.From)
	response := processUserInput(update.Message.Text, user)
	sendMessage(update.Message.Chat.ID, response)
}
