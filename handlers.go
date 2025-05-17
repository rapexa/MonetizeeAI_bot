package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strings"
	"time"

	"MonetizeeAI_bot/logger"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"go.uber.org/zap"
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

📞 ` + SUPPORT_NUMBER + `
`
}

func handleExerciseSubmission(user *User, content string) string {
	// Get current session info
	var session Session
	if err := db.Where("number = ?", user.CurrentSession).First(&session).Error; err != nil {
		logger.Error("Failed to get session",
			zap.Int64("user_id", user.TelegramID),
			zap.Int("session_number", user.CurrentSession),
			zap.Error(err))
		return "❌ خطا در دریافت اطلاعات جلسه. لطفا دوباره تلاش کنید."
	}

	var video Video
	if err := db.Where("session_id = ?", session.ID).First(&video).Error; err != nil {
		logger.Error("Failed to get video",
			zap.Int64("user_id", user.TelegramID),
			zap.Uint("session_id", session.ID),
			zap.Error(err))
		return "❌ خطا در دریافت اطلاعات ویدیو. لطفا دوباره تلاش کنید."
	}

	// Prepare context for ChatGPT
	context := fmt.Sprintf(`Session Title: %s
Session Description: %s
Video Title: %s
Video Description: %s

Student's Exercise Submission:
%s

Please evaluate this exercise submission according to these criteria:
1. Check if the answer aligns with the session's learning objectives
2. If the answer is incomplete or incorrect:
   - Provide specific feedback on what's missing
   - Give helpful hints and examples
   - Guide them to improve their answer
3. If the answer is good:
   - Provide positive reinforcement
   - Give permission to move to next session
4. Keep the tone friendly and encouraging
5. Respond in Persian

Format your response as:
APPROVED: [yes/no]
FEEDBACK: [your detailed feedback]`,
		session.Title,
		session.Description,
		video.Title,
		video.Description,
		content)

	// Get evaluation from ChatGPT
	evaluation := handleChatGPTMessage(user, context)

	// Parse the response
	var approved bool
	var feedback string

	// Split the response into lines
	lines := strings.Split(evaluation, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "APPROVED:") {
			approved = strings.Contains(strings.ToLower(line), "yes")
		} else if strings.HasPrefix(line, "FEEDBACK:") {
			feedback = strings.TrimSpace(strings.TrimPrefix(line, "FEEDBACK:"))
		}
	}

	// If feedback is empty, provide default feedback
	if feedback == "" {
		if approved {
			feedback = "عالی! تمرین شما با موفقیت انجام شد و نشان می‌دهد که مفاهیم را به خوبی درک کرده‌اید."
		} else {
			feedback = "تمرین شما نیاز به بهبود دارد. لطفا موارد زیر را در نظر بگیرید:\n\n" +
				"1. آیا تمام نکات مهم جلسه را در نظر گرفته‌اید؟\n" +
				"2. آیا پاسخ شما با اهداف یادگیری جلسه همخوانی دارد؟\n" +
				"3. آیا می‌توانید جزئیات بیشتری به پاسخ خود اضافه کنید؟\n\n" +
				"لطفا با توجه به این نکات، تمرین خود را اصلاح کنید."
		}
	}

	// Create exercise record
	exercise := Exercise{
		UserID:      user.ID,
		SessionID:   uint(user.CurrentSession),
		Content:     content,
		Status:      "pending",
		Feedback:    feedback,
		SubmittedAt: time.Now(),
	}

	// Save exercise
	if err := db.Create(&exercise).Error; err != nil {
		logger.Error("Failed to save exercise",
			zap.Int64("user_id", user.TelegramID),
			zap.Uint("session_id", session.ID),
			zap.Error(err))
		return "❌ خطا در ثبت تمرین. لطفا دوباره تلاش کنید."
	}

	if approved {
		// Move user to next session
		user.CurrentSession++
		if err := db.Save(user).Error; err != nil {
			logger.Error("Failed to update user session",
				zap.Int64("user_id", user.TelegramID),
				zap.Int("new_session", user.CurrentSession),
				zap.Error(err))
			return "❌ خطا در به‌روزرسانی جلسه. لطفا دوباره تلاش کنید."
		}

		// Get next session info
		var nextSession Session
		if err := db.Where("number = ?", user.CurrentSession).First(&nextSession).Error; err != nil {
			logger.Error("Failed to get next session",
				zap.Int64("user_id", user.TelegramID),
				zap.Int("session_number", user.CurrentSession),
				zap.Error(err))
			return fmt.Sprintf("🎉 %s\n\nبه جلسه بعدی منتقل شدید!", feedback)
		}

		logger.Info("User moved to next session",
			zap.Int64("user_id", user.TelegramID),
			zap.Int("old_session", user.CurrentSession-1),
			zap.Int("new_session", user.CurrentSession))

		return fmt.Sprintf("🎉 %s\n\n📚 جلسه بعدی شما:\n%s\n\n%s",
			feedback,
			nextSession.Title,
			nextSession.Description)
	}

	// If not approved, return feedback for improvement
	logger.Info("Exercise needs improvement",
		zap.Int64("user_id", user.TelegramID),
		zap.Uint("session_id", session.ID),
		zap.Bool("approved", approved))

	return fmt.Sprintf("📝 %s\n\nلطفا با توجه به راهنمایی‌های بالا، تمرین خود را اصلاح کنید و دوباره ارسال کنید.", feedback)
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
		logger.Error("Failed to marshal request",
			zap.Int64("user_id", user.TelegramID),
			zap.Error(err))
		return "❌ خطا در پردازش درخواست. لطفا دوباره تلاش کنید."
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		logger.Error("Failed to create request",
			zap.Int64("user_id", user.TelegramID),
			zap.Error(err))
		return "❌ خطا در ایجاد درخواست. لطفا دوباره تلاش کنید."
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+os.Getenv("OPENAI_API_KEY"))

	// Send request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		logger.Error("Failed to send request",
			zap.Int64("user_id", user.TelegramID),
			zap.Error(err))
		return "❌ خطا در ارتباط با سرور. لطفا دوباره تلاش کنید."
	}
	defer resp.Body.Close()

	// Read response
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		logger.Error("Failed to read response",
			zap.Int64("user_id", user.TelegramID),
			zap.Error(err))
		return "❌ خطا در خواندن پاسخ. لطفا دوباره تلاش کنید."
	}

	// Log the raw response for debugging
	logger.Debug("Raw API response",
		zap.Int64("user_id", user.TelegramID),
		zap.String("response", string(body)))

	// Parse response
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		logger.Error("Failed to unmarshal response",
			zap.Int64("user_id", user.TelegramID),
			zap.Error(err))
		return "❌ خطا در پردازش پاسخ. لطفا دوباره تلاش کنید."
	}

	// Check for API errors
	if errObj, ok := result["error"].(map[string]interface{}); ok {
		errMsg := "❌ خطا در دریافت پاسخ"
		if msg, ok := errObj["message"].(string); ok {
			errMsg += ": " + msg
		}
		logger.Error("API Error",
			zap.Int64("user_id", user.TelegramID),
			zap.Any("error", errObj))
		return errMsg
	}

	// Extract the choices array
	choices, ok := result["choices"].([]interface{})
	if !ok || len(choices) == 0 {
		logger.Error("Invalid choices in response",
			zap.Int64("user_id", user.TelegramID),
			zap.Any("result", result))
		return "❌ پاسخ نامعتبر از سرور. لطفا دوباره تلاش کنید."
	}

	// Get the first choice
	choice, ok := choices[0].(map[string]interface{})
	if !ok {
		logger.Error("Invalid choice format",
			zap.Int64("user_id", user.TelegramID),
			zap.Any("choice", choices[0]))
		return "❌ خطا در پردازش پاسخ. لطفا دوباره تلاش کنید."
	}

	// Get the message
	messageObj, ok := choice["message"].(map[string]interface{})
	if !ok {
		logger.Error("Invalid message format",
			zap.Int64("user_id", user.TelegramID),
			zap.Any("choice", choice))
		return "❌ خطا در پردازش پیام. لطفا دوباره تلاش کنید."
	}

	// Get the content
	content, ok := messageObj["content"].(string)
	if !ok {
		logger.Error("Invalid content format",
			zap.Int64("user_id", user.TelegramID),
			zap.Any("message", messageObj))
		return "❌ خطا در پردازش محتوا. لطفا دوباره تلاش کنید."
	}

	return content
}
