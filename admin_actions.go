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
		CreatedAt:  time.Now(),
	}
	db.Create(&log)
}
