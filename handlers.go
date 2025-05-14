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

// handleCallbackQuery processes callback queries from inline keyboards
func handleCallbackQuery(update tgbotapi.Update) {
	query := update.CallbackQuery
	admin := getAdmin(query.From.ID)
	if admin == nil {
		bot.Send(tgbotapi.NewMessage(query.From.ID, "❌ دسترسی غیرمجاز"))
		return
	}

	// Split callback data to get action and parameters
	parts := strings.Split(query.Data, ":")
	action := parts[0]
	params := parts[1:]

	switch action {
	case "user_chart":
		handleUserChart(admin, params)
	case "session_chart":
		handleSessionChart(admin, params)
	case "video_chart":
		handleVideoChart(admin, params)
	case "exercise_chart":
		handleExerciseChart(admin, params)
	case "search_user":
		handleSearchUser(admin, params)
	case "user_stats":
		handleUserStats(admin, params)
	case "add_session":
		handleAddSession(admin, params)
	case "edit_session":
		handleEditSession(admin, params)
	case "delete_session":
		handleDeleteSession(admin, params)
	case "session_stats":
		handleSessionStats(admin, params)
	case "add_video":
		handleAddVideo(admin, params)
	case "edit_video":
		handleEditVideo(admin, params)
	case "delete_video":
		handleDeleteVideo(admin, params)
	case "video_stats":
		handleVideoStats(admin, params)
	default:
		bot.Send(tgbotapi.NewMessage(query.From.ID, "❌ عملیات نامعتبر"))
	}

	// Answer callback query to remove loading state
	bot.Send(tgbotapi.NewCallback(query.ID, ""))
}

// Chart handlers
func handleUserChart(admin *Admin, params []string) {
	// TODO: Implement user statistics chart
	bot.Send(tgbotapi.NewMessage(admin.TelegramID, "📊 نمودار آمار کاربران در حال آماده‌سازی..."))
}

func handleSessionChart(admin *Admin, params []string) {
	// TODO: Implement session statistics chart
	bot.Send(tgbotapi.NewMessage(admin.TelegramID, "📊 نمودار آمار جلسات در حال آماده‌سازی..."))
}

func handleVideoChart(admin *Admin, params []string) {
	// TODO: Implement video statistics chart
	bot.Send(tgbotapi.NewMessage(admin.TelegramID, "📊 نمودار آمار ویدیوها در حال آماده‌سازی..."))
}

func handleExerciseChart(admin *Admin, params []string) {
	// TODO: Implement exercise statistics chart
	bot.Send(tgbotapi.NewMessage(admin.TelegramID, "📊 نمودار آمار تمرین‌ها در حال آماده‌سازی..."))
}

// User management handlers
func handleSearchUser(admin *Admin, params []string) {
	msg := tgbotapi.NewMessage(admin.TelegramID, "🔍 لطفا آیدی یا نام کاربری را وارد کنید:")
	msg.ReplyMarkup = tgbotapi.NewForceReply()
	bot.Send(msg)
}

func handleUserStats(admin *Admin, params []string) {
	var stats struct {
		TotalUsers    int64
		ActiveUsers   int64
		BannedUsers   int64
		NewUsersToday int64
		NewUsersWeek  int64
		NewUsersMonth int64
	}

	// Get user statistics
	db.Model(&User{}).Count(&stats.TotalUsers)
	db.Model(&User{}).Where("is_active = ?", true).Count(&stats.ActiveUsers)
	db.Model(&User{}).Where("is_active = ?", false).Count(&stats.BannedUsers)

	today := time.Now().Truncate(24 * time.Hour)
	weekAgo := today.AddDate(0, 0, -7)
	monthAgo := today.AddDate(0, -1, 0)

	db.Model(&User{}).Where("created_at >= ?", today).Count(&stats.NewUsersToday)
	db.Model(&User{}).Where("created_at >= ?", weekAgo).Count(&stats.NewUsersWeek)
	db.Model(&User{}).Where("created_at >= ?", monthAgo).Count(&stats.NewUsersMonth)

	response := fmt.Sprintf("📊 آمار کاربران:\n\n"+
		"👥 کل کاربران: %d\n"+
		"✅ کاربران فعال: %d\n"+
		"❌ کاربران مسدود: %d\n\n"+
		"📈 کاربران جدید:\n"+
		"• امروز: %d\n"+
		"• هفته گذشته: %d\n"+
		"• ماه گذشته: %d",
		stats.TotalUsers,
		stats.ActiveUsers,
		stats.BannedUsers,
		stats.NewUsersToday,
		stats.NewUsersWeek,
		stats.NewUsersMonth)

	bot.Send(tgbotapi.NewMessage(admin.TelegramID, response))
}

// Session management handlers
func handleAddSession(admin *Admin, params []string) {
	msg := tgbotapi.NewMessage(admin.TelegramID, "➕ افزودن جلسه جدید:\n\nلطفا اطلاعات را به فرمت زیر وارد کنید:\nشماره جلسه|عنوان|توضیحات")
	msg.ReplyMarkup = tgbotapi.NewForceReply()
	bot.Send(msg)
}

func handleEditSession(admin *Admin, params []string) {
	if len(params) == 0 {
		msg := tgbotapi.NewMessage(admin.TelegramID, "✏️ ویرایش جلسه:\n\nلطفا شماره جلسه را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.NewForceReply()
		bot.Send(msg)
		return
	}

	sessionNum := params[0]
	msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("✏️ ویرایش جلسه %s:\n\nلطفا اطلاعات جدید را به فرمت زیر وارد کنید:\nعنوان|توضیحات", sessionNum))
	msg.ReplyMarkup = tgbotapi.NewForceReply()
	bot.Send(msg)
}

func handleDeleteSession(admin *Admin, params []string) {
	if len(params) == 0 {
		msg := tgbotapi.NewMessage(admin.TelegramID, "🗑️ حذف جلسه:\n\nلطفا شماره جلسه را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.NewForceReply()
		bot.Send(msg)
		return
	}

	sessionNum := params[0]
	response := deleteSession(admin, sessionNum)
	bot.Send(tgbotapi.NewMessage(admin.TelegramID, response))
}

func handleSessionStats(admin *Admin, params []string) {
	var stats struct {
		TotalSessions     int64
		TotalVideos       int64
		TotalExercises    int64
		ActiveSessions    int64
		CompletedSessions int64
	}

	// Get session statistics
	db.Model(&Session{}).Count(&stats.TotalSessions)
	db.Model(&Video{}).Count(&stats.TotalVideos)
	db.Model(&Exercise{}).Count(&stats.TotalExercises)
	db.Model(&Session{}).Where("is_active = ?", true).Count(&stats.ActiveSessions)
	db.Model(&Session{}).Where("is_completed = ?", true).Count(&stats.CompletedSessions)

	response := fmt.Sprintf("📊 آمار جلسات:\n\n"+
		"📚 کل جلسات: %d\n"+
		"✅ جلسات فعال: %d\n"+
		"🏁 جلسات تکمیل شده: %d\n\n"+
		"📈 محتوا:\n"+
		"• کل ویدیوها: %d\n"+
		"• کل تمرین‌ها: %d",
		stats.TotalSessions,
		stats.ActiveSessions,
		stats.CompletedSessions,
		stats.TotalVideos,
		stats.TotalExercises)

	bot.Send(tgbotapi.NewMessage(admin.TelegramID, response))
}

// Video management handlers
func handleAddVideo(admin *Admin, params []string) {
	if len(params) == 0 {
		msg := tgbotapi.NewMessage(admin.TelegramID, "➕ افزودن ویدیو:\n\nلطفا شماره جلسه را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.NewForceReply()
		bot.Send(msg)
		return
	}

	sessionNum := params[0]
	msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("➕ افزودن ویدیو به جلسه %s:\n\nلطفا اطلاعات را به فرمت زیر وارد کنید:\nعنوان|لینک ویدیو", sessionNum))
	msg.ReplyMarkup = tgbotapi.NewForceReply()
	bot.Send(msg)
}

func handleEditVideo(admin *Admin, params []string) {
	if len(params) == 0 {
		msg := tgbotapi.NewMessage(admin.TelegramID, "✏️ ویرایش ویدیو:\n\nلطفا آیدی ویدیو را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.NewForceReply()
		bot.Send(msg)
		return
	}

	videoID := params[0]
	msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("✏️ ویرایش ویدیو %s:\n\nلطفا اطلاعات جدید را به فرمت زیر وارد کنید:\nعنوان|لینک ویدیو", videoID))
	msg.ReplyMarkup = tgbotapi.NewForceReply()
	bot.Send(msg)
}

func handleDeleteVideo(admin *Admin, params []string) {
	if len(params) == 0 {
		msg := tgbotapi.NewMessage(admin.TelegramID, "🗑️ حذف ویدیو:\n\nلطفا آیدی ویدیو را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.NewForceReply()
		bot.Send(msg)
		return
	}

	videoID := params[0]
	var video Video
	if err := db.First(&video, videoID).Error; err != nil {
		bot.Send(tgbotapi.NewMessage(admin.TelegramID, "❌ ویدیو یافت نشد"))
		return
	}

	if err := db.Delete(&video).Error; err != nil {
		bot.Send(tgbotapi.NewMessage(admin.TelegramID, "❌ خطا در حذف ویدیو"))
		return
	}

	logAdminAction(admin, "delete_video", fmt.Sprintf("Deleted video %s", videoID), "video", video.ID)
	bot.Send(tgbotapi.NewMessage(admin.TelegramID, "✅ ویدیو با موفقیت حذف شد"))
}

func handleVideoStats(admin *Admin, params []string) {
	var stats struct {
		TotalVideos     int64
		VideosToday     int64
		VideosWeek      int64
		VideosMonth     int64
		AverageDuration float64
	}

	// Get video statistics
	db.Model(&Video{}).Count(&stats.TotalVideos)

	today := time.Now().Truncate(24 * time.Hour)
	weekAgo := today.AddDate(0, 0, -7)
	monthAgo := today.AddDate(0, -1, 0)

	db.Model(&Video{}).Where("created_at >= ?", today).Count(&stats.VideosToday)
	db.Model(&Video{}).Where("created_at >= ?", weekAgo).Count(&stats.VideosWeek)
	db.Model(&Video{}).Where("created_at >= ?", monthAgo).Count(&stats.VideosMonth)

	response := fmt.Sprintf("📊 آمار ویدیوها:\n\n"+
		"🎥 کل ویدیوها: %d\n\n"+
		"📈 ویدیوهای جدید:\n"+
		"• امروز: %d\n"+
		"• هفته گذشته: %d\n"+
		"• ماه گذشته: %d",
		stats.TotalVideos,
		stats.VideosToday,
		stats.VideosWeek,
		stats.VideosMonth)

	bot.Send(tgbotapi.NewMessage(admin.TelegramID, response))
}
