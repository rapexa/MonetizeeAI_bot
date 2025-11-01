package main

import (
	"time"

	"MonetizeeAI_bot/logger"

	"go.uber.org/zap"
)

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

// checkPendingPayments finds pending transactions older than 2 minutes and verifies them
func checkPendingPayments() {
	// Find all pending transactions that are older than 2 minutes
	// (to give users time to complete payment, but check soon after)
	var pendingTransactions []PaymentTransaction
	cutoffTime := time.Now().Add(-3 * time.Minute)

	err := db.Where("status = ? AND created_at <= ?", "pending", cutoffTime).Find(&pendingTransactions).Error
	if err != nil {
		logger.Error("Failed to query pending transactions", zap.Error(err))
		return
	}

	if len(pendingTransactions) == 0 {
		// Changed to Info for better visibility
		logger.Info("No pending transactions to check",
			zap.Time("checked_at", time.Now()),
			zap.Time("cutoff_time", cutoffTime))
		return
	}

	logger.Info("Checking pending payments",
		zap.Int("count", len(pendingTransactions)),
		zap.Time("checked_at", time.Now()))

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
		if verifiedTransaction.Status == "success" {
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
