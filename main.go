package main

import (
	"log"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"MonetizeeAI_bot/logger"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/joho/godotenv"
	"go.uber.org/zap"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

var (
	bot *tgbotapi.BotAPI
	db  *gorm.DB
)

func initDB() {
	var err error
	dsn := os.Getenv("MYSQL_DSN")
	db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Warn),
	})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Set connection pool settings
	sqlDB, err := db.DB()
	if err != nil {
		log.Fatal("Failed to get database instance:", err)
	}
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	// Auto-migrate the schema
	err = db.AutoMigrate(
		&User{},
		&Video{},
		&Session{},
		&Exercise{},
		&UserSession{},
		&Admin{},
		&AdminAction{},
		&Backup{},
	)
	if err != nil {
		log.Printf("Warning: Migration error: %v", err)
	}

	// Verify database connection
	if err := db.Raw("SELECT 1").Error; err != nil {
		log.Fatal("Failed to verify database connection:", err)
	}
}

func init() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	// Create logs directory if it doesn't exist
	if err := os.MkdirAll("logs", 0755); err != nil {
		log.Fatalf("Failed to create logs directory: %v", err)
	}

	// Initialize logger
	logger.InitLogger()
	defer logger.Sync()

	// Initialize database
	initDB()

	// Initialize bot
	var err error
	bot, err = tgbotapi.NewBotAPI(os.Getenv("TELEGRAM_BOT_TOKEN"))
	if err != nil {
		logger.Fatal("Failed to initialize bot", zap.Error(err))
	}

	bot.Debug = false
	logger.Info("Bot started", zap.String("username", bot.Self.UserName))

	// Set up update configuration
	updateConfig := tgbotapi.NewUpdate(0)
	updateConfig.Timeout = 60

	// Handle graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		<-sigChan
		logger.Info("Shutting down bot...")
		bot.StopReceivingUpdates()
		os.Exit(0)
	}()

	// Start receiving updates
	updates := bot.GetUpdatesChan(updateConfig)

	// Process updates
	for update := range updates {
		if update.Message != nil {
			// Log incoming message
			logger.Debug("Received message",
				zap.Int64("user_id", update.Message.From.ID),
				zap.String("username", update.Message.From.UserName),
				zap.String("text", update.Message.Text))

			handleMessage(update)
		} else if update.CallbackQuery != nil {
			handleCallbackQuery(update)
		}
	}
}

func main() {
	// The main function is now empty as initialization and update handling
	// are done in the init function
}

// handleMessage processes incoming messages
func handleMessage(update tgbotapi.Update) {
	// Check if user is admin
	admin := getAdminByTelegramID(update.Message.From.ID)
	if admin != nil {
		// Handle admin commands
		if update.Message.IsCommand() {
			command := update.Message.Command()
			args := update.Message.CommandArguments()
			response := handleAdminCommand(admin, "/"+command, strings.Fields(args))
			sendMessage(update.Message.Chat.ID, response)
			return
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
		case "/admin_exercises":
			if isAdmin {
				handleAdminExercises(admin, args)
			} else {
				sendMessage(update.Message.Chat.ID, "❌ شما دسترسی به این بخش را ندارید")
			}
		}
	}

	// Handle regular messages
	response := processUserInput(update.Message.Text, user)
	sendMessage(update.Message.Chat.ID, response)
}
