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

		response := "🎥 لیست ویدیوها:\n\n"
		for _, video := range videos {
			response += fmt.Sprintf("🆔 آیدی: %d\n📝 عنوان: %s\n📚 جلسه: %d - %s\n🔗 لینک: %s\n\n",
				video.ID,
				video.Title,
				video.Session.Number,
				video.Session.Title,
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
			response += fmt.Sprintf("🆔 آیدی: %d\n📝 عنوان: %s\n📚 جلسه: %d\n🔗 لینک: %s\n\n",
				video.ID,
				video.Title,
				video.Session.Number,
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
			response += fmt.Sprintf("🆔 آیدی: %d\n📝 عنوان: %s\n📚 جلسه: %d\n\n",
				video.ID,
				video.Title,
				video.Session.Number)
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

// handleSearchUser handles user search
func handleSearchUser(admin *Admin, params []string) {
	msg := tgbotapi.NewMessage(admin.TelegramID, "🔍 لطفا آیدی عددی یا نام کاربری را وارد کنید:\n\n"+
		"📝 نکات:\n"+
		"• برای جستجو با آیدی، عدد را وارد کنید\n"+
		"• برای جستجو با نام کاربری، بخشی از نام را وارد کنید\n"+
		"• جستجو با نام کاربری حساس به حروف کوچک و بزرگ نیست")
	msg.ReplyMarkup = tgbotapi.ForceReply{}
	bot.Send(msg)
	adminStates[admin.TelegramID] = StateWaitingForUserID
}

// handleUserSearchResponse processes the response to a user search prompt
func handleUserSearchResponse(admin *Admin, searchText string) {
	// First try to parse as user ID
	userID, err := strconv.ParseInt(searchText, 10, 64)
	var users []User
	var searchErr error

	if err == nil {
		// If it's a valid number, search by Telegram ID
		searchErr = db.Where("telegram_id = ?", userID).Find(&users).Error
	} else {
		// If not a number, search by username
		searchErr = db.Where("username ILIKE ?", "%"+searchText+"%").Find(&users).Error
	}

	if searchErr != nil {
		sendMessage(admin.TelegramID, "❌ خطا در جستجوی کاربر")
		return
	}

	if len(users) == 0 {
		sendMessage(admin.TelegramID, "❌ کاربری یافت نشد")
		return
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

	// Clear the admin state after handling the search
	delete(adminStates, admin.TelegramID)
}

// handleUserStats shows user statistics
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

// handleAddSessionResponse processes the response for adding a new session
func handleAddSessionResponse(admin *Admin, response string) {
	parts := strings.Split(response, "|")
	if len(parts) != 3 {
		sendMessage(admin.TelegramID, "❌ فرمت نامعتبر. لطفا به فرمت زیر وارد کنید:\nشماره جلسه|عنوان|توضیحات")
		return
	}

	sessionNum, err := strconv.Atoi(strings.TrimSpace(parts[0]))
	if err != nil {
		sendMessage(admin.TelegramID, "❌ شماره جلسه نامعتبر است")
		return
	}

	title := strings.TrimSpace(parts[1])
	description := strings.TrimSpace(parts[2])

	// Check if session number already exists
	var existingSession Session
	if err := db.Where("number = ?", sessionNum).First(&existingSession).Error; err == nil {
		sendMessage(admin.TelegramID, "❌ این شماره جلسه قبلا استفاده شده است")
		return
	}

	// Create new session
	session := Session{
		Number:       sessionNum,
		Title:        title,
		Description:  description,
		IsActive:     true,
		ThumbnailURL: "", // Add empty thumbnail URL
	}

	if err := db.Create(&session).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در ایجاد جلسه")
		return
	}

	// Create confirmation message with all session details
	confirmationMsg := fmt.Sprintf("✅ جلسه با موفقیت ایجاد شد:\n\n"+
		"🆔 شماره: %d\n"+
		"📝 عنوان: %s\n"+
		"📄 توضیحات: %s",
		session.Number,
		session.Title,
		session.Description)

	// Add inline keyboard for quick actions
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("✏️ ویرایش جلسه", fmt.Sprintf("edit_session:%d", session.Number)),
			tgbotapi.NewInlineKeyboardButtonData("➕ افزودن ویدیو", fmt.Sprintf("add_video:%d", session.Number)),
		),
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("🗑️ حذف جلسه", fmt.Sprintf("delete_session:%d", session.Number)),
		),
	)
	msg := tgbotapi.NewMessage(admin.TelegramID, confirmationMsg)
	msg.ReplyMarkup = keyboard
	bot.Send(msg)

	logAdminAction(admin, "add_session", fmt.Sprintf("جلسه %d اضافه شد: %s", session.Number, session.Title), "session", session.ID)
	delete(adminStates, admin.TelegramID)
}

// handleSessionNumberResponse processes the response for session number input
func handleSessionNumberResponse(admin *Admin, response string) {
	sessionNum, err := strconv.Atoi(strings.TrimSpace(response))
	if err != nil {
		sendMessage(admin.TelegramID, "❌ شماره جلسه نامعتبر است")
		// Show admin menu again
		handleAdminSessions(admin, []string{})
		return
	}

	var session Session
	if err := db.Where("number = ?", sessionNum).First(&session).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ جلسه یافت نشد")
		// Show admin menu again
		handleAdminSessions(admin, []string{})
		return
	}

	// Get the current state to determine the action
	state, exists := adminStates[admin.TelegramID]
	if !exists {
		sendMessage(admin.TelegramID, "❌ خطا در پردازش درخواست")
		// Show admin menu again
		handleAdminSessions(admin, []string{})
		return
	}

	switch state {
	case StateEditSession:
		// Store the session number in the state for the next step
		adminStates[admin.TelegramID] = fmt.Sprintf("edit_session:%d", sessionNum)
		msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("✏️ ویرایش جلسه %d:\n\nلطفا اطلاعات جدید را به فرمت زیر وارد کنید:\nعنوان|توضیحات", sessionNum))
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)

	case StateDeleteSession:
		// Store session info before deletion for confirmation message
		sessionInfo := fmt.Sprintf("🆔 شماره: %d\n📝 عنوان: %s\n📄 توضیحات: %s",
			session.Number,
			session.Title,
			session.Description)

		if err := db.Delete(&session).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ خطا در حذف جلسه")
			// Show admin menu again
			handleAdminSessions(admin, []string{})
			return
		}

		confirmationMsg := fmt.Sprintf("✅ جلسه با موفقیت حذف شد:\n\n%s", sessionInfo)
		sendMessage(admin.TelegramID, confirmationMsg)

		logAdminAction(admin, "delete_session", fmt.Sprintf("جلسه %d حذف شد: %s", session.Number, session.Title), "session", session.ID)
		delete(adminStates, admin.TelegramID)
	}
}

// handleSessionStats shows session statistics
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
func handleAddVideo(admin *Admin, params []string) string {
	if len(params) == 0 {
		msg := tgbotapi.NewMessage(admin.TelegramID, "➕ افزودن ویدیو:\n\nلطفا شماره جلسه را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		return ""
	}

	sessionNum := params[0]
	msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("➕ افزودن ویدیو به جلسه %s:\n\nلطفا اطلاعات را به فرمت زیر وارد کنید:\nعنوان|لینک ویدیو", sessionNum))
	msg.ReplyMarkup = tgbotapi.ForceReply{}
	bot.Send(msg)
	return ""
}

func handleEditVideo(admin *Admin, params []string) string {
	if len(params) == 0 {
		msg := tgbotapi.NewMessage(admin.TelegramID, "✏️ ویرایش ویدیو:\n\nلطفا آیدی ویدیو را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		return ""
	}

	videoID := params[0]
	var video Video
	if err := db.Preload("Session").First(&video, videoID).Error; err != nil {
		bot.Send(tgbotapi.NewMessage(admin.TelegramID, "❌ ویدیو یافت نشد"))
		return ""
	}

	msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("✏️ ویرایش ویدیو %s:\n\nلطفا اطلاعات جدید را به فرمت زیر وارد کنید:\nعنوان|لینک\n\nاطلاعات فعلی:\nعنوان: %s\nلینک: %s",
		videoID, video.Title, video.VideoLink))
	msg.ReplyMarkup = tgbotapi.ForceReply{}
	bot.Send(msg)
	return ""
}

func handleDeleteVideo(admin *Admin, params []string) string {
	if len(params) == 0 {
		msg := tgbotapi.NewMessage(admin.TelegramID, "🗑️ حذف ویدیو:\n\nلطفا آیدی ویدیو را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		return ""
	}

	videoID := params[0]
	var video Video
	if err := db.First(&video, videoID).Error; err != nil {
		bot.Send(tgbotapi.NewMessage(admin.TelegramID, "❌ ویدیو یافت نشد"))
		return ""
	}

	if err := db.Delete(&video).Error; err != nil {
		bot.Send(tgbotapi.NewMessage(admin.TelegramID, "❌ خطا در حذف ویدیو"))
		return ""
	}

	logAdminAction(admin, "delete_video", fmt.Sprintf("ویدیو %s حذف شد", videoID), "video", video.ID)
	bot.Send(tgbotapi.NewMessage(admin.TelegramID, "✅ ویدیو با موفقیت حذف شد"))
	return ""
}

func handleVideoStats(admin *Admin, params []string) string {
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
	return ""
}

// handleAddVideoResponse processes the response for adding a new video
func handleAddVideoResponse(admin *Admin, text string) {
	state := adminStates[admin.TelegramID]

	// If state is just "add_video", this is the first step (selecting session)
	if state == StateAddVideo {
		// Parse session number
		sessionNumber, err := strconv.Atoi(strings.TrimSpace(text))
		if err != nil {
			sendMessage(admin.TelegramID, "❌ لطفا یک شماره جلسه معتبر وارد کنید")
			return
		}

		// Check if session exists
		var session Session
		if err := db.Where("number = ?", sessionNumber).First(&session).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ جلسه مورد نظر یافت نشد")
			return
		}

		// Store session number in state for next step
		adminStates[admin.TelegramID] = fmt.Sprintf("add_video:%d", sessionNumber)
		sendMessage(admin.TelegramID, "📝 لطفا عنوان و لینک ویدیو را به فرمت زیر وارد کنید:\nعنوان|لینک")
		return
	}

	// This is the second step (entering video details)
	if strings.HasPrefix(state, "add_video:") {
		parts := strings.Split(state, ":")
		if len(parts) != 2 {
			sendMessage(admin.TelegramID, "❌ خطا در پردازش درخواست")
			delete(adminStates, admin.TelegramID)
			return
		}

		sessionNumber, err := strconv.Atoi(parts[1])
		if err != nil {
			sendMessage(admin.TelegramID, "❌ خطا در پردازش شماره جلسه")
			delete(adminStates, admin.TelegramID)
			return
		}

		// Parse video details
		videoParts := strings.Split(text, "|")
		if len(videoParts) != 2 {
			sendMessage(admin.TelegramID, "❌ لطفا اطلاعات را به فرمت صحیح وارد کنید:\nعنوان|لینک")
			return
		}

		title := strings.TrimSpace(videoParts[0])
		link := strings.TrimSpace(videoParts[1])

		// Create new video
		video := Video{
			SessionID: uint(sessionNumber),
			Title:     title,
			VideoLink: link,
		}

		// Save video to database
		if err := db.Create(&video).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ خطا در ثبت ویدیو")
			delete(adminStates, admin.TelegramID)
			return
		}

		// Send confirmation message
		confirmationMsg := fmt.Sprintf("✅ ویدیو با موفقیت اضافه شد\n\n📝 عنوان: %s\n🔗 لینک: %s\n📚 جلسه: %d",
			title, link, sessionNumber)
		sendMessage(admin.TelegramID, confirmationMsg)

		// Show video management menu
		handleAdminVideos(admin, []string{})

		// Clear the admin state after successful video addition
		delete(adminStates, admin.TelegramID)
		return
	}

	// If we get here, something went wrong with the state
	sendMessage(admin.TelegramID, "❌ خطا در پردازش درخواست")
	delete(adminStates, admin.TelegramID)
}

// handleEditVideoResponse processes the response for editing a video
func handleEditVideoResponse(admin *Admin, text string) {
	state := adminStates[admin.TelegramID]

	// If state is just "edit_video", this is the first step (selecting video)
	if state == StateEditVideo {
		// Parse video ID
		videoID, err := strconv.Atoi(strings.TrimSpace(text))
		if err != nil {
			sendMessage(admin.TelegramID, "❌ لطفا یک آیدی معتبر وارد کنید")
			return
		}

		// Check if video exists
		var video Video
		if err := db.Preload("Session").First(&video, videoID).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ ویدیو مورد نظر یافت نشد")
			return
		}

		// Store video ID in state for next step
		adminStates[admin.TelegramID] = fmt.Sprintf("edit_video:%d", videoID)
		sendMessage(admin.TelegramID, fmt.Sprintf("📝 لطفا عنوان و لینک جدید ویدیو را به فرمت زیر وارد کنید:\nعنوان|لینک\n\nاطلاعات فعلی:\nعنوان: %s\nلینک: %s",
			video.Title, video.VideoLink))
		return
	}

	// This is the second step (entering new video details)
	if strings.HasPrefix(state, "edit_video:") {
		parts := strings.Split(state, ":")
		if len(parts) != 2 {
			sendMessage(admin.TelegramID, "❌ خطا در پردازش درخواست")
			delete(adminStates, admin.TelegramID)
			return
		}

		videoID, err := strconv.Atoi(parts[1])
		if err != nil {
			sendMessage(admin.TelegramID, "❌ خطا در پردازش آیدی ویدیو")
			delete(adminStates, admin.TelegramID)
			return
		}

		// Parse video details
		videoParts := strings.Split(text, "|")
		if len(videoParts) != 2 {
			sendMessage(admin.TelegramID, "❌ لطفا اطلاعات را به فرمت صحیح وارد کنید:\nعنوان|لینک")
			return
		}

		title := strings.TrimSpace(videoParts[0])
		link := strings.TrimSpace(videoParts[1])

		// Update video
		var video Video
		if err := db.Preload("Session").First(&video, videoID).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ ویدیو مورد نظر یافت نشد")
			delete(adminStates, admin.TelegramID)
			return
		}

		// Update video fields
		video.Title = title
		video.VideoLink = link

		// Save changes to database
		if err := db.Save(&video).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ خطا در ویرایش ویدیو")
			delete(adminStates, admin.TelegramID)
			return
		}

		// Send confirmation message
		confirmationMsg := fmt.Sprintf("✅ ویدیو با موفقیت ویرایش شد\n\n📝 عنوان: %s\n🔗 لینک: %s\n📚 جلسه: %d - %s",
			title, link, video.Session.Number, video.Session.Title)
		sendMessage(admin.TelegramID, confirmationMsg)

		// Show video management menu
		handleAdminVideos(admin, []string{})

		// Clear the admin state after successful video edit
		delete(adminStates, admin.TelegramID)
		return
	}

	// If we get here, something went wrong with the state
	sendMessage(admin.TelegramID, "❌ خطا در پردازش درخواست")
	delete(adminStates, admin.TelegramID)
}

func handleDeleteVideoResponse(admin *Admin, text string) {
	videoID, err := strconv.Atoi(strings.TrimSpace(text))
	if err != nil {
		sendMessage(admin.TelegramID, "❌ آیدی ویدیو نامعتبر است")
		return
	}

	var video Video
	if err := db.Preload("Session").First(&video, videoID).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ ویدیو یافت نشد")
		return
	}

	// Store video info before deletion for confirmation message
	videoInfo := fmt.Sprintf("🆔 آیدی: %d\n📝 عنوان: %s\n📚 جلسه: %d - %s",
		video.ID,
		video.Title,
		video.Session.Number,
		video.Session.Title)

	// Delete the video
	if err := db.Delete(&video).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در حذف ویدیو")
		return
	}

	// Send confirmation message
	confirmationMsg := fmt.Sprintf("✅ ویدیو با موفقیت حذف شد:\n\n%s", videoInfo)
	sendMessage(admin.TelegramID, confirmationMsg)

	// Show video management menu
	handleAdminVideos(admin, []string{})

	// Clear the admin state after successful video deletion
	delete(adminStates, admin.TelegramID)
}

// handleEditSessionInfo processes the response for editing session info
func handleEditSessionInfo(admin *Admin, response string) {
	parts := strings.Split(response, "|")
	if len(parts) != 2 {
		sendMessage(admin.TelegramID, "❌ فرمت نامعتبر. لطفا به فرمت زیر وارد کنید:\nعنوان|توضیحات")
		return
	}

	// Get session number from state
	stateParts := strings.Split(adminStates[admin.TelegramID], ":")
	if len(stateParts) != 2 {
		sendMessage(admin.TelegramID, "❌ خطا در پردازش درخواست")
		return
	}
	sessionNum, _ := strconv.Atoi(stateParts[1])

	// Update session
	var session Session
	if err := db.Where("number = ?", sessionNum).First(&session).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ جلسه یافت نشد")
		return
	}

	session.Title = strings.TrimSpace(parts[0])
	session.Description = strings.TrimSpace(parts[1])

	if err := db.Save(&session).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در ویرایش جلسه")
		return
	}

	// Create confirmation message with all session details
	confirmationMsg := fmt.Sprintf("✅ جلسه با موفقیت ویرایش شد:\n\n"+
		"🆔 شماره: %d\n"+
		"📝 عنوان: %s\n"+
		"📄 توضیحات: %s",
		session.Number,
		session.Title,
		session.Description)

	// Add inline keyboard for quick actions
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("✏️ ویرایش مجدد", fmt.Sprintf("edit_session:%d", session.Number)),
			tgbotapi.NewInlineKeyboardButtonData("➕ افزودن ویدیو", fmt.Sprintf("add_video:%d", session.Number)),
		),
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("🗑️ حذف جلسه", fmt.Sprintf("delete_session:%d", session.Number)),
		),
	)
	msg := tgbotapi.NewMessage(admin.TelegramID, confirmationMsg)
	msg.ReplyMarkup = keyboard
	bot.Send(msg)

	logAdminAction(admin, "edit_session", fmt.Sprintf("جلسه %d ویرایش شد: %s", session.Number, session.Title), "session", session.ID)
	delete(adminStates, admin.TelegramID)
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
