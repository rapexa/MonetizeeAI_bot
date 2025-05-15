package main

import (
	"log"
	"os"
	"os/signal"
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

			handleMessage(&update)
		} else if update.CallbackQuery != nil {
			handleCallbackQuery(update)
		}
	}
}

func main() {
	// The main function is now empty as initialization and update handling
	// are done in the init function
}
