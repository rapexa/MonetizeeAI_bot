package main

import (
	"fmt"
	"time"

	"MonetizeeAI_bot/logger"

	"go.uber.org/zap"
)

// startSMSScheduler starts background goroutine to send scheduled SMS messages
func startSMSScheduler() {
	go func() {
		// Set Iran timezone
		loc, err := time.LoadLocation("Asia/Tehran")
		if err != nil {
			logger.Error("Failed to load Iran timezone", zap.Error(err))
			loc = time.UTC
		}

		ticker := time.NewTicker(1 * time.Minute) // Check every minute
		defer ticker.Stop()

		for range ticker.C {
			now := time.Now().In(loc)
			currentHour := now.Hour()
			currentMinute := now.Minute()

			// Day 2 SMS: 11:00 AM (free trial day one - 11 صبح)
			if currentHour == 11 && currentMinute == 0 {
				sendFreeTrialDayOneSMS()
			}

			// Day 3 SMS: 10:00 AM (free trial day two - 10 صبح)
			if currentHour == 10 && currentMinute == 0 {
				sendFreeTrialDayTwoSMS()
			}

			// Check for expired free trials (2 hours after expiry)
			checkAndSendExpiredFreeTrialSMS()
		}
	}()

	logger.Info("SMS Scheduler started")
}

// sendFreeTrialDayOneSMS sends SMS to users on day 2 of free trial (11 AM)
func sendFreeTrialDayOneSMS() {
	var users []User
	config := GetSMSConfig()

	// Find all free trial users who haven't received day one SMS
	// Only send if they still have free_trial subscription (not upgraded to paid)
	db.Where("subscription_type = ? AND free_trial_day_one_sms_sent = ?", "free_trial", false).Find(&users)

	now := time.Now()
	for _, user := range users {
		// Skip if user has purchased subscription (upgraded from free_trial)
		if user.SubscriptionType != "free_trial" || (user.HasActiveSubscription() && user.SubscriptionType == "paid") {
			// Mark as sent to prevent future attempts
			user.FreeTrialDayOneSMSSent = true
			db.Save(&user)
			continue
		}

		// Check if user started free trial yesterday (approximately)
		// We check if subscription was started 24-48 hours ago
		if user.SubscriptionExpiry != nil {
			expiryTime := user.SubscriptionExpiry.In(time.UTC)
			daysSinceStart := now.Sub(expiryTime).Hours() / 24
			// Day 2 means 1 day has passed (between 1 and 2 days)
			if daysSinceStart >= -2 && daysSinceStart <= -1 {
				if user.Phone != "" {
					err := sendPatternSMS(config.PatternDayOne, user.Phone, map[string]string{})
					if err != nil {
						logger.Error("Failed to send free trial day one SMS",
							zap.Int64("user_id", user.TelegramID),
							zap.String("phone", user.Phone),
							zap.Error(err))
					} else {
						user.FreeTrialDayOneSMSSent = true
						db.Save(&user)
						logger.Info("Free trial day one SMS sent",
							zap.Int64("user_id", user.TelegramID),
							zap.String("phone", user.Phone))
					}
				}
			}
		}
	}
}

// sendFreeTrialDayTwoSMS sends SMS to users on day 3 of free trial (10 AM)
func sendFreeTrialDayTwoSMS() {
	var users []User
	config := GetSMSConfig()

	// Find all free trial users who haven't received day two SMS and haven't purchased subscription
	// Only send if they still have free_trial subscription (not upgraded to paid)
	db.Where("subscription_type = ? AND free_trial_day_two_sms_sent = ?", "free_trial", false).Find(&users)

	now := time.Now()
	for _, user := range users {
		// Skip if user has purchased subscription (upgraded from free_trial)
		if user.SubscriptionType != "free_trial" || (user.HasActiveSubscription() && user.SubscriptionType == "paid") {
			// Mark as sent to prevent future attempts
			user.FreeTrialDayTwoSMSSent = true
			db.Save(&user)
			continue
		}

		// Check if user started free trial 2 days ago (approximately)
		// We check if subscription expires soon (on day 3, it expires in less than 1 day)
		if user.SubscriptionExpiry != nil {
			expiryTime := user.SubscriptionExpiry.In(time.UTC)
			daysUntilExpiry := expiryTime.Sub(now).Hours() / 24
			// Day 3 means less than 1 day left (between 0 and 1 day remaining)
			if daysUntilExpiry >= 0 && daysUntilExpiry <= 1 {
				if user.Phone != "" {
					err := sendPatternSMS(config.PatternDayTwo, user.Phone, map[string]string{})
					if err != nil {
						logger.Error("Failed to send free trial day two SMS",
							zap.Int64("user_id", user.TelegramID),
							zap.String("phone", user.Phone),
							zap.Error(err))
					} else {
						user.FreeTrialDayTwoSMSSent = true
						db.Save(&user)
						logger.Info("Free trial day two SMS sent",
							zap.Int64("user_id", user.TelegramID),
							zap.String("phone", user.Phone))
					}
				}
			}
		}
	}
}

// checkAndSendExpiredFreeTrialSMS sends SMS 2 hours after free trial expiry
func checkAndSendExpiredFreeTrialSMS() {
	var users []User
	now := time.Now()
	config := GetSMSConfig()

	// Find users whose free trial expired 2 hours ago (within 5 minute window for checking)
	// Only send if they still have free_trial subscription (haven't purchased)
	twoHoursAgo := now.Add(-2 * time.Hour)
	fiveMinutesAgo := now.Add(-5 * time.Minute)

	db.Where("subscription_type = ? AND subscription_expiry IS NOT NULL AND subscription_expiry BETWEEN ? AND ? AND free_trial_expire_sms_sent = ?",
		"free_trial", twoHoursAgo, fiveMinutesAgo, false).Find(&users)

	for _, user := range users {
		// Skip if user has purchased subscription (upgraded from free_trial)
		if user.SubscriptionType != "free_trial" || (user.HasActiveSubscription() && user.SubscriptionType == "paid") {
			// Mark as sent to prevent future attempts
			user.FreeTrialExpireSMSSent = true
			db.Save(&user)
			continue
		}

		if user.Phone != "" && user.SubscriptionExpiry != nil {
			// Check if expired more than 2 hours ago
			expiryTime := user.SubscriptionExpiry.In(time.UTC)
			if now.Sub(expiryTime) >= 2*time.Hour && now.Sub(expiryTime) < 3*time.Hour {
				userName := user.FirstName
				if user.LastName != "" {
					userName = fmt.Sprintf("%s %s", user.FirstName, user.LastName)
				}

				err := sendPatternSMS(config.PatternExpire, user.Phone, map[string]string{
					"variable": userName,
				})
				if err != nil {
					logger.Error("Failed to send free trial expiry SMS",
						zap.Int64("user_id", user.TelegramID),
						zap.String("phone", user.Phone),
						zap.Error(err))
				} else {
					user.FreeTrialExpireSMSSent = true
					db.Save(&user)
					logger.Info("Free trial expiry SMS sent",
						zap.Int64("user_id", user.TelegramID),
						zap.String("phone", user.Phone))
				}
			}
		}
	}
}

// cancelRemainingSMSPromotions cancels all remaining SMS promotions for a user
// Call this when user purchases a subscription
func cancelRemainingSMSPromotions(user *User) {
	user.FreeTrialDayOneSMSSent = true
	user.FreeTrialDayTwoSMSSent = true
	user.FreeTrialExpireSMSSent = true
	db.Save(user)
	logger.Info("Cancelled remaining SMS promotions for user",
		zap.Int64("user_id", user.TelegramID))
}
