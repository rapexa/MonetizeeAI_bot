package main

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
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
	if isAdmin(update.Message.From.ID) {
		admin := getAdmin(update.Message.From.ID)
		if admin == nil {
			sendMessage(update.Message.Chat.ID, "❌ خطا در دریافت اطلاعات ادمین")
			return
		}

		// Check admin state
		if state, exists := adminStates[admin.TelegramID]; exists {
			switch state {
			case StateWaitingForUserID:
				delete(adminStates, admin.TelegramID)
				handleUserSearchResponse(admin, update.Message.Text)
				return

			case StateWaitingForSessionInfo:
				delete(adminStates, admin.TelegramID)
				handleAddSessionResponse(admin, update.Message.Text)
				return

			case StateWaitingForSessionNum:
				delete(adminStates, admin.TelegramID)
				handleSessionNumberResponse(admin, update.Message.Text)
				return

			case StateEditSession:
				// Handle session number input for editing
				sessionNum, err := strconv.Atoi(strings.TrimSpace(update.Message.Text))
				if err != nil {
					sendMessage(admin.TelegramID, "❌ شماره جلسه نامعتبر است")
					return
				}

				var session Session
				if err := db.Where("number = ?", sessionNum).First(&session).Error; err != nil {
					sendMessage(admin.TelegramID, "❌ جلسه یافت نشد")
					return
				}

				msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("✏️ ویرایش جلسه %d:\n\nلطفا اطلاعات جدید را به فرمت زیر وارد کنید:\nعنوان|توضیحات", sessionNum))
				msg.ReplyMarkup = tgbotapi.ForceReply{}
				bot.Send(msg)
				adminStates[admin.TelegramID] = fmt.Sprintf("%s:%d", StateEditSession, sessionNum)
				return

			case StateDeleteSession:
				// Handle session number input for deletion
				sessionNum, err := strconv.Atoi(strings.TrimSpace(update.Message.Text))
				if err != nil {
					sendMessage(admin.TelegramID, "❌ شماره جلسه نامعتبر است")
					return
				}

				var session Session
				if err := db.Where("number = ?", sessionNum).First(&session).Error; err != nil {
					sendMessage(admin.TelegramID, "❌ جلسه یافت نشد")
					return
				}

				if err := db.Delete(&session).Error; err != nil {
					sendMessage(admin.TelegramID, "❌ خطا در حذف جلسه")
					return
				}

				sendMessage(admin.TelegramID, fmt.Sprintf("✅ جلسه %d با موفقیت حذف شد", sessionNum))
				delete(adminStates, admin.TelegramID)
				return

			case StateAddVideo:
				// Handle session number input for adding video
				sessionNum, err := strconv.Atoi(strings.TrimSpace(update.Message.Text))
				if err != nil {
					sendMessage(admin.TelegramID, "❌ شماره جلسه نامعتبر است")
					return
				}

				var session Session
				if err := db.Where("number = ?", sessionNum).First(&session).Error; err != nil {
					sendMessage(admin.TelegramID, "❌ جلسه یافت نشد")
					return
				}

				msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("➕ افزودن ویدیو به جلسه %d:\n\nلطفا اطلاعات را به فرمت زیر وارد کنید:\nعنوان|لینک ویدیو", sessionNum))
				msg.ReplyMarkup = tgbotapi.ForceReply{}
				bot.Send(msg)
				adminStates[admin.TelegramID] = fmt.Sprintf("%s:%d", StateAddVideo, sessionNum)
				return

			case StateEditVideo:
				// Handle video ID input for editing
				videoID, err := strconv.ParseUint(strings.TrimSpace(update.Message.Text), 10, 32)
				if err != nil {
					sendMessage(admin.TelegramID, "❌ آیدی ویدیو نامعتبر است")
					return
				}

				var video Video
				if err := db.First(&video, videoID).Error; err != nil {
					sendMessage(admin.TelegramID, "❌ ویدیو یافت نشد")
					return
				}

				msg := tgbotapi.NewMessage(admin.TelegramID, fmt.Sprintf("✏️ ویرایش ویدیو %d:\n\nلطفا اطلاعات جدید را به فرمت زیر وارد کنید:\nعنوان|لینک ویدیو", videoID))
				msg.ReplyMarkup = tgbotapi.ForceReply{}
				bot.Send(msg)
				adminStates[admin.TelegramID] = fmt.Sprintf("%s:%d", StateEditVideo, videoID)
				return

			case StateDeleteVideo:
				// Handle video ID input for deletion
				videoID, err := strconv.ParseUint(strings.TrimSpace(update.Message.Text), 10, 32)
				if err != nil {
					sendMessage(admin.TelegramID, "❌ آیدی ویدیو نامعتبر است")
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

				logAdminAction(admin, "delete_video", fmt.Sprintf("ویدیو %s حذف شد", videoID), "video", video.ID)
				sendMessage(admin.TelegramID, fmt.Sprintf("✅ ویدیو %d با موفقیت حذف شد", videoID))
				delete(adminStates, admin.TelegramID)
				return
			}
		}

		// Handle admin commands
		if update.Message.IsCommand() {
			switch update.Message.Command() {
			case "start":
				msg := tgbotapi.NewMessage(update.Message.Chat.ID, "👋 به پنل مدیریت خوش آمدید!\n\nاز منوی زیر برای مدیریت سیستم استفاده کنید:")
				msg.ReplyMarkup = getAdminMainMenuKeyboard()
				bot.Send(msg)
				return
			default:
				args := strings.Fields(update.Message.CommandArguments())
				response := handleAdminCommand(admin, "/"+update.Message.Command(), args)
				sendMessage(update.Message.Chat.ID, response)
				return
			}
		}

		// Check if this is a response to a search prompt
		if update.Message.ReplyToMessage != nil {
			replyText := update.Message.ReplyToMessage.Text
			if strings.Contains(replyText, "لطفا آیدی یا نام کاربری را وارد کنید") {
				handleUserSearchResponse(admin, update.Message.Text)
				return
			}
		}

		// Only show admin menu if no state is active
		if _, exists := adminStates[admin.TelegramID]; !exists {
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
	}

	// If not admin, let the user handlers process the message
	user := getUserOrCreate(update.Message.From)

	// Handle commands
	if update.Message.IsCommand() {
		switch update.Message.Command() {
		case "start":
			msg := tgbotapi.NewMessage(update.Message.Chat.ID, "👋 به ربات مونیتایز خوش آمدید! من دستیار هوشمند شما برای دوره هستم. بیایید سفر خود را برای ساخت یک کسب و کار موفق مبتنی بر هوش مصنوعی شروع کنیم.")
			msg.ReplyMarkup = getMainMenuKeyboard()
			bot.Send(msg)
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
		msg := tgbotapi.NewMessage(admin.TelegramID, "🔍 لطفا آیدی کاربر را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		adminStates[admin.TelegramID] = StateWaitingForUserID

	case "add_session":
		msg := tgbotapi.NewMessage(admin.TelegramID, "➕ افزودن جلسه جدید:\n\nلطفا اطلاعات را به فرمت زیر وارد کنید:\nشماره جلسه|عنوان|توضیحات")
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		adminStates[admin.TelegramID] = StateWaitingForSessionInfo

	case "edit_session":
		msg := tgbotapi.NewMessage(admin.TelegramID, "✏️ ویرایش جلسه:\n\nلطفا شماره جلسه را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		adminStates[admin.TelegramID] = StateEditSession

	case "delete_session":
		msg := tgbotapi.NewMessage(admin.TelegramID, "🗑️ حذف جلسه:\n\nلطفا شماره جلسه را وارد کنید:")
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
		msg := tgbotapi.NewMessage(admin.TelegramID, "➕ افزودن ویدیو:\n\nلطفا شماره جلسه را وارد کنید:")
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
		msg := tgbotapi.NewMessage(admin.TelegramID, "🗑️ حذف ویدیو:\n\nلطفا آیدی ویدیو را وارد کنید:")
		msg.ReplyMarkup = tgbotapi.ForceReply{}
		bot.Send(msg)
		adminStates[admin.TelegramID] = StateDeleteVideo

	case "video_stats":
		handleVideoStats(admin, []string{})

	default:
		sendMessage(admin.TelegramID, "❌ عملیات نامعتبر")
	}
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

	logAdminAction(admin, "unban_user", fmt.Sprintf("مسدودیت کاربر %s برداشته شد", user.Username), "user", user.ID)
	sendMessage(admin.TelegramID, fmt.Sprintf("✅ مسدودیت کاربر %s با موفقیت برداشته شد", user.Username))
}

// handleSearchUser handles user search
func handleSearchUser(admin *Admin, params []string) {
	msg := tgbotapi.NewMessage(admin.TelegramID, "🔍 لطفا آیدی یا نام کاربری را وارد کنید:")
	msg.ReplyMarkup = tgbotapi.ForceReply{}
	bot.Send(msg)
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

	logAdminAction(admin, "add_session", fmt.Sprintf("جلسه %d اضافه شد: %s", session.Number, session.Title), "session", session.ID)
	sendMessage(admin.TelegramID, fmt.Sprintf("✅ جلسه %d با موفقیت ایجاد شد", sessionNum))
}

// handleSessionNumberResponse processes the response for session number input
func handleSessionNumberResponse(admin *Admin, response string) {
	sessionNum, err := strconv.Atoi(strings.TrimSpace(response))
	if err != nil {
		sendMessage(admin.TelegramID, "❌ شماره جلسه نامعتبر است")
		return
	}

	var session Session
	if err := db.Where("number = ?", sessionNum).First(&session).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ جلسه یافت نشد")
		return
	}

	// Get the current state to determine the action
	state, exists := adminStates[admin.TelegramID]
	if !exists {
		sendMessage(admin.TelegramID, "❌ خطا در پردازش درخواست")
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
		// Delete the session
		if err := db.Delete(&session).Error; err != nil {
			sendMessage(admin.TelegramID, "❌ خطا در حذف جلسه")
			return
		}
		logAdminAction(admin, "delete_session", fmt.Sprintf("جلسه %d حذف شد: %s", session.Number, session.Title), "session", session.ID)
		sendMessage(admin.TelegramID, fmt.Sprintf("✅ جلسه %d با موفقیت حذف شد", sessionNum))
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

// handleUserSearchResponse processes the response to a user search prompt
func handleUserSearchResponse(admin *Admin, searchText string) {
	// Try to parse as user ID
	userID, err := strconv.ParseInt(searchText, 10, 64)
	if err != nil {
		sendMessage(admin.TelegramID, "❌ لطفا یک آیدی معتبر وارد کنید")
		return
	}

	var user User
	if err := db.Where("telegram_id = ?", userID).First(&user).Error; err != nil {
		sendMessage(admin.TelegramID, "❌ کاربر یافت نشد")
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
}

// Add this at the top of the file with other global variables
var adminStates = make(map[int64]string)

func getAdminMainMenuKeyboard() tgbotapi.ReplyKeyboardMarkup {
	keyboard := tgbotapi.NewReplyKeyboard(
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("📚 جلسات"),
			tgbotapi.NewKeyboardButton("🎥 ویدیوها"),
		),
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("✍️ تمرین‌ها"),
			tgbotapi.NewKeyboardButton("📊 پیشرفت من"),
		),
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("❓ راهنما"),
			tgbotapi.NewKeyboardButton("📞 پشتیبانی"),
		),
	)
	keyboard.ResizeKeyboard = true
	return keyboard
}
