package main

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"gorm.io/gorm"
)

var (
	backupSchedule *time.Ticker
	stopBackup     chan bool
)

// handleAdminBackup handles database backup operations
func handleAdminBackup(admin *Admin, args []string) string {
	if len(args) == 0 {
		// Show backup menu
		keyboard := tgbotapi.NewInlineKeyboardMarkup(
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("💾 پشتیبان‌گیری فوری", "backup:now"),
				tgbotapi.NewInlineKeyboardButtonData("⏰ تنظیم زمان پشتیبان‌گیری", "backup:schedule"),
			),
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonData("❌ توقف پشتیبان‌گیری خودکار", "backup:stop"),
			),
		)
		msg := tgbotapi.NewMessage(admin.TelegramID, "💾 مدیریت پشتیبان‌گیری:\n\nاز گزینه‌های زیر استفاده کنید:")
		msg.ReplyMarkup = keyboard
		bot.Send(msg)
		return ""
	}

	switch args[0] {
	case "now":
		return performBackup(admin)
	case "schedule":
		return scheduleBackup(admin)
	case "stop":
		return stopScheduledBackup(admin)
	default:
		return "❌ دستور نامعتبر"
	}
}

// performBackup creates a database backup
func performBackup(admin *Admin) string {
	// Parse DSN to get database credentials
	dsn := os.Getenv("MYSQL_DSN")
	parts := strings.Split(dsn, "@")
	if len(parts) != 2 {
		return "❌ خطا در فرمت DSN دیتابیس"
	}

	credentials := strings.Split(parts[0], ":")
	if len(credentials) != 2 {
		return "❌ خطا در فرمت DSN دیتابیس"
	}

	user := credentials[0]
	password := credentials[1]

	// Create backup directory if it doesn't exist
	backupDir := "backups"
	if err := os.MkdirAll(backupDir, 0755); err != nil {
		return "❌ خطا در ایجاد پوشه پشتیبان‌گیری"
	}

	// Generate backup filename with timestamp
	timestamp := time.Now().Format("2006-01-02_15-04-05")
	filename := filepath.Join(backupDir, fmt.Sprintf("backup_%s.sql", timestamp))

	// Extract database name from DSN
	dbName := strings.Split(parts[1], "/")[1]
	dbName = strings.Split(dbName, "?")[0]

	// Create mysqldump command with credentials
	cmd := exec.Command("mysqldump",
		"-u", user,
		"-p"+password, // Note: This is not secure for production
		"--single-transaction",
		"--quick",
		"--lock-tables=false",
		dbName,
		"-r", filename)

	// Run the backup command
	if err := cmd.Run(); err != nil {
		return fmt.Sprintf("❌ خطا در پشتیبان‌گیری: %v", err)
	}

	// Create backup record
	backup := Backup{
		Filename:    filename,
		Size:        getFileSize(filename),
		CreatedByID: admin.ID,
	}
	if err := db.Create(&backup).Error; err != nil {
		return "❌ خطا در ثبت اطلاعات پشتیبان‌گیری"
	}

	// Send backup file to admin
	doc := tgbotapi.NewDocument(admin.TelegramID, tgbotapi.FilePath(filename))
	doc.Caption = fmt.Sprintf("✅ پشتیبان‌گیری با موفقیت انجام شد\n\n📁 نام فایل: %s\n📊 حجم: %s",
		filepath.Base(filename),
		formatFileSize(backup.Size))
	bot.Send(doc)

	return "✅ پشتیبان‌گیری با موفقیت انجام شد"
}

// scheduleBackup sets up automatic daily backups
func scheduleBackup(admin *Admin) string {
	// Stop existing schedule if any
	if backupSchedule != nil {
		stopScheduledBackup(admin)
	}

	// Create new ticker for daily backups at midnight
	now := time.Now()
	nextRun := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
	delay := nextRun.Sub(now)

	// Create channels for control
	stopBackup = make(chan bool)

	// Start the backup scheduler
	go func() {
		// Wait for the first backup time
		time.Sleep(delay)

		// Create ticker for daily backups
		backupSchedule = time.NewTicker(24 * time.Hour)
		defer backupSchedule.Stop()

		for {
			select {
			case <-backupSchedule.C:
				performBackup(admin)
			case <-stopBackup:
				return
			}
		}
	}()

	return "⏰ پشتیبان‌گیری خودکار هر روز در ساعت 00:00 انجام می‌شود"
}

// stopScheduledBackup stops the automatic backup schedule
func stopScheduledBackup(admin *Admin) string {
	if backupSchedule != nil {
		backupSchedule.Stop()
		backupSchedule = nil
		stopBackup <- true
		return "⏹️ پشتیبان‌گیری خودکار متوقف شد"
	}
	return "❌ هیچ برنامه پشتیبان‌گیری فعال نیست"
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
	CreatedByID uint
	CreatedBy   Admin `gorm:"foreignKey:CreatedByID"`
}
