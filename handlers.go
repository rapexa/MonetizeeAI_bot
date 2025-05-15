package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"gorm.io/gorm"
)

var userStates = make(map[int64]string)

type UserState struct {
	IsSubmittingExercise bool
}

func getUserOrCreate(from *tgbotapi.User) *User {
	// First check if user is admin
	var admin Admin
	if err := db.Where("telegram_id = ?", from.ID).First(&admin).Error; err == nil {
		// User is admin, send admin welcome message and return
		msg := tgbotapi.NewMessage(from.ID, "به پنل مدیریت خوش اومدین از دکمه های زیر میتونید به سیستم دسترسی داشته باشید")
		msg.ReplyMarkup = getAdminKeyboard()
		bot.Send(msg)

		// Create or get user record without showing course content
		var user User
		result := db.Where("telegram_id = ?", from.ID).First(&user)
		if result.Error == gorm.ErrRecordNotFound {
			user = User{
				TelegramID:     from.ID,
				Username:       from.UserName,
				FirstName:      from.FirstName,
				LastName:       from.LastName,
				CurrentSession: 1,
			}
			db.Create(&user)
		}
		return &user
	}

	// Handle regular user
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

func processUserInput(input string, user *User) string {
	state, exists := userStates[user.TelegramID]
	if !exists {
		state = ""
		userStates[user.TelegramID] = state
	}

	switch input {
	case "📚 جلسه فعلی":
		return getCurrentSessionInfo(user)
	case "✅ ارسال تمرین":
		userStates[user.TelegramID] = "submitting_exercise"
		msg := tgbotapi.NewMessage(user.TelegramID, "لطفا تمرین خود را برای جلسه فعلی ارسال کنید. پاسخ خود را در پیام بعدی بنویسید.")
		msg.ReplyMarkup = getExerciseSubmissionKeyboard()
		bot.Send(msg)
		return ""
	case "📊 پیشرفت":
		userStates[user.TelegramID] = ""
		return getProgressInfo(user)
	case "❓ راهنما":
		userStates[user.TelegramID] = ""
		return getHelpMessage()
	case "🔙 بازگشت":
		userStates[user.TelegramID] = ""
		msg := tgbotapi.NewMessage(user.TelegramID, "به منوی اصلی بازگشتید.")
		msg.ReplyMarkup = getMainMenuKeyboard()
		bot.Send(msg)
		return ""
	case "💬 چت با هدایتگر":
		userStates[user.TelegramID] = "chat_mode"
		msg := tgbotapi.NewMessage(user.TelegramID, "👋 سلام! من هدایتگر هوشمند دوره هستم. سوال خود را بپرسید تا کمکتان کنم.")
		msg.ReplyMarkup = getChatKeyboard()
		bot.Send(msg)
		return ""
	case "🔚 اتمام مکالمه با هدایتگر":
		userStates[user.TelegramID] = ""
		msg := tgbotapi.NewMessage(user.TelegramID, "مکالمه با هدایتگر به پایان رسید. به منوی اصلی بازگشتید.")
		msg.ReplyMarkup = getMainMenuKeyboard()
		bot.Send(msg)
		return ""
	default:
		if state == "submitting_exercise" {
			userStates[user.TelegramID] = ""
			msg := tgbotapi.NewMessage(user.TelegramID, handleExerciseSubmission(user, input))
			msg.ReplyMarkup = getMainMenuKeyboard()
			bot.Send(msg)
			return ""
		}

		if state == "chat_mode" {
			response := handleChatGPTMessage(user, input)
			msg := tgbotapi.NewMessage(user.TelegramID, response)
			msg.ReplyMarkup = getChatKeyboard()
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

نیاز به کمک بیشتر دارید؟ با پشتیبانی تماس بگیرید.

📞 09121234567
`
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
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("💬 چت با هدایتگر"),
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

func getChatKeyboard() tgbotapi.ReplyKeyboardMarkup {
	keyboard := tgbotapi.NewReplyKeyboard(
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("🔚 اتمام مکالمه با هدایتگر"),
		),
	)
	keyboard.ResizeKeyboard = true
	return keyboard
}

func handleChatGPTMessage(user *User, message string) string {
	// Create the API request
	url := "https://api.openai.com/v1/chat/completions"

	// Prepare the request body
	requestBody := map[string]interface{}{
		"model": "gpt-4.1-2025-04-14",
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "You are a helpful course assistant for MonetizeeAI. Provide clear, concise, and relevant answers to help students with their questions about the course content. Always respond in Persian.",
			},
			{
				"role":    "user",
				"content": message,
			},
		},
		"temperature": 1.0,
		"top_p":       1.0,
	}

	// Convert request body to JSON
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		log.Printf("Error marshaling request: %v", err)
		return "❌ خطا در پردازش درخواست. لطفا دوباره تلاش کنید."
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		log.Printf("Error creating request: %v", err)
		return "❌ خطا در ایجاد درخواست. لطفا دوباره تلاش کنید."
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer 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")

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error sending request: %v", err)
		return "❌ خطا در ارتباط با سرور. لطفا دوباره تلاش کنید."
	}
	defer resp.Body.Close()

	// Read response
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		log.Printf("Error reading response: %v", err)
		return "❌ خطا در خواندن پاسخ. لطفا دوباره تلاش کنید."
	}

	// Log the raw response for debugging
	log.Printf("Raw API response: %s", string(body))

	// Parse response
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		log.Printf("Error unmarshaling response: %v", err)
		return "❌ خطا در پردازش پاسخ. لطفا دوباره تلاش کنید."
	}

	// Check for API errors
	if errObj, ok := result["error"].(map[string]interface{}); ok {
		errMsg := "❌ خطا در دریافت پاسخ"
		if msg, ok := errObj["message"].(string); ok {
			errMsg += ": " + msg
		}
		log.Printf("API Error: %v", errObj)
		return errMsg
	}

	// Check if status is completed
	if status, ok := result["status"].(string); !ok || status != "completed" {
		log.Printf("Invalid status in response: %v", result)
		return "❌ پاسخ ناقص از سرور. لطفا دوباره تلاش کنید."
	}

	// Extract the output array
	output, ok := result["output"].([]interface{})
	if !ok || len(output) == 0 {
		log.Printf("Invalid output in response: %v", result)
		return "❌ پاسخ نامعتبر از سرور. لطفا دوباره تلاش کنید."
	}

	// Get the first output message
	outputMsg, ok := output[0].(map[string]interface{})
	if !ok {
		log.Printf("Invalid output message format: %v", output[0])
		return "❌ خطا در پردازش پیام. لطفا دوباره تلاش کنید."
	}

	// Get the content array
	content, ok := outputMsg["content"].([]interface{})
	if !ok || len(content) == 0 {
		log.Printf("Invalid content in output message: %v", outputMsg)
		return "❌ خطا در پردازش محتوا. لطفا دوباره تلاش کنید."
	}

	// Get the first content item
	contentItem, ok := content[0].(map[string]interface{})
	if !ok {
		log.Printf("Invalid content item format: %v", content[0])
		return "❌ خطا در پردازش محتوا. لطفا دوباره تلاش کنید."
	}

	// Get the text
	text, ok := contentItem["text"].(string)
	if !ok {
		log.Printf("Invalid text format: %v", contentItem)
		return "❌ خطا در پردازش متن. لطفا دوباره تلاش کنید."
	}

	return text
}
