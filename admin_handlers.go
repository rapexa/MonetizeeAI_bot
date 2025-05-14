package main

import (
	"fmt"
	"strconv"
	"strings"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api"
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

// handleAdminStats shows system statistics
func handleAdminStats(admin *Admin, args []string) string {
	var stats struct {
		TotalUsers     int64
		ActiveUsers    int64
		BannedUsers    int64
		TotalSessions  int64
		TotalVideos    int64
		TotalExercises int64
	}

	// Get user statistics
	db.Model(&User{}).Count(&stats.TotalUsers)
	db.Model(&User{}).Where("is_banned = ?", false).Count(&stats.ActiveUsers)
	db.Model(&User{}).Where("is_banned = ?", true).Count(&stats.BannedUsers)

	// Get session statistics
	db.Model(&Session{}).Count(&stats.TotalSessions)

	// Get video statistics
	db.Model(&Video{}).Count(&stats.TotalVideos)

	// Get exercise statistics
	db.Model(&Exercise{}).Count(&stats.TotalExercises)

	response := fmt.Sprintf("📊 آمار سیستم:\n\n"+
		"👥 کاربران:\n"+
		"• کل کاربران: %d\n"+
		"• کاربران فعال: %d\n"+
		"• کاربران مسدود: %d\n\n"+
		"📚 جلسات:\n"+
		"• کل جلسات: %d\n\n"+
		"🎥 ویدیوها:\n"+
		"• کل ویدیوها: %d\n\n"+
		"✍️ تمرین‌ها:\n"+
		"• کل تمرین‌ها: %d",
		stats.TotalUsers,
		stats.ActiveUsers,
		stats.BannedUsers,
		stats.TotalSessions,
		stats.TotalVideos,
		stats.TotalExercises)

	// Add inline keyboard for detailed stats
	keyboard := tgbotapi.NewInlineKeyboardMarkup(
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("📈 نمودار کاربران", "user_chart"),
			tgbotapi.NewInlineKeyboardButtonData("📈 نمودار جلسات", "session_chart"),
		),
		tgbotapi.NewInlineKeyboardRow(
			tgbotapi.NewInlineKeyboardButtonData("📈 نمودار ویدیوها", "video_chart"),
			tgbotapi.NewInlineKeyboardButtonData("📈 نمودار تمرین‌ها", "exercise_chart"),
		),
	)
	msg := tgbotapi.NewMessage(admin.TelegramID, response)
	msg.ReplyMarkup = keyboard
	bot.Send(msg)

	return "از دکمه‌های زیر برای مشاهده نمودارهای آماری استفاده کنید"
}

// handleAdminUsers manages users
func handleAdminUsers(admin *Admin, args []string) string {
	if len(args) == 0 {
		var users []User
		db.Order("created_at desc").Limit(10).Find(&users)

		response := "👥 آخرین کاربران:\n\n"
		for _, user := range users {
			status := "✅ فعال"
			if user.IsBanned {
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
		bot.Send(msg)

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
				video.URL)
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
		logAdminAction(admin, "approve_exercise", fmt.Sprintf("Approved exercise %d", exerciseID), "exercise", uint(exerciseID))
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
		logAdminAction(admin, "reject_exercise", fmt.Sprintf("Rejected exercise %d", exerciseID), "exercise", uint(exerciseID))
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

// logAdminAction logs admin activities
func logAdminAction(admin *Admin, action string, details string, targetType string, targetID uint) {
	adminAction := AdminAction{
		AdminID:    admin.ID,
		Action:     action,
		Details:    details,
		TargetType: targetType,
		TargetID:   targetID,
	}
	db.Create(&adminAction)
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
