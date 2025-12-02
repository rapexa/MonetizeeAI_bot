package main

import (
	"fmt"
	"strconv"
	"time"
)

// banUser bans a user by their Telegram ID
func banUser(admin *Admin, telegramID string) string {
	userID, err := strconv.ParseInt(telegramID, 10, 64)
	if err != nil {
		return "❌ آیدی نامعتبر"
	}

	var user User
	if err := db.Where("telegram_id = ?", userID).First(&user).Error; err != nil {
		return "❌ کاربر یافت نشد"
	}

	user.IsActive = false
	if err := db.Save(&user).Error; err != nil {
		return "❌ خطا در مسدود کردن کاربر"
	}

	logAdminAction(admin, "ban_user", fmt.Sprintf("Banned user %d", userID), "user", user.ID)
	return "✅ کاربر با موفقیت مسدود شد"
}

// unbanUser unbans a user by their Telegram ID
func unbanUser(admin *Admin, telegramID string) string {
	userID, err := strconv.ParseInt(telegramID, 10, 64)
	if err != nil {
		return "❌ آیدی نامعتبر"
	}

	var user User
	if err := db.Where("telegram_id = ?", userID).First(&user).Error; err != nil {
		return "❌ کاربر یافت نشد"
	}

	user.IsActive = true
	if err := db.Save(&user).Error; err != nil {
		return "❌ خطا در آزاد کردن کاربر"
	}

	logAdminAction(admin, "unban_user", fmt.Sprintf("Unbanned user %d", userID), "user", user.ID)
	return "✅ کاربر با موفقیت آزاد شد"
}

// editSession edits a session's details
func editSession(admin *Admin, sessionNum, title, description string) string {
	num, err := strconv.Atoi(sessionNum)
	if err != nil {
		return "❌ شماره جلسه نامعتبر"
	}

	var session Session
	if err := db.Where("number = ?", num).First(&session).Error; err != nil {
		return "❌ جلسه یافت نشد"
	}

	session.Title = title
	session.Description = description
	if err := db.Save(&session).Error; err != nil {
		return "❌ خطا در ویرایش جلسه"
	}

	// ⚡ PERFORMANCE: Invalidate session cache after update
	sessionCache.InvalidateSessions()

	logAdminAction(admin, "edit_session", fmt.Sprintf("Edited session %d", num), "session", session.ID)
	return "✅ جلسه با موفقیت ویرایش شد"
}

// deleteSession deletes a session
func deleteSession(admin *Admin, sessionNum string) string {
	num, err := strconv.Atoi(sessionNum)
	if err != nil {
		return "❌ شماره جلسه نامعتبر"
	}

	var session Session
	if err := db.Where("number = ?", num).First(&session).Error; err != nil {
		return "❌ جلسه یافت نشد"
	}

	// Start a transaction
	tx := db.Begin()

	// Delete associated videos
	if err := tx.Where("session_id = ?", session.ID).Delete(&Video{}).Error; err != nil {
		tx.Rollback()
		return "❌ خطا در حذف ویدیوهای جلسه"
	}

	// Delete associated exercises
	if err := tx.Where("session_id = ?", session.ID).Delete(&Exercise{}).Error; err != nil {
		tx.Rollback()
		return "❌ خطا در حذف تمرین‌های جلسه"
	}

	// Delete the session
	if err := tx.Delete(&session).Error; err != nil {
		tx.Rollback()
		return "❌ خطا در حذف جلسه"
	}

	// Commit the transaction
	if err := tx.Commit().Error; err != nil {
		return "❌ خطا در ثبت تغییرات"
	}

	// ⚡ PERFORMANCE: Invalidate session cache after deletion
	sessionCache.InvalidateSessions()

	logAdminAction(admin, "delete_session", fmt.Sprintf("Deleted session %d", num), "session", session.ID)
	return "✅ جلسه و محتوای مرتبط با آن با موفقیت حذف شد"
}

// addVideo adds a new video to a session
func addVideo(admin *Admin, sessionNum, title, url string) string {
	num, err := strconv.Atoi(sessionNum)
	if err != nil {
		return "❌ شماره جلسه نامعتبر"
	}

	var session Session
	if err := db.Where("number = ?", num).First(&session).Error; err != nil {
		return "❌ جلسه یافت نشد"
	}

	video := Video{
		Title:     title,
		VideoLink: url,
		SessionID: session.ID,
		Date:      time.Now(),
	}

	if err := db.Create(&video).Error; err != nil {
		return "❌ خطا در افزودن ویدیو"
	}

	logAdminAction(admin, "add_video", fmt.Sprintf("Added video for session %d", num), "video", video.ID)
	return "✅ ویدیو با موفقیت اضافه شد"
}

// editVideo edits a video's details
func editVideo(admin *Admin, videoID, title, url string) string {
	id, err := strconv.ParseUint(videoID, 10, 32)
	if err != nil {
		return "❌ آیدی نامعتبر"
	}

	var video Video
	if err := db.First(&video, id).Error; err != nil {
		return "❌ ویدیو یافت نشد"
	}

	video.Title = title
	video.VideoLink = url
	if err := db.Save(&video).Error; err != nil {
		return "❌ خطا در ویرایش ویدیو"
	}

	logAdminAction(admin, "edit_video", fmt.Sprintf("Edited video %d", id), "video", uint(id))
	return "✅ ویدیو با موفقیت ویرایش شد"
}

// logAdminAction logs an admin action
func logAdminAction(admin *Admin, action, details, targetType string, targetID uint) {
	log := AdminAction{
		AdminID:    admin.ID,
		Action:     action,
		Details:    details,
		TargetType: targetType,
		TargetID:   targetID,
	}
	db.Create(&log)
}

// deleteVideo deletes a video
func deleteVideo(admin *Admin, videoID string) string {
	id, err := strconv.ParseUint(videoID, 10, 32)
	if err != nil {
		return "❌ آیدی نامعتبر"
	}

	var video Video
	if err := db.First(&video, id).Error; err != nil {
		return "❌ ویدیو یافت نشد"
	}

	if err := db.Delete(&video).Error; err != nil {
		return "❌ خطا در حذف ویدیو"
	}

	logAdminAction(admin, "delete_video", fmt.Sprintf("حذف ویدیو %d", id), "video", uint(id))
	return "✅ ویدیو با موفقیت حذف شد"
}

// getAdminStats returns admin statistics
func getAdminStats() string {
	var stats struct {
		TotalUsers     int64
		ActiveUsers    int64
		TotalSessions  int64
		TotalVideos    int64
		TotalExercises int64
	}

	db.Model(&User{}).Count(&stats.TotalUsers)
	db.Model(&User{}).Where("is_active = ?", true).Count(&stats.ActiveUsers)
	db.Model(&Session{}).Count(&stats.TotalSessions)
	db.Model(&Video{}).Count(&stats.TotalVideos)
	db.Model(&Exercise{}).Count(&stats.TotalExercises)

	return fmt.Sprintf("📊 آمار سیستم:\n\n"+
		"👥 کاربران:\n"+
		"• کل کاربران: %d\n"+
		"• کاربران فعال: %d\n\n"+
		"📚 جلسات:\n"+
		"• کل جلسات: %d\n\n"+
		"🎥 ویدیوها:\n"+
		"• کل ویدیوها: %d\n\n"+
		"✍️ تمرین‌ها:\n"+
		"• کل تمرین‌ها: %d",
		stats.TotalUsers,
		stats.ActiveUsers,
		stats.TotalSessions,
		stats.TotalVideos,
		stats.TotalExercises)
}

// getAdminLogs returns recent admin actions
func getAdminLogs() string {
	var logs []AdminAction
	db.Preload("Admin").Order("created_at desc").Limit(10).Find(&logs)

	if len(logs) == 0 {
		return "📝 هیچ عملیاتی ثبت نشده است"
	}

	response := "📝 آخرین عملیات‌های ادمین:\n\n"
	for _, log := range logs {
		response += fmt.Sprintf("👤 %s\n"+
			"📌 عملیات: %s\n"+
			"📝 جزئیات: %s\n"+
			"⏰ زمان: %s\n\n",
			log.Admin.Username,
			log.Action,
			log.Details,
			log.CreatedAt.Format("2006-01-02 15:04:05"))
	}

	return response
}
