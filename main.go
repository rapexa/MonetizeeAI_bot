package main

import (
	"log"
	"os"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/joho/godotenv"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var (
	bot *tgbotapi.BotAPI
	db  *gorm.DB
)

func init() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Printf("Error loading .env file: %v", err)
	}

	// Initialize bot
	var err error
	bot, err = tgbotapi.NewBotAPI(os.Getenv("TELEGRAM_BOT_TOKEN"))
	if err != nil {
		log.Panic(err)
	}

	// Initialize database
	dsn := os.Getenv("MYSQL_DSN")
	db, err = gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Panic("Failed to connect to database:", err)
	}

	// Auto migrate models
	err = db.AutoMigrate(&User{}, &Video{}, &Session{}, &Exercise{}, &UserSession{}, &Admin{}, &AdminAction{})
	if err != nil {
		log.Panic("Failed to migrate database:", err)
	}
}

func main() {
	// Set up update channel
	updateConfig := tgbotapi.NewUpdate(0)
	updateConfig.Timeout = 60
	updates := bot.GetUpdatesChan(updateConfig)

	// Handle updates
	for update := range updates {
		if update.Message != nil {
			handleMessage(&update)
		}
	}
}

func handleMessage(message *tgbotapi.Update) {
	// Get or create user
	user := getUserOrCreate(message.Message.From)

	// Create response message
	msg := tgbotapi.NewMessage(message.Message.Chat.ID, "")

	// Handle commands
	if message.Message.IsCommand() {
		switch message.Message.Command() {
		case "start":
			msg.Text = "Welcome to MonetizeAI! I'm your AI assistant for the course. Let's begin your journey to building a successful AI-powered business."
			msg.ReplyMarkup = getMainMenuKeyboard()
		case "help":
			msg.Text = "I'm here to help you with your MonetizeAI course journey. Use the menu buttons to navigate through the course."
		default:
			msg.Text = "I don't know that command"
		}
	} else {
		// Handle regular messages
		msg.Text = processUserInput(message.Message.Text, user)
	}

	if _, err := bot.Send(msg); err != nil {
		log.Printf("Error sending message: %v", err)
	}
}

func getMainMenuKeyboard() tgbotapi.ReplyKeyboardMarkup {
	keyboard := tgbotapi.NewReplyKeyboard(
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("📚 Current Session"),
			tgbotapi.NewKeyboardButton("✅ Submit Exercise"),
		),
		tgbotapi.NewKeyboardButtonRow(
			tgbotapi.NewKeyboardButton("📊 Progress"),
			tgbotapi.NewKeyboardButton("❓ Help"),
		),
	)
	keyboard.ResizeKeyboard = true
	return keyboard
}
