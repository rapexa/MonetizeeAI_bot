package main

import (
	"fmt"
	"strconv"
	"strings"
	"time"
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
	var totalUsers, activeUsers, totalSessions, totalVideos, totalExercises int64
	var pendingExercises int64

	db.Model(&User{}).Count(&totalUsers)
	db.Model(&User{}).Where("is_active = ?", true).Count(&activeUsers)
	db.Model(&Session{}).Count(&totalSessions)
	db.Model(&Video{}).Count(&totalVideos)
	db.Model(&Exercise{}).Count(&totalExercises)
	db.Model(&Exercise{}).Where("status = ?", "pending").Count(&pendingExercises)

	return fmt.Sprintf(`📊 آمار سیستم:

👥 کاربران:
• کل کاربران: %d
• کاربران فعال: %d

📚 محتوا:
• تعداد جلسات: %d
• تعداد ویدیوها: %d

✍️ تمرین‌ها:
• کل تمرین‌ها: %d
• تمرین‌های در انتظار: %d`,
		totalUsers, activeUsers, totalSessions, totalVideos, totalExercises, pendingExercises)
}

// handleAdminUsers manages users
func handleAdminUsers(admin *Admin, args []string) string {
	if len(args) == 0 {
		// Show user list
		var users []User
		db.Limit(10).Order("created_at desc").Find(&users)

		response := "👥 لیست کاربران (۱۰ مورد آخر):\n\n"
		for _, user := range users {
			response += fmt.Sprintf("ID: %d\nنام: %s %s\nیوزر: @%s\nجلسه: %d\nوضعیت: %v\n\n",
				user.ID, user.FirstName, user.LastName, user.Username, user.CurrentSession, user.IsActive)
		}
		return response
	}

	// Handle user management commands
	switch args[0] {
	case "ban":
		if len(args) < 2 {
			return "❌ لطفا آیدی کاربر را وارد کنید"
		}
		userID, err := strconv.ParseUint(args[1], 10, 32)
		if err != nil {
			return "❌ آیدی نامعتبر"
		}
		var user User
		if err := db.First(&user, userID).Error; err != nil {
			return "❌ کاربر یافت نشد"
		}
		user.IsActive = false
		db.Save(&user)
		logAdminAction(admin, "ban_user", fmt.Sprintf("Banned user %d", userID), "user", uint(userID))
		return "✅ کاربر با موفقیت مسدود شد"

	case "unban":
		if len(args) < 2 {
			return "❌ لطفا آیدی کاربر را وارد کنید"
		}
		userID, err := strconv.ParseUint(args[1], 10, 32)
		if err != nil {
			return "❌ آیدی نامعتبر"
		}
		var user User
		if err := db.First(&user, userID).Error; err != nil {
			return "❌ کاربر یافت نشد"
		}
		user.IsActive = true
		db.Save(&user)
		logAdminAction(admin, "unban_user", fmt.Sprintf("Unbanned user %d", userID), "user", uint(userID))
		return "✅ کاربر با موفقیت آزاد شد"

	default:
		return "❌ دستور نامعتبر"
	}
}

// handleAdminSessions manages sessions
func handleAdminSessions(admin *Admin, args []string) string {
	if len(args) == 0 {
		// Show session list
		var sessions []Session
		db.Order("number").Find(&sessions)

		response := "📚 لیست جلسات:\n\n"
		for _, session := range sessions {
			response += fmt.Sprintf("شماره: %d\nعنوان: %s\n\n", session.Number, session.Title)
		}
		return response
	}

	// Handle session management commands
	switch args[0] {
	case "edit":
		if len(args) < 4 {
			return "❌ فرمت دستور: /admin_sessions edit [شماره] [عنوان] [توضیحات]"
		}
		sessionNum, err := strconv.Atoi(args[1])
		if err != nil {
			return "❌ شماره جلسه نامعتبر"
		}
		var session Session
		if err := db.Where("number = ?", sessionNum).First(&session).Error; err != nil {
			return "❌ جلسه یافت نشد"
		}
		session.Title = args[2]
		session.Description = strings.Join(args[3:], " ")
		db.Save(&session)
		logAdminAction(admin, "edit_session", fmt.Sprintf("Edited session %d", sessionNum), "session", session.ID)
		return "✅ جلسه با موفقیت ویرایش شد"

	default:
		return "❌ دستور نامعتبر"
	}
}

// handleAdminVideos manages videos
func handleAdminVideos(admin *Admin, args []string) string {
	if len(args) == 0 {
		// Show video list
		var videos []Video
		db.Preload("Session").Order("created_at desc").Limit(10).Find(&videos)

		response := "🎥 لیست ویدیوها (۱۰ مورد آخر):\n\n"
		for _, video := range videos {
			response += fmt.Sprintf("ID: %d\nعنوان: %s\nجلسه: %d\nلینک: %s\n\n",
				video.ID, video.Title, video.Session.Number, video.VideoLink)
		}
		return response
	}

	// Handle video management commands
	switch args[0] {
	case "add":
		if len(args) < 4 {
			return "❌ فرمت دستور: /admin_videos add [شماره_جلسه] [عنوان] [لینک]"
		}
		sessionNum, err := strconv.Atoi(args[1])
		if err != nil {
			return "❌ شماره جلسه نامعتبر"
		}
		var session Session
		if err := db.Where("number = ?", sessionNum).First(&session).Error; err != nil {
			return "❌ جلسه یافت نشد"
		}
		video := Video{
			Title:     args[2],
			VideoLink: args[3],
			SessionID: session.ID,
			Date:      time.Now(),
		}
		db.Create(&video)
		logAdminAction(admin, "add_video", fmt.Sprintf("Added video for session %d", sessionNum), "video", video.ID)
		return "✅ ویدیو با موفقیت اضافه شد"

	case "edit":
		if len(args) < 4 {
			return "❌ فرمت دستور: /admin_videos edit [آیدی] [عنوان] [لینک]"
		}
		videoID, err := strconv.ParseUint(args[1], 10, 32)
		if err != nil {
			return "❌ آیدی نامعتبر"
		}
		var video Video
		if err := db.First(&video, videoID).Error; err != nil {
			return "❌ ویدیو یافت نشد"
		}
		video.Title = args[2]
		video.VideoLink = args[3]
		db.Save(&video)
		logAdminAction(admin, "edit_video", fmt.Sprintf("Edited video %d", videoID), "video", uint(videoID))
		return "✅ ویدیو با موفقیت ویرایش شد"

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
