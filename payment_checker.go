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

// checkPendingPayments finds pending transactions older than 5 minutes and verifies them
func checkPendingPayments() {
	// Find all pending transactions that are older than 5 minutes
	// (to give users time to complete payment)
	var pendingTransactions []PaymentTransaction
	cutoffTime := time.Now().Add(-5 * time.Minute)

	err := db.Where("status = ? AND created_at <= ?", "pending", cutoffTime).Find(&pendingTransactions).Error
	if err != nil {
		logger.Error("Failed to query pending transactions", zap.Error(err))
		return
	}

	if len(pendingTransactions) == 0 {
		logger.Debug("No pending transactions to check")
		return
	}

	logger.Info("Checking pending payments",
		zap.Int("count", len(pendingTransactions)))

	paymentService := NewPaymentService(db)

	for _, transaction := range pendingTransactions {
		// Skip if already processed (shouldn't happen, but safety check)
		if transaction.Status != "pending" {
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

			logger.Info("Pending payment processed successfully",
				zap.Uint("transaction_id", transaction.ID),
				zap.String("authority", transaction.Authority),
				zap.Uint("user_id", transaction.UserID),
				zap.String("plan_type", transaction.Type))
		} else {
			logger.Debug("Payment still pending",
				zap.Uint("transaction_id", transaction.ID),
				zap.String("authority", transaction.Authority),
				zap.String("status", verifiedTransaction.Status))
		}
	}
}

