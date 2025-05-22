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

const (
	StateWaitingForLicense = "waiting_for_license"
	StateWaitingForName    = "waiting_for_name"
	StateWaitingForPhone   = "waiting_for_phone"
)

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
				IsVerified:     true, // Admins are automatically verified
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
			CurrentSession: 1,
			IsVerified:     false,
		}
		db.Create(&user)

		// Set state to wait for license
		userStates[user.TelegramID] = StateWaitingForLicense

		// Send voice message with caption
		voice := tgbotapi.NewVoice(update.Message.Chat.ID, tgbotapi.FileURL("http://quantnano.ir/wp-content/uploads/2025/05/جلسه-صفر.mp3"))
		voice.Caption = "🧠 این ویس رو با دقت گوش بده؛ اینجا نقطه شروع یه مسیر جدیه…\n\n👇 بعد از گوش دادن، برو سراغ مرحله ۱\nجایی که اولین قدم مسیر درآمد دلاری با هوش مصنوعی رو برمی‌داری 🚀"
		bot.Send(voice)

		// Send license request message
		msg := tgbotapi.NewMessage(user.TelegramID, "👋 به ربات MONETIZE AI🥇 خوش آمدید!\n\nلطفا لایسنس خود را وارد کنید:")
		bot.Send(msg)
		return &user
	}

	// If user exists but not verified, ask for license
	if !user.IsVerified {
		userStates[user.TelegramID] = StateWaitingForLicense
		msg := tgbotapi.NewMessage(user.TelegramID, "لطفا لایسنس خود را وارد کنید:")
		bot.Send(msg)
		return &user
	}

	return &user
}

func processUserInput(input string, user *User) string {
	state, exists := userStates[user.TelegramID]
	if !exists {
		state = ""
		userStates[user.TelegramID] = state
	}

	// Handle retry button for unverified users
	if !user.IsVerified && input == "🔄 ارسال لایسنس" {
		userStates[user.TelegramID] = StateWaitingForLicense
		msg := tgbotapi.NewMessage(user.TelegramID, "لطفا لایسنس خود را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.NewRemoveKeyboard(true)
		bot.Send(msg)
		return ""
	}

	// Block all access if not verified and not in the process of verification
	if !user.IsVerified && state == "" {
		msg := tgbotapi.NewMessage(user.TelegramID, "⛔️ دسترسی شما هنوز تایید نشده است. لطفا لایسنس خود را وارد کنید یا منتظر تایید ادمین باشید.")
		msg.ReplyMarkup = getUnverifiedRetryKeyboard()
		bot.Send(msg)
		return ""
	}

	switch state {
	case StateWaitingForLicense:
		if strings.TrimSpace(input) == "" {
			return ""
		}
		// License must be 64 characters (adjust if needed)
		if len(input) != 64 {
			msg := tgbotapi.NewMessage(user.TelegramID, "لطفا فقط کد لایسنس معتبر را کپی کنید و  وارد کنید.")
			bot.Send(msg)
			return ""
		}
		if input == "5a7474e6746067c57382ac1727a400fa65b7398a3774c3b19272916549c93a8d" {
			user.License = input
			userStates[user.TelegramID] = StateWaitingForName
			msg := tgbotapi.NewMessage(user.TelegramID, "✅ لایسنس معتبر است.\n\nلطفا نام و نام خانوادگی خود را وارد کنید:")
			bot.Send(msg)
			return ""
		} else {
			msg := tgbotapi.NewMessage(user.TelegramID, "✅ از منو پایین: لطفا روی گزینه ارسال لایسنس کلیک کنید.")
			bot.Send(msg)
			return ""
		}

	case StateWaitingForName:
		names := strings.Split(input, " ")
		if len(names) < 2 {
			msg := tgbotapi.NewMessage(user.TelegramID, "❌ لطفا نام و نام خانوادگی را با فاصله وارد کنید:")
			bot.Send(msg)
			return ""
		}
		firstName := names[0]
		lastName := strings.Join(names[1:], " ")
		user.FirstName = firstName
		user.LastName = lastName
		db.Save(user)
		userStates[user.TelegramID] = StateWaitingForPhone
		msg := tgbotapi.NewMessage(user.TelegramID, "لطفا شماره موبایل خود را وارد کنید:")
		bot.Send(msg)
		return ""
	case StateWaitingForPhone:
		// Save phone number
		user.License = user.License // keep license
		userStates[user.TelegramID] = ""
		user.Phone = input
		db.Save(user)
		// Create verification request
		verification := LicenseVerification{
			UserID:    user.ID,
			License:   user.License,
			FirstName: user.FirstName,
			LastName:  user.LastName,
		}
		if err := db.Create(&verification).Error; err != nil {
			logger.Error("Failed to create license verification",
				zap.Int64("user_id", user.TelegramID),
				zap.Error(err))
			msg := tgbotapi.NewMessage(user.TelegramID, "❌ خطا در ثبت اطلاعات. لطفا دوباره تلاش کنید.")
			bot.Send(msg)
			return ""
		}
		// Notify admins
		var admins []Admin
		db.Find(&admins)
		for _, admin := range admins {
			adminMsg := fmt.Sprintf("🔔 درخواست تایید لایسنس جدید:\n\n👤 کاربر: %s\n📱 آیدی: %d\n📝 نام: %s %s\n📞 موبایل: %s\n🔑 لایسنس: %s",
				user.Username,
				user.TelegramID,
				user.FirstName,
				user.LastName,
				user.Phone,
				user.License)
			keyboard := tgbotapi.NewInlineKeyboardMarkup(
				tgbotapi.NewInlineKeyboardRow(
					tgbotapi.NewInlineKeyboardButtonData("✅ تایید", fmt.Sprintf("verify:%d", verification.ID)),
					tgbotapi.NewInlineKeyboardButtonData("❌ رد", fmt.Sprintf("reject:%d", verification.ID)),
				),
			)
			msg := tgbotapi.NewMessage(admin.TelegramID, adminMsg)
			msg.ReplyMarkup = keyboard
			bot.Send(msg)
		}
		msg := tgbotapi.NewMessage(user.TelegramID, "✅ اطلاعات شما با موفقیت ثبت شد.\n\n⏳ لطفا منتظر تایید ادمین باشید.")
		bot.Send(msg)
		return ""
	}

	// If not verified, block all other actions
	if !user.IsVerified {
		msg := tgbotapi.NewMessage(user.TelegramID, "⏳ لطفا منتظر تایید ادمین باشید. دسترسی شما هنوز فعال نشده است.")
		bot.Send(msg)
		return ""
	}

	// Handle other states and commands
	switch input {
	case "📚 ادامه مسیر من":
		return getCurrentSessionInfo(user)
	case "✅ ارسال تمرین":
		userStates[user.TelegramID] = "submitting_exercise"
		msg := tgbotapi.NewMessage(user.TelegramID, "لطفا تمرین خود را برای مرحله فعلی ارسال کنید. پاسخ خود را در پیام بعدی بنویسید.")
		msg.ReplyMarkup = getExerciseSubmissionKeyboard()
		bot.Send(msg)
		return ""
	case "📥 دریافت تمرین":
		// Get current session info
		var session Session
		if err := db.Where("number = ?", user.CurrentSession).First(&session).Error; err != nil {
			logger.Error("Failed to get session",
				zap.Int64("user_id", user.TelegramID),
				zap.Int("session_number", user.CurrentSession),
				zap.Error(err))
			return "❌ خطا در دریافت اطلاعات مرحله. لطفا دوباره تلاش کنید."
		}

		// Get exercise files for the current session
		var exercise Exercise
		if err := db.Where("session_id = ?", session.ID).First(&exercise).Error; err != nil {
			logger.Error("Failed to get exercise",
				zap.Int64("user_id", user.TelegramID),
				zap.Uint("session_id", session.ID),
				zap.Error(err))
			return "❌ خطا در دریافت تمرین. لطفا دوباره تلاش کنید."
		}

		// Send PDF file if available
		if exercise.PDFFile != "" {
			// Check if the PDFFile is a URL
			if strings.HasPrefix(exercise.PDFFile, "http://") || strings.HasPrefix(exercise.PDFFile, "https://") {
				// Send PDF file using URL
				file := tgbotapi.NewDocument(user.TelegramID, tgbotapi.FileURL(exercise.PDFFile))
				file.Caption = fmt.Sprintf("📄 تمرین مرحله %d: %s", session.Number, session.Title)
				bot.Send(file)
			} else {
				// Try sending as FileID (for backward compatibility)
				file := tgbotapi.NewDocument(user.TelegramID, tgbotapi.FileID(exercise.PDFFile))
				file.Caption = fmt.Sprintf("📄 تمرین مرحله %d: %s", session.Number, session.Title)
				bot.Send(file)
			}
		}

		// Send exercise text
		exerciseMsg := fmt.Sprintf("📝 تمرین مرحله %d: %s\n\n%s",
			session.Number,
			session.Title,
			exercise.Content)
		bot.Send(tgbotapi.NewMessage(user.TelegramID, exerciseMsg))
		return ""
	case "📊 پیشرفت":
		userStates[user.TelegramID] = ""
		return getProgressInfo(user)
	case "❇️ دیدن همه مسیر":
		userStates[user.TelegramID] = ""
		return getFullRoadmap(user)
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
	case "🛍️ خرید اشتراک هوش مصنوعی":
		msg := tgbotapi.NewMessage(user.TelegramID, "برای خرید اکانت GPT به لینک پایین مراجعه کنید:\n\n💻 "+BUY_GPT_LINK)
		bot.Send(msg)
		return ""
	case "🎯 استخدام":
		// Check if user has completed all sessions
		if user.CurrentSession >= 29 {
			msg := tgbotapi.NewMessage(user.TelegramID, "🎉 تبریک! شما به پایان دوره رسیده‌اید!\n\nبرای استخدام به لینک زیر مراجعه کنید :\n\n🎁 "+START_REFFER)
			bot.Send(msg)
		} else {
			msg := tgbotapi.NewMessage(user.TelegramID, "🔒 این گزینه پس از گذروندن تمام مراحل دوره برای شما فعال خواهد شد.\n\nبرای دسترسی به این بخش، لطفا تمام مراحل را با موفقیت پشت سر بگذارید.")
			bot.Send(msg)
		}
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
		return "خطا در دریافت اطلاعات مرحله فعلی. لطفا دوباره تلاش کنید."
	}

	var video Video
	db.Where("session_id = ?", session.ID).First(&video)

	// Create a message with the session thumbnail
	message := fmt.Sprintf("📚 %d: %s\n\n%s\n\n📺 ویدیو: %s",
		session.Number,
		session.Title,
		session.Description,
		video.VideoLink)

	// Send the thumbnail photo with the message
	photo := tgbotapi.NewPhoto(user.TelegramID, tgbotapi.FileURL(session.ThumbnailURL))
	photo.Caption = message
	bot.Send(photo)

	// Check if this is the last video (session 29)
	if session.Number == 29 {
		// Send congratulatory message
		congratsMsg := "🎉 تبریک! شما به پایان دوره رسیده‌اید!\n\n" +
			"شما تمام ۲۹ ویدیوی دوره را با موفقیت مشاهده کرده‌اید. این یک دستاورد بزرگ است!\n\n" +
			"برای انتهای کار میتونی روی دکمه استخدام کلیک کنی و اقدام به شروع مسیر خودت کنی ! 🎁"

		// Create a modified keyboard without exercise buttons
		keyboard := tgbotapi.NewReplyKeyboard(
			tgbotapi.NewKeyboardButtonRow(
				tgbotapi.NewKeyboardButton("📊 پیشرفت"),
				tgbotapi.NewKeyboardButton("❇️ دیدن همه مسیر"),
			),
			tgbotapi.NewKeyboardButtonRow(
				tgbotapi.NewKeyboardButton("❓ راهنما"),
			),
			tgbotapi.NewKeyboardButtonRow(
				tgbotapi.NewKeyboardButton("💬 چت با هدایتگر"),
			),
		)
		keyboard.ResizeKeyboard = true

		msg := tgbotapi.NewMessage(user.TelegramID, congratsMsg)
		msg.ReplyMarkup = keyboard
		bot.Send(msg)
	} else {
		// Send normal instruction message for other sessions
		instructionMsg := "بعد از ارسال تکالیف این مرحله و ارسال تمرین و بررسی جواب شما به ویدیو بعدی منتقل خواهید شد"
		bot.Send(tgbotapi.NewMessage(user.TelegramID, instructionMsg))
	}

	return "" // Return empty string since we're sending the messages directly
}

func getProgressInfo(user *User) string {
	// Calculate completed sessions based on current session
	completedSessions := user.CurrentSession - 1
	if completedSessions < 0 {
		completedSessions = 0
	}

	// Get user's current level
	level := GetUserLevel(completedSessions)
	progress := GetUserProgress(completedSessions)
	progressBar := GetProgressBar(progress)

	// Format the response with level number
	return fmt.Sprintf("👤 پروفایل من – مانیتایز AI\n\n🔢 نام: %s\n🎮 سطح: %d. %s (%s) %s\n📈 جلسات کامل‌شده: %d از 36\n📊 پیشرفت شما: %s %d%%",
		user.Username,
		level.Level,
		level.Name,
		level.Description,
		level.Emoji,
		completedSessions,
		progressBar,
		progress)
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
		return "❌ خطا در دریافت اطلاعات مرحله. لطفا دوباره تلاش کنید."
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
				"1. آیا تمام نکات مهم مرحله را در نظر گرفته‌اید؟\n" +
				"2. آیا پاسخ شما با اهداف یادگیری مرحله همخوانی دارد؟\n" +
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
		// Use the same completedSessions logic as profile
		currentCompletedSessions := user.CurrentSession - 1 // before increment

		// Move user to next session
		user.CurrentSession++
		if err := db.Save(user).Error; err != nil {
			logger.Error("Failed to update user session",
				zap.Int64("user_id", user.TelegramID),
				zap.Int("new_session", user.CurrentSession),
				zap.Error(err))
			return "❌ خطا در به‌روزرسانی مرحله. لطفا دوباره تلاش کنید."
		}

		// Get next session info
		var nextSession Session
		if err := db.Where("number = ?", user.CurrentSession).First(&nextSession).Error; err != nil {
			logger.Error("Failed to get next session",
				zap.Int64("user_id", user.TelegramID),
				zap.Int("session_number", user.CurrentSession),
				zap.Error(err))
			return fmt.Sprintf("🎉 %s\n\nبه مرحله بعدی منتقل شدید!", feedback)
		}

		// After incrementing session
		newCompletedSessions := user.CurrentSession - 1

		oldLevel := GetUserLevel(currentCompletedSessions)
		newLevel := GetUserLevel(newCompletedSessions)

		response := fmt.Sprintf("🎉 %s\n\n📚 مرحله بعدی شما:\n%s\n\n%s",
			feedback,
			nextSession.Title,
			nextSession.Description)

		// If user leveled up, add the level up message
		if newLevel.Level > oldLevel.Level {
			response = GetLevelUpMessage(newLevel) + "\n\n⸻\n\n" + response
		}

		logger.Info("User moved to next session",
			zap.Int64("user_id", user.TelegramID),
			zap.Int("old_session", user.CurrentSession-1),
			zap.Int("new_session", user.CurrentSession))

		return response
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
			tgbotapi.NewKeyboardButton("📚 ادامه مسیر من"),
			tgbotapi.NewKeyboardButton("✅ ارسال تمرین"),
		),
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("📥 دریافت تمرین"),
			tgbotapi.NewKeyboardButton("❇️ دیدن همه مسیر"),
		),
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("📊 پیشرفت"),
			tgbotapi.NewKeyboardButton("❓ راهنما"),
		),
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("🛍️ خرید اشتراک هوش مصنوعی"),
			tgbotapi.NewKeyboardButton("🎯 استخدام"),
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

// getAdminKeyboard returns the admin keyboard layout
func getAdminKeyboard() tgbotapi.ReplyKeyboardMarkup {
	keyboard := tgbotapi.NewReplyKeyboard(
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("📊 آمار سیستم"),
			tgbotapi.NewKeyboardButton("👥 مدیریت کاربران"),
		),
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("📚 مدیریت جلسات"),
			tgbotapi.NewKeyboardButton("🎥 مدیریت ویدیوها"),
		),
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("💾 پشتیبان‌گیری"),
		),
	)
	keyboard.ResizeKeyboard = true
	return keyboard
}

func getFullRoadmap(user *User) string {
	completedSessions := user.CurrentSession - 1
	if completedSessions < 0 {
		completedSessions = 0
	}
	level := GetUserLevel(completedSessions)
	progress := GetUserProgress(completedSessions)

	// Level roadmap
	levels := []struct {
		Title  string
		Status string
	}{
		{"سطح ۱ – انتخاب ایده", "✅"},
		{"سطح ۲ – ساخت سرویس اولیه", "✅"},
		{"سطح ۳ – برند شخصی", "⏳"},
		{"سطح ۴ – جذب مشتری", "🔒"},
		{"سطح ۵ – اجرای اتوماسیون", "🔒"},
		{"سطح ۶ – تیم‌سازی و رشد", "🔒"},
		{"سطح ۷ – اجرای سیستم", "🔒"},
		{"سطح ۸ – فروش خودکار با AI", "🔒"},
		{"سطح ۹ – جهش درآمد دلاری", "🔒"},
	}
	// Mark completed and current levels
	for i := range levels {
		if level.Level > i+1 {
			levels[i].Status = "✅"
		} else if level.Level == i+1 {
			levels[i].Status = "⏳"
		} else {
			levels[i].Status = "🔒"
		}
	}

	// Current stage in level (for demo, assume 4 stages per level)
	// You can adjust this logic based on your real session-to-level mapping
	// For now, let's use the completedSessions to estimate
	// Find the start session for this level
	levelStartSessions := []int{0, 6, 9, 12, 15, 18, 20, 22, 25}
	levelEndSessions := []int{5, 8, 11, 14, 17, 19, 21, 24, 27}
	currentLevelIndex := level.Level - 1
	stageInLevel := completedSessions - levelStartSessions[currentLevelIndex] + 1
	stagesInLevel := levelEndSessions[currentLevelIndex] - levelStartSessions[currentLevelIndex] + 1
	if stageInLevel < 1 {
		stageInLevel = 1
	}
	if stageInLevel > stagesInLevel {
		stageInLevel = stagesInLevel
	}

	// Current and next stage titles (for demo, use placeholders)
	currentStageTitle := "ساخت پیام برند"
	nextStageTitle := "ساخت پیام برند"

	// Compose the roadmap message
	msg := fmt.Sprintf(`🏁 نقشه راه درآمد دلاری تو در MonetizeAI

👤 %sعزیز، تو الان یک مانتیازر سطح %d هستی
یعنی %d لول واقعی از مسیر پول‌سازی با AI رو پشت سر گذاشتی 💥

🔹 مرحله فعلیت: %d از %d
🔹عنوان مرحله فعلی: «%s»
🔜 مرحله بعد: «%s» 🔓

⸻

🧭 ساختار ربات چطوریه؟

سیستم MonetizeAI از ۹ سطح اصلی تشکیل شده.
هر سطح یعنی یه قدم واقعی برای ساخت بیزینس یا استخدام دلاری با AI.

📦 هر سطح، شامل چند مرحله‌ست.
تو هر مرحله فقط یه تمرین داری — همراه با چک‌لیست، ویدیو، راهنما و پشتیبانی.

✨ وقتی هر مرحله رو انجام بدی، لِول می‌گیری و مرحله بعد برات باز می‌شه!

⸻

🎮 نقشه کلی مسیر تو:

%s %s
%s %s
%s %s
%s %s
%s %s
%s %s
%s %s
%s %s
%s %s

⸻

📊 پیشرفت تو: %d%%
🔥 فقط %d سطح دیگه تا پایان مسیر و ساخت درآمد دلاری واقعی باقی مونده!

⸻

🚀 برای رفتن به مرحله بعد، بزن:
👉 [ادامه مسیر من]`,
		user.Username,
		level.Level,
		level.Level,
		stageInLevel,
		stagesInLevel,
		currentStageTitle,
		nextStageTitle,
		levels[0].Status, levels[0].Title,
		levels[1].Status, levels[1].Title,
		levels[2].Status, levels[2].Title,
		levels[3].Status, levels[3].Title,
		levels[4].Status, levels[4].Title,
		levels[5].Status, levels[5].Title,
		levels[6].Status, levels[6].Title,
		levels[7].Status, levels[7].Title,
		levels[8].Status, levels[8].Title,
		progress,
		9-level.Level,
	)
	return msg
}

// Update the retry keyboard to only include resend license
func getUnverifiedRetryKeyboard() tgbotapi.ReplyKeyboardMarkup {
	keyboard := tgbotapi.NewReplyKeyboard(
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("🔄 ارسال لایسنس"),
		),
	)
	keyboard.ResizeKeyboard = true
	return keyboard
}
