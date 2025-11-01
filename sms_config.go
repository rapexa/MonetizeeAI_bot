package main

import "os"

// SMSConfig holds SMS service configuration
type SMSConfig struct {
	APIKey       string
	BaseURL      string
	SenderNumber string
	
	// Pattern codes
	PatternSignUp        string
	PatternDayOne        string
	PatternDayTwo        string
	PatternExpire        string
}

// GetSMSConfig loads SMS configuration from environment variables
func GetSMSConfig() SMSConfig {
	return SMSConfig{
		APIKey:       getEnvOrDefault("IPPANEL_API_KEY", "YTA0MGZmMjUtYWZkOS00NDI3LTk3ZGMtOWIxYTk5N2ViZjVkZWRkY2MxZDg4YTU2ZjZkZGMyMzNiODA0YWE4OGM3MzE="),
		BaseURL:      getEnvOrDefault("IPPANEL_BASE_URL", "https://api2.ippanel.com/api/v1/sms/pattern/normal/send"),
		SenderNumber: getEnvOrDefault("IPPANEL_SENDER", "+983000505"),
		
		// Pattern codes
		PatternSignUp: getEnvOrDefault("SMS_PATTERN_SIGNUP", "atd1s2iyjhbyn97"),
		PatternDayOne: getEnvOrDefault("SMS_PATTERN_DAY_ONE", "2oqomrq32ku7ulw"),
		PatternDayTwo: getEnvOrDefault("SMS_PATTERN_DAY_TWO", "bmjuebluw7fqtb8"),
		PatternExpire: getEnvOrDefault("SMS_PATTERN_EXPIRE", "0p50p1flzpolqhe"),
	}
}

// getEnvOrDefault returns environment variable value or default if not set
func getEnvOrDefault(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

