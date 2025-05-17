package main

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"gorm.io/gorm"
)

// Add these constants at the top of the file
const (
	StateWaitingForUserID      = "waiting_for_user_id"
	StateWaitingForSessionNum  = "waiting_for_session_num"
	StateWaitingForSessionInfo = "waiting_for_session_info"
	StateWaitingForVideoInfo   = "waiting_for_video_info"
	StateEditSession           = "edit_session"
	StateDeleteSession         = "delete_session"
	StateAddVideo              = "add_video"
	StateEditVideo             = "edit_video"
	StateDeleteVideo           = "delete_video"
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
	if len(args) == 0 {
		var sessions []Session
		db.Order("number desc").Limit(12).Find(&sessions) // Get last 12 sessions

		// Build the response with sessions list
		var response strings.Builder
		for _, session := range sessions {
			response.WriteString(fmt.Sprintf("📖 جلسه %d: %s\n📝 %s\n\n",
				session.Number,
				session.Title,
				session.Description))
		}

		// Create message with sessions list and buttons
		msg := tgbotapi.NewMessage(admin.TelegramID, response.String())
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
		msg.ReplyMarkup = keyboard
		bot.Send(msg)

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
	if len(args) == 0 {
		var videos []Video
		db.Preload("Session").Order("created_at desc").Find(&videos)

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
		msg := tgbotapi.NewMessage(admin.TelegramID, response)
		msg.ReplyMarkup = keyboard
		bot.Send(msg)

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
	admin := getAdminByTelegramID(update.CallbackQuery.From.ID)
	if admin == nil {
		sendMessage(update.CallbackQuery.From.ID, "❌ شما دسترسی به این بخش را ندارید")
		return
	}

	// Parse callback data
	parts := strings.Split(update.CallbackQuery.Data, ":")
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
	callback := tgbotapi.NewCallback(update.CallbackQuery.ID, "")
	bot.Request(callback)
}

// getAdminByTelegramID returns admin by telegram ID
func getAdminByTelegramID(telegramID int64) *Admin {
	var admin Admin
	if err := db.Where("telegram_id = ?", telegramID).First(&admin).Error; err != nil {
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

	// Create video
	video := Video{
		Title:     parts[0],
		VideoLink: videoLink,
		SessionID: uint(sessionID),
	}

	if err := db.Create(&video).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در ثبت ویدیو")
		delete(adminStates, admin.TelegramID)
		return
	}

	response := fmt.Sprintf("✅ ویدیو با موفقیت اضافه شد:\n\n"+
		"📝 عنوان: %s\n"+
		"🔗 لینک: %s",
		video.Title, video.VideoLink)

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
