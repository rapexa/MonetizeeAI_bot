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
	bot        *tgbotapi.BotAPI
	db         *gorm.DB
	groqClient *GroqClient
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
		&PaymentTransaction{},
	)
	if err != nil {
		logger.Fatal("Failed to migrate database", zap.Error(err))
	} else {
		logger.Info("Database migration completed successfully", zap.String("tables", "users, videos, sessions, exercises, admins, payment_transactions"))
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

	// Initialize Groq AI client
	groqClient = NewGroqClient()
	if groqClient == nil {
		logger.Warn("Groq client initialization failed - AI features may not work")
	} else {
		logger.Info("Groq AI client initialized successfully")
	}

	// Start Web API server (optional, controlled by environment variable)
	StartWebAPI()

	// Start payment checker background job
	StartPaymentChecker()

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

			case StateWaitingForSubsUser:
				handleSubsSearch(admin, update.Message.Text)
				delete(adminStates, admin.TelegramID)
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
		case "💎 مدیریت اشتراک‌ها":
			handleManageSubscriptions(admin)
			return
		}

		// Send admin keyboard if no command matched
		msg := tgbotapi.NewMessage(update.Message.Chat.ID, "منوی ادمین:")
		msg.ReplyMarkup = getAdminKeyboard()
		bot.Send(msg)
		return
	}

	// 📢 CHANNEL MEMBERSHIP CHECK (for non-admin users only)
	// Check if user is member of required channel
	if !checkChannelMembership(update.Message.From.ID) {
		logger.Info("User not member of required channel",
			zap.Int64("user_id", update.Message.From.ID),
			zap.String("username", update.Message.From.UserName))
		
		// Send join channel message
		sendJoinChannelMessage(update.Message.From.ID)
		return
	}

	// Handle test_start command early to reset everything and show full flow
	if update.Message.IsCommand() && update.Message.Command() == "test_start" {
		// Reset state to force full flow
		userStates[update.Message.From.ID] = StateWaitingForName

		// Get or create user, but reset their verification status for testing
		var user User
		result := db.Where("telegram_id = ?", update.Message.From.ID).First(&user)
		if result.Error == gorm.ErrRecordNotFound {
			// Create new user for testing
			user = User{
				TelegramID:       update.Message.From.ID,
				Username:         update.Message.From.UserName,
				FirstName:        update.Message.From.FirstName,
				LastName:         update.Message.From.LastName,
				CurrentSession:   1,
				IsVerified:       false,
				SubscriptionType: "none",
				PlanName:         "",
				// Reset SMS flags for testing
				SignUpSMSSent:          false,
				FreeTrialDayOneSMSSent: false,
				FreeTrialDayTwoSMSSent: false,
				FreeTrialExpireSMSSent: false,
			}
			db.Create(&user)
		} else {
			// User exists - reset SMS flags and verification for testing
			user.IsVerified = false
			user.SubscriptionType = "none"
			user.PlanName = ""
			// Reset SMS flags for testing so SMS can be sent again
			user.SignUpSMSSent = false
			user.FreeTrialDayOneSMSSent = false
			user.FreeTrialDayTwoSMSSent = false
			user.FreeTrialExpireSMSSent = false
			// Clear phone so it asks again
			user.Phone = ""
			user.FirstName = ""
			user.LastName = ""
			// Reset subscription expiry
			user.SubscriptionExpiry = nil
			db.Save(&user)
		}

		// Send welcome message and ask for name
		msg := tgbotapi.NewMessage(update.Message.Chat.ID, "👋 سلام\n\nخوش اومدی به دنیای MonetizeAI\n\nاولین ربات هوشمندی که قدم‌به‌قدم کمکت می‌کنه مسیر درآمد دلاری خودت رو با هوش مصنوعی بسازی.\n\n🧠 لطفاً نام و نام خانوادگی خودت رو ارسال کن تا ربات هوشمند برای تو فعال بشه.")
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

    // If we are collecting phone and user shared contact, handle it
    if update.Message.Contact != nil {
        // Ensure we have latest state
        state, _ := userStates[user.TelegramID]
        if state == StateWaitingForPhone {
            completePhoneStepWithContact(user, update.Message.Contact)
            return
        }
    }

    // Block access until user is verified OR has active subscription (free trial)
    // Only process license input for users who are NOT verified AND have NO active subscription
    if !user.IsVerified && !user.HasActiveSubscription() {
        // Only allow license/name/phone input, do not show main menu or process other commands
        processUserInput(update.Message.Text, user)
        return
    }

	// Check if subscription has expired and is not in license entry mode
	state, _ := userStates[user.TelegramID]
	if !user.HasActiveSubscription() && state != StateWaitingForLicense {
		// If user tries to use any command except license entry, send message
		if update.Message.IsCommand() && update.Message.Command() != "start" {
			msg := tgbotapi.NewMessage(update.Message.Chat.ID,
				"⚠️ اشتراک شما به پایان رسید!\n\n"+
					"🔒 برای استفاده از امکانات ربات، لطفا اشتراک ماهیانه خریداری کنید یا لایسنس خود را وارد کنید.")
			msg.ReplyMarkup = getExpiredSubscriptionKeyboard()
			bot.Send(msg)
			return
		}
	}

	// Handle commands
	if update.Message.IsCommand() {
		switch update.Message.Command() {
		case "start":
			// Only send welcome message if user already exists and is verified
			if !isNewUser(update.Message.From.ID) && user.IsVerified {
				msg := tgbotapi.NewMessage(update.Message.Chat.ID, "👋 سلام خوش اومدی به دنیای MonetizeAI اولین ربات هوشمندی که قدم‌به‌قدم کمکت می‌کنه مسیر درآمد دلاری خودت رو با هوش مصنوعی بسازی.")
				msg.ReplyMarkup = getMainMenuKeyboard(user)
				bot.Send(msg)
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

	// Refresh user from database before processing input
	// This ensures we have the latest subscription status
	var freshUser User
	if err := db.Where("telegram_id = ?", update.Message.From.ID).First(&freshUser).Error; err == nil {
		user = &freshUser
	}

	// Handle regular messages
	response := processUserInput(update.Message.Text, user)
	sendMessage(update.Message.Chat.ID, response)
}
