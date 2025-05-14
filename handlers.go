package main

import (
	"fmt"
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
		return handleExerciseSubmission(text, user)
	}
}

func getCurrentSessionInfo(user *User) string {
	var session Session
	if err := db.First(&session, user.CurrentSession).Error; err != nil {
		return "Error retrieving session information. Please try again later."
	}

	var video Video
	db.Where("session_id = ?", session.ID).First(&video)

	return fmt.Sprintf("📚 Session %d: %s\n\n%s\n\n📺 Video: %s",
		session.Number,
		session.Title,
		session.Description,
		video.VideoLink)
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

func handleExerciseSubmission(text string, user *User) string {
	// Create new exercise submission
	exercise := Exercise{
		UserID:      user.ID,
		SessionID:   uint(user.CurrentSession),
		Content:     text,
		SubmittedAt: time.Now(),
		Status:      "pending",
	}

	if err := db.Create(&exercise).Error; err != nil {
		return "Error submitting your exercise. Please try again."
	}

	// TODO: Implement OpenAI API integration for exercise review
	// For now, return a simple acknowledgment
	return "✅ Your exercise has been submitted! I'll review it and provide feedback soon."
} 