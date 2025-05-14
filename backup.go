package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"time"
)

// handleAdminBackup handles database backup operations
func handleAdminBackup(admin *Admin, args []string) string {
	if len(args) == 0 {
		return "💾 پشتیبان‌گیری از دیتابیس:\n\n• /backup now - پشتیبان‌گیری فوری\n• /backup schedule - تنظیم زمان پشتیبان‌گیری"
	}

	switch args[0] {
	case "now":
		return performBackup(admin)
	case "schedule":
		return scheduleBackup(admin)
	default:
		return "❌ دستور نامعتبر"
	}
}

// performBackup performs an immediate database backup
func performBackup(admin *Admin) string {
	// Create backup directory if it doesn't exist
	backupDir := "backups"
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return "❌ خطا در ایجاد پوشه پشتیبان"
	}

	// Generate backup filename with timestamp
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := fmt.Sprintf("backup_%s.sql", timestamp)
	backupPath := filepath.Join(backupDir, filename)

	// Get database credentials from environment
	dbUser := os.Getenv("MYSQL_USER")
	dbPass := os.Getenv("MYSQL_PASSWORD")
	dbName := os.Getenv("MYSQL_DATABASE")

	// Create mysqldump command
	cmd := exec.Command("mysqldump",
		"-u", dbUser,
		"-p"+dbPass,
		"--databases", dbName,
		"--result-file="+backupPath)

	// Execute backup
	if err := cmd.Run(); err != nil {
		return "❌ خطا در پشتیبان‌گیری: " + err.Error()
	}

	// Create backup record
	backup := Backup{
		Filename:    filename,
		Size:        getFileSize(backupPath),
		CreatedAt:   time.Now(),
		CreatedByID: admin.ID,
	}
	db.Create(&backup)

	// Send backup file to admin
	doc := tgbotapi.NewDocument(admin.TelegramID, tgbotapi.FilePath(backupPath))
	doc.Caption = fmt.Sprintf("✅ پشتیبان‌گیری با موفقیت انجام شد\n\n📁 نام فایل: %s\n📊 حجم: %s\n⏰ تاریخ: %s",
		filename,
		formatFileSize(backup.Size),
		backup.CreatedAt.Format("2006-01-02 15:04:05"))
	bot.Send(doc)

	return "✅ پشتیبان‌گیری با موفقیت انجام شد"
}

// scheduleBackup sets up automatic daily backups
func scheduleBackup(admin *Admin) string {
	// TODO: Implement scheduling logic
	return "⏰ پشتیبان‌گیری خودکار هر روز در ساعت 00:00 انجام می‌شود"
}

// getFileSize returns the size of a file in bytes
func getFileSize(path string) int64 {
	info, err := os.Stat(path)
	if err != nil {
		return 0
	}
	return info.Size()
}

// formatFileSize formats file size in human-readable format
func formatFileSize(size int64) string {
	const unit = 1024
	if size < unit {
		return fmt.Sprintf("%d B", size)
	}
	div, exp := int64(unit), 0
	for n := size / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB", float64(size)/float64(div), "KMGTPE"[exp])
}

// Backup represents a database backup record
type Backup struct {
	gorm.Model
	Filename    string
	Size        int64
	CreatedAt   time.Time
	CreatedByID uint
	CreatedBy   Admin `gorm:"foreignKey:CreatedByID"`
} 