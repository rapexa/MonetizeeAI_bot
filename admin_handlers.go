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
	{
		Command:     "/admin_logs",
		Description: "📝 مشاهده لاگ‌های سیستم",
		Handler:     handleAdminLogs,
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

		// Add inline keyboard for actions - Search button first
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

		return ""
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
		return ""

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

// handleAdminLogs shows system logs
func handleAdminLogs(admin *Admin, args []string) string {
	var actions []AdminAction
	db.Preload("Admin").Order("created_at desc").Limit(50).Find(&actions)

	if len(actions) == 0 {
		return "📝 هیچ فعالیتی ثبت نشده است"
	}

	response := "📝 آخرین فعالیت‌های ادمین:\n\n"
	for _, action := range actions {
		// Format the action type for better readability
		actionType := action.Action
		switch action.Action {
		case "add_session":
			actionType = "➕ افزودن جلسه"
		case "edit_session":
			actionType = "✏️ ویرایش جلسه"
		case "delete_session":
			actionType = "🗑️ حذف جلسه"
		case "add_video":
			actionType = "➕ افزودن ویدیو"
		case "edit_video":
			actionType = "✏️ ویرایش ویدیو"
		case "delete_video":
			actionType = "🗑️ حذف ویدیو"
		case "ban_user":
			actionType = "🚫 مسدود کردن کاربر"
		case "unban_user":
			actionType = "✅ رفع مسدودیت کاربر"
		}

		response += fmt.Sprintf("👤 ادمین: %s\n📝 عملیات: %s\n📋 جزئیات: %s\n⏰ تاریخ: %s\n\n",
			action.Admin.Username,
			actionType,
			action.Details,
			action.CreatedAt.Format("2006-01-02 15:04:05"))
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

// handleMessage processes incoming messages
func handleMessage(update *tgbotapi.Update) {
	// Check if user is admin
	admin := getAdminByTelegramID(update.Message.From.ID)
	if admin != nil {
		// Check if this is a response to a state prompt
		if state, exists := adminStates[admin.TelegramID]; exists {
			switch state {
			case StateWaitingForUserID:
				handleUserSearchResponse(admin, update.Message.Text)
				return
			case StateWaitingForSessionInfo:
				handleAddSessionResponse(admin, update.Message.Text)
				return
			case StateEditSession:
				handleSessionNumberResponse(admin, update.Message.Text)
				return
			case StateDeleteSession:
				handleSessionNumberResponse(admin, update.Message.Text)
				return
			case StateAddVideo:
				handleAddVideoResponse(admin, update.Message.Text)
				return
			case StateEditVideo:
				handleEditVideoResponse(admin, update.Message.Text)
				return
			case StateDeleteVideo:
				handleDeleteVideoResponse(admin, update.Message.Text)
				return
			}

			// Check if this is an edit session info response
			if strings.HasPrefix(state, "edit_session:") {
				handleEditSessionInfo(admin, update.Message.Text)
				return
			}

			// Check if this is an add video response
			if strings.HasPrefix(state, "add_video:") {
				handleAddVideoResponse(admin, update.Message.Text)
				return
			}
		}

		// Handle admin commands
		if update.Message.IsCommand() {
			switch update.Message.Command() {
			case "start":
				msg := tgbotapi.NewMessage(update.Message.Chat.ID, "به پنل مدیریت خوش اومدین از دکمه های زیر میتونید به سیستم دسترسی داشته باشید")
				msg.ReplyMarkup = getAdminKeyboard()
				bot.Send(msg)
				return
			case "help":
				sendMessage(update.Message.Chat.ID, "من اینجا هستم تا در سفر دوره مونیتایز به شما کمک کنم. از دکمه‌های منو برای پیمایش در دوره استفاده کنید.")
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
			var sessions []Session
			if err := db.Order("number desc").Limit(12).Find(&sessions).Error; err != nil {
				sendMessage(update.Message.Chat.ID, "❌ خطا در دریافت لیست جلسات")
				return
			}

			// Build the response with sessions list
			var response strings.Builder
			for _, session := range sessions {
				response.WriteString(fmt.Sprintf("📖 جلسه %d: %s\n📝 %s\n\n",
					session.Number,
					session.Title,
					session.Description))
			}

			// Create message with sessions list and buttons
			msg := tgbotapi.NewMessage(update.Message.Chat.ID, response.String())
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
			return
		case "🎥 مدیریت ویدیوها":
			response := handleAdminVideos(admin, []string{})
			sendMessage(update.Message.Chat.ID, response)
			return
		case "💾 پشتیبان‌گیری":
			response := performBackup(admin)
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

	// If not admin, check if user is blocked
	var user *User
	if err := db.Where("telegram_id = ?", update.Message.From.ID).First(&user).Error; err == nil {
		if !user.IsActive {
			// User is blocked, send block message and remove keyboard
			blockMsg := tgbotapi.NewMessage(update.Message.Chat.ID, "⚠️ دسترسی شما به ربات مسدود شده است.\n\n📞 برای رفع مسدودیت با پشتیبانی تماس بگیرید:\n\n📞 "+SUPPORT_NUMBER)
			blockMsg.ReplyMarkup = tgbotapi.NewRemoveKeyboard(true)
			bot.Send(blockMsg)
			return
		}
	} else {
		// User not found, create new user
		user = getUserOrCreate(update.Message.From)
	}

	// Handle commands
	if update.Message.IsCommand() {
		switch update.Message.Command() {
		case "start":
			// Only send welcome message if user already exists
			if !isNewUser(update.Message.From.ID) {
				msg := tgbotapi.NewMessage(update.Message.Chat.ID, "👋 به ربات مونیتایز خوش آمدید! من دستیار هوشمند شما برای دوره هستم. بیایید سفر خود را برای ساخت یک کسب و کار موفق مبتنی بر هوش مصنوعی شروع کنیم.")
				msg.ReplyMarkup = getMainMenuKeyboard()
				bot.Send(msg)
			}
			return
		case "help":
			sendMessage(update.Message.Chat.ID, "من اینجا هستم تا در سفر دوره مونیتایز به شما کمک کنم. از دکمه‌های منو برای پیمایش در دوره استفاده کنید.")
			return
		}
	}

	// Handle regular messages
	response := processUserInput(update.Message.Text, user)
	sendMessage(update.Message.Chat.ID, response)
}

// getAdminByTelegramID returns admin by telegram ID
func getAdminByTelegramID(telegramID int64) *Admin {
	var admin Admin
	if err := db.Where("telegram_id = ?", telegramID).First(&admin).Error; err != nil {
		return nil
	}
	return &admin
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
		msg := tgbotapi.NewMessage(admin.TelegramID, "🔍 لطفا آیدی عددی یا نام کاربری را وارد کنید:")
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

	case "session_stats":
		handleSessionStats(admin, []string{})

	case "user_stats":
		handleUserStats(admin, []string{})

	case "ban":
		handleBanUser(admin, param)

	case "unban":
		handleUnbanUser(admin, param)

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

	case "video_stats":
		handleVideoStats(admin, []string{})

	default:
		sendMessage(admin.TelegramID, "❌ عملیات نامعتبر")
	}

	// Answer callback query to remove loading state
	callback := tgbotapi.NewCallback(update.CallbackQuery.ID, "")
	bot.Request(callback)
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
	blockMsg := tgbotapi.NewMessage(user.TelegramID, "⚠️ دسترسی شما به ربات مسدود شده است.\n\n📞 برای رفع مسدودیت با پشتیبانی تماس بگیرید:\n\n�� "+SUPPORT_NUMBER)
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
	msg := tgbotapi.NewMessage(admin.TelegramID, "🔍 لطفا آیدی عددی یا نام کاربری را وارد کنید:")
	msg.ReplyMarkup = tgbotapi.ForceReply{}
	bot.Send(msg)
	adminStates[admin.TelegramID] = StateWaitingForUserID
}

// handleUserSearchResponse processes the response to a user search prompt
func handleUserSearchResponse(admin *Admin, searchText string) {
	// First try to parse as user ID
	userID, err := strconv.ParseInt(searchText, 10, 64)
	var user User
	var searchErr error

	if err == nil {
		// If it's a valid number, search by Telegram ID
		searchErr = db.Where("telegram_id = ?", userID).First(&user).Error
	} else {
		// If not a number, search by username
		searchErr = db.Where("username ILIKE ?", "%"+searchText+"%").First(&user).Error
	}

	if searchErr != nil {
		sendMessage(admin.TelegramID, "❌ کاربر یافت نشد. لطفا نام کاربری یا آیدی عددی را وارد کنید.")
		return
	}

	// Get user's session progress
	var completedSessions int64
	db.Model(&UserProgress{}).Where("user_id = ? AND is_completed = ?", user.ID, true).Count(&completedSessions)

	// Get user's exercise submissions
	var exerciseCount int64
	db.Model(&Exercise{}).Where("user_id = ?", user.ID).Count(&exerciseCount)

	// Format the response
	status := "✅ فعال"
	if !user.IsActive {
		status = "❌ مسدود"
	}

	response := fmt.Sprintf("👤 اطلاعات کاربر:\n\n"+
		"📱 آیدی تلگرام: %d\n"+
		"👤 نام کاربری: %s\n"+
		"📊 وضعیت: %s\n"+
		"⏰ تاریخ عضویت: %s\n"+
		"📚 جلسات تکمیل شده: %d\n"+
		"✍️ تعداد تمرین‌ها: %d",
		user.TelegramID,
		user.Username,
		status,
		user.CreatedAt.Format("2006-01-02 15:04:05"),
		completedSessions,
		exerciseCount)

	// Create action buttons
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
	msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("✏️ ویرایش ویدیو %s:\n\nلطفا اطلاعات جدید را به فرمت زیر وارد کنید:\nعنوان|لینک ویدیو", videoID))
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
	delete(adminStates, admin.TelegramID)

	// If state is just "add_video", this is the first step (selecting session)
	if state == "add_video" {
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
	parts := strings.Split(state, ":")
	if len(parts) != 2 {
		sendMessage(admin.TelegramID, "❌ خطا در پردازش درخواست")
		return
	}

	sessionNumber, err := strconv.Atoi(parts[1])
	if err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در پردازش شماره جلسه")
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

	if err := db.Create(&video).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در ثبت ویدیو")
		return
	}

	// Send confirmation message
	confirmationMsg := fmt.Sprintf("✅ ویدیو با موفقیت اضافه شد\n\n📝 عنوان: %s\n🔗 لینک: %s\n📚 جلسه: %d",
		title, link, sessionNumber)
	sendMessage(admin.TelegramID, confirmationMsg)

	// Show video management menu with inline keyboard
	var videos []Video
	db.Preload("Session").Order("created_at desc").Find(&videos)

	videoListMsg := "🎥 لیست ویدیوها:\n\n"
	for _, v := range videos {
		videoListMsg += fmt.Sprintf("🆔 آیدی: %d\n📝 عنوان: %s\n📚 جلسه: %d - %s\n🔗 لینک: %s\n\n",
			v.ID,
			v.Title,
			v.Session.Number,
			v.Session.Title,
			v.VideoLink)
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
	msg := tgbotapi.NewMessage(admin.TelegramID, videoListMsg)
	msg.ReplyMarkup = keyboard
	bot.Send(msg)
}

func handleEditVideoResponse(admin *Admin, response string) {
	// Check if this is the first step (video ID)
	if !strings.Contains(response, "|") {
		videoID, err := strconv.Atoi(strings.TrimSpace(response))
		if err != nil {
			sendMessage(admin.TelegramID, "❌ آیدی ویدیو نامعتبر است")
			return
		}

		// Check if video exists
		var video Video
		if err := db.Preload("Session").First(&video, videoID).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ ویدیو یافت نشد")
			return
		}

		// Store video ID in state
		adminStates[admin.TelegramID] = fmt.Sprintf("edit_video:%d", videoID)
		msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("✏️ ویرایش ویدیو %d:\n\nلطفا اطلاعات جدید را به فرمت زیر وارد کنید:\nعنوان|لینک ویدیو", videoID))
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		return
	}

	// This is the second step (new video info)
	parts := strings.Split(response, "|")
	if len(parts) != 2 {
		sendMessage(admin.TelegramID, "❌ فرمت نامعتبر. لطفا به فرمت زیر وارد کنید:\nعنوان|لینک ویدیو")
		return
	}

	// Get video ID from state
	stateParts := strings.Split(adminStates[admin.TelegramID], ":")
	if len(stateParts) != 2 {
		sendMessage(admin.TelegramID, "❌ خطا در پردازش درخواست")
		return
	}
	videoID, _ := strconv.Atoi(stateParts[1])

	// Update video
	var video Video
	if err := db.Preload("Session").First(&video, videoID).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ ویدیو یافت نشد")
		return
	}

	video.Title = strings.TrimSpace(parts[0])
	video.VideoLink = strings.TrimSpace(parts[1])

	if err := db.Save(&video).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در ویرایش ویدیو")
		return
	}

	// Create confirmation message with all video details
	confirmationMsg := fmt.Sprintf("✅ ویدیو با موفقیت ویرایش شد:\n\n"+
		"🆔 آیدی: %d\n"+
		"📝 عنوان: %s\n"+
		"🔗 لینک: %s\n"+
		"📚 جلسه: %d - %s",
		video.ID,
		video.Title,
		video.VideoLink,
		video.Session.Number,
		video.Session.Title)

	// Add inline keyboard for quick actions
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("✏️ ویرایش مجدد", fmt.Sprintf("edit_video:%d", video.ID)),
			tgbotapi.NewInlineKeyboardButtonData("🗑️ حذف ویدیو", fmt.Sprintf("delete_video:%d", video.ID)),
		),
	)
	msg := tgbotapi.NewMessage(admin.TelegramID, confirmationMsg)
	msg.ReplyMarkup = keyboard
	bot.Send(msg)

	logAdminAction(admin, "edit_video", fmt.Sprintf("ویدیو ویرایش شد: %s", video.Title), "video", video.ID)
	delete(adminStates, admin.TelegramID)
}

func handleDeleteVideoResponse(admin *Admin, response string) {
	videoID, err := strconv.Atoi(strings.TrimSpace(response))
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

	if err := db.Delete(&video).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ خطا در حذف ویدیو")
		return
	}

	confirmationMsg := fmt.Sprintf("✅ ویدیو با موفقیت حذف شد:\n\n%s", videoInfo)
	sendMessage(admin.TelegramID, confirmationMsg)

	logAdminAction(admin, "delete_video", fmt.Sprintf("ویدیو حذف شد: %s", video.Title), "video", video.ID)
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
