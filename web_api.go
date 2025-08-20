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

		// Profile endpoints
		v1.GET("/user/:telegram_id/profile", getUserProfile)
		v1.PUT("/user/:telegram_id/profile", updateUserProfile)

		// Progress tracking
		v1.POST("/user/:telegram_id/progress", updateUserProgress)
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
	// Create the API request
	url := "https://api.openai.com/v1/chat/completions"

	// Prepare the request body
	requestBody := map[string]interface{}{
		"model": "gpt-4-turbo-preview",
		"messages": []map[string]string{
			{
				"role":    "system",
				"content": "You are a helpful course assistant for MonetizeeAI. Provide clear, concise, and relevant answers to help students with their questions about the course content. Always respond in Persian.",
			},
			{
				"role":    "user",
				"content": message,
			},
		},
		"temperature": 0.7,
		"max_tokens":  1000,
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
		Timeout: 30 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		logger.Error("Failed to send request",
			zap.Int64("user_id", user.TelegramID),
			zap.Error(err))
		return "❌ خطا در ارسال درخواست. لطفا دوباره تلاش کنید."
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
			Message string `json:"message"`
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

// Helper function to get environment variable with default
func getEnvWithDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
