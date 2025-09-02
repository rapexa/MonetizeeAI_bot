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
		&LicenseVerification{},
		&ChatMessage{},
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

	// Start Web API server (optional, controlled by environment variable)
	StartWebAPI()

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

	// 🔒 SECURITY: Start rate limit cache cleanup
	cleanupRateLimitCache()

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
			// Route all callbacks to admin_handlers.go
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

			// Handle cancel command
			if command == "cancel" {
				state, exists := adminStates[admin.TelegramID]
				if exists && (state == StateWaitingForBroadcast ||
					strings.HasPrefix(state, StateConfirmBroadcast) ||
					state == StateWaitingForSMSBroadcast ||
					strings.HasPrefix(state, StateConfirmSMSBroadcast)) {
					delete(adminStates, admin.TelegramID)
					sendMessage(update.Message.Chat.ID, "❌ ارسال پیام یا پیامک همگانی لغو شد")
					return
				}
			}

			response := handleAdminCommand(admin, "/"+command, strings.Fields(args))
			sendMessage(update.Message.Chat.ID, response)
			return
		}

		// Handle admin state
		state, exists := adminStates[admin.TelegramID]
		if exists {
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

			case StateWaitingForBroadcast:
				response := handleBroadcastMessage(admin, update.Message)
				sendMessage(admin.TelegramID, response)
				return

			case StateWaitingForSMSBroadcast:
				response := handleSMSBroadcastMessage(admin, update.Message.Text)
				sendMessage(admin.TelegramID, response)
				return
			}

			// Handle states with parameters
			if strings.HasPrefix(state, "edit_session:") {
				handleEditSessionInfo(admin, update.Message.Text)
				return
			} else if strings.HasPrefix(state, "add_video:") {
				handleAddVideoResponse(admin, update.Message.Text)
				return
			} else if strings.HasPrefix(state, "edit_video:") {
				handleEditVideoResponse(admin, update.Message.Text)
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
		case "📢 ارسال پیام همگانی":
			response := handleAdminBroadcast(admin, []string{})
			sendMessage(update.Message.Chat.ID, response)
			return
		case "📲 ارسال پیامک همگانی":
			response := handleAdminSMSBroadcast(admin, []string{})
			sendMessage(update.Message.Chat.ID, response)
			return
		case "🔒 امنیت مینی اپ":
			response := handleMiniAppSecurity(admin, []string{})
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
			blockMsg := tgbotapi.NewMessage(update.Message.Chat.ID, "⚠️ دسترسی شما به ربات مسدود شده است.\n\n📞 برای رفع مسدودیت با پشتیبانی تماس بگیرید:\n\n"+SUPPORT_NUMBER)
			blockMsg.ReplyMarkup = tgbotapi.NewRemoveKeyboard(true)
			bot.Send(blockMsg)
			return
		}
	} else {
		// User not found, create new user
		user = getUserOrCreate(update.Message.From)
	}

	// Block access until user is verified
	if !user.IsVerified {
		// Only allow license/name input, do not show main menu or process other commands
		processUserInput(update.Message.Text, user)
		return
	}

	// Handle commands
	if update.Message.IsCommand() {
		switch update.Message.Command() {
		case "start":
			// Only send welcome message if user already exists
			if !isNewUser(update.Message.From.ID) {
				msg := tgbotapi.NewMessage(update.Message.Chat.ID, "به ربات MONETIZE AI🥇 خوش آمدید! من دستیار هوشمند شما هستم. بیایید سفر خود را برای ساخت یک کسب و کار موفق مبتنی بر هوش مصنوعی شروع کنیم.")
				msg.ReplyMarkup = getMainMenuKeyboard()
				bot.Send(msg)

				// Send voice message with caption
				voice := tgbotapi.NewVoice(update.Message.Chat.ID, tgbotapi.FileURL("http://quantnano.ir/wp-content/uploads/2025/05/جلسه-صفر.mp3"))
				voice.Caption = "🧠 این ویس رو با دقت گوش بده؛ اینجا نقطه شروع یه مسیر جدیه…\n\n👇 بعد از گوش دادن، برو سراغ مرحله ۱\nجایی که اولین قدم مسیر درآمد دلاری با هوش مصنوعی رو برمی‌داری 🚀"
				bot.Send(voice)
			}
			return
		case "help":
			sendMessage(update.Message.Chat.ID, "من اینجا هستم تا در سفر مونیتایز به شما کمک کنم. از دکمه‌های منو برای پیمایش در ربات استفاده کنید.")
			return
		case "admin_exercises":
			// Check if user is admin for this specific command
			currentAdmin := getAdminByTelegramID(update.Message.From.ID)
			if currentAdmin != nil {
				handleAdminExercises(currentAdmin, []string{})
			} else {
				sendMessage(update.Message.Chat.ID, "❌ شما دسترسی به این بخش را ندارید")
			}
			return
		}
	}

	// Handle regular messages
	response := processUserInput(update.Message.Text, user)
	sendMessage(update.Message.Chat.ID, response)
}
