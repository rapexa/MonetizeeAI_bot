package main

import (
	"log"
	"os"
	"strings"
)

// SMSConfig holds SMS service configuration
type SMSConfig struct {
	APIKey       string
	BaseURL      string
	SenderNumber string

	// Pattern codes
	PatternSignUp                string
	PatternDayOne                string
	PatternDayTwo                string
	PatternExpire                string
	PatternSubscriptionOneMonth  string // یک ماهه
	PatternSubscriptionSixMonth  string // شش‌ماهه
	PatternSubscriptionUnlimited string // مادام‌العمر
}

// isDevelopmentMode returns true if DEVELOPMENT_MODE env is "true"
func isDevelopmentMode() bool {
	return strings.ToLower(os.Getenv("DEVELOPMENT_MODE")) == "true"
}

// getRequiredEnv returns the env value or fatals if missing in production.
// In DEVELOPMENT_MODE=true, it returns devFallback instead of failing.
func getRequiredEnv(key, devFallback string) string {
	value := os.Getenv(key)
	if value != "" {
		return value
	}
	if isDevelopmentMode() {
		log.Printf("⚠️  [DEV MODE] Missing %s, using development fallback", key)
		return devFallback
	}
	log.Fatalf("❌ FATAL: Required environment variable %s is not set. Set it in .env or export it.", key)
	return "" // unreachable
}

// getEnvOrDefault returns environment variable value or default if not set
// Use this for non-secret configuration values only.
func getEnvOrDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// GetSMSConfig loads SMS configuration from environment variables.
// IPPANEL_API_KEY is required in production; other values have safe defaults.
func GetSMSConfig() SMSConfig {
	return SMSConfig{
		// 🔒 SECURITY: API key is required in production (no hardcoded secrets)
		APIKey:       getRequiredEnv("IPPANEL_API_KEY", "DEMO_SMS_KEY"),
		BaseURL:      getEnvOrDefault("IPPANEL_BASE_URL", "https://api2.ippanel.com/api/v1/sms/pattern/normal/send"),
		SenderNumber: getEnvOrDefault("IPPANEL_SENDER", "+983000505"),

		// Pattern codes (not secrets, can have defaults)
		PatternSignUp:                getEnvOrDefault("SMS_PATTERN_SIGNUP", ""),
		PatternDayOne:                getEnvOrDefault("SMS_PATTERN_DAY_ONE", ""),
		PatternDayTwo:                getEnvOrDefault("SMS_PATTERN_DAY_TWO", ""),
		PatternExpire:                getEnvOrDefault("SMS_PATTERN_EXPIRE", ""),
		PatternSubscriptionOneMonth:  getEnvOrDefault("SMS_PATTERN_SUBSCRIPTION_ONE_MONTH", ""),
		PatternSubscriptionSixMonth:  getEnvOrDefault("SMS_PATTERN_SUBSCRIPTION_SIX_MONTH", ""),
		PatternSubscriptionUnlimited: getEnvOrDefault("SMS_PATTERN_SUBSCRIPTION_UNLIMITED", ""),
	}
}
