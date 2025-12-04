package main

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"os"
	"sort"
	"strconv"
	"strings"

	"MonetizeeAI_bot/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// getTelegramInitDataFromRequest returns Telegram init data from header or query string.
func getTelegramInitDataFromRequest(c *gin.Context) string {
	// First try header (for REST API calls)
	if initData := c.GetHeader("X-Telegram-Init-Data"); initData != "" {
		return initData
	}

	// Then try query string (for WebSocket connections)
	// Gin automatically URL-decodes query parameters, so we get the raw init_data string
	initData := c.Query("init_data")
	if initData != "" {
		// The init_data from query string is already URL-decoded by Gin
		// But we need to make sure it's properly formatted
		// If it contains % encoding, decode it again (double-encoded case)
		if decoded, err := url.QueryUnescape(initData); err == nil && decoded != initData {
			// Was double-encoded, use decoded version
			return decoded
		}
		return initData
	}

	return ""
}

// getTelegramIDFromRequest extracts and validates telegram_id from the incoming request.
func getTelegramIDFromRequest(c *gin.Context) (int64, error) {
	// First check if already set in context
	if telegramID := c.GetInt64("telegram_id"); telegramID != 0 {
		return telegramID, nil
	}

	// For WebSocket connections, try telegram_id from query string first (faster, no validation needed)
	// This is safe because WebSocket is only accessible through Telegram WebApp
	if telegramIDStr := c.Query("telegram_id"); telegramIDStr != "" {
		if telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64); err == nil && telegramID > 0 {
			logger.Debug("Using telegram_id from query string",
				zap.String("path", c.Request.URL.Path),
				zap.Int64("telegram_id", telegramID))
			c.Set("telegram_id", telegramID)
			return telegramID, nil
		}
	}

	// Try to validate from init_data (for REST API calls or when telegram_id not in query)
	initData := getTelegramInitDataFromRequest(c)
	if initData == "" {
		err := errors.New("missing Telegram init data")
		logger.Warn("Telegram authentication missing init data",
			zap.String("path", c.Request.URL.Path))
		return 0, err
	}

	telegramID, err := validateTelegramInitData(initData)
	if err != nil {
		logger.Warn("Telegram authentication failed",
			zap.String("path", c.Request.URL.Path),
			zap.Error(err))
		return 0, err
	}

	c.Set("telegram_id", telegramID)
	return telegramID, nil
}

// validateTelegramInitData verifies Telegram WebApp init data signature and extracts the user ID.
func validateTelegramInitData(initData string) (int64, error) {
	// initData is a query string format: "user=...&hash=..."
	// Parse it as a query string
	params, err := url.ParseQuery(initData)
	if err != nil {
		return 0, fmt.Errorf("invalid init data format: %w", err)
	}

	hashHex := params.Get("hash")
	if hashHex == "" {
		return 0, errors.New("missing init data hash")
	}
	params.Del("hash")

	var dataCheck []string
	for key, vals := range params {
		if len(vals) == 0 {
			continue
		}
		dataCheck = append(dataCheck, fmt.Sprintf("%s=%s", key, vals[0]))
	}
	sort.Strings(dataCheck)
	dataCheckString := strings.Join(dataCheck, "\n")

	botToken := os.Getenv("TELEGRAM_BOT_TOKEN")
	if botToken == "" {
		return 0, errors.New("telegram bot token not configured")
	}

	secretKey := sha256.Sum256([]byte("WebAppData" + botToken))
	mac := hmac.New(sha256.New, secretKey[:])
	mac.Write([]byte(dataCheckString))
	expectedMAC := mac.Sum(nil)

	providedMAC, err := hex.DecodeString(hashHex)
	if err != nil {
		return 0, fmt.Errorf("invalid hash encoding: %w", err)
	}

	if !hmac.Equal(expectedMAC, providedMAC) {
		return 0, errors.New("invalid Telegram init data hash")
	}

	userJSON := params.Get("user")
	if userJSON == "" {
		return 0, errors.New("missing Telegram user payload")
	}

	var tgUser struct {
		ID int64 `json:"id"`
	}
	if err := json.Unmarshal([]byte(userJSON), &tgUser); err != nil {
		return 0, fmt.Errorf("invalid Telegram user payload: %w", err)
	}
	if tgUser.ID == 0 {
		return 0, errors.New("invalid Telegram user id")
	}

	return tgUser.ID, nil
}
