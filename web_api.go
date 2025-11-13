package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"regexp"
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
	MaxMiniAppCallsPerMinute = 3 // Rate limit: 3 messages per minute
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

// 🔒 SECURITY: Simple input validation for Mini App (only length check)
func isValidMiniAppInput(input string, maxLength int) bool {
	// Only check message length - no other restrictions
	if len(input) > maxLength {
		return false
	}

	// Allow all other content
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
	TelegramID         int64      `json:"telegram_id"`
	Username           string     `json:"username"`
	FirstName          string     `json:"first_name"`
	LastName           string     `json:"last_name"`
	CurrentSession     int        `json:"current_session"`
	IsVerified         bool       `json:"is_verified"`
	IsActive           bool       `json:"is_active"`
	Level              int        `json:"level"`
	Progress           int        `json:"progress"`
	CompletedTasks     int        `json:"completed_tasks"`
	SubscriptionType   string     `json:"subscription_type"`
	PlanName           string     `json:"plan_name"`
	SubscriptionExpiry *time.Time `json:"subscription_expiry,omitempty"`
	FreeTrialUsed      bool       `json:"free_trial_used"`
	ChatMessagesUsed   int        `json:"chat_messages_used"`
	CourseSessionsUsed int        `json:"course_sessions_used"`
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
		v1.POST("/security", handleMiniAppSecurityAPI)

		// Payment endpoints
		v1.POST("/payment/create", handleCreatePaymentRequest)
		v1.GET("/payment/status", handleCheckPaymentStatus)
	}

	// Payment callback routes (outside v1, for ZarinPal)
	paymentHandler := NewPaymentHandler()
	r.GET("/payment/callback", func(c *gin.Context) {
		paymentHandler.HandleCallback(c.Writer, c.Request)
	})
	r.POST("/payment/callback", func(c *gin.Context) {
		paymentHandler.HandleCallback(c.Writer, c.Request)
	})
	r.GET("/payment/check", func(c *gin.Context) {
		paymentHandler.CheckPaymentStatus(c.Writer, c.Request)
	})

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

	// Check if subscription has expired
	if !user.HasActiveSubscription() {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   "Your subscription has expired. Please return to the bot and purchase a subscription or enter your license.",
		})
		return
	}

	// Return user info
	completedSessions := user.CurrentSession - 1
	userLevel := GetUserLevel(completedSessions)
	progress := GetUserProgress(completedSessions)

	userInfo := UserInfoResponse{
		TelegramID:         user.TelegramID,
		Username:           user.Username,
		FirstName:          user.FirstName,
		LastName:           user.LastName,
		CurrentSession:     user.CurrentSession,
		IsVerified:         user.IsVerified,
		IsActive:           user.IsActive,
		Level:              userLevel.Level,
		Progress:           progress,
		CompletedTasks:     completedSessions,
		SubscriptionType:   user.SubscriptionType,
		PlanName:           user.PlanName,
		SubscriptionExpiry: user.SubscriptionExpiry,
		FreeTrialUsed:      user.FreeTrialUsed,
		ChatMessagesUsed:   user.ChatMessagesUsed,
		CourseSessionsUsed: user.CourseSessionsUsed,
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

	// 📢 Check channel membership
	if errMsg := checkChannelMembershipAPI(telegramID); errMsg != "" {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   errMsg,
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
		TelegramID:         user.TelegramID,
		Username:           user.Username,
		FirstName:          user.FirstName,
		LastName:           user.LastName,
		CurrentSession:     user.CurrentSession,
		IsVerified:         user.IsVerified,
		IsActive:           user.IsActive,
		Level:              userLevel.Level,
		Progress:           progress,
		CompletedTasks:     completedSessions,
		SubscriptionType:   user.SubscriptionType,
		PlanName:           user.PlanName,
		SubscriptionExpiry: user.SubscriptionExpiry,
		FreeTrialUsed:      user.FreeTrialUsed,
		ChatMessagesUsed:   user.ChatMessagesUsed,
		CourseSessionsUsed: user.CourseSessionsUsed,
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

	// 🔒 SECURITY: Only rate limiting (3 messages per minute)
	if !checkMiniAppRateLimit(requestData.TelegramID) {
		c.JSON(http.StatusTooManyRequests, APIResponse{
			Success: false,
			Error:   "شما به محدودیت سه تا سوال در دقیقه رسیدید لطفا دقایق دیگر امتحان کنید",
		})
		return
	}

	// 🔒 SECURITY: Simple input validation (only length check)
	if !isValidMiniAppInput(requestData.Message, 2000) { // Increased limit to 2000 characters
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "❌ پیام شما خیلی طولانی است. لطفا پیام کوتاه‌تری ارسال کنید.",
		})
		return
	}

	// 📢 Check channel membership
	if errMsg := checkChannelMembershipAPI(requestData.TelegramID); errMsg != "" {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   errMsg,
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

	// Check if subscription has expired
	if !user.HasActiveSubscription() {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   "Your subscription has expired. Please return to the bot and purchase a subscription or enter your license.",
		})
		return
	}

	// Check subscription limits
	if !user.CanUseChat() {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   "⚠️ به سقف پیام روزانه‌ات رسیدی! 🤖 با نسخه ویژه، بدون محدودیت از دستیار هوش مصنوعی استفاده کن",
		})
		return
	}

	// Get response from ChatGPT
	response := handleChatGPTMessageAPI(&user, requestData.Message)

	// Increment chat message count for free trial users and users without subscription type
	if user.SubscriptionType == "free_trial" || user.SubscriptionType == "none" || user.SubscriptionType == "" {
		user.ChatMessagesUsed++
		if err := db.Save(&user).Error; err != nil {
			logger.Error("Failed to increment chat messages used", zap.Error(err))
		}
	}

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

// 📦 BACKUP: Old OpenAI implementation - kept for reference
func makeChatGPTRequest_OLD(user *User, message string) string {
	// Create the API request
	url := "https://api.openai.com/v1/chat/completions"

	// Prepare the request body
	requestBody := map[string]interface{}{
		"model": "gpt-4-turbo-preview",
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "You are a helpful AI assistant for MonetizeeAI. You can help with various topics including business, marketing, sales, and general questions. Always respond in Persian and be friendly and helpful. Address users as 'مانیتایزر عزیز' (dear monetizer).",
			},
			{
				"role":    "user",
				"content": message,
			},
		},
		"temperature": 0.7,
		"max_tokens":  4000, // Reduced to save costs
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

// ⚡ NEW: Groq-based ChatGPT handler for API
func makeChatGPTRequest(user *User, message string) string {
	// Check if Groq client is initialized
	if groqClient == nil {
		logger.Error("Groq client not initialized",
			zap.Int64("user_id", user.TelegramID))
		return "❌ سرویس هوش مصنوعی در حال حاضر در دسترس نیست. لطفا بعداً تلاش کنید."
	}

	// Generate response using Groq
	response, err := groqClient.GenerateMonetizeAIResponse(message)
	if err != nil {
		logger.Error("Groq API error in web_api",
			zap.Int64("user_id", user.TelegramID),
			zap.Error(err))
		return "❌ خطا در دریافت پاسخ. لطفا دوباره تلاش کنید."
	}

	logger.Info("Groq response received in web_api",
		zap.Int64("user_id", user.TelegramID),
		zap.Int("response_length", len(response)))

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

	// 📢 Check channel membership
	if errMsg := checkChannelMembershipAPI(req.TelegramID); errMsg != "" {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   errMsg,
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

IMPORTANT: پاسخ خود را دقیقاً به صورت JSON بده بدون هیچ متن اضافی و field names باید دقیقاً انگلیسی باشند:

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

	// 🔒 SECURITY: Rate limiting for AI tools
	if !checkMiniAppRateLimit(req.TelegramID) {
		c.JSON(http.StatusTooManyRequests, APIResponse{
			Success: false,
			Error:   "شما به محدودیت سه تا سوال در دقیقه رسیدید لطفا دقایق دیگر امتحان کنید",
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
	
	// First try to fix malformed JSON with empty keys
	fixedResponse := fixMalformedBusinessJSON(cleanResponse)
	
	if err := json.Unmarshal([]byte(fixedResponse), &businessPlan); err != nil {
		// If JSON parsing fails, log detailed error and return fallback response
		logger.Error("Failed to parse ChatGPT JSON response for business builder",
			zap.Error(err),
			zap.String("response", response),
			zap.String("clean_response", cleanResponse),
			zap.String("fixed_response", fixedResponse),
			zap.String("error_detail", err.Error()))

		// Return a fallback business plan based on user input
		businessPlan = BusinessBuilderResponse{
			BusinessName:   fmt.Sprintf("استارتاپ %s", req.Interests),
			Tagline:        fmt.Sprintf("%s را به زبان خودت بیاموز", req.Interests),
			Description:    fmt.Sprintf("پلتفرم آموزشی آنلاین برای %s که به کاربران کمک می‌کند مهارت‌های خود را توسعه دهند", req.Market),
			TargetAudience: req.Market,
			Products:       []string{"دوره‌های آنلاین", "پروژه‌های عملی", "پشتیبانی تخصصی"},
			Monetization:   []string{"عضویت ماهیانه", "فروش دوره‌های اختصاصی", "مشاوره تخصصی"},
			FirstAction:    "ثبت نام در یک دوره آنلاین و آغاز آموزش به‌صورت رایگان",
		}
		logger.Info("Using fallback response for business builder due to parsing error")
	}

	// Ensure arrays are not nil (safety check)
	if businessPlan.Products == nil {
		businessPlan.Products = []string{"محصول پایه", "سرویس مشاوره", "پکیج آموزشی"}
	}
	if businessPlan.Monetization == nil {
		businessPlan.Monetization = []string{"فروش مستقیم", "اشتراک ماهیانه", "کمیسیون فروش"}
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

	// 📢 Check channel membership
	if errMsg := checkChannelMembershipAPI(req.TelegramID); errMsg != "" {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   errMsg,
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

IMPORTANT: پاسخ خود را دقیقاً به صورت JSON بده بدون هیچ متن اضافی و field names باید دقیقاً انگلیسی باشند:

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

	// 🔒 SECURITY: Rate limiting for AI tools
	if !checkMiniAppRateLimit(req.TelegramID) {
		c.JSON(http.StatusTooManyRequests, APIResponse{
			Success: false,
			Error:   "شما به محدودیت سه تا سوال در دقیقه رسیدید لطفا دقایق دیگر امتحان کنید",
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
		// If JSON parsing fails, log detailed error and return fallback response
		logger.Error("Failed to parse ChatGPT JSON response for sellkit",
			zap.Error(err),
			zap.String("response", response),
			zap.String("clean_response", cleanResponse),
			zap.String("error_detail", err.Error()))

		// Return a fallback sell kit based on user input
		sellKit = SellKitResponse{
			Title:            fmt.Sprintf("کیت فروش %s", req.ProductName),
			Headline:         fmt.Sprintf("بهترین %s برای %s", req.ProductName, req.TargetAudience),
			Description:      fmt.Sprintf("محصول %s طراحی شده برای %s که مشکلات اصلی آنها را حل می‌کند", req.ProductName, req.TargetAudience),
			Benefits:         []string{"کیفیت بالا", "قیمت مناسب", "پشتیبانی 24 ساعته", "ضمانت کیفیت"},
			PriceRange:       "500,000 تا 2,000,000 تومان",
			Offer:            "تخفیف ویژه 20% برای خریداران اولیه",
			VisualSuggestion: "تصاویر با کیفیت از محصول و مشتریان راضی",
		}
		logger.Info("Using fallback response for sellkit due to parsing error")
	}

	// Ensure arrays are not nil (safety check)
	if sellKit.Benefits == nil {
		sellKit.Benefits = []string{"کیفیت عالی", "قیمت مناسب", "پشتیبانی کامل"}
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

	// 📢 Check channel membership
	if errMsg := checkChannelMembershipAPI(req.TelegramID); errMsg != "" {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   errMsg,
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

IMPORTANT: پاسخ خود را دقیقاً به صورت JSON بده بدون هیچ متن اضافی و field names باید دقیقاً انگلیسی باشند:

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

	// 🔒 SECURITY: Rate limiting for AI tools
	if !checkMiniAppRateLimit(req.TelegramID) {
		c.JSON(http.StatusTooManyRequests, APIResponse{
			Success: false,
			Error:   "شما به محدودیت سه تا سوال در دقیقه رسیدید لطفا دقایق دیگر امتحان کنید",
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
		// If JSON parsing fails, log detailed error and return fallback response
		logger.Error("Failed to parse ChatGPT JSON response for clientfinder",
			zap.Error(err),
			zap.String("response", response),
			zap.String("clean_response", cleanResponse),
			zap.String("error_detail", err.Error()))

		// Return a fallback client finder based on user input
		clientFinder = ClientFinderResponse{
			Channels: []ClientChannel{
				{Name: "اینستاگرام", Reason: "پلتفرم اصلی برای ارتباط با مشتریان ایرانی"},
				{Name: "تلگرام", Reason: "کانال‌های تخصصی و گروه‌های هدفمند"},
				{Name: "لینکدین", Reason: "شبکه حرفه‌ای برای B2B"},
			},
			OutreachMessage: fmt.Sprintf("سلام! محصول %s ما می‌تواند به شما در %s کمک کند. آیا علاقه‌مند به اطلاعات بیشتر هستید؟", req.Product, req.TargetClient),
			Hashtags:        []string{"#فروش", "#کسب_و_کار", "#ایران", "#آنلاین"},
			ActionPlan:      []string{"شناسایی مخاطبان هدف", "تولید محتوای جذاب", "ارسال پیام‌های شخصی", "پیگیری منظم"},
		}
		logger.Info("Using fallback response for clientfinder due to parsing error")
	}

	// Ensure arrays are not nil (safety check)
	if clientFinder.Channels == nil {
		clientFinder.Channels = []ClientChannel{{Name: "اینستاگرام", Reason: "پلتفرم اصلی"}}
	}
	if clientFinder.Hashtags == nil {
		clientFinder.Hashtags = []string{"#فروش", "#کسب_و_کار"}
	}
	if clientFinder.ActionPlan == nil {
		clientFinder.ActionPlan = []string{"شناسایی مخاطبان", "تولید محتوا", "ارتباط مستقیم"}
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

	// 📢 Check channel membership
	if errMsg := checkChannelMembershipAPI(req.TelegramID); errMsg != "" {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   errMsg,
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

IMPORTANT: پاسخ خود را دقیقاً به صورت JSON بده بدون هیچ متن اضافی و field names باید دقیقاً انگلیسی باشند:

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

	// 🔒 SECURITY: Rate limiting for AI tools
	if !checkMiniAppRateLimit(req.TelegramID) {
		c.JSON(http.StatusTooManyRequests, APIResponse{
			Success: false,
			Error:   "شما به محدودیت سه تا سوال در دقیقه رسیدید لطفا دقایق دیگر امتحان کنید",
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

	// Ensure arrays are not nil (safety check)
	if salesPath.DailyPlan == nil {
		salesPath.DailyPlan = []DailyPlan{{Day: "روز ۱", Action: "شروع", Content: "آغاز فروش"}}
	}
	if salesPath.SalesTips == nil {
		salesPath.SalesTips = []string{"تمرکز روی ارزش", "گوش دادن به مشتری"}
	}
	if salesPath.Engagement == nil {
		salesPath.Engagement = []string{"محتوای جذاب", "تعامل مستقیم"}
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

// fixMalformedBusinessJSON fixes JSON with empty field names by using regex replacement
func fixMalformedBusinessJSON(jsonStr string) string {
	// Replace empty field names with correct field names in order
	replacements := []struct {
		pattern string
		replacement string
	}{
		{`""\s*:\s*"([^"]*)"`, `"businessName": "$1"`},      // First empty key -> businessName
		{`""\s*:\s*"([^"]*)"`, `"tagline": "$1"`},          // Second empty key -> tagline  
		{`""\s*:\s*"([^"]*)"`, `"description": "$1"`},      // Third empty key -> description
		{`""\s*:\s*"([^"]*)"`, `"targetAudience": "$1"`},   // Fourth empty key -> targetAudience
		{`""\s*:\s*\[([^\]]*)\]`, `"products": [$1]`},      // Fifth empty key -> products (array)
		{`""\s*:\s*\[([^\]]*)\]`, `"monetization": [$1]`},  // Sixth empty key -> monetization (array)
		{`""\s*:\s*"([^"]*)"`, `"firstAction": "$1"`},      // Seventh empty key -> firstAction
	}

	result := jsonStr
	for _, repl := range replacements {
		// Only replace the first occurrence each time
		re := regexp.MustCompile(repl.pattern)
		if re.MatchString(result) {
			result = re.ReplaceAllString(result, repl.replacement)
		}
	}

	return result
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

	// Evaluate using dedicated Groq evaluation (Persian-only, colloquial)
	approved, feedback, evalErr := groqClient.GenerateExerciseEvaluation(
		session.Title,
		session.Description,
		"",
		"",
		answersStr,
	)
	if evalErr != nil {
		logger.Error("Groq evaluation error",
			zap.Int64("user_id", user.TelegramID),
			zap.Int("stage_id", req.StageID),
			zap.Error(evalErr))
		// Fallback: do not pass automatically; provide generic feedback
		approved = false
		if feedback == "" {
			feedback = "ارزیابی با خطا مواجه شد. لطفاً دوباره ارسال کن یا پاسخ‌ها رو کمی دقیق‌تر بنویس."
		}
	}
	// Default score based on approval (Groq evaluation doesn't return SCORE)
	score := 0
	if approved {
		score = 80
	} else {
		score = 50
	}

	// Fallback values if parsing failed
	if feedback == "" {
		if approved {
			feedback = "عالی! این مرحله رو با موفقیت رد کردی و می‌تونی بری سراغ مرحله بعد."
		} else {
			feedback = "چند نکته کم بود. دوباره مرور کن و با نکات دقیق‌تر ارسال کن تا قبول شی."
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

// handleMiniAppSecurityAPI handles security-related requests for Mini App API
func handleMiniAppSecurityAPI(c *gin.Context) {
	action := c.Query("action")

	switch action {
	case "list_blocked":
		handleListBlockedMiniAppUsers(c)
	case "unblock":
		handleUnblockMiniAppUser(c)
	case "clear_activity":
		handleClearMiniAppUserActivity(c)
	case "block":
		handleBlockMiniAppUser(c)
	default:
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid action. Use: list_blocked, unblock, clear_activity, or block",
		})
	}
}

// handleListBlockedMiniAppUsers lists all blocked Mini App users
func handleListBlockedMiniAppUsers(c *gin.Context) {
	if len(miniAppBlockedUsers) == 0 {
		c.JSON(http.StatusOK, APIResponse{
			Success: true,
			Data: map[string]interface{}{
				"message":       "No Mini App users are currently blocked",
				"blocked_users": []interface{}{},
			},
		})
		return
	}

	var blockedUsers []map[string]interface{}
	for telegramID := range miniAppBlockedUsers {
		violationCount := miniAppSuspiciousActivityCount[telegramID]
		blockedUsers = append(blockedUsers, map[string]interface{}{
			"telegram_id":     telegramID,
			"violation_count": violationCount,
		})
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]interface{}{
			"blocked_users": blockedUsers,
			"total_blocked": len(miniAppBlockedUsers),
		},
	})
}

// handleUnblockMiniAppUser unblocks a Mini App user
func handleUnblockMiniAppUser(c *gin.Context) {
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

	if !miniAppBlockedUsers[telegramID] {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "User is not blocked",
		})
		return
	}

	// Unblock user
	delete(miniAppBlockedUsers, telegramID)
	miniAppSuspiciousActivityCount[telegramID] = 0

	logger.Info("Mini App user unblocked",
		zap.Int64("user_id", telegramID))

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]string{
			"message": fmt.Sprintf("User %d has been unblocked", telegramID),
		},
	})
}

// handleClearMiniAppUserActivity clears suspicious activity for a Mini App user
func handleClearMiniAppUserActivity(c *gin.Context) {
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

	// Clear suspicious activity
	miniAppSuspiciousActivityCount[telegramID] = 0
	delete(miniAppRateLimits, telegramID)
	delete(miniAppCallCounts, telegramID)

	logger.Info("Mini App user suspicious activity cleared",
		zap.Int64("user_id", telegramID))

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]string{
			"message": fmt.Sprintf("Suspicious activity cleared for user %d", telegramID),
		},
	})
}

// handleBlockMiniAppUser blocks a Mini App user
func handleBlockMiniAppUser(c *gin.Context) {
	telegramIDStr := c.PostForm("telegram_id")
	reason := c.PostForm("reason")
	if reason == "" {
		reason = "Manual block by admin"
	}

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

	// Block user
	blockMiniAppUser(telegramID, reason)

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: map[string]string{
			"message": fmt.Sprintf("User %d has been blocked", telegramID),
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
