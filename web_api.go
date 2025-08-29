package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"MonetizeeAI_bot/logger"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// 🔒 SECURITY: Global variables for Mini App security
var (
	// Rate limiting for Mini App API calls
	miniAppRateLimits = make(map[int64]time.Time)
	miniAppCallCounts = make(map[int64]int)

	// User blocking for Mini App
	miniAppBlockedUsers            = make(map[int64]bool)
	miniAppSuspiciousActivityCount = make(map[int64]int)
)

const (
	// 🔒 SECURITY: Rate limiting constants for Mini App
	MaxMiniAppCallsPerMinute = 40 // Allow more calls than bot since Mini App has multiple features
	MiniAppRateLimitWindow   = time.Minute
)

// 🔒 SECURITY: Block suspicious users for Mini App
func blockMiniAppUser(telegramID int64, reason string) {
	miniAppBlockedUsers[telegramID] = true
	miniAppSuspiciousActivityCount[telegramID]++

	logger.Warn("Mini App user blocked for suspicious activity",
		zap.Int64("user_id", telegramID),
		zap.String("reason", reason),
		zap.Int("violation_count", miniAppSuspiciousActivityCount[telegramID]))
}

// 🔒 SECURITY: Check if Mini App user is blocked
func isMiniAppUserBlocked(telegramID int64) bool {
	return miniAppBlockedUsers[telegramID]
}

// 🔒 SECURITY: Validate and sanitize Mini App input
func isValidMiniAppInput(input string, maxLength int) bool {
	// Block suspicious patterns
	suspiciousPatterns := []string{
		"system:", "role:", "assistant:", "user:", "function:", "tool:",
		"prompt injection", "jailbreak", "ignore previous",
		"forget", "reset", "clear", "delete",
		"execute", "run", "command", "script",
		"<script>", "javascript:", "eval(", "document.",
		"admin", "root", "sudo", "chmod", "rm -rf",
		"DROP TABLE", "INSERT INTO", "UPDATE", "DELETE FROM",
		"../../", "..\\", "file://", "ftp://", "http://", "https://",
	}

	inputLower := strings.ToLower(input)
	for _, pattern := range suspiciousPatterns {
		if strings.Contains(inputLower, pattern) {
			return false
		}
	}

	// Block messages that are too long
	if len(input) > maxLength {
		return false
	}

	// Block messages with too many special characters
	specialCharCount := 0
	for _, char := range input {
		if char < 32 || char > 126 { // ASCII printable characters
			specialCharCount++
		}
	}
	if specialCharCount > len(input)/2 {
		return false
	}

	return true
}

// 🔒 SECURITY: Rate limiting for Mini App API calls
func checkMiniAppRateLimit(telegramID int64) bool {
	now := time.Now()
	if lastCallTime, exists := miniAppRateLimits[telegramID]; exists {
		if now.Sub(lastCallTime) < MiniAppRateLimitWindow {
			if miniAppCallCounts[telegramID] >= MaxMiniAppCallsPerMinute {
				return false // Rate limit exceeded
			}
			miniAppCallCounts[telegramID]++
		} else {
			miniAppCallCounts[telegramID] = 1
			miniAppRateLimits[telegramID] = now
		}
	} else {
		miniAppCallCounts[telegramID] = 1
		miniAppRateLimits[telegramID] = now
	}
	return true
}

// 🔒 SECURITY: Clean up Mini App rate limit cache periodically
func cleanupMiniAppRateLimitCache() {
	ticker := time.NewTicker(5 * time.Minute)
	go func() {
		for range ticker.C {
			now := time.Now()
			for telegramID, lastCallTime := range miniAppRateLimits {
				if now.Sub(lastCallTime) > 10*time.Minute {
					delete(miniAppRateLimits, telegramID)
					delete(miniAppCallCounts, telegramID)
				}
			}
		}
	}()
}

// API Response structures
type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
}

type UserInfoResponse struct {
	TelegramID     int64  `json:"telegram_id"`
	Username       string `json:"username"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	CurrentSession int    `json:"current_session"`
	IsVerified     bool   `json:"is_verified"`
	IsActive       bool   `json:"is_active"`
	Level          int    `json:"level"`
	Progress       int    `json:"progress"`
	CompletedTasks int    `json:"completed_tasks"`
}

type SessionInfoResponse struct {
	Number      int    `json:"number"`
	Title       string `json:"title"`
	Description string `json:"description"`
	IsActive    bool   `json:"is_active"`
	IsCompleted bool   `json:"is_completed"`
}

// StartWebAPI initializes and starts the web API server
func StartWebAPI() {
	// Only start if WEB_API_ENABLED is set to true
	if strings.ToLower(os.Getenv("WEB_API_ENABLED")) != "true" {
		logger.Info("Web API is disabled")
		return
	}

	// 🔒 SECURITY: Start cleanup for Mini App rate limiting
	cleanupMiniAppRateLimitCache()

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()

	// Add CORS middleware
	config := cors.DefaultConfig()
	config.AllowOrigins = []string{"*"} // In production, restrict this to your domain
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Telegram-Init-Data"}
	r.Use(cors.New(config))

	// Middleware for logging
	r.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return fmt.Sprintf("%s - [%s] \"%s %s %s %d %s \"%s\" %s\"\n",
			param.ClientIP,
			param.TimeStamp.Format(time.RFC1123),
			param.Method,
			param.Path,
			param.Request.Proto,
			param.StatusCode,
			param.Latency,
			param.Request.UserAgent(),
			param.ErrorMessage,
		)
	}))

	// Recovery middleware
	r.Use(gin.Recovery())

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, APIResponse{
			Success: true,
			Data:    map[string]string{"status": "healthy", "service": "MonetizeeAI API"},
		})
	})

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// Authentication
		v1.POST("/auth/telegram", authenticateTelegramUser)

		// User endpoints
		v1.GET("/user/:telegram_id", getUserInfo)
		v1.GET("/user/:telegram_id/progress", getUserProgress)

		// Session endpoints
		v1.GET("/sessions", getAllSessions)
		v1.GET("/sessions/:number", getSessionByNumber)

		// Chat endpoints
		v1.POST("/chat", handleChatRequest)
		v1.GET("/user/:telegram_id/chat-history", getChatHistory)
		v1.POST("/user/:telegram_id/chat-history", saveChatMessage)

		// Business Builder AI endpoint
		v1.POST("/business-builder", handleBusinessBuilderRequest)

		// SellKit AI endpoint
		v1.POST("/sellkit", handleSellKitRequest)

		// ClientFinder AI endpoint
		v1.POST("/clientfinder", handleClientFinderRequest)

		// SalesPath AI endpoint
		v1.POST("/salespath", handleSalesPathRequest)

		// Profile endpoints
		v1.GET("/user/:telegram_id/profile", getUserProfile)
		v1.PUT("/user/:telegram_id/profile", updateUserProfile)

		// Progress tracking
		v1.POST("/user/:telegram_id/progress", updateUserProgress)

		// Quiz evaluation endpoint
		v1.POST("/evaluate-quiz", handleQuizEvaluation)

		// 🔒 SECURITY: Mini App security management endpoint
		v1.POST("/security", handleMiniAppSecurity)

	}

	port := getEnvWithDefault("WEB_API_PORT", "8080")
	logger.Info("Starting Web API server", zap.String("port", port))

	go func() {
		if err := r.Run(":" + port); err != nil {
			logger.Error("Failed to start Web API server", zap.Error(err))
		}
	}()
}

// authenticateTelegramUser validates Telegram user and returns user info
func authenticateTelegramUser(c *gin.Context) {
	var requestData struct {
		TelegramID int64  `json:"telegram_id" binding:"required"`
		Username   string `json:"username"`
		FirstName  string `json:"first_name"`
		LastName   string `json:"last_name"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request data: " + err.Error(),
		})
		return
	}

	// Find user in database
	var user User
	result := db.Where("telegram_id = ?", requestData.TelegramID).First(&user)

	if result.Error == gorm.ErrRecordNotFound {
		c.JSON(http.StatusNotFound, APIResponse{
			Success: false,
			Error:   "User not found. Please use the Telegram bot first to register.",
		})
		return
	}

	if result.Error != nil {
		logger.Error("Database error in authentication", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
		})
		return
	}

	// Check if user is verified and active
	if !user.IsVerified {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   "User not verified. Please complete verification in the Telegram bot.",
		})
		return
	}

	if !user.IsActive {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   "User account is suspended.",
		})
		return
	}

	// Return user info
	completedSessions := user.CurrentSession - 1
	userLevel := GetUserLevel(completedSessions)
	progress := GetUserProgress(completedSessions)

	userInfo := UserInfoResponse{
		TelegramID:     user.TelegramID,
		Username:       user.Username,
		FirstName:      user.FirstName,
		LastName:       user.LastName,
		CurrentSession: user.CurrentSession,
		IsVerified:     user.IsVerified,
		IsActive:       user.IsActive,
		Level:          userLevel.Level,
		Progress:       progress,
		CompletedTasks: completedSessions,
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    userInfo,
	})
}

// getUserInfo returns detailed user information
func getUserInfo(c *gin.Context) {
	telegramIDStr := c.Param("telegram_id")
	telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid telegram_id",
		})
		return
	}

	var user User
	if err := db.Where("telegram_id = ?", telegramID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Success: false,
			Error:   "User not found",
		})
		return
	}

	completedSessions := user.CurrentSession - 1
	userLevel := GetUserLevel(completedSessions)
	progress := GetUserProgress(completedSessions)

	userInfo := UserInfoResponse{
		TelegramID:     user.TelegramID,
		Username:       user.Username,
		FirstName:      user.FirstName,
		LastName:       user.LastName,
		CurrentSession: user.CurrentSession,
		IsVerified:     user.IsVerified,
		IsActive:       user.IsActive,
		Level:          userLevel.Level,
		Progress:       progress,
		CompletedTasks: completedSessions,
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    userInfo,
	})
}

// getUserProgress returns user progress details
func getUserProgress(c *gin.Context) {
	telegramIDStr := c.Param("telegram_id")
	telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid telegram_id",
		})
		return
	}

	var user User
	if err := db.Where("telegram_id = ?", telegramID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Success: false,
			Error:   "User not found",
		})
		return
	}

	completedSessions := user.CurrentSession - 1
	userLevel := GetUserLevel(completedSessions)
	progress := GetUserProgress(completedSessions)

	progressInfo := map[string]interface{}{
		"current_session":    user.CurrentSession,
		"completed_sessions": completedSessions,
		"total_sessions":     29,
		"current_level":      userLevel.Level,
		"level_name":         userLevel.Name,
		"level_description":  userLevel.Description,
		"level_emoji":        userLevel.Emoji,
		"progress_percent":   progress,
		"next_level":         nil,
	}

	// Add next level info if not at max level
	if userLevel.Level < 9 {
		nextLevel := UserLevels[userLevel.Level] // Next level (0-indexed)
		progressInfo["next_level"] = map[string]interface{}{
			"level":       nextLevel.Level,
			"name":        nextLevel.Name,
			"description": nextLevel.Description,
			"emoji":       nextLevel.Emoji,
		}
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    progressInfo,
	})
}

// getAllSessions returns all available sessions
func getAllSessions(c *gin.Context) {
	var sessions []Session
	if err := db.Find(&sessions).Error; err != nil {
		logger.Error("Failed to get sessions", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
		})
		return
	}

	var sessionResponses []SessionInfoResponse
	for _, session := range sessions {
		sessionResponses = append(sessionResponses, SessionInfoResponse{
			Number:      session.Number,
			Title:       session.Title,
			Description: session.Description,
			IsActive:    session.IsActive,
			IsCompleted: session.IsCompleted,
		})
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    sessionResponses,
	})
}

// getSessionByNumber returns specific session information
func getSessionByNumber(c *gin.Context) {
	numberStr := c.Param("number")
	number, err := strconv.Atoi(numberStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid session number",
		})
		return
	}

	var session Session
	if err := db.Where("number = ?", number).First(&session).Error; err != nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Success: false,
			Error:   "Session not found",
		})
		return
	}

	sessionResponse := SessionInfoResponse{
		Number:      session.Number,
		Title:       session.Title,
		Description: session.Description,
		IsActive:    session.IsActive,
		IsCompleted: session.IsCompleted,
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    sessionResponse,
	})
}

// updateUserProgress updates user progress (future use)
func updateUserProgress(c *gin.Context) {
	telegramIDStr := c.Param("telegram_id")
	_, err := strconv.ParseInt(telegramIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid telegram_id",
		})
		return
	}

	var requestData struct {
		Action string                 `json:"action" binding:"required"` // "complete_session", etc.
		Data   map[string]interface{} `json:"data"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request data: " + err.Error(),
		})
		return
	}

	// For now, just return success (implement actual logic later)
	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    map[string]string{"message": "Progress update received (not implemented yet)"},
	})
}

// ChatRequest represents the chat request payload
type ChatRequest struct {
	TelegramID int64  `json:"telegram_id" binding:"required"`
	Message    string `json:"message" binding:"required"`
}

// ChatResponse represents the chat response
type ChatResponse struct {
	Response string `json:"response"`
}

// handleChatRequest handles chat requests to ChatGPT
func handleChatRequest(c *gin.Context) {
	var requestData ChatRequest
	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request data",
		})
		return
	}

	// 🔒 SECURITY: Check if user is blocked
	if isMiniAppUserBlocked(requestData.TelegramID) {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   "🚫 دسترسی شما به چت مسدود شده است. لطفا با پشتیبانی تماس بگیرید.",
		})
		return
	}

	// 🔒 SECURITY: Rate limiting
	if !checkMiniAppRateLimit(requestData.TelegramID) {
		c.JSON(http.StatusTooManyRequests, APIResponse{
			Success: false,
			Error:   "⚠️ شما بیش از حد درخواست ارسال کرده‌اید. لطفا چند دقیقه صبر کنید.",
		})
		return
	}

	// 🔒 SECURITY: Validate and sanitize user input
	if !isValidMiniAppInput(requestData.Message, 500) {
		logger.Warn("Blocked suspicious chat message",
			zap.Int64("user_id", requestData.TelegramID),
			zap.String("message", requestData.Message))

		// Increment suspicious activity count
		miniAppSuspiciousActivityCount[requestData.TelegramID]++

		// Block user after 3 violations
		if miniAppSuspiciousActivityCount[requestData.TelegramID] >= 3 {
			blockMiniAppUser(requestData.TelegramID, "Multiple suspicious messages")
			c.JSON(http.StatusForbidden, APIResponse{
				Success: false,
				Error:   "🚫 دسترسی شما به دلیل فعالیت مشکوک مسدود شده است.",
			})
			return
		}

		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "❌ پیام شما حاوی محتوای نامعتبر است. لطفا فقط سوالات مرتبط با دوره را بپرسید.",
		})
		return
	}

	// Verify user exists
	var user User
	result := db.Where("telegram_id = ?", requestData.TelegramID).First(&user)
	if result.Error == gorm.ErrRecordNotFound {
		c.JSON(http.StatusNotFound, APIResponse{
			Success: false,
			Error:   "User not found",
		})
		return
	}

	if result.Error != nil {
		logger.Error("Database error in chat request", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
		})
		return
	}

	// Get response from ChatGPT
	response := handleChatGPTMessageAPI(&user, requestData.Message)

	// Save chat message to database
	chatMessage := ChatMessage{
		TelegramID: requestData.TelegramID,
		Message:    requestData.Message,
		Response:   response,
	}

	if err := db.Create(&chatMessage).Error; err != nil {
		logger.Error("Failed to save chat message", zap.Error(err))
		// Continue anyway - don't fail the request just because we couldn't save
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: ChatResponse{
			Response: response,
		},
	})
}

// handleChatGPTMessageAPI handles ChatGPT requests for API (similar to handlers.go function)
func handleChatGPTMessageAPI(user *User, message string) string {
	return makeChatGPTRequest(user, message)
}

// makeChatGPTRequest makes the actual ChatGPT API request
func makeChatGPTRequest(user *User, message string) string {
	// Create the API request
	url := "https://api.openai.com/v1/chat/completions"

	// Prepare the request body
	requestBody := map[string]interface{}{
		"model": "gpt-4-turbo-preview",
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "You are a helpful course assistant for MonetizeeAI. Provide clear, concise, and relevant answers to help monetizers with their questions about the course content. Always respond in Persian and address users as 'مانیتایزر عزیز' (dear monetizer).",
			},
			{
				"role":    "user",
				"content": message,
			},
		},
		"temperature": 0.7,
		"max_tokens":  4000, // Increased from 1000 to prevent truncation
	}

	// Convert request body to JSON
	jsonBody, err := json.Marshal(requestBody)
	if err != nil {
		logger.Error("Failed to marshal request",
			zap.Int64("user_id", user.TelegramID),
			zap.Error(err))
		return "❌ خطا در پردازش درخواست. لطفا دوباره تلاش کنید."
	}

	// Create HTTP request
	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	if err != nil {
		logger.Error("Failed to create request",
			zap.Int64("user_id", user.TelegramID),
			zap.Error(err))
		return "❌ خطا در ایجاد درخواست. لطفا دوباره تلاش کنید."
	}

	// Set headers
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+os.Getenv("OPENAI_API_KEY"))

	// Send request
	client := &http.Client{
		Timeout: 120 * time.Second, // Increased timeout for complete AI responses
	}
	resp, err := client.Do(req)
	if err != nil {
		logger.Error("Failed to send request",
			zap.Int64("user_id", user.TelegramID),
			zap.Error(err))
		return "❌ خطا در ارتباط با ChatGPT. لطفا چند لحظه صبر کنید و دوباره تلاش کنید."
	}
	defer resp.Body.Close()

	// Read response
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		logger.Error("Failed to read response",
			zap.Int64("user_id", user.TelegramID),
			zap.Error(err))
		return "❌ خطا در دریافت پاسخ. لطفا دوباره تلاش کنید."
	}

	// Parse response
	var openAIResponse struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
		Error struct {
			Message string `json:"error"`
		} `json:"error"`
	}

	if err := json.Unmarshal(body, &openAIResponse); err != nil {
		logger.Error("Failed to parse response",
			zap.Int64("user_id", user.TelegramID),
			zap.Error(err))
		return "❌ خطا در تجزیه پاسخ. لطفا دوباره تلاش کنید."
	}

	// Check for API errors
	if openAIResponse.Error.Message != "" {
		logger.Error("OpenAI API error",
			zap.Int64("user_id", user.TelegramID),
			zap.String("error", openAIResponse.Error.Message))
		return "❌ خطا در سرویس هوش مصنوعی. لطفا دوباره تلاش کنید."
	}

	// Check if we have a response
	if len(openAIResponse.Choices) == 0 {
		logger.Error("No response from OpenAI",
			zap.Int64("user_id", user.TelegramID))
		return "❌ پاسخی دریافت نشد. لطفا دوباره تلاش کنید."
	}

	response := openAIResponse.Choices[0].Message.Content

	logger.Info("ChatGPT response received",
		zap.Int64("user_id", user.TelegramID),
		zap.Int("response_length", len(response)),
		zap.String("response_preview", response[:min(len(response), 200)]))

	return response
}

// getChatHistory returns chat history for a user
func getChatHistory(c *gin.Context) {
	telegramIDStr := c.Param("telegram_id")
	telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid telegram_id",
		})
		return
	}

	var chatMessages []ChatMessage
	result := db.Where("telegram_id = ?", telegramID).Order("created_at ASC").Find(&chatMessages)
	if result.Error != nil {
		logger.Error("Database error in getting chat history", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    chatMessages,
	})
}

// saveChatMessage saves a chat message to database
func saveChatMessage(c *gin.Context) {
	telegramIDStr := c.Param("telegram_id")
	telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid telegram_id",
		})
		return
	}

	var requestData struct {
		Message  string `json:"message" binding:"required"`
		Response string `json:"response" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request data",
		})
		return
	}

	chatMessage := ChatMessage{
		TelegramID: telegramID,
		Message:    requestData.Message,
		Response:   requestData.Response,
	}

	if err := db.Create(&chatMessage).Error; err != nil {
		logger.Error("Database error in saving chat message", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    chatMessage,
	})
}

// getUserProfile returns user profile information
func getUserProfile(c *gin.Context) {
	telegramIDStr := c.Param("telegram_id")
	telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid telegram_id",
		})
		return
	}

	var user User
	result := db.Where("telegram_id = ?", telegramID).First(&user)
	if result.Error != nil {
		logger.Error("Database error in getting user profile", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "User not found",
		})
		return
	}

	// Create profile response (only requested fields)
	profileData := map[string]interface{}{
		"username":       user.Username,
		"phone":          user.Phone,
		"email":          user.Email,
		"monthly_income": user.MonthlyIncome,
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    profileData,
	})
}

// updateUserProfile updates user profile information
func updateUserProfile(c *gin.Context) {
	telegramIDStr := c.Param("telegram_id")
	telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid telegram_id",
		})
		return
	}

	var requestData struct {
		Username      string `json:"username"`
		Phone         string `json:"phone"`
		Email         string `json:"email"`
		MonthlyIncome int64  `json:"monthly_income"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request data",
		})
		return
	}

	// Find user
	var user User
	result := db.Where("telegram_id = ?", telegramID).First(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "User not found",
		})
		return
	}

	// Update profile fields (only requested fields)
	if requestData.Username != "" {
		user.Username = requestData.Username
	}
	user.Phone = requestData.Phone
	user.Email = requestData.Email
	user.MonthlyIncome = requestData.MonthlyIncome

	// Save to database
	if err := db.Save(&user).Error; err != nil {
		logger.Error("Database error in updating user profile", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
		})
		return
	}

	logger.Info("User profile updated",
		zap.Int64("telegram_id", telegramID),
		zap.String("username", requestData.Username))

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"message": "Profile updated successfully",
		},
	})
}

// BusinessBuilderRequest represents the input for business plan generation
type BusinessBuilderRequest struct {
	TelegramID int64  `json:"telegram_id"`
	UserName   string `json:"user_name"`
	Interests  string `json:"interests"`
	Skills     string `json:"skills"`
	Market     string `json:"market"`
}

// BusinessBuilderResponse represents the structured business plan response
type BusinessBuilderResponse struct {
	BusinessName   string   `json:"businessName"`
	Tagline        string   `json:"tagline"`
	Description    string   `json:"description"`
	TargetAudience string   `json:"targetAudience"`
	Products       []string `json:"products"`
	Monetization   []string `json:"monetization"`
	FirstAction    string   `json:"firstAction"`
}

// handleBusinessBuilderRequest handles AI-powered business plan generation
func handleBusinessBuilderRequest(c *gin.Context) {
	var req BusinessBuilderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request format",
		})
		return
	}

	// Validate required fields
	if req.UserName == "" || req.Interests == "" || req.Market == "" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "نام، علاقه‌مندی‌ها و بازار هدف الزامی هستند",
		})
		return
	}

	// Create structured prompt for ChatGPT
	prompt := fmt.Sprintf(`تو یک مشاور کسب‌وکار حرفه‌ای و خلاق هستی. بر اساس اطلاعات زیر، یک طرح کسب‌وکار جذاب و عملی بساز:

نام کاربر: %s
علاقه‌مندی‌ها: %s
مهارت‌ها: %s
بازار هدف: %s

اهمیت:
- نام کسب‌وکار باید خلاقانه و جذاب باشد (نه فقط نام + کسب‌وکار)
- توضیحات باید مفصل و جذاب باشد
- محصولات باید عملی و قابل اجرا باشند
- روش‌های درآمدزایی مشخص و واقعی باشند
- اولین قدم عملی و قابل انجام باشد

پاسخ خود را دقیقاً به صورت JSON بده بدون هیچ متن اضافی:

{
  "businessName": "نام خلاقانه و جذاب برای کسب‌وکار",
  "tagline": "شعار جذاب و کوتاه که ارزش برند را نشان دهد",
  "description": "توضیح کامل و جذاب کسب‌وکار در 3-4 جمله که مشکل مخاطب و راه‌حل را نشان دهد",
  "targetAudience": "مخاطب هدف دقیق و مشخص",
  "products": ["محصول عملی 1", "محصول عملی 2", "محصول عملی 3"],
  "monetization": ["روش درآمدزایی مشخص 1", "روش درآمدزایی مشخص 2", "روش درآمدزایی مشخص 3"],
  "firstAction": "اولین قدم عملی و مشخص که امروز می‌توان انجام داد"
}`,
		req.UserName, req.Interests, req.Skills, req.Market)

	// Find user for ChatGPT call
	var user User
	result := db.Where("telegram_id = ?", req.TelegramID).First(&user)
	if result.Error != nil {
		logger.Error("Database error in finding user for business builder", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "کاربر یافت نشد",
		})
		return
	}

	// Call ChatGPT API
	response := handleChatGPTMessageAPI(&user, prompt)

	// Extract JSON from response (handle markdown code blocks)
	cleanResponse := extractJSONFromResponse(response)
	logger.Info("ChatGPT response for business builder",
		zap.String("raw_response", response),
		zap.String("clean_response", cleanResponse))

	// Try to parse the JSON response
	var businessPlan BusinessBuilderResponse
	if err := json.Unmarshal([]byte(cleanResponse), &businessPlan); err != nil {
		// If JSON parsing fails, log and return error
		logger.Error("Failed to parse ChatGPT JSON response",
			zap.Error(err),
			zap.String("response", response),
			zap.String("clean_response", cleanResponse))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "خطا در پردازش پاسخ ChatGPT. لطفاً دوباره تلاش کنید.",
		})
		return
	}

	logger.Info("Business plan generated successfully",
		zap.Int64("telegram_id", req.TelegramID),
		zap.String("business_name", businessPlan.BusinessName))

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    businessPlan,
	})
}

// SellKitRequest represents the input for sales kit generation
type SellKitRequest struct {
	TelegramID     int64  `json:"telegram_id"`
	ProductName    string `json:"product_name"`
	Description    string `json:"description"`
	TargetAudience string `json:"target_audience"`
	Benefits       string `json:"benefits"`
}

// SellKitResponse represents the structured sales kit response
type SellKitResponse struct {
	Title            string   `json:"title"`
	Headline         string   `json:"headline"`
	Description      string   `json:"description"`
	Benefits         []string `json:"benefits"`
	PriceRange       string   `json:"priceRange"`
	Offer            string   `json:"offer"`
	VisualSuggestion string   `json:"visualSuggestion"`
}

// handleSellKitRequest handles AI-powered sales kit generation
func handleSellKitRequest(c *gin.Context) {
	var req SellKitRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request format",
		})
		return
	}

	// Validate required fields
	if req.ProductName == "" || req.Description == "" || req.TargetAudience == "" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "نام محصول، توضیحات و مخاطب هدف الزامی هستند",
		})
		return
	}

	// Create structured prompt for ChatGPT
	prompt := fmt.Sprintf(`تو یک متخصص بازاریابی و فروش حرفه‌ای هستی. بر اساس اطلاعات زیر، یک کیت فروش حرفه‌ای و جذاب بساز:

نام محصول: %s
توضیحات: %s
مخاطب هدف: %s
مزایای اصلی: %s

اهمیت:
- عنوان باید جذاب و قانع‌کننده باشد
- تیتر باید عاطفی و تأثیرگذار باشد
- توضیحات باید مشکل مخاطب و راه‌حل را نشان دهد
- مزایا باید عملی و قابل اندازه‌گیری باشند
- قیمت بر اساس بازار ایران باشد
- پیشنهاد ویژه جذاب و عملی باشد

پاسخ خود را دقیقاً به صورت JSON بده بدون هیچ متن اضافی:

{
  "title": "عنوان جذاب و قانع‌کننده برای محصول",
  "headline": "تیتر عاطفی و تأثیرگذار که توجه را جلب کند",
  "description": "توضیح کامل و متقاعدکننده که مشکل و راه‌حل را بیان کند",
  "benefits": ["مزیت عملی 1", "مزیت عملی 2", "مزیت عملی 3"],
  "priceRange": "محدوده قیمت به تومان بر اساس بازار ایران",
  "offer": "پیشنهاد ویژه جذاب با تخفیف یا بونوس",
  "visualSuggestion": "پیشنهاد مشخص برای تصاویر بازاریابی"
}`,
		req.ProductName, req.Description, req.TargetAudience, req.Benefits)

	// Find user for ChatGPT call
	var user User
	result := db.Where("telegram_id = ?", req.TelegramID).First(&user)
	if result.Error != nil {
		logger.Error("Database error in finding user for sellkit", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "کاربر یافت نشد",
		})
		return
	}

	// Call ChatGPT API
	response := handleChatGPTMessageAPI(&user, prompt)

	// Extract JSON from response (handle markdown code blocks)
	cleanResponse := extractJSONFromResponse(response)
	logger.Info("ChatGPT response for sellkit",
		zap.String("raw_response", response),
		zap.String("clean_response", cleanResponse))

	// Try to parse the JSON response
	var sellKit SellKitResponse
	if err := json.Unmarshal([]byte(cleanResponse), &sellKit); err != nil {
		// If JSON parsing fails, log and return error
		logger.Error("Failed to parse ChatGPT JSON response for sellkit",
			zap.Error(err),
			zap.String("response", response),
			zap.String("clean_response", cleanResponse))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "خطا در پردازش پاسخ ChatGPT. لطفاً دوباره تلاش کنید.",
		})
		return
	}

	logger.Info("Sell kit generated successfully",
		zap.Int64("telegram_id", req.TelegramID),
		zap.String("product_name", req.ProductName))

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    sellKit,
	})
}

// ClientFinderRequest represents the input for client finding
type ClientFinderRequest struct {
	TelegramID   int64    `json:"telegram_id"`
	Product      string   `json:"product"`
	TargetClient string   `json:"target_client"`
	Platforms    []string `json:"platforms"`
}

// ClientFinderResponse represents the structured client finder response
type ClientFinderResponse struct {
	Channels        []ClientChannel `json:"channels"`
	OutreachMessage string          `json:"outreachMessage"`
	Hashtags        []string        `json:"hashtags"`
	ActionPlan      []string        `json:"actionPlan"`
}

// ClientChannel represents a recommended channel for finding clients
type ClientChannel struct {
	Name   string `json:"name"`
	Reason string `json:"reason"`
}

// handleClientFinderRequest handles AI-powered client finding
func handleClientFinderRequest(c *gin.Context) {
	var req ClientFinderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request format",
		})
		return
	}

	// Validate required fields
	if req.Product == "" || req.TargetClient == "" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "محصول و مخاطب هدف الزامی هستند",
		})
		return
	}

	// Convert platforms array to string
	platformsStr := "همه پلتفرم‌ها"
	if len(req.Platforms) > 0 {
		platformsStr = strings.Join(req.Platforms, ", ")
	}

	// Create structured prompt for ChatGPT
	prompt := fmt.Sprintf(`تو یک متخصص بازاریابی و یافتن مشتری هستی. بر اساس اطلاعات زیر، یک راهنمای کامل یافتن مشتری بساز:

محصول/خدمات: %s
مخاطب هدف: %s
پلتفرم‌های مورد نظر: %s

اهمیت:
- کانال‌ها باید بهترین و موثرترین باشند برای مخاطب هدف
- پیام ارتباط باید شخصی و جذاب باشد
- هشتگ‌ها باید مرتبط و پر ترافیک باشند
- برنامه عملی باید مشخص و عملی باشد

پاسخ خود را دقیقاً به صورت JSON بده بدون هیچ متن اضافی:

{
  "channels": [
    {
      "name": "نام کانال موثر 1",
      "reason": "دلیل انتخاب و مزیت این کانال"
    },
    {
      "name": "نام کانال موثر 2",
      "reason": "دلیل انتخاب و مزیت این کانال"
    },
    {
      "name": "نام کانال موثر 3",
      "reason": "دلیل انتخاب و مزیت این کانال"
    }
  ],
  "outreachMessage": "پیام شخصی و جذاب برای ارتباط با مشتریان بالقوه",
  "hashtags": ["هشتگ1", "هشتگ2", "هشتگ3", "هشتگ4"],
  "actionPlan": ["قدم عملی 1", "قدم عملی 2", "قدم عملی 3"]
}`,
		req.Product, req.TargetClient, platformsStr)

	// Find user for ChatGPT call
	var user User
	result := db.Where("telegram_id = ?", req.TelegramID).First(&user)
	if result.Error != nil {
		logger.Error("Database error in finding user for clientfinder", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "کاربر یافت نشد",
		})
		return
	}

	// Call ChatGPT API
	response := handleChatGPTMessageAPI(&user, prompt)

	// Extract JSON from response (handle markdown code blocks)
	cleanResponse := extractJSONFromResponse(response)
	logger.Info("ChatGPT response for clientfinder",
		zap.String("raw_response", response),
		zap.String("clean_response", cleanResponse))

	// Try to parse the JSON response
	var clientFinder ClientFinderResponse
	if err := json.Unmarshal([]byte(cleanResponse), &clientFinder); err != nil {
		// If JSON parsing fails, log and return error
		logger.Error("Failed to parse ChatGPT JSON response for clientfinder",
			zap.Error(err),
			zap.String("response", response),
			zap.String("clean_response", cleanResponse))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "خطا در پردازش پاسخ ChatGPT. لطفاً دوباره تلاش کنید.",
		})
		return
	}

	logger.Info("Client finder generated successfully",
		zap.Int64("telegram_id", req.TelegramID),
		zap.String("product", req.Product),
		zap.String("target_client", req.TargetClient))

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    clientFinder,
	})
}

// SalesPathRequest represents the input for sales path generation
type SalesPathRequest struct {
	TelegramID     int64  `json:"telegram_id"`
	ProductName    string `json:"product_name"`
	TargetAudience string `json:"target_audience"`
	SalesChannel   string `json:"sales_channel"`
	Goal           string `json:"goal"`
}

// SalesPathResponse represents the structured sales path response
type SalesPathResponse struct {
	DailyPlan  []DailyPlan `json:"dailyPlan"`
	SalesTips  []string    `json:"salesTips"`
	Engagement []string    `json:"engagement"`
}

// DailyPlan represents a daily action in the sales path
type DailyPlan struct {
	Day     string `json:"day"`
	Action  string `json:"action"`
	Content string `json:"content"`
}

// handleSalesPathRequest handles AI-powered sales path generation
func handleSalesPathRequest(c *gin.Context) {
	var req SalesPathRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request format",
		})
		return
	}

	// Validate required fields
	if req.ProductName == "" || req.TargetAudience == "" || req.SalesChannel == "" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "نام محصول، مخاطب هدف و کانال فروش الزامی هستند",
		})
		return
	}

	// Create structured prompt for ChatGPT
	prompt := fmt.Sprintf(`تو یک متخصص فروش و بازاریابی حرفه‌ای هستی. بر اساس اطلاعات زیر، یک مسیر فروش سریع و عملی برای ۷ روز بساز:

نام محصول/خدمات: %s
مخاطب هدف: %s
کانال فروش: %s
هدف فروش: %s

اهمیت:
- برنامه ۷ روزه باید عملی و قابل اجرا باشد
- نکات فروش باید عملی و موثر باشند
- تاکتیک‌های تعامل باید متنوع و جذاب باشند
- توجه ویژه به کانال فروش انتخابی

پاسخ خود را دقیقاً به صورت JSON بده بدون هیچ متن اضافی:

{
  "dailyPlan": [
    {
      "day": "روز ۱",
      "action": "عنوان اقدام روز اول",
      "content": "توضیح کامل اقدامات عملی روز اول"
    },
    {
      "day": "روز ۲",
      "action": "عنوان اقدام روز دوم",
      "content": "توضیح کامل اقدامات عملی روز دوم"
    },
    {
      "day": "روز ۳",
      "action": "عنوان اقدام روز سوم",
      "content": "توضیح کامل اقدامات عملی روز سوم"
    },
    {
      "day": "روز ۴",
      "action": "عنوان اقدام روز چهارم",
      "content": "توضیح کامل اقدامات عملی روز چهارم"
    },
    {
      "day": "روز ۵",
      "action": "عنوان اقدام روز پنجم",
      "content": "توضیح کامل اقدامات عملی روز پنجم"
    },
    {
      "day": "روز ۶",
      "action": "عنوان اقدام روز ششم",
      "content": "توضیح کامل اقدامات عملی روز ششم"
    },
    {
      "day": "روز ۷",
      "action": "عنوان اقدام روز هفتم",
      "content": "توضیح کامل اقدامات عملی روز هفتم"
    }
  ],
  "salesTips": ["نکته فروش 1", "نکته فروش 2", "نکته فروش 3", "نکته فروش 4"],
  "engagement": ["تاکتیک تعامل 1", "تاکتیک تعامل 2", "تاکتیک تعامل 3", "تاکتیک تعامل 4"]
}`,
		req.ProductName, req.TargetAudience, req.SalesChannel, req.Goal)

	// Find user for ChatGPT call
	var user User
	result := db.Where("telegram_id = ?", req.TelegramID).First(&user)
	if result.Error != nil {
		logger.Error("Database error in finding user for salespath", zap.Error(result.Error))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "کاربر یافت نشد",
		})
		return
	}

	// Call ChatGPT API
	response := handleChatGPTMessageAPI(&user, prompt)

	// Check if response is an error message (timeout or other ChatGPT issues)
	if strings.Contains(response, "❌") || strings.Contains(response, "خطا") {
		// If ChatGPT failed, use fallback response directly
		logger.Info("ChatGPT API failed, using fallback response for salespath",
			zap.String("error_response", response))

		salesPath := SalesPathResponse{
			DailyPlan: []DailyPlan{
				{Day: "روز ۱", Action: "آماده‌سازی محتوا", Content: "ایجاد پست معرفی محصول و آماده‌سازی پیام‌های فروش"},
				{Day: "روز ۲", Action: "شروع تعامل", Content: "ارسال پیام به 20 مخاطب هدف و پاسخ به کامنت‌ها"},
				{Day: "روز ۳", Action: "ارائه پیشنهاد", Content: "ارائه تخفیف ویژه و تماس با مشتریان علاقه‌مند"},
				{Day: "روز ۴", Action: "پیگیری فروش", Content: "تماس با مشتریان و بستن اولین معاملات"},
				{Day: "روز ۵", Action: "بهینه‌سازی", Content: "تحلیل نتایج و بهبود استراتژی فروش"},
				{Day: "روز ۶", Action: "توسعه بازار", Content: "جستجوی مشتریان جدید و گسترش شبکه"},
				{Day: "روز ۷", Action: "نتیجه‌گیری", Content: "ارزیابی نتایج و برنامه‌ریزی برای هفته بعد"},
			},
			SalesTips: []string{
				"همیشه روی ارزش محصول تمرکز کنید نه قیمت",
				"مشتریان را گوش دهید و نیازهایشان را درک کنید",
				"از داستان‌سرایی برای جذب توجه استفاده کنید",
				"پیگیری منظم و مداوم داشته باشید",
			},
			Engagement: []string{
				"پرسش‌های تعاملی",
				"محتوای آموزشی",
				"تخفیف‌های محدود",
				"گواهی‌نامه‌های کیفیت",
			},
		}

		logger.Info("Sales path generated successfully with fallback",
			zap.Int64("telegram_id", req.TelegramID),
			zap.String("product_name", req.ProductName),
			zap.String("sales_channel", req.SalesChannel))

		c.JSON(http.StatusOK, APIResponse{
			Success: true,
			Data:    salesPath,
		})
		return
	}

	// Extract JSON from response (handle markdown code blocks)
	cleanResponse := extractJSONFromResponse(response)
	logger.Info("ChatGPT response for salespath",
		zap.String("raw_response", response),
		zap.String("clean_response", cleanResponse))

	// Try to parse the JSON response
	var salesPath SalesPathResponse
	if err := json.Unmarshal([]byte(cleanResponse), &salesPath); err != nil {
		// If JSON parsing fails, log detailed error and return default response for testing
		logger.Error("Failed to parse ChatGPT JSON response for salespath",
			zap.Error(err),
			zap.String("response", response),
			zap.String("clean_response", cleanResponse),
			zap.String("error_detail", err.Error()))

		// For testing purposes, return a default response if JSON parsing fails
		salesPath = SalesPathResponse{
			DailyPlan: []DailyPlan{
				{Day: "روز ۱", Action: "آماده‌سازی محتوا", Content: "ایجاد پست معرفی محصول و آماده‌سازی پیام‌های فروش"},
				{Day: "روز ۲", Action: "شروع تعامل", Content: "ارسال پیام به 20 مخاطب هدف و پاسخ به کامنت‌ها"},
				{Day: "روز ۳", Action: "ارائه پیشنهاد", Content: "ارائه تخفیف ویژه و تماس با مشتریان علاقه‌مند"},
				{Day: "روز ۴", Action: "پیگیری فروش", Content: "تماس با مشتریان و بستن اولین معاملات"},
				{Day: "روز ۵", Action: "بهینه‌سازی", Content: "تحلیل نتایج و بهبود استراتژی فروش"},
				{Day: "روز ۶", Action: "توسعه بازار", Content: "جستجوی مشتریان جدید و گسترش شبکه"},
				{Day: "روز ۷", Action: "نتیجه‌گیری", Content: "ارزیابی نتایج و برنامه‌ریزی برای هفته بعد"},
			},
			SalesTips: []string{
				"همیشه روی ارزش محصول تمرکز کنید نه قیمت",
				"مشتریان را گوش دهید و نیازهایشان را درک کنید",
				"از داستان‌سرایی برای جذب توجه استفاده کنید",
				"پیگیری منظم و مداوم داشته باشید",
			},
			Engagement: []string{
				"پرسش‌های تعاملی",
				"محتوای آموزشی",
				"تخفیف‌های محدود",
				"گواهی‌نامه‌های کیفیت",
			},
		}
		logger.Info("Using fallback response for salespath due to parsing error")
	}

	logger.Info("Sales path generated successfully",
		zap.Int64("telegram_id", req.TelegramID),
		zap.String("product_name", req.ProductName),
		zap.String("sales_channel", req.SalesChannel))

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    salesPath,
	})
}

// extractJSONFromResponse extracts JSON from ChatGPT response (handles markdown code blocks)
func extractJSONFromResponse(response string) string {
	// Remove leading/trailing whitespace
	response = strings.TrimSpace(response)

	// Look for JSON in markdown code blocks
	if strings.Contains(response, "```json") {
		// Find the start and end of the JSON block
		startMarker := "```json"
		endMarker := "```"

		startIdx := strings.Index(response, startMarker)
		if startIdx != -1 {
			startIdx += len(startMarker)
			endIdx := strings.Index(response[startIdx:], endMarker)
			if endIdx != -1 {
				jsonContent := strings.TrimSpace(response[startIdx : startIdx+endIdx])
				return jsonContent
			}
		}
	}

	// Look for JSON in generic code blocks
	if strings.Contains(response, "```") {
		// Find the start and end of any code block
		startMarker := "```"
		startIdx := strings.Index(response, startMarker)
		if startIdx != -1 {
			startIdx += len(startMarker)
			// Skip any language identifier on the same line
			if newlineIdx := strings.Index(response[startIdx:], "\n"); newlineIdx != -1 {
				startIdx += newlineIdx + 1
			}
			endIdx := strings.Index(response[startIdx:], startMarker)
			if endIdx != -1 {
				jsonContent := strings.TrimSpace(response[startIdx : startIdx+endIdx])
				// Check if it looks like JSON
				if strings.HasPrefix(jsonContent, "{") && strings.HasSuffix(jsonContent, "}") {
					return jsonContent
				}
			}
		}
	}

	// If no code blocks found, try to find JSON object directly
	if strings.Contains(response, "{") && strings.Contains(response, "}") {
		startIdx := strings.Index(response, "{")
		lastIdx := strings.LastIndex(response, "}")
		if startIdx != -1 && lastIdx != -1 && lastIdx > startIdx {
			jsonContent := strings.TrimSpace(response[startIdx : lastIdx+1])
			return jsonContent
		}
	}

	// Return original response if no JSON structure found
	return response
}

// QuizEvaluationRequest represents the quiz evaluation request
type QuizEvaluationRequest struct {
	TelegramID int64                  `json:"telegram_id" binding:"required"`
	StageID    int                    `json:"stage_id" binding:"required"`
	Answers    map[string]interface{} `json:"answers" binding:"required"`
}

// QuizEvaluationResponse represents the quiz evaluation response
type QuizEvaluationResponse struct {
	Passed            bool   `json:"passed"`
	Score             int    `json:"score"`
	Feedback          string `json:"feedback"`
	NextStageUnlocked bool   `json:"next_stage_unlocked"`
}

// handleQuizEvaluation handles quiz evaluation with ChatGPT
func handleQuizEvaluation(c *gin.Context) {
	var req QuizEvaluationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request format",
		})
		return
	}

	// Find user
	var user User
	result := db.Where("telegram_id = ?", req.TelegramID).First(&user)
	if result.Error != nil {
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "User not found",
		})
		return
	}

	// Get stage information (from current session)
	var session Session
	if err := db.Where("number = ?", req.StageID).First(&session).Error; err != nil {
		logger.Error("Failed to get session for quiz evaluation", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Stage not found",
		})
		return
	}

	// Convert answers to string for ChatGPT analysis
	answersJSON, _ := json.Marshal(req.Answers)
	answersStr := string(answersJSON)

	// Create evaluation prompt similar to exercise submission
	context := fmt.Sprintf(`Stage Title: %s
Stage Description: %s
Stage ID: %d

Student's Quiz Answers:
%s

Please evaluate this quiz submission according to these criteria:
1. Check if the answers demonstrate understanding of the stage's learning objectives
2. Evaluate the quality and depth of responses
3. If the answers are insufficient:
   - Provide specific feedback on what's missing
   - Give helpful guidance for improvement
   - Explain what they should study more
4. If the answers are good:
   - Provide positive reinforcement
   - Give permission to move to next stage
5. Keep the tone friendly and encouraging
6. Always address the user as 'مانیتایزر عزیز' (dear monetizer)
7. Respond in Persian

Rate the performance on a scale of 0-100 and determine if they should pass (≥70).

Format your response as:
APPROVED: [yes/no]
SCORE: [0-100]
FEEDBACK: [your detailed feedback in Persian]`,
		session.Title,
		session.Description,
		req.StageID,
		answersStr)

	// Get evaluation from ChatGPT
	evaluation := handleChatGPTMessageAPI(&user, context)

	// Parse the response
	var approved bool
	var score int
	var feedback string

	// Split the response into lines
	lines := strings.Split(evaluation, "\n")
	for _, line := range lines {
		if strings.HasPrefix(line, "APPROVED:") {
			approved = strings.Contains(strings.ToLower(line), "yes")
		} else if strings.HasPrefix(line, "SCORE:") {
			scoreStr := strings.TrimSpace(strings.TrimPrefix(line, "SCORE:"))
			if parsedScore, err := strconv.Atoi(scoreStr); err == nil {
				score = parsedScore
			}
		} else if strings.HasPrefix(line, "FEEDBACK:") {
			feedback = strings.TrimSpace(strings.TrimPrefix(line, "FEEDBACK:"))
		}
	}

	// Fallback values if parsing failed
	if feedback == "" {
		if approved {
			feedback = "عالی! مانیتایزر عزیز، شما با موفقیت این مرحله را تکمیل کردید و آماده ورود به مرحله بعدی هستید."
		} else {
			feedback = "نیاز به بهبود دارید. مانیتایزر عزیز، لطفا مطالب را مرور کنید و دوباره تلاش کنید."
		}
	}
	if score == 0 {
		if approved {
			score = 80
		} else {
			score = 50
		}
	}

	nextStageUnlocked := false
	if approved {
		// Update user progress - move to next stage
		user.CurrentSession++
		if err := db.Save(&user).Error; err != nil {
			logger.Error("Failed to update user session after quiz",
				zap.Int64("user_id", user.TelegramID),
				zap.Int("new_session", user.CurrentSession),
				zap.Error(err))
		} else {
			nextStageUnlocked = true
			logger.Info("User passed quiz and moved to next session",
				zap.Int64("user_id", user.TelegramID),
				zap.Int("stage_id", req.StageID),
				zap.Int("score", score))
		}
	}

	response := QuizEvaluationResponse{
		Passed:            approved,
		Score:             score,
		Feedback:          feedback,
		NextStageUnlocked: nextStageUnlocked,
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    response,
	})
}

// handleMiniAppSecurity handles security-related requests for Mini App
func handleMiniAppSecurity(c *gin.Context) {
	// This endpoint is for Mini App developers to manage security settings.
	// For now, it's a placeholder. In a real application, you'd implement
	// actual security logic here, e.g., rate limiting, blocking, etc.

	// Example: Block a user for suspicious activity
	telegramIDStr := c.PostForm("telegram_id")
	if telegramIDStr == "" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Telegram ID is required",
		})
		return
	}

	telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid Telegram ID",
		})
		return
	}

	// Simulate suspicious activity for demonstration
	// In a real app, you'd check actual suspicious activity counts
	if miniAppSuspiciousActivityCount[telegramID] >= 3 { // Example: block after 3 suspicious activities
		blockMiniAppUser(telegramID, "Too many suspicious activities detected.")
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   "User account is blocked due to suspicious activity.",
		})
		return
	}

	// Simulate a successful check
	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]string{
			"message": "Security check passed. No suspicious activity detected.",
		},
	})
}

// Helper function to get environment variable with default
func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// Helper functions for logging
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
