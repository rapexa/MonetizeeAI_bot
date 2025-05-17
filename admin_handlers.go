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

// handleMessage processes incoming messages
func handleMessage(update tgbotapi.Update) {
	admin := getAdminByTelegramID(update.Message.From.ID)
	if admin == nil {
		return
	}

	// Get current state
	state, exists := adminStates[admin.TelegramID]
	if !exists {
		return
	}

	// Handle different states
	switch state {
	case StateWaitingForUserID:
		handleUserSearchResponse(admin, update.Message.Text)

	case StateWaitingForSessionInfo:
		handleAddSessionResponse(admin, update.Message.Text)

	case StateEditSession:
		handleSessionNumberResponse(admin, update.Message.Text)

	case StateDeleteSession:
		handleSessionNumberResponse(admin, update.Message.Text)

	case StateAddVideo:
		handleAddVideoResponse(admin, update.Message.Text)

	case StateEditVideo:
		handleEditVideoResponse(admin, update.Message.Text)

	case StateDeleteVideo:
		handleDeleteVideoResponse(admin, update.Message.Text)

	default:
		if strings.HasPrefix(state, "edit_session:") {
			handleEditSessionInfo(admin, update.Message.Text)
		} else if strings.HasPrefix(state, "add_video:") {
			handleAddVideoResponse(admin, update.Message.Text)
		} else if strings.HasPrefix(state, "edit_video:") {
			handleEditVideoResponse(admin, update.Message.Text)
		}
	}
}
