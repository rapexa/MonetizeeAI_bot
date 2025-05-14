package main

import (
	"log"
	"os"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/joho/godotenv"
	"gorm.io/gorm"
)

var (
	bot *tgbotapi.BotAPI
	db  *gorm.DB
)

func init() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Fatal("Error loading .env file")
	}

	// Initialize database
	initDB()

	// Initialize bot
	var err error
	bot, err = tgbotapi.NewBotAPI(os.Getenv("TELEGRAM_BOT_TOKEN"))
	if err != nil {
		log.Fatal(err)
	}

	// Set up update configuration
	updateConfig := tgbotapi.NewUpdate(0)
	updateConfig.Timeout = 60

	// Start receiving updates
	updates := bot.GetUpdatesChan(updateConfig)

	// Process updates
	for update := range updates {
		if update.Message != nil {
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
