package main

import (
	"time"

	"MonetizeeAI_bot/logger"

	"go.uber.org/zap"
)

// getIranTime returns current time in Iran timezone
func getIranTime() time.Time {
	loc, err := time.LoadLocation("Asia/Tehran")
	if err != nil {
		logger.Warn("Failed to load Iran timezone, using UTC", zap.Error(err))
		return time.Now().UTC()
	}
	return time.Now().In(loc)
}

// StartPaymentChecker starts a background goroutine that checks pending payments every 2 minutes
func StartPaymentChecker() {
	go func() {
		ticker := time.NewTicker(2 * time.Minute)
		defer ticker.Stop()

		logger.Info("Payment checker started - checking every 2 minutes")

		// Check immediately on start
		checkPendingPayments()

		for range ticker.C {
			checkPendingPayments()
		}
	}()
}

// checkPendingPayments finds pending transactions older than 3 minutes and verifies them
func checkPendingPayments() {
	// Use Iran timezone for all time operations
	iranTime := getIranTime()

	// Find all pending transactions that are older than 3 minutes
	// (to give users time to complete payment, but check soon after)
	var pendingTransactions []PaymentTransaction
	cutoffTime := iranTime.Add(-3 * time.Minute)

	err := db.Where("status = ? AND created_at <= ?", "pending", cutoffTime).Find(&pendingTransactions).Error
	if err != nil {
		logger.Error("Failed to query pending transactions", zap.Error(err))
		return
	}

	if len(pendingTransactions) == 0 {
		// Changed to Info for better visibility
		logger.Info("No pending transactions to check",
			zap.Time("checked_at", iranTime),
			zap.Time("cutoff_time", cutoffTime))
		return
	}

	logger.Info("Checking pending payments",
		zap.Int("count", len(pendingTransactions)),
		zap.Time("checked_at", iranTime))

	paymentService := NewPaymentService(db)

	for _, transaction := range pendingTransactions {
		// Re-check status from database to avoid race conditions
		var currentTransaction PaymentTransaction
		if err := db.Where("id = ?", transaction.ID).First(&currentTransaction).Error; err != nil {
			logger.Warn("Transaction not found, skipping",
				zap.Uint("transaction_id", transaction.ID))
			continue
		}

		// Skip if already processed (shouldn't happen, but safety check)
		if currentTransaction.Status != "pending" {
			logger.Debug("Transaction already processed, skipping",
				zap.Uint("transaction_id", transaction.ID),
				zap.String("status", currentTransaction.Status))
			continue
		}

		logger.Info("Verifying pending payment",
			zap.Uint("transaction_id", transaction.ID),
			zap.String("authority", transaction.Authority),
			zap.Int("amount", transaction.Amount),
			zap.Int64("user_id", int64(transaction.UserID)),
			zap.Time("created_at", transaction.CreatedAt))

		// Verify payment with ZarinPal
		// VerifyPayment is idempotent - if transaction was already processed by manual check,
		// it will return the current status without re-processing
		verifiedTransaction, err := paymentService.VerifyPayment(transaction.Authority, transaction.Amount)
		if err != nil {
			logger.Warn("Payment verification failed",
				zap.Uint("transaction_id", transaction.ID),
				zap.String("authority", transaction.Authority),
				zap.Error(err))
			continue
		}

		logger.Info("Payment verification result",
			zap.Uint("transaction_id", transaction.ID),
			zap.String("authority", transaction.Authority),
			zap.String("status", verifiedTransaction.Status),
			zap.String("ref_id", verifiedTransaction.RefID))

		// Check if payment was successful
		// If transaction was already processed by manual check, status will be "success" but
		// subscription may have already been updated - check before updating again
		if verifiedTransaction.Status == "success" {
			// Final check: Make sure we actually updated the transaction (not just read existing success)
			// VerifyPayment uses atomic update - if RowsAffected was 0, transaction was already processed
			// In that case, subscription should already be updated, so skip duplicate update
			var transactionCheck PaymentTransaction
			if err := db.Where("authority = ?", transaction.Authority).First(&transactionCheck).Error; err == nil {
				// If transaction was already in success state before our call, it was processed manually
				// Check if subscription was already updated
				var userCheck User
				if err := db.First(&userCheck, transaction.UserID).Error; err == nil {
					if userCheck.HasActiveSubscription() && userCheck.PlanName == transaction.Type {
						// Subscription already active with this plan - likely processed by manual check
						logger.Info("Transaction already processed manually, subscription already active - skipping duplicate",
							zap.String("authority", transaction.Authority),
							zap.Uint("user_id", transaction.UserID))
						continue // Skip duplicate subscription update
					}
				}
			}
			logger.Info("Pending payment verified as successful",
				zap.Uint("transaction_id", transaction.ID),
				zap.String("authority", transaction.Authority),
				zap.String("ref_id", verifiedTransaction.RefID),
				zap.Uint("user_id", transaction.UserID))

			// Update user subscription
			if err := paymentService.UpdateUserSubscription(
				transaction.UserID,
				transaction.Type,
			); err != nil {
				logger.Error("Failed to update subscription after verification",
					zap.Uint("user_id", transaction.UserID),
					zap.String("plan_type", transaction.Type),
					zap.Error(err))
				continue
			}

			// Send success notifications (SMS and Telegram)
			sendPaymentSuccessNotifications(verifiedTransaction)

			// Clear user state so they can use the menu
			var user User
			if err := db.First(&user, transaction.UserID).Error; err == nil {
				userStates[user.TelegramID] = ""
				logger.Info("Cleared user state after successful payment",
					zap.Int64("telegram_id", user.TelegramID))
			}

			logger.Info("Pending payment processed successfully",
				zap.Uint("transaction_id", transaction.ID),
				zap.String("authority", transaction.Authority),
				zap.Uint("user_id", transaction.UserID),
				zap.String("plan_type", transaction.Type))
		} else {
			logger.Debug("Payment still pending or failed",
				zap.Uint("transaction_id", transaction.ID),
				zap.String("authority", transaction.Authority),
				zap.String("status", verifiedTransaction.Status))
		}
	}
}
