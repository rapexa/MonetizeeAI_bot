package main

import (
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"MonetizeeAI_bot/logger"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Add these constants at the top of the file
const (
	StateWaitingForUserID       = "waiting_for_user_id"
	StateWaitingForSessionNum   = "waiting_for_session_num"
	StateWaitingForSessionInfo  = "waiting_for_session_info"
	StateWaitingForVideoInfo    = "waiting_for_video_info"
	StateEditSession            = "edit_session"
	StateDeleteSession          = "delete_session"
	StateAddVideo               = "add_video"
	StateEditVideo              = "edit_video"
	StateDeleteVideo            = "delete_video"
	StateWaitingForBroadcast    = "waiting_for_broadcast"
	StateConfirmBroadcast       = "confirm_broadcast"
	StateWaitingForSMSBroadcast = "waiting_for_sms_broadcast"
	StateConfirmSMSBroadcast    = "confirm_sms_broadcast"
)

// Add this with other model definitions at the top of the file
type UserProgress struct {
	ID          uint `gorm:"primaryKey"`
	UserID      uint `gorm:"not null"`
	SessionID   uint `gorm:"not null"`
	IsCompleted bool `gorm:"default:false"`
	CompletedAt time.Time
	CreatedAt   time.Time
	UpdatedAt   time.Time
	User        User    `gorm:"foreignKey:UserID"`
	Session     Session `gorm:"foreignKey:SessionID"`
}

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
		Command:     "/admin_broadcast",
		Description: "📢 ارسال پیام به همه کاربران",
		Handler:     handleAdminBroadcast,
	},
	{
		Command:     "/admin_sms_broadcast",
		Description: "📲 ارسال پیامک به همه کاربران",
		Handler:     handleAdminSMSBroadcast,
	},
	// 🔒 SECURITY: New security commands
	{
		Command:     "/admin_security",
		Description: "🛡️ مدیریت امنیت و کاربران مسدود شده",
		Handler:     handleAdminSecurity,
	},
}

// Add these at the top of the file after the imports
var adminStates = make(map[int64]string)

// Add this helper function
func isNewUser(telegramID int64) bool {
	var user User
	result := db.Where("telegram_id = ?", telegramID).First(&user)
	return result.Error == gorm.ErrRecordNotFound
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
	// Generate and send statistics
	generateAndSendStats(admin)
	return "برای دانلود آمار سیستم روی گزینه های بالا کلیک کنید ✅"
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
				tgbotapi.NewInlineKeyboardButtonData("🔍 جستجوی کاربر", "search_user:0"),
			),
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("📊 آمار کاربران", "user_stats:0"),
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
	case "search":
		if len(args) < 2 {
			return "❌ لطفا نام کاربری یا آیدی را وارد کنید"
		}
		return searchUser(admin, args[1])
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
	fmt.Printf("[DEBUG] handleAdminSessions called by admin %d with args: %v\n", admin.TelegramID, args)
	if len(args) == 0 {
		var sessions []Session
		db.Order("number desc").Limit(12).Find(&sessions) // Get last 12 sessions
		fmt.Printf("[DEBUG] handleAdminSessions: fetched %d sessions\n", len(sessions))

		// Build the response with sessions list
		var response strings.Builder
		for _, session := range sessions {
			response.WriteString(fmt.Sprintf("📖 جلسه %d: %s\n📝 %s\n\n",
				session.Number,
				session.Title,
				session.Description))
		}

		// Create message with sessions list and buttons
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
		fmt.Printf("[DEBUG] handleAdminSessions: response length = %d\n", len(response.String()))
		sendLongMessage(admin.TelegramID, response.String(), keyboard)
		return "از دکمه‌های زیر برای مدیریت جلسات استفاده کنید"
	}

	// Handle session actions
	switch args[0] {
	case "edit":
		// Show list of sessions first
		var sessions []Session
		db.Order("number desc").Find(&sessions)

		response := "📚 لیست جلسات:\n\n"
		for _, session := range sessions {
			response += fmt.Sprintf("🆔 شماره: %d\n📝 عنوان: %s\n📄 توضیحات: %s\n\n",
				session.Number,
				session.Title,
				session.Description)
		}
		response += "\n✏️ لطفا شماره جلسه مورد نظر برای ویرایش را ارسال کنید"

		msg := tgbotapi.NewMessage(admin.TelegramID, response)
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		adminStates[admin.TelegramID] = StateEditSession
		return "لطفا شماره جلسه مورد نظر را وارد کنید"

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
	fmt.Printf("[DEBUG] handleAdminVideos called by admin %d with args: %v\n", admin.TelegramID, args)
	if len(args) == 0 {
		var videos []Video
		db.Preload("Session").Order("created_at desc").Find(&videos)
		fmt.Printf("[DEBUG] handleAdminVideos: fetched %d videos\n", len(videos))

		response := "🎥 مدیریت ویدیوها:\n\n"
		if len(videos) == 0 {
			response += "📝 هنوز ویدیویی ثبت نشده است.\n\n"
		} else {
			response += "📋 لیست ویدیوها:\n\n"
			for _, video := range videos {
				response += fmt.Sprintf("🆔 آیدی: %d\n📝 عنوان: %s\n📚 جلسه: %d - %s\n🔗 لینک: %s\n\n",
					video.ID,
					video.Title,
					video.Session.Number,
					video.Session.Title,
					video.VideoLink)
			}
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
		fmt.Printf("[DEBUG] handleAdminVideos: response length = %d\n", len(response))
		sendLongMessage(admin.TelegramID, response, keyboard)
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
			response += fmt.Sprintf("🆔 آیدی: %d\n👤 کاربر: %s\n📚 جلسه: %d\n📝 محتوا: %s\n\n",
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

// handleCallbackQuery processes callback queries from inline keyboards
func handleCallbackQuery(update tgbotapi.Update) {
	callback := update.CallbackQuery
	data := callback.Data

	// Get admin
	admin := getAdminByTelegramID(callback.From.ID)
	if admin == nil {
		bot.Send(tgbotapi.NewCallback(callback.ID, "❌ دسترسی غیرمجاز"))
		return
	}

	// Handle license verification callbacks first
	if strings.HasPrefix(data, "verify:") || strings.HasPrefix(data, "reject:") {
		handleLicenseVerification(admin, data)
		bot.Send(tgbotapi.NewCallback(callback.ID, "✅ عملیات با موفقیت انجام شد"))
		return
	}

	// Handle broadcast confirmation
	if data == "confirm_broadcast" || data == "cancel_broadcast" {
		confirm := data == "confirm_broadcast"
		response := handleBroadcastConfirmation(admin, confirm)
		sendMessage(admin.TelegramID, response)
		bot.Send(tgbotapi.NewCallback(callback.ID, "✅ عملیات با موفقیت انجام شد"))
		return
	}

	// Handle SMS broadcast confirmation
	if data == "confirm_sms_broadcast" || data == "cancel_sms_broadcast" {
		confirm := data == "confirm_sms_broadcast"
		response := handleSMSBroadcastConfirmation(admin, confirm)
		sendMessage(admin.TelegramID, response)
		bot.Send(tgbotapi.NewCallback(callback.ID, "✅ عملیات با موفقیت انجام شد"))
		return
	}

	// Parse callback data for other admin actions
	parts := strings.Split(data, ":")
	if len(parts) < 1 {
		return
	}

	action := parts[0]
	param := ""
	if len(parts) > 1 {
		param = parts[1]
	}

	switch action {
	case "search_user":
		msg := tgbotapi.NewMessage(admin.TelegramID, "🔍 لطفا آیدی عددی یا نام کاربری را وارد کنید:\n\n"+
			"📝 نکات:\n"+
			"• برای جستجو با آیدی، عدد را وارد کنید\n"+
			"• برای جستجو با نام کاربری، بخشی از نام را وارد کنید\n"+
			"• جستجو با نام کاربری حساس به حروف کوچک و بزرگ نیست")
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		adminStates[admin.TelegramID] = StateWaitingForUserID

	case "add_session":
		msg := tgbotapi.NewMessage(admin.TelegramID, "➕ افزودن جلسه جدید:\n\nلطفا اطلاعات را به فرمت زیر وارد کنید:\nشماره جلسه|عنوان|توضیحات")
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		adminStates[admin.TelegramID] = StateWaitingForSessionInfo

	case "edit_session":
		// Show list of sessions first
		var sessions []Session
		db.Order("number desc").Find(&sessions)

		response := "📚 لیست جلسات:\n\n"
		for _, session := range sessions {
			response += fmt.Sprintf("🆔 شماره: %d\n📝 عنوان: %s\n📄 توضیحات: %s\n\n",
				session.Number,
				session.Title,
				session.Description)
		}
		response += "\n✏️ لطفا شماره جلسه مورد نظر برای ویرایش را ارسال کنید"

		msg := tgbotapi.NewMessage(admin.TelegramID, response)
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		adminStates[admin.TelegramID] = StateEditSession

	case "delete_session":
		// Show list of sessions first
		var sessions []Session
		db.Order("number desc").Find(&sessions)

		response := "📚 لیست جلسات:\n\n"
		for _, session := range sessions {
			response += fmt.Sprintf("🆔 شماره: %d\n📝 عنوان: %s\n\n",
				session.Number,
				session.Title)
		}
		response += "\n🗑️ لطفا شماره جلسه مورد نظر را وارد کنید:"

		msg := tgbotapi.NewMessage(admin.TelegramID, response)
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		adminStates[admin.TelegramID] = StateDeleteSession

	case "add_video":
		// Show list of sessions first
		var sessions []Session
		db.Order("number desc").Find(&sessions)

		response := "📚 لیست جلسات:\n\n"
		for _, session := range sessions {
			response += fmt.Sprintf("🆔 شماره: %d\n📝 عنوان: %s\n\n",
				session.Number,
				session.Title)
		}
		response += "\n➕ لطفا شماره جلسه مورد نظر را وارد کنید:"

		msg := tgbotapi.NewMessage(admin.TelegramID, response)
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		adminStates[admin.TelegramID] = StateAddVideo

	case "edit_video":
		// Show list of videos first
		var videos []Video
		db.Preload("Session").Order("created_at desc").Find(&videos)

		response := "📺 لیست ویدیوها:\n\n"
		for _, video := range videos {
			response += fmt.Sprintf("🆔 آیدی: %d\n📝 عنوان: %s\n📚 جلسه: %d - %s\n🔗 لینک: %s\n\n",
				video.ID,
				video.Title,
				video.Session.Number,
				video.Session.Title,
				video.VideoLink)
		}
		response += "\n✏️ لطفا آیدی ویدیو مورد نظر را وارد کنید:"

		msg := tgbotapi.NewMessage(admin.TelegramID, response)
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		adminStates[admin.TelegramID] = StateEditVideo

	case "delete_video":
		// Show list of videos first
		var videos []Video
		db.Preload("Session").Order("created_at desc").Find(&videos)

		response := "📺 لیست ویدیوها:\n\n"
		for _, video := range videos {
			response += fmt.Sprintf("🆔 آیدی: %d\n📝 عنوان: %s\n📚 جلسه: %d - %s\n\n",
				video.ID,
				video.Title,
				video.Session.Number,
				video.Session.Title)
		}
		response += "\n🗑️ لطفا آیدی ویدیو مورد نظر را وارد کنید:"

		msg := tgbotapi.NewMessage(admin.TelegramID, response)
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		adminStates[admin.TelegramID] = StateDeleteVideo

	case "session_stats":
		handleSessionStats(admin, []string{})

	case "video_stats":
		handleVideoStats(admin, []string{})

	case "ban":
		handleBanUser(admin, param)

	case "unban":
		handleUnbanUser(admin, param)

	default:
		sendMessage(admin.TelegramID, "❌ عملیات نامعتبر")
	}

	// Answer callback query to remove loading state
	callbackConfig := tgbotapi.NewCallback(callback.ID, "")
	bot.Request(callbackConfig)
}

// getAdminByTelegramID returns admin by telegram ID
func getAdminByTelegramID(telegramID int64) *Admin {
	var admin Admin
	if err := db.Where("telegram_id = ?", telegramID).First(&admin).Error; err != nil {
		// Don't log error for record not found - this is expected for non-admin users
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			logger.Error("Database error in getAdminByTelegramID", zap.Error(err), zap.Int64("telegram_id", telegramID))
		}
		return nil
	}
	return &admin
}

// handleBanUser bans a user
func handleBanUser(admin *Admin, userID string) {
	id, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		sendMessage(admin.TelegramID, "❌ آیدی کاربر نامعتبر است")
		return
	}

	var user User
	if err := db.Where("telegram_id = ?", id).First(&user).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ کاربر یافت نشد")
		return
	}

	user.IsActive = false
	if err := db.Save(&user).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در مسدود کردن کاربر")
		return
	}

	// Send notification to the blocked user
	blockMsg := tgbotapi.NewMessage(user.TelegramID, "⚠️ دسترسی شما به ربات مسدود شده است.\n\n📞 برای رفع مسدودیت با پشتیبانی تماس بگیرید:\n\n"+SUPPORT_NUMBER)
	blockMsg.ReplyMarkup = tgbotapi.NewRemoveKeyboard(true)
	bot.Send(blockMsg)

	logAdminAction(admin, "ban_user", fmt.Sprintf("کاربر %s مسدود شد", user.Username), "user", user.ID)
	sendMessage(admin.TelegramID, fmt.Sprintf("✅ کاربر %s با موفقیت مسدود شد", user.Username))
}

// handleUnbanUser unbans a user
func handleUnbanUser(admin *Admin, userID string) {
	id, err := strconv.ParseInt(userID, 10, 64)
	if err != nil {
		sendMessage(admin.TelegramID, "❌ آیدی کاربر نامعتبر است")
		return
	}

	var user User
	if err := db.Where("telegram_id = ?", id).First(&user).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ کاربر یافت نشد")
		return
	}

	user.IsActive = true
	if err := db.Save(&user).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در رفع مسدودیت کاربر")
		return
	}

	// Send notification to the unblocked user
	unblockMsg := tgbotapi.NewMessage(user.TelegramID, "✅ دسترسی شما به ربات بازگردانده شد.\n\nشما می‌توانید از خدمات ربات استفاده کنید.")
	unblockMsg.ReplyMarkup = getMainMenuKeyboard()
	bot.Send(unblockMsg)

	logAdminAction(admin, "unban_user", fmt.Sprintf("مسدودیت کاربر %s برداشته شد", user.Username), "user", user.ID)
	sendMessage(admin.TelegramID, fmt.Sprintf("✅ مسدودیت کاربر %s با موفقیت برداشته شد", user.Username))
}

// searchUser searches for a user by username or ID
func searchUser(admin *Admin, query string) string {
	var users []User
	var searchErr error

	// Try to parse as user ID first
	userID, err := strconv.ParseInt(query, 10, 64)
	if err == nil {
		// Search by Telegram ID
		searchErr = db.Where("telegram_id = ?", userID).Find(&users).Error
	} else {
		// Search by username
		searchErr = db.Where("username ILIKE ?", "%"+query+"%").Find(&users).Error
	}

	if searchErr != nil {
		return "❌ خطا در جستجوی کاربر"
	}

	if len(users) == 0 {
		return "❌ کاربری یافت نشد"
	}

	response := "🔍 نتایج جستجو:\n\n"
	for _, user := range users {
		status := "✅ فعال"
		if !user.IsActive {
			status = "❌ مسدود"
		}

		// Get user's session progress
		var completedSessions int64
		db.Model(&UserProgress{}).Where("user_id = ? AND is_completed = ?", user.ID, true).Count(&completedSessions)

		// Get user's exercise submissions
		var exerciseCount int64
		db.Model(&Exercise{}).Where("user_id = ?", user.ID).Count(&exerciseCount)

		response += fmt.Sprintf("👤 اطلاعات کاربر:\n\n"+
			"📱 آیدی تلگرام: %d\n"+
			"👤 نام کاربری: %s\n"+
			"📊 وضعیت: %s\n"+
			"⏰ تاریخ عضویت: %s\n"+
			"📚 جلسات تکمیل شده: %d\n"+
			"✍️ تعداد تمرین‌ها: %d\n\n",
			user.TelegramID,
			user.Username,
			status,
			user.CreatedAt.Format("2006-01-02 15:04:05"),
			completedSessions,
			exerciseCount)

		// Create action buttons for each user
		var keyboard tgbotapi.InlineKeyboardMarkup
		if user.IsActive {
			keyboard = tgbotapi.NewInlineKeyboardMarkup(
				tgbotapi.NewInlineKeyboardRow(
					tgbotapi.NewInlineKeyboardButtonData("🚫 مسدود کردن کاربر", fmt.Sprintf("ban:%d", user.TelegramID)),
				),
			)
		} else {
			keyboard = tgbotapi.NewInlineKeyboardMarkup(
				tgbotapi.NewInlineKeyboardRow(
					tgbotapi.NewInlineKeyboardButtonData("✅ رفع مسدودیت کاربر", fmt.Sprintf("unban:%d", user.TelegramID)),
				),
			)
		}

		msg := tgbotapi.NewMessage(admin.TelegramID, response)
		msg.ReplyMarkup = keyboard
		bot.Send(msg)
	}

	return "✅ جستجو با موفقیت انجام شد"
}

// handleSessionStats shows statistics for sessions
func handleSessionStats(admin *Admin, args []string) {
	var totalSessions int64
	var totalVideos int64
	var totalExercises int64

	db.Model(&Session{}).Count(&totalSessions)
	db.Model(&Video{}).Count(&totalVideos)
	db.Model(&Exercise{}).Count(&totalExercises)

	response := fmt.Sprintf("📊 آمار جلسات:\n\n"+
		"📚 تعداد کل جلسات: %d\n"+
		"🎥 تعداد کل ویدیوها: %d\n"+
		"✍️ تعداد کل تمرین‌ها: %d\n",
		totalSessions, totalVideos, totalExercises)

	sendMessage(admin.TelegramID, response)
}

// handleVideoStats shows statistics for videos
func handleVideoStats(admin *Admin, args []string) {
	var totalVideos int64
	var videosBySession []struct {
		SessionNumber int
		Count         int64
	}

	db.Model(&Video{}).Count(&totalVideos)
	db.Model(&Video{}).
		Select("sessions.number as session_number, count(*) as count").
		Joins("left join sessions on videos.session_id = sessions.id").
		Group("sessions.number").
		Order("sessions.number").
		Scan(&videosBySession)

	response := fmt.Sprintf("📊 آمار ویدیوها:\n\n"+
		"🎥 تعداد کل ویدیوها: %d\n\n"+
		"📚 تعداد ویدیوها به تفکیک جلسه:\n",
		totalVideos)

	for _, v := range videosBySession {
		response += fmt.Sprintf("جلسه %d: %d ویدیو\n", v.SessionNumber, v.Count)
	}

	sendMessage(admin.TelegramID, response)
}

// handleUserSearchResponse processes user search response
func handleUserSearchResponse(admin *Admin, query string) {
	response := searchUser(admin, query)
	sendMessage(admin.TelegramID, response)
	delete(adminStates, admin.TelegramID)
}

// handleAddSessionResponse processes add session response
func handleAddSessionResponse(admin *Admin, input string) {
	parts := strings.Split(input, "|")
	if len(parts) != 3 {
		sendMessage(admin.TelegramID, "❌ فرمت نامعتبر. لطفا به فرمت زیر وارد کنید:\nشماره جلسه|عنوان|توضیحات")
		return
	}

	sessionNum, err := strconv.Atoi(parts[0])
	if err != nil {
		sendMessage(admin.TelegramID, "❌ شماره جلسه باید عدد باشد")
		return
	}

	// Check if session number already exists
	var existingSession Session
	if err := db.Where("number = ?", sessionNum).First(&existingSession).Error; err == nil {
		sendMessage(admin.TelegramID, "❌ این شماره جلسه قبلا ثبت شده است")
		return
	}

	session := Session{
		Number:      sessionNum,
		Title:       parts[1],
		Description: parts[2],
	}

	if err := db.Create(&session).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در ثبت جلسه")
		return
	}

	response := fmt.Sprintf("✅ جلسه با موفقیت اضافه شد:\n\n"+
		"📚 شماره جلسه: %d\n"+
		"📝 عنوان: %s\n"+
		"📄 توضیحات: %s",
		session.Number, session.Title, session.Description)

	// Add inline keyboard for quick actions
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("✏️ ویرایش جلسه", fmt.Sprintf("edit_session:%d", session.ID)),
			tgbotapi.NewInlineKeyboardButtonData("🗑️ حذف جلسه", fmt.Sprintf("delete_session:%d", session.ID)),
		),
	)

	msg := tgbotapi.NewMessage(admin.TelegramID, response)
	msg.ReplyMarkup = keyboard
	bot.Send(msg)

	delete(adminStates, admin.TelegramID)
}

// handleSessionNumberResponse processes session number response
func handleSessionNumberResponse(admin *Admin, input string) {
	sessionNum, err := strconv.Atoi(input)
	if err != nil {
		sendMessage(admin.TelegramID, "❌ شماره جلسه باید عدد باشد")
		return
	}

	var session Session
	if err := db.Where("number = ?", sessionNum).First(&session).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ جلسه یافت نشد")
		return
	}

	state := adminStates[admin.TelegramID]
	switch state {
	case StateEditSession:
		response := fmt.Sprintf("✏️ ویرایش جلسه %d:\n\n"+
			"📝 عنوان فعلی: %s\n"+
			"📄 توضیحات فعلی: %s\n\n"+
			"لطفا اطلاعات جدید را به فرمت زیر وارد کنید:\nعنوان|توضیحات",
			session.Number, session.Title, session.Description)
		sendMessage(admin.TelegramID, response)
		adminStates[admin.TelegramID] = fmt.Sprintf("edit_session:%d", session.ID)

	case StateDeleteSession:
		if err := db.Delete(&session).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ خطا در حذف جلسه")
			return
		}
		sendMessage(admin.TelegramID, fmt.Sprintf("✅ جلسه %d با موفقیت حذف شد", sessionNum))
		delete(adminStates, admin.TelegramID)
	}
}

// handleAddVideoResponse processes add video response
func handleAddVideoResponse(admin *Admin, input string) {
	state := adminStates[admin.TelegramID]
	if state == StateAddVideo {
		// First step: Get session number
		sessionNum, err := strconv.Atoi(input)
		if err != nil {
			sendMessage(admin.TelegramID, "❌ شماره جلسه باید عدد باشد")
			return
		}

		// Check if session exists
		var session Session
		if err := db.Where("number = ?", sessionNum).First(&session).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ جلسه یافت نشد")
			return
		}

		// Store session number for next step
		adminStates[admin.TelegramID] = fmt.Sprintf("add_video:%d", session.ID)
		sendMessage(admin.TelegramID, "لطفا عنوان و لینک ویدیو را به فرمت زیر وارد کنید:\nعنوان|لینک")
		return
	}

	// Second step: Get video details
	parts := strings.Split(input, "|")
	if len(parts) != 2 {
		sendMessage(admin.TelegramID, "❌ فرمت نامعتبر. لطفا به فرمت زیر وارد کنید:\nعنوان|لینک")
		return
	}

	// Extract session ID from state
	stateParts := strings.Split(state, ":")
	if len(stateParts) != 2 {
		sendMessage(admin.TelegramID, "❌ خطا در پردازش اطلاعات")
		delete(adminStates, admin.TelegramID)
		return
	}

	sessionID, err := strconv.ParseUint(stateParts[1], 10, 32)
	if err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در پردازش اطلاعات")
		delete(adminStates, admin.TelegramID)
		return
	}

	// Validate video link
	videoLink := parts[1]
	if !strings.HasPrefix(videoLink, "http://") && !strings.HasPrefix(videoLink, "https://") {
		sendMessage(admin.TelegramID, "❌ لینک ویدیو باید با http:// یا https:// شروع شود")
		return
	}

	// Create video with current date
	video := Video{
		Title:     parts[0],
		VideoLink: videoLink,
		SessionID: uint(sessionID),
		Date:      time.Now(), // Set the current date
	}

	if err := db.Create(&video).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در ثبت ویدیو")
		delete(adminStates, admin.TelegramID)
		return
	}

	response := fmt.Sprintf("✅ ویدیو با موفقیت اضافه شد:\n\n"+
		"📝 عنوان: %s\n"+
		"🔗 لینک: %s\n"+
		"📅 تاریخ: %s",
		video.Title, video.VideoLink, video.Date.Format("2006-01-02 15:04:05"))

	// Add inline keyboard for quick actions
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("✏️ ویرایش ویدیو", fmt.Sprintf("edit_video:%d", video.ID)),
			tgbotapi.NewInlineKeyboardButtonData("🗑️ حذف ویدیو", fmt.Sprintf("delete_video:%d", video.ID)),
		),
	)

	msg := tgbotapi.NewMessage(admin.TelegramID, response)
	msg.ReplyMarkup = keyboard
	bot.Send(msg)

	delete(adminStates, admin.TelegramID)
}

// handleEditVideoResponse processes edit video response
func handleEditVideoResponse(admin *Admin, input string) {
	state := adminStates[admin.TelegramID]
	if state == StateEditVideo {
		// First step: Get video ID
		videoID, err := strconv.ParseUint(input, 10, 32)
		if err != nil {
			sendMessage(admin.TelegramID, "❌ آیدی ویدیو باید عدد باشد")
			return
		}

		// Check if video exists
		var video Video
		if err := db.First(&video, videoID).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ ویدیو یافت نشد")
			return
		}

		// Store video ID for next step
		adminStates[admin.TelegramID] = fmt.Sprintf("edit_video:%d", video.ID)
		sendMessage(admin.TelegramID, fmt.Sprintf("✏️ ویرایش ویدیو:\n\n"+
			"📝 عنوان فعلی: %s\n"+
			"🔗 لینک فعلی: %s\n\n"+
			"لطفا اطلاعات جدید را به فرمت زیر وارد کنید:\nعنوان|لینک",
			video.Title, video.VideoLink))
		return
	}

	// Second step: Get new video details
	parts := strings.Split(input, "|")
	if len(parts) != 2 {
		sendMessage(admin.TelegramID, "❌ فرمت نامعتبر. لطفا به فرمت زیر وارد کنید:\nعنوان|لینک")
		return
	}

	// Extract video ID from state
	stateParts := strings.Split(state, ":")
	if len(stateParts) != 2 {
		sendMessage(admin.TelegramID, "❌ خطا در پردازش اطلاعات")
		delete(adminStates, admin.TelegramID)
		return
	}

	videoID, err := strconv.ParseUint(stateParts[1], 10, 32)
	if err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در پردازش اطلاعات")
		delete(adminStates, admin.TelegramID)
		return
	}

	// Validate video link
	videoLink := parts[1]
	if !strings.HasPrefix(videoLink, "http://") && !strings.HasPrefix(videoLink, "https://") {
		sendMessage(admin.TelegramID, "❌ لینک ویدیو باید با http:// یا https:// شروع شود")
		return
	}

	// Update video
	var video Video
	if err := db.First(&video, videoID).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ ویدیو یافت نشد")
		delete(adminStates, admin.TelegramID)
		return
	}

	video.Title = parts[0]
	video.VideoLink = videoLink

	// Fix: Ensure CreatedAt is valid before saving
	if video.CreatedAt.IsZero() {
		video.CreatedAt = time.Now() // or fetch the original value if you want
	}

	if err := db.Save(&video).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در ویرایش ویدیو")
		delete(adminStates, admin.TelegramID)
		return
	}

	response := fmt.Sprintf("✅ ویدیو با موفقیت ویرایش شد:\n\n"+
		"📝 عنوان: %s\n"+
		"🔗 لینک: %s",
		video.Title, video.VideoLink)

	// Add inline keyboard for quick actions
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("✏️ ویرایش مجدد", fmt.Sprintf("edit_video:%d", video.ID)),
			tgbotapi.NewInlineKeyboardButtonData("🗑️ حذف ویدیو", fmt.Sprintf("delete_video:%d", video.ID)),
		),
	)

	msg := tgbotapi.NewMessage(admin.TelegramID, response)
	msg.ReplyMarkup = keyboard
	bot.Send(msg)

	delete(adminStates, admin.TelegramID)
}

// handleDeleteVideoResponse processes delete video response
func handleDeleteVideoResponse(admin *Admin, input string) {
	videoID, err := strconv.ParseUint(input, 10, 32)
	if err != nil {
		sendMessage(admin.TelegramID, "❌ آیدی ویدیو باید عدد باشد")
		return
	}

	var video Video
	if err := db.First(&video, videoID).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ ویدیو یافت نشد")
		return
	}

	if err := db.Delete(&video).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در حذف ویدیو")
		return
	}

	sendMessage(admin.TelegramID, fmt.Sprintf("✅ ویدیو با موفقیت حذف شد"))
	delete(adminStates, admin.TelegramID)
}

// handleEditSessionInfo processes edit session info response
func handleEditSessionInfo(admin *Admin, input string) {
	parts := strings.Split(input, "|")
	if len(parts) != 2 {
		sendMessage(admin.TelegramID, "❌ فرمت نامعتبر. لطفا به فرمت زیر وارد کنید:\nعنوان|توضیحات")
		return
	}

	// Extract session ID from state
	stateParts := strings.Split(adminStates[admin.TelegramID], ":")
	if len(stateParts) != 2 {
		sendMessage(admin.TelegramID, "❌ خطا در پردازش اطلاعات")
		delete(adminStates, admin.TelegramID)
		return
	}

	sessionID, err := strconv.ParseUint(stateParts[1], 10, 32)
	if err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در پردازش اطلاعات")
		delete(adminStates, admin.TelegramID)
		return
	}

	// Update session
	var session Session
	if err := db.First(&session, sessionID).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ جلسه یافت نشد")
		delete(adminStates, admin.TelegramID)
		return
	}

	session.Title = parts[0]
	session.Description = parts[1]

	if err := db.Save(&session).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در ویرایش جلسه")
		delete(adminStates, admin.TelegramID)
		return
	}

	response := fmt.Sprintf("✅ جلسه با موفقیت ویرایش شد:\n\n"+
		"📚 شماره جلسه: %d\n"+
		"📝 عنوان: %s\n"+
		"📄 توضیحات: %s",
		session.Number, session.Title, session.Description)

	// Add inline keyboard for quick actions
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("✏️ ویرایش مجدد", fmt.Sprintf("edit_session:%d", session.ID)),
			tgbotapi.NewInlineKeyboardButtonData("🗑️ حذف جلسه", fmt.Sprintf("delete_session:%d", session.ID)),
		),
	)

	msg := tgbotapi.NewMessage(admin.TelegramID, response)
	msg.ReplyMarkup = keyboard
	bot.Send(msg)

	delete(adminStates, admin.TelegramID)
}

// Helper to send long messages in 4096-char chunks (by runes, for UTF-8 safety)
func sendLongMessage(chatID int64, text string, replyMarkup interface{}) {
	const maxLen = 4096
	runes := []rune(text)
	for len(runes) > 0 {
		chunkLen := maxLen
		if len(runes) < maxLen {
			chunkLen = len(runes)
		}
		chunk := string(runes[:chunkLen])
		msg := tgbotapi.NewMessage(chatID, chunk)
		if replyMarkup != nil && len(runes) == chunkLen {
			msg.ReplyMarkup = replyMarkup
		}
		if _, err := bot.Send(msg); err != nil {
			fmt.Printf("[ERROR] bot.Send failed in sendLongMessage: %v\n", err)
		}
		runes = runes[chunkLen:]
	}
}

// handleLicenseVerification handles license verification approval/rejection
func handleLicenseVerification(admin *Admin, data string) {
	parts := strings.Split(data, ":")
	if len(parts) != 2 {
		return
	}

	action := parts[0]
	verificationID, err := strconv.ParseUint(parts[1], 10, 32)
	if err != nil {
		return
	}

	var verification LicenseVerification
	if err := db.Preload("User").First(&verification, verificationID).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ درخواست تایید یافت نشد")
		return
	}

	if verification.IsApproved {
		sendMessage(admin.TelegramID, "❌ این درخواست قبلا تایید شده است")
		return
	}

	now := time.Now()
	if action == "verify" {
		// Approve verification
		verification.IsApproved = true
		verification.ApprovedBy = &admin.ID
		verification.ApprovedAt = &now

		if err := db.Save(&verification).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ خطا در تایید درخواست")
			return
		}

		// Update user
		verification.User.IsVerified = true
		if err := db.Save(&verification.User).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ خطا در به‌روزرسانی کاربر")
			return
		}

		// Send success message to admin
		sendMessage(admin.TelegramID, "✅ درخواست با موفقیت تایید شد")

		// Send success message to user
		msg := tgbotapi.NewMessage(verification.User.TelegramID, "✅ درخواست شما تایید شد!\n\nبه ربات MONETIZE AI🥇 خوش آمدید! من دستیار هوشمند شما هستم. بیایید سفر خود را برای ساخت یک کسب و کار موفق مبتنی بر هوش مصنوعی شروع کنیم.")
		msg.ReplyMarkup = getMainMenuKeyboard()
		bot.Send(msg)
		// Send session 1 info
		getCurrentSessionInfo(&verification.User)

		// Log admin action
		logAdminAction(admin, "verify_license", fmt.Sprintf("تایید لایسنس کاربر %s", verification.User.Username), "user", verification.User.ID)

	} else if action == "reject" {
		// Reject verification
		if err := db.Delete(&verification).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ خطا در رد درخواست")
			return
		}

		// Send rejection message to user
		msg := tgbotapi.NewMessage(verification.User.TelegramID, "❌ درخواست شما رد شد.\n\nلطفا با پشتیبانی تماس بگیرید:\n\n📞 "+SUPPORT_NUMBER)
		bot.Send(msg)

		// Send success message to admin
		sendMessage(admin.TelegramID, "✅ درخواست با موفقیت رد شد")

		// Log admin action
		logAdminAction(admin, "reject_license", fmt.Sprintf("رد لایسنس کاربر %s", verification.User.Username), "user", verification.User.ID)
	}
}

// handleAdminBroadcast handles broadcasting messages to all users
func handleAdminBroadcast(admin *Admin, args []string) string {
	// Set state to wait for broadcast message
	adminStates[admin.TelegramID] = StateWaitingForBroadcast

	msg := tgbotapi.NewMessage(admin.TelegramID, "📢 لطفا پیام مورد نظر برای ارسال به همه کاربران را وارد کنید:\n\n"+
		"شما می‌توانید متن، تصویر، ویدیو یا پیام صوتی ارسال کنید.\n"+
		"برای لغو عملیات، دستور /cancel را ارسال کنید.")
	msg.ReplyMarkup = tgbotapi.ForceReply{}
	bot.Send(msg)

	return "در انتظار پیام..."
}

// handleBroadcastMessage processes the broadcast message and sends it to all users
func handleBroadcastMessage(admin *Admin, message *tgbotapi.Message) string {
	var previewMsg string
	var mediaType string
	var fileID string
	var content string

	// Determine media type and create appropriate preview message
	if message.Photo != nil && len(message.Photo) > 0 {
		mediaType = "photo"
		fileID = message.Photo[len(message.Photo)-1].FileID
		content = message.Caption
		previewMsg = fmt.Sprintf("📢 پیش‌نمایش پیام همگانی (تصویر):\n\n%s", content)
	} else if message.Video != nil {
		mediaType = "video"
		fileID = message.Video.FileID
		content = message.Caption
		previewMsg = fmt.Sprintf("📢 پیش‌نمایش پیام همگانی (ویدیو):\n\n%s", content)
	} else if message.Voice != nil {
		mediaType = "voice"
		fileID = message.Voice.FileID
		content = message.Caption
		previewMsg = fmt.Sprintf("📢 پیش‌نمایش پیام همگانی (پیام صوتی):\n\n%s", content)
	} else {
		mediaType = "text"
		content = message.Text
		previewMsg = fmt.Sprintf("📢 پیش‌نمایش پیام همگانی:\n\n%s", content)
	}

	// Create inline keyboard for confirmation
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("✅ بله، ارسال کن", "confirm_broadcast"),
			tgbotapi.NewInlineKeyboardButtonData("❌ خیر، لغو کن", "cancel_broadcast"),
		),
	)

	// Send preview message with confirmation buttons
	msg := tgbotapi.NewMessage(admin.TelegramID, previewMsg)
	msg.ReplyMarkup = keyboard
	bot.Send(msg)

	// Store the message content in admin state for later use
	stateData := fmt.Sprintf("%s:%s:%s:%s", StateConfirmBroadcast, mediaType, fileID, content)
	if mediaType == "text" {
		stateData = fmt.Sprintf("%s:%s:%s:%s", StateConfirmBroadcast, mediaType, "", message.Text)
	}
	adminStates[admin.TelegramID] = stateData

	return "لطفا تایید یا لغو را انتخاب کنید"
}

// handleBroadcastConfirmation handles the broadcast confirmation
func handleBroadcastConfirmation(admin *Admin, confirm bool) string {
	// Get the stored message info from state
	state := adminStates[admin.TelegramID]
	parts := strings.SplitN(state, ":", 4) // Use SplitN to handle colons in the message content
	if len(parts) != 4 {
		delete(adminStates, admin.TelegramID)
		return "❌ خطا در پردازش پیام"
	}

	mediaType := parts[1]
	fileID := parts[2]
	content := parts[3]

	if !confirm {
		delete(adminStates, admin.TelegramID)
		return "❌ ارسال پیام همگانی لغو شد"
	}

	var users []User
	if err := db.Where("is_active = ?", true).Find(&users).Error; err != nil {
		delete(adminStates, admin.TelegramID)
		return "❌ خطا در دریافت لیست کاربران"
	}

	successCount := 0
	failCount := 0

	for _, user := range users {
		var err error
		switch mediaType {
		case "photo":
			photo := tgbotapi.NewPhoto(user.TelegramID, tgbotapi.FileID(fileID))
			photo.Caption = content
			_, err = bot.Send(photo)
		case "video":
			video := tgbotapi.NewVideo(user.TelegramID, tgbotapi.FileID(fileID))
			video.Caption = content
			_, err = bot.Send(video)
		case "voice":
			voice := tgbotapi.NewVoice(user.TelegramID, tgbotapi.FileID(fileID))
			voice.Caption = content
			_, err = bot.Send(voice)
		case "text":
			msg := tgbotapi.NewMessage(user.TelegramID, fmt.Sprintf("📢 پیام از ادمین:\n\n%s", content))
			_, err = bot.Send(msg)
		}

		if err != nil {
			failCount++
			continue
		}
		successCount++
	}

	// Log the broadcast action
	logAdminAction(admin, "broadcast_message", fmt.Sprintf("Broadcast %s to %d users (%d failed)", mediaType, successCount, failCount), "system", 0)

	delete(adminStates, admin.TelegramID)
	return fmt.Sprintf("✅ پیام با موفقیت ارسال شد:\n\n📊 آمار ارسال:\n• موفق: %d\n• ناموفق: %d", successCount, failCount)
}

func handleAdminSMSBroadcast(admin *Admin, args []string) string {
	adminStates[admin.TelegramID] = StateWaitingForSMSBroadcast
	msg := tgbotapi.NewMessage(admin.TelegramID, "📲 لطفا متن پیامک را وارد کنید:\n\nبرای لغو عملیات، دستور /cancel را ارسال کنید.")
	msg.ReplyMarkup = tgbotapi.ForceReply{}
	bot.Send(msg)
	return "در انتظار پیامک..."
}

func handleSMSBroadcastMessage(admin *Admin, message string) string {
	previewMsg := fmt.Sprintf("📲 پیش‌نمایش پیامک همگانی:\n\n%s\n\nآیا می‌خواهید این پیامک را به همه کاربران ارسال کنید؟", message)
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("✅ بله، ارسال کن", "confirm_sms_broadcast"),
			tgbotapi.NewInlineKeyboardButtonData("❌ خیر، لغو کن", "cancel_sms_broadcast"),
		),
	)
	msg := tgbotapi.NewMessage(admin.TelegramID, previewMsg)
	msg.ReplyMarkup = keyboard
	bot.Send(msg)
	adminStates[admin.TelegramID] = StateConfirmSMSBroadcast + ":" + message
	return "لطفا تایید یا لغو را انتخاب کنید"
}

func handleSMSBroadcastConfirmation(admin *Admin, confirm bool) string {
	state := adminStates[admin.TelegramID]
	message := strings.TrimPrefix(state, StateConfirmSMSBroadcast+":")
	if !confirm {
		delete(adminStates, admin.TelegramID)
		return "❌ ارسال پیامک همگانی لغو شد"
	}
	// Get all user phone numbers
	var users []User
	if err := db.Where("is_active = ? AND phone != ''", true).Find(&users).Error; err != nil {
		delete(adminStates, admin.TelegramID)
		return "❌ خطا در دریافت لیست کاربران"
	}
	var phones []string
	for _, user := range users {
		normalized := normalizePhoneNumber(user.Phone)
		if normalized != "" {
			phones = append(phones, normalized)
		}
	}
	// Send SMS and report status to admin
	// status := ""
	if len(phones) == 0 {
		delete(adminStates, admin.TelegramID)
		return "❌ هیچ شماره معتبری برای ارسال پیامک پیدا نشد."
	}
	apiStatus, err := sendBulkSMSWithStatus(phones, message)
	delete(adminStates, admin.TelegramID)
	if err != nil {
		return fmt.Sprintf("❌ خطا در ارسال پیامک همگانی:\n%s", err.Error())
	}
	return fmt.Sprintf("وضعیت ارسال پیامک: %s\nتعداد شماره معتبر: %d", apiStatus, len(phones))
}

// 🔒 SECURITY: Handle admin security commands
func handleAdminSecurity(admin *Admin, args []string) string {
	if len(args) == 0 {
		// Show security overview
		blockedCount := len(blockedUsers)
		suspiciousCount := 0
		for _, count := range suspiciousActivityCount {
			if count > 0 {
				suspiciousCount++
			}
		}

		response := fmt.Sprintf("🛡️ **وضعیت امنیت سیستم:**\n\n"+
			"🚫 کاربران مسدود شده: %d\n"+
			"⚠️ کاربران مشکوک: %d\n\n"+
			"**دستورات امنیتی:**\n"+
			"• `/admin_security list` - نمایش کاربران مسدود شده\n"+
			"• `/admin_security unblock <user_id>` - آزادسازی کاربر\n"+
			"• `/admin_security clear <user_id>` - پاک کردن سوابق مشکوک\n"+
			"• `/admin_security logs` - نمایش لاگ‌های امنیتی",
			blockedCount, suspiciousCount)

		return response
	}

	switch args[0] {
	case "list":
		if len(blockedUsers) == 0 {
			return "✅ هیچ کاربری مسدود نشده است."
		}

		response := "🚫 **کاربران مسدود شده:**\n\n"
		for telegramID := range blockedUsers {
			violationCount := suspiciousActivityCount[telegramID]
			response += fmt.Sprintf("👤 آیدی: %d\n⚠️ تعداد تخلفات: %d\n\n", telegramID, violationCount)
		}
		return response

	case "unblock":
		if len(args) < 2 {
			return "❌ لطفا آیدی کاربر را وارد کنید: `/admin_security unblock <user_id>`"
		}

		userID, err := strconv.ParseInt(args[1], 10, 64)
		if err != nil {
			return "❌ آیدی کاربر نامعتبر است"
		}

		if !blockedUsers[userID] {
			return "❌ این کاربر مسدود نشده است"
		}

		// Unblock user
		delete(blockedUsers, userID)
		suspiciousActivityCount[userID] = 0

		logger.Info("User unblocked by admin",
			zap.Int64("admin_id", admin.TelegramID),
			zap.Int64("user_id", userID))

		return fmt.Sprintf("✅ کاربر %d آزادسازی شد.", userID)

	case "clear":
		if len(args) < 2 {
			return "❌ لطفا آیدی کاربر را وارد کنید: `/admin_security clear <user_id>`"
		}

		userID, err := strconv.ParseInt(args[1], 10, 64)
		if err != nil {
			return "❌ آیدی کاربر نامعتبر است"
		}

		// Clear suspicious activity
		suspiciousActivityCount[userID] = 0
		delete(chatRateLimits, userID)
		delete(chatMessageCounts, userID)

		logger.Info("User suspicious activity cleared by admin",
			zap.Int64("admin_id", admin.TelegramID),
			zap.Int64("user_id", userID))

		return fmt.Sprintf("✅ سوابق مشکوک کاربر %d پاک شد.", userID)

	case "logs":
		// This would show recent security logs
		return "📋 نمایش لاگ‌های امنیتی در نسخه‌های آینده اضافه خواهد شد."

	default:
		return "❌ دستور نامعتبر. از `/admin_security` برای راهنما استفاده کنید."
	}
}
