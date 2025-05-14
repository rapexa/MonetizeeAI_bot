package main

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
)

// AdminCommand represents an admin command with its handler
type AdminCommand struct {
	Command     string
	Description string
	Handler     func(admin *Admin, args []string) string
}

var adminCommands = []AdminCommand{
	{
		Command:     "/admin_stats",
		Description: "📊 نمایش آمار کلی سیستم",
		Handler:     handleAdminStats,
	},
	{
		Command:     "/admin_users",
		Description: "👥 مدیریت کاربران",
		Handler:     handleAdminUsers,
	},
	{
		Command:     "/admin_sessions",
		Description: "📚 مدیریت جلسات",
		Handler:     handleAdminSessions,
	},
	{
		Command:     "/admin_videos",
		Description: "🎥 مدیریت ویدیوها",
		Handler:     handleAdminVideos,
	},
	{
		Command:     "/admin_exercises",
		Description: "✍️ مدیریت تمرین‌ها",
		Handler:     handleAdminExercises,
	},
	{
		Command:     "/admin_logs",
		Description: "📝 مشاهده لاگ‌های سیستم",
		Handler:     handleAdminLogs,
	},
	{
		Command:     "/backup",
		Description: "💾 پشتیبان‌گیری از دیتابیس",
		Handler:     handleAdminBackup,
	},
}

// handleAdminCommand processes admin commands
func handleAdminCommand(admin *Admin, command string, args []string) string {
	for _, cmd := range adminCommands {
		if strings.HasPrefix(command, cmd.Command) {
			return cmd.Handler(admin, args)
		}
	}
	return "❌ دستور نامعتبر"
}

// handleAdminStats handles the admin statistics command
func handleAdminStats(admin *Admin, args []string) string {
	// Generate and send all charts
	generateAndSendCharts(admin)
	return "✅ نمودارهای آماری با موفقیت ارسال شدند"
}

// handleAdminUsers manages users
func handleAdminUsers(admin *Admin, args []string) string {
	if len(args) == 0 {
		var users []User
		db.Order("created_at desc").Limit(10).Find(&users)

		response := "👥 آخرین کاربران:\n\n"
		for _, user := range users {
			status := "✅ فعال"
			if !user.IsActive {
				status = "❌ مسدود"
			}
			response += fmt.Sprintf("👤 %s\n📱 آیدی: %d\n📊 وضعیت: %s\n⏰ تاریخ عضویت: %s\n\n",
				user.Username,
				user.TelegramID,
				status,
				user.CreatedAt.Format("2006-01-02 15:04:05"))
		}

		// Add inline keyboard for actions
		keyboard := tgbotapi.NewInlineKeyboardMarkup(
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("🔍 جستجوی کاربر", "search_user"),
				tgbotapi.NewInlineKeyboardButtonData("📊 آمار کاربران", "user_stats"),
			),
		)
		msg := tgbotapi.NewMessage(admin.TelegramID, response)
		msg.ReplyMarkup = keyboard
		if _, err := bot.Send(msg); err != nil {
			return "❌ خطا در ارسال پیام"
		}

		return "از دکمه‌های زیر برای مدیریت کاربران استفاده کنید"
	}

	// Handle user actions
	switch args[0] {
	case "ban":
		if len(args) < 2 {
			return "❌ لطفا آیدی کاربر را وارد کنید"
		}
		return banUser(admin, args[1])
	case "unban":
		if len(args) < 2 {
			return "❌ لطفا آیدی کاربر را وارد کنید"
		}
		return unbanUser(admin, args[1])
	default:
		return "❌ دستور نامعتبر"
	}
}

// handleAdminSessions manages sessions
func handleAdminSessions(admin *Admin, args []string) string {
	if len(args) == 0 {
		var sessions []Session
		db.Order("number desc").Limit(10).Find(&sessions)

		response := "📚 آخرین جلسات:\n\n"
		for _, session := range sessions {
			response += fmt.Sprintf("📖 جلسه %d: %s\n📝 %s\n\n",
				session.Number,
				session.Title,
				session.Description)
		}

		// Add inline keyboard for actions
		keyboard := tgbotapi.NewInlineKeyboardMarkup(
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("➕ افزودن جلسه", "add_session"),
				tgbotapi.NewInlineKeyboardButtonData("✏️ ویرایش جلسه", "edit_session"),
			),
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("🗑️ حذف جلسه", "delete_session"),
				tgbotapi.NewInlineKeyboardButtonData("📊 آمار جلسات", "session_stats"),
			),
		)
		msg := tgbotapi.NewMessage(admin.TelegramID, response)
		msg.ReplyMarkup = keyboard
		bot.Send(msg)

		return "از دکمه‌های زیر برای مدیریت جلسات استفاده کنید"
	}

	// Handle session actions
	switch args[0] {
	case "edit":
		if len(args) < 4 {
			return "❌ لطفا شماره جلسه، عنوان و توضیحات را وارد کنید"
		}
		return editSession(admin, args[1], args[2], args[3])
	case "delete":
		if len(args) < 2 {
			return "❌ لطفا شماره جلسه را وارد کنید"
		}
		return deleteSession(admin, args[1])
	default:
		return "❌ دستور نامعتبر"
	}
}

// handleAdminVideos manages videos
func handleAdminVideos(admin *Admin, args []string) string {
	if len(args) == 0 {
		var videos []Video
		db.Order("created_at desc").Limit(10).Find(&videos)

		response := "🎥 آخرین ویدیوها:\n\n"
		for _, video := range videos {
			response += fmt.Sprintf("📺 %s\n🔗 %s\n\n",
				video.Title,
				video.VideoLink)
		}

		// Add inline keyboard for actions
		keyboard := tgbotapi.NewInlineKeyboardMarkup(
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("➕ افزودن ویدیو", "add_video"),
				tgbotapi.NewInlineKeyboardButtonData("✏️ ویرایش ویدیو", "edit_video"),
			),
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("🗑️ حذف ویدیو", "delete_video"),
				tgbotapi.NewInlineKeyboardButtonData("📊 آمار ویدیوها", "video_stats"),
			),
		)
		msg := tgbotapi.NewMessage(admin.TelegramID, response)
		msg.ReplyMarkup = keyboard
		if _, err := bot.Send(msg); err != nil {
			return "❌ خطا در ارسال پیام"
		}

		return "از دکمه‌های زیر برای مدیریت ویدیوها استفاده کنید"
	}

	// Handle video actions
	switch args[0] {
	case "add":
		if len(args) < 4 {
			return "❌ لطفا شماره جلسه، عنوان و لینک ویدیو را وارد کنید"
		}
		return addVideo(admin, args[1], args[2], args[3])
	case "edit":
		if len(args) < 4 {
			return "❌ لطفا آیدی ویدیو، عنوان و لینک را وارد کنید"
		}
		return editVideo(admin, args[1], args[2], args[3])
	default:
		return "❌ دستور نامعتبر"
	}
}

// handleAdminExercises manages exercises
func handleAdminExercises(admin *Admin, args []string) string {
	if len(args) == 0 {
		// Show pending exercises
		var exercises []Exercise
		db.Preload("User").Preload("Session").Where("status = ?", "pending").Order("created_at desc").Limit(10).Find(&exercises)

		response := "✍️ تمرین‌های در انتظار بررسی:\n\n"
		for _, exercise := range exercises {
			response += fmt.Sprintf("ID: %d\nکاربر: %s\nجلسه: %d\nمحتوا: %s\n\n",
				exercise.ID, exercise.User.Username, exercise.Session.Number, exercise.Content)
		}
		response += "\nدستورات:\n• approve [آیدی] [نظرات] - تایید تمرین\n• reject [آیدی] [نظرات] - رد تمرین"
		return response
	}

	// Handle exercise management commands
	switch args[0] {
	case "approve":
		if len(args) < 3 {
			return "❌ فرمت دستور: /admin_exercises approve [آیدی] [نظرات]"
		}
		exerciseID, err := strconv.ParseUint(args[1], 10, 32)
		if err != nil {
			return "❌ آیدی نامعتبر"
		}
		var exercise Exercise
		if err := db.First(&exercise, exerciseID).Error; err != nil {
			return "❌ تمرین یافت نشد"
		}
		exercise.Status = "approved"
		exercise.Feedback = strings.Join(args[2:], " ")
		db.Save(&exercise)
		return "✅ تمرین با موفقیت تایید شد"

	case "reject":
		if len(args) < 3 {
			return "❌ فرمت دستور: /admin_exercises reject [آیدی] [نظرات]"
		}
		exerciseID, err := strconv.ParseUint(args[1], 10, 32)
		if err != nil {
			return "❌ آیدی نامعتبر"
		}
		var exercise Exercise
		if err := db.First(&exercise, exerciseID).Error; err != nil {
			return "❌ تمرین یافت نشد"
		}
		exercise.Status = "needs_revision"
		exercise.Feedback = strings.Join(args[2:], " ")
		db.Save(&exercise)
		return "✅ تمرین با موفقیت رد شد"

	default:
		return "❌ دستور نامعتبر"
	}
}

// handleAdminLogs shows system logs
func handleAdminLogs(admin *Admin, args []string) string {
	var actions []AdminAction
	db.Preload("Admin").Order("created_at desc").Limit(10).Find(&actions)

	response := "📝 آخرین فعالیت‌های ادمین:\n\n"
	for _, action := range actions {
		response += fmt.Sprintf("ادمین: %s\nعملیات: %s\nجزئیات: %s\nتاریخ: %s\n\n",
			action.Admin.Username, action.Action, action.Details, action.CreatedAt.Format("2006-01-02 15:04:05"))
	}
	return response
}

// isAdmin checks if a user is an admin
func isAdmin(telegramID int64) bool {
	var admin Admin
	result := db.Where("telegram_id = ? AND is_active = ?", telegramID, true).First(&admin)
	return result.Error == nil
}

// getAdmin returns admin by telegram ID
func getAdmin(telegramID int64) *Admin {
	var admin Admin
	if err := db.Where("telegram_id = ?", telegramID).First(&admin).Error; err != nil {
		return nil
	}
	return &admin
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
			case "backup":
				args := strings.Fields(update.Message.CommandArguments())
				response := handleAdminBackup(admin, args)
				sendMessage(update.Message.Chat.ID, response)
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

	// If not admin, let the user handlers process the message
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
	case "chart":
		if len(params) > 0 {
			handleChartCallback(admin, params[0])
		}
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
	msg.ReplyMarkup = tgbotapi.ForceReply{}
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
	msg.ReplyMarkup = tgbotapi.ForceReply{}
	bot.Send(msg)
}

func handleEditSession(admin *Admin, params []string) {
	if len(params) == 0 {
		msg := tgbotapi.NewMessage(admin.TelegramID, "✏️ ویرایش جلسه:\n\nلطفا شماره جلسه را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		return
	}

	sessionNum := params[0]
	msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("✏️ ویرایش جلسه %s:\n\nلطفا اطلاعات جدید را به فرمت زیر وارد کنید:\nعنوان|توضیحات", sessionNum))
	msg.ReplyMarkup = tgbotapi.ForceReply{}
	bot.Send(msg)
}

func handleDeleteSession(admin *Admin, params []string) {
	if len(params) == 0 {
		msg := tgbotapi.NewMessage(admin.TelegramID, "🗑️ حذف جلسه:\n\nلطفا شماره جلسه را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.ForceReply{}
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
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		return
	}

	sessionNum := params[0]
	msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("➕ افزودن ویدیو به جلسه %s:\n\nلطفا اطلاعات را به فرمت زیر وارد کنید:\nعنوان|لینک ویدیو", sessionNum))
	msg.ReplyMarkup = tgbotapi.ForceReply{}
	bot.Send(msg)
}

func handleEditVideo(admin *Admin, params []string) {
	if len(params) == 0 {
		msg := tgbotapi.NewMessage(admin.TelegramID, "✏️ ویرایش ویدیو:\n\nلطفا آیدی ویدیو را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		return
	}

	videoID := params[0]
	msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("✏️ ویرایش ویدیو %s:\n\nلطفا اطلاعات جدید را به فرمت زیر وارد کنید:\nعنوان|لینک ویدیو", videoID))
	msg.ReplyMarkup = tgbotapi.ForceReply{}
	bot.Send(msg)
}

func handleDeleteVideo(admin *Admin, params []string) {
	if len(params) == 0 {
		msg := tgbotapi.NewMessage(admin.TelegramID, "🗑️ حذف ویدیو:\n\nلطفا آیدی ویدیو را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.ForceReply{}
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
