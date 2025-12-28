package main

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"sync"
	"time"

	"MonetizeeAI_bot/logger"

	"github.com/gin-gonic/gin"
	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// Web session storage (in-memory, can be moved to Redis in production)
var webSessions = make(map[string]WebSession)
var webSessionsMutex sync.RWMutex

type WebSession struct {
	AdminID   uint
	Username  string
	ExpiresAt time.Time
	CreatedAt time.Time
}

// User web session storage (for regular users, not admins)
var userWebSessions = make(map[string]UserWebSession)
var userWebSessionsMutex sync.RWMutex

type UserWebSession struct {
	TelegramID int64
	ExpiresAt  time.Time
	CreatedAt  time.Time
}

// Setup admin API routes
func setupAdminAPIRoutes(r *gin.Engine) {
	// Start session cleanup
	startSessionCleanup()

	// Auth routes are now registered directly in web_api.go before this function is called
	// This ensures they are registered before NoRoute middleware
	// adminAuth routes are registered in web_api.go to ensure proper order

	// Main admin routes group
	admin := r.Group("/api/v1/admin")
	admin.Use(adminAuthMiddleware())
	{
		// WebSocket connection
		admin.GET("/ws", handleAdminWebSocket)

		// Stats
		admin.GET("/stats", getAdminStatsAPI)
		admin.GET("/stats/chart", getChartDataAPI)

		// Users management
		admin.GET("/users", getAdminUsers)
		admin.GET("/users/:id", getAdminUserDetail)
		admin.POST("/users/:id/block", blockUserAPI)
		admin.POST("/users/:id/unblock", unblockUserAPI)
		admin.POST("/users/:id/change-plan", changeUserPlanAPI)
		admin.POST("/users/:id/send-message", sendMessageToUserAPI)
		admin.POST("/users/:id/change-session", changeUserSessionAPI)
		admin.DELETE("/users/:id", deleteUserAPI)

		// Payments
		admin.GET("/payments", getAdminPayments)
		admin.GET("/payments/:id", getPaymentDetail)

		// Sessions/Content
		admin.GET("/sessions", getAdminSessions)
		admin.POST("/sessions", createSession)
		admin.PUT("/sessions/:id", updateSession)
		admin.DELETE("/sessions/:id", deleteSessionAPI)

		// Videos
		admin.GET("/videos", getAdminVideos)
		admin.POST("/videos", createVideo)
		admin.PUT("/videos/:id", updateVideo)
		admin.DELETE("/videos/:id", deleteVideoAPI)

		// Exercises
		admin.GET("/exercises", getAdminExercises)
		admin.POST("/exercises", createExercise)
		admin.PUT("/exercises/:id", updateExercise)
		admin.DELETE("/exercises/:id", deleteExercise)

		// Licenses (old verification system)
		admin.GET("/licenses", getAdminLicenses)
		admin.POST("/licenses/:id/approve", approveLicenseAPI)
		admin.POST("/licenses/:id/reject", rejectLicenseAPI)

		// License Keys (new pre-generated license system)
		admin.GET("/license-keys", getLicenseKeys)
		admin.GET("/license-keys/stats", getLicenseKeysStats)
		admin.GET("/license-keys/:id", getLicenseKeyDetail)
		admin.POST("/license-keys/generate", generateLicenseKeys)
		admin.GET("/license-keys/export/unused", exportUnusedLicenseKeys)

		// Broadcast
		admin.POST("/broadcast/telegram", sendTelegramBroadcast)
		admin.POST("/broadcast/sms", sendSMSBroadcast)

		// Security
		admin.GET("/security/blocked", getBlockedUsers)
		admin.GET("/security/suspicious", getSuspiciousActivity)

		// Analytics
		admin.GET("/analytics/revenue", getRevenueAnalytics)
		admin.GET("/analytics/users", getUserAnalytics)
		admin.GET("/analytics/engagement", getEngagementAnalytics)

		// Tickets management
		admin.GET("/tickets", getAdminTickets)
		admin.GET("/tickets/:id", getAdminTicketDetail)
		admin.POST("/tickets/:id/reply", adminReplyTicket)
		admin.POST("/tickets/:id/change-status", adminChangeTicketStatus)
	}

	// Legacy route support: /v1/admin/ws (for backward compatibility)
	// This handles requests that come without /api prefix
	legacyAdmin := r.Group("/v1/admin")
	legacyAdmin.Use(adminAuthMiddleware())
	{
		legacyAdmin.GET("/ws", handleAdminWebSocket)
	}
}

// Generate secure random token
func generateSessionToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// Handle web login
func handleWebLogin(c *gin.Context) {
	// Log the request for debugging - this should be called if route is matched
	logger.Info("✅ handleWebLogin called - route matched!",
		zap.String("path", c.Request.URL.Path),
		zap.String("method", c.Request.Method),
		zap.String("remote_addr", c.ClientIP()),
		zap.String("content_type", c.GetHeader("Content-Type")),
		zap.String("user_agent", c.GetHeader("User-Agent")))

	type LoginRequest struct {
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("Web login failed - invalid JSON",
			zap.Error(err),
			zap.String("remote_addr", c.ClientIP()))
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request",
		})
		return
	}

	// Check credentials (hardcoded for now - can be moved to database)
	if req.Username != "admin" || req.Password != "admin123" {
		logger.Warn("Web login failed - invalid credentials",
			zap.String("username", req.Username),
			zap.String("remote_addr", c.ClientIP()))
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid username or password",
		})
		return
	}

	// Generate session token
	token, err := generateSessionToken()
	if err != nil {
		logger.Error("Failed to generate session token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Internal server error",
		})
		return
	}

	// Create session (24 hours expiry)
	session := WebSession{
		AdminID:   1, // Default admin ID
		Username:  req.Username,
		ExpiresAt: time.Now().Add(24 * time.Hour),
		CreatedAt: time.Now(),
	}

	webSessionsMutex.Lock()
	webSessions[token] = session
	webSessionsMutex.Unlock()

	// Clean up expired sessions
	go cleanupExpiredSessions()

	logger.Info("Web login successful",
		zap.String("username", req.Username),
		zap.String("remote_addr", c.ClientIP()))

	// Ensure Content-Type is set correctly
	c.Header("Content-Type", "application/json; charset=utf-8")
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token":    token,
			"username": req.Username,
		},
	})
}

// Handle check auth
func handleCheckAuth(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if token == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "No token provided",
		})
		return
	}

	// Remove "Bearer " prefix if present
	token = strings.TrimPrefix(token, "Bearer ")

	webSessionsMutex.RLock()
	session, exists := webSessions[token]
	webSessionsMutex.RUnlock()

	if !exists || time.Now().After(session.ExpiresAt) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Invalid or expired token",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"username": session.Username,
		},
	})
}

// Handle web logout
func handleWebLogout(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if token != "" {
		token = strings.TrimPrefix(token, "Bearer ")
		webSessionsMutex.Lock()
		delete(webSessions, token)
		webSessionsMutex.Unlock()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
	})
}

// Cleanup expired sessions
func cleanupExpiredSessions() {
	webSessionsMutex.Lock()
	defer webSessionsMutex.Unlock()

	now := time.Now()
	for token, session := range webSessions {
		if now.After(session.ExpiresAt) {
			delete(webSessions, token)
		}
	}
}

// Start periodic cleanup of expired sessions
func startSessionCleanup() {
	ticker := time.NewTicker(1 * time.Hour) // Cleanup every hour
	go func() {
		for range ticker.C {
			cleanupExpiredSessions()
			logger.Debug("Cleaned up expired web sessions")
		}
	}()
}

// Admin authentication middleware
func adminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check 1: Try Telegram authentication first
		initData := getTelegramInitDataFromRequest(c)
		telegramWebApp := c.GetHeader("X-Telegram-WebApp")
		startParam := c.GetHeader("X-Telegram-Start-Param")

		logger.Debug("Admin auth middleware check",
			zap.String("path", c.Request.URL.Path),
			zap.Bool("has_init_data", initData != ""),
			zap.Bool("has_telegram_webapp", telegramWebApp != ""),
			zap.String("start_param", startParam))

		if initData != "" || telegramWebApp != "" {
			// Telegram authentication
			telegramID, err := getTelegramIDFromRequest(c)
			if err != nil {
				logger.Warn("Admin auth failed - Telegram ID extraction error",
					zap.String("path", c.Request.URL.Path),
					zap.Error(err),
					zap.Bool("has_init_data", initData != ""),
					zap.String("telegram_webapp", telegramWebApp))
				c.JSON(http.StatusUnauthorized, gin.H{
					"success": false,
					"error":   "Invalid Telegram authentication",
					"message": err.Error(),
				})
				c.Abort()
				return
			}

			var admin Admin
			if err := db.Where("telegram_id = ? AND is_active = ?", telegramID, true).First(&admin).Error; err != nil {
				logger.Warn("Admin Panel access denied - User is not an admin",
					zap.Int64("telegram_id", telegramID),
					zap.String("remote_addr", c.ClientIP()),
					zap.Error(err))
				c.JSON(http.StatusForbidden, gin.H{
					"success": false,
					"error":   "Forbidden",
					"message": "Admin access required. Your Telegram ID is not registered as an admin.",
				})
				c.Abort()
				return
			}

			if strings.HasPrefix(startParam, "admin_") {
				logger.Info("Admin Panel access with start_param",
					zap.Int64("admin_telegram_id", telegramID),
					zap.String("start_param", startParam))
			}

			logger.Info("Admin Panel access granted (Telegram)",
				zap.Int64("admin_telegram_id", telegramID),
				zap.String("admin_username", admin.Username),
				zap.String("path", c.Request.URL.Path))

			c.Set("admin_id", admin.ID)
			c.Set("admin_telegram_id", telegramID)
			c.Set("admin_username", admin.Username)
			c.Next()
			return
		}

		// Check 2: Try Web authentication
		authHeader := c.GetHeader("Authorization")
		webAuth := c.GetHeader("X-Web-Auth")

		if authHeader != "" && webAuth == "true" {
			token := strings.TrimPrefix(authHeader, "Bearer ")

			webSessionsMutex.RLock()
			session, exists := webSessions[token]
			webSessionsMutex.RUnlock()

			if !exists || time.Now().After(session.ExpiresAt) {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error":   "Unauthorized",
					"message": "Invalid or expired session",
				})
				c.Abort()
				return
			}

			logger.Info("Admin Panel access granted (Web)",
				zap.String("admin_username", session.Username),
				zap.String("path", c.Request.URL.Path))

			c.Set("admin_id", session.AdminID)
			c.Set("admin_username", session.Username)
			c.Set("auth_type", "web")
			c.Next()
			return
		}

		// No valid authentication found
		logger.Warn("Admin Panel access denied - No valid authentication",
			zap.String("remote_addr", c.ClientIP()),
			zap.String("user_agent", c.GetHeader("User-Agent")),
			zap.String("path", c.Request.URL.Path),
			zap.Bool("has_init_data", initData != ""),
			zap.Bool("has_telegram_webapp", telegramWebApp != ""),
			zap.Bool("has_auth_header", authHeader != ""),
			zap.Bool("has_web_auth", webAuth == "true"))
		c.JSON(http.StatusForbidden, gin.H{
			"success": false,
			"error":   "Access Denied",
			"message": "Authentication required. Please login or access from Telegram.",
		})
		c.Abort()
		return
	}
}

// Get admin stats (API endpoint)
func getAdminStatsAPI(c *gin.Context) {
	stats := getRealtimeStats()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// Get chart data for analytics
func getChartDataAPI(c *gin.Context) {
	chartType := c.Query("type") // revenue, users, engagement
	period := c.Query("period")  // day, week, month

	var data []map[string]interface{}

	switch chartType {
	case "revenue":
		data = getRevenueChartData(period)
	case "users":
		data = getUsersChartData(period)
	case "engagement":
		data = getEngagementChartData(period)
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid chart type"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

// Get revenue chart data
func getRevenueChartData(period string) []map[string]interface{} {
	var results []map[string]interface{}

	var days int
	switch period {
	case "day":
		days = 1
	case "week":
		days = 7
	case "month":
		days = 30
	default:
		days = 7
	}

	startDate := time.Now().AddDate(0, 0, -days)

	type RevenueData struct {
		Date   string
		Amount int
	}

	var revenueData []RevenueData
	db.Model(&PaymentTransaction{}).
		Select("DATE(created_at) as date, SUM(amount) as amount").
		Where("status = ? AND created_at >= ?", "success", startDate).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&revenueData)

	for _, rd := range revenueData {
		results = append(results, map[string]interface{}{
			"date":   rd.Date,
			"amount": rd.Amount,
		})
	}

	return results
}

// Get users chart data
func getUsersChartData(period string) []map[string]interface{} {
	var results []map[string]interface{}

	var days int
	switch period {
	case "day":
		days = 1
	case "week":
		days = 7
	case "month":
		days = 30
	default:
		days = 7
	}

	startDate := time.Now().AddDate(0, 0, -days)

	type UserData struct {
		Date  string
		Count int
	}

	var userData []UserData
	db.Model(&User{}).
		Select("DATE(created_at) as date, COUNT(*) as count").
		Where("created_at >= ?", startDate).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&userData)

	for _, ud := range userData {
		results = append(results, map[string]interface{}{
			"date":  ud.Date,
			"count": ud.Count,
		})
	}

	return results
}

// Get engagement chart data
func getEngagementChartData(period string) []map[string]interface{} {
	var results []map[string]interface{}

	// Engagement based on chat messages, completed tasks, etc.
	var days int
	switch period {
	case "day":
		days = 1
	case "week":
		days = 7
	case "month":
		days = 30
	default:
		days = 7
	}

	startDate := time.Now().AddDate(0, 0, -days)

	type EngagementData struct {
		Date  string
		Count int
	}

	var engagementData []EngagementData
	db.Model(&ChatMessage{}).
		Select("DATE(created_at) as date, COUNT(*) as count").
		Where("created_at >= ?", startDate).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&engagementData)

	for _, ed := range engagementData {
		results = append(results, map[string]interface{}{
			"date":  ed.Date,
			"count": ed.Count,
		})
	}

	return results
}

// Get admin users list
func getAdminUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	search := c.Query("search")
	filterType := c.Query("type") // all, free_trial, paid, blocked

	offset := (page - 1) * limit

	query := db.Model(&User{})

	// Apply filters
	if search != "" {
		query = query.Where("username LIKE ? OR first_name LIKE ? OR phone_number LIKE ? OR phone LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	if filterType != "" && filterType != "all" {
		switch filterType {
		case "free_trial":
			query = query.Where("subscription_type = ?", "free_trial")
		case "paid":
			query = query.Where("subscription_type = ?", "paid")
		case "blocked":
			query = query.Where("is_blocked = ?", true)
		}
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		logger.Error("Failed to count users", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to count users",
		})
		return
	}

	var users []User
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users).Error; err != nil {
		logger.Error("Failed to fetch users", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch users",
		})
		return
	}

	logger.Info("Users fetched successfully",
		zap.Int("count", len(users)),
		zap.Int64("total", total),
		zap.Int("page", page))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"users": users,
			"total": total,
			"page":  page,
			"limit": limit,
		},
	})
}

// Get user detail
func getAdminUserDetail(c *gin.Context) {
	userID := c.Param("id")

	var user User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get user's payments
	var payments []PaymentTransaction
	db.Where("user_id = ?", user.ID).Order("created_at DESC").Limit(10).Find(&payments)

	// Get user's progress
	var progress []UserSession
	db.Where("user_id = ?", user.ID).Find(&progress)

	// Calculate statistics
	// Total time spent: difference between created_at and updated_at (in days, then convert to hours)
	daysSinceJoin := time.Since(user.CreatedAt).Hours() / 24
	totalTimeHours := time.Since(user.CreatedAt).Hours()

	// Average daily time (if user has been active for more than 1 day)
	var avgDailyTimeHours float64
	if daysSinceJoin > 1 {
		// Estimate: assume user spends time based on completed sessions
		// Each session completion might take ~1-2 hours, so we estimate based on progress
		completedSessions := user.CurrentSession - 1
		if completedSessions > 0 {
			// Estimate 1.5 hours per completed session
			estimatedTotalHours := float64(completedSessions) * 1.5
			avgDailyTimeHours = estimatedTotalHours / daysSinceJoin
		} else {
			// If no sessions completed, estimate based on account age
			avgDailyTimeHours = totalTimeHours / daysSinceJoin
		}
	} else {
		avgDailyTimeHours = totalTimeHours
	}

	// Get total points from user model
	totalPoints := user.Points

	// Get completed sessions count
	completedSessionsCount := user.CurrentSession - 1
	if completedSessionsCount < 0 {
		completedSessionsCount = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user": gin.H{
				"id":                  user.ID,
				"telegram_id":         user.TelegramID,
				"username":            user.Username,
				"first_name":          user.FirstName,
				"last_name":           user.LastName,
				"phone":               user.Phone,
				"phone_number":        user.PhoneNumber,
				"current_session":     user.CurrentSession,
				"subscription_type":   user.SubscriptionType,
				"plan_name":           user.PlanName,
				"subscription_expiry": user.SubscriptionExpiry,
				"is_active":           user.IsActive,
				"is_blocked":          user.IsBlocked,
				"is_verified":         user.IsVerified,
				"points":              user.Points,
				"created_at":          user.CreatedAt,
				"updated_at":          user.UpdatedAt,
			},
			"payments": payments,
			"progress": progress,
			"statistics": gin.H{
				"current_session":      user.CurrentSession,
				"completed_sessions":   completedSessionsCount,
				"total_points":         totalPoints,
				"total_time_hours":     totalTimeHours,
				"total_time_days":      daysSinceJoin,
				"avg_daily_time_hours": avgDailyTimeHours,
			},
		},
	})
}

// Block user
func blockUserAPI(c *gin.Context) {
	userID := c.Param("id")

	var user User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.IsBlocked = true
	db.Save(&user)

	// ⚡ CRITICAL: Invalidate user cache so mini app gets updated data immediately
	userCache.InvalidateUser(user.TelegramID)

	logger.Info("User blocked by admin",
		zap.Uint("user_id", user.ID),
		zap.Int64("admin_telegram_id", c.GetInt64("admin_telegram_id")))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User blocked successfully",
	})
}

// Unblock user
func unblockUserAPI(c *gin.Context) {
	userID := c.Param("id")

	var user User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	user.IsBlocked = false
	db.Save(&user)

	// ⚡ CRITICAL: Invalidate user cache so mini app gets updated data immediately
	userCache.InvalidateUser(user.TelegramID)

	logger.Info("User unblocked by admin",
		zap.Uint("user_id", user.ID),
		zap.Int64("admin_telegram_id", c.GetInt64("admin_telegram_id")))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User unblocked successfully",
	})
}

// Change user plan
func changeUserPlanAPI(c *gin.Context) {
	userID := c.Param("id")

	type PlanChangeRequest struct {
		PlanType string `json:"plan_type"` // free, starter, pro, ultimate
	}

	var req PlanChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var user User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update user subscription
	switch req.PlanType {
	case "free":
		// Free trial - 3 days
		expiry := time.Now().AddDate(0, 0, 3)
		user.SubscriptionType = "free_trial"
		user.PlanName = "free_trial"
		user.SubscriptionExpiry = &expiry
		user.IsActive = true
		user.IsVerified = false
		user.FreeTrialUsed = true
	case "starter":
		expiry := time.Now().AddDate(0, 1, 0)
		user.SubscriptionType = "paid"
		user.PlanName = "starter"
		user.SubscriptionExpiry = &expiry
		user.IsActive = true
		user.IsVerified = true
		user.FreeTrialUsed = true
	case "pro":
		expiry := time.Now().AddDate(0, 6, 0)
		user.SubscriptionType = "paid"
		user.PlanName = "pro"
		user.SubscriptionExpiry = &expiry
		user.IsActive = true
		user.IsVerified = true
		user.FreeTrialUsed = true
	case "ultimate":
		// Ultimate plan - lifetime (no expiry)
		user.SubscriptionType = "paid"
		user.PlanName = "ultimate"
		user.SubscriptionExpiry = nil
		user.IsActive = true
		user.IsVerified = true
		user.FreeTrialUsed = true
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plan type"})
		return
	}

	// Ensure user is not blocked when changing plan (unless explicitly blocked)
	// Only unblock if the plan change is successful
	if err := db.Save(&user).Error; err != nil {
		logger.Error("Failed to save user after plan change", zap.Error(err), zap.Uint("user_id", user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update user plan",
		})
		return
	}

	// ⚡ CRITICAL: Invalidate user cache so mini app gets updated data immediately
	userCache.InvalidateUser(user.TelegramID)
	logger.Info("User cache invalidated after plan change",
		zap.Uint("user_id", user.ID),
		zap.Int64("telegram_id", user.TelegramID))

	logger.Info("User plan changed by admin",
		zap.Uint("user_id", user.ID),
		zap.String("new_plan", req.PlanType),
		zap.Int64("admin_telegram_id", c.GetInt64("admin_telegram_id")))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User plan changed successfully",
	})
}

// Send message to user
func sendMessageToUserAPI(c *gin.Context) {
	userID := c.Param("id")

	type MessageRequest struct {
		Message string `json:"message" binding:"required"`
	}

	var req MessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	var user User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Send message via Telegram bot
	msg := tgbotapi.NewMessage(user.TelegramID, req.Message)
	if _, err := bot.Send(msg); err != nil {
		logger.Error("Failed to send message to user",
			zap.Uint("user_id", user.ID),
			zap.Int64("telegram_id", user.TelegramID),
			zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to send message",
		})
		return
	}

	logger.Info("Message sent to user by admin",
		zap.Uint("user_id", user.ID),
		zap.Int64("telegram_id", user.TelegramID),
		zap.Int64("admin_telegram_id", c.GetInt64("admin_telegram_id")))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Message sent successfully",
	})
}

// Change user session (stage)
func changeUserSessionAPI(c *gin.Context) {
	userID := c.Param("id")

	type SessionChangeRequest struct {
		SessionNumber int `json:"session_number" binding:"required"`
	}

	var req SessionChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request"})
		return
	}

	// Validate session number (should be between 1 and 29)
	if req.SessionNumber < 1 || req.SessionNumber > 29 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Session number must be between 1 and 29"})
		return
	}

	var user User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	oldSession := user.CurrentSession
	user.CurrentSession = req.SessionNumber

	// Use explicit WHERE clause for atomic update
	updates := map[string]interface{}{
		"current_session": req.SessionNumber,
	}
	if err := db.Model(&User{}).Where("id = ?", user.ID).Updates(updates).Error; err != nil {
		logger.Error("Failed to update user session", zap.Error(err), zap.Uint("user_id", user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update user session",
		})
		return
	}

	// Verify the update
	var verifyUser User
	if err := db.First(&verifyUser, user.ID).Error; err != nil {
		logger.Error("Failed to verify user session update", zap.Error(err), zap.Uint("user_id", user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to verify session update",
		})
		return
	}

	// ⚡ CRITICAL: Invalidate user cache so mini app gets updated data immediately
	userCache.InvalidateUser(user.TelegramID)
	logger.Info("User cache invalidated after session change",
		zap.Uint("user_id", user.ID),
		zap.Int64("telegram_id", user.TelegramID))

	logger.Info("User session changed by admin",
		zap.Uint("user_id", user.ID),
		zap.Int("old_session", oldSession),
		zap.Int("new_session", req.SessionNumber),
		zap.Int("verified_session", verifyUser.CurrentSession),
		zap.Bool("update_verified", verifyUser.CurrentSession == req.SessionNumber),
		zap.Int64("admin_telegram_id", c.GetInt64("admin_telegram_id")))

	// Calculate which stages are now available
	completedStages := req.SessionNumber - 1
	availableStage := req.SessionNumber

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": fmt.Sprintf("User session changed from %d to %d. Stage %d is now available for the user.", oldSession, req.SessionNumber, availableStage),
		"data": gin.H{
			"old_session":      oldSession,
			"new_session":      req.SessionNumber,
			"completed_stages": completedStages,
			"available_stage":  availableStage,
		},
	})
}

// Delete user
func deleteUserAPI(c *gin.Context) {
	userID := c.Param("id")

	var user User
	if err := db.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Soft delete (set inactive)
	user.IsActive = false
	db.Save(&user)

	logger.Warn("User deleted by admin",
		zap.Uint("user_id", user.ID),
		zap.Int64("admin_telegram_id", c.GetInt64("admin_telegram_id")))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User deleted successfully",
	})
}

// Get admin payments
func getAdminPayments(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	status := c.Query("status") // all, success, pending, failed

	offset := (page - 1) * limit

	query := db.Model(&PaymentTransaction{})

	if status != "" && status != "all" {
		query = query.Where("status = ?", status)
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		logger.Error("Failed to count payments", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to count payments",
		})
		return
	}

	var payments []PaymentTransaction
	if err := query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&payments).Error; err != nil {
		logger.Error("Failed to fetch payments", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch payments",
		})
		return
	}

	logger.Info("Payments fetched successfully",
		zap.Int("count", len(payments)),
		zap.Int64("total", total),
		zap.Int("page", page))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"payments": payments,
			"total":    total,
			"page":     page,
			"limit":    limit,
		},
	})
}

// Get payment detail
func getPaymentDetail(c *gin.Context) {
	paymentID := c.Param("id")

	var payment PaymentTransaction
	if err := db.First(&payment, paymentID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Payment not found"})
		return
	}

	// Get user info
	var user User
	db.First(&user, payment.UserID)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"payment": payment,
			"user":    user,
		},
	})
}

// Get admin sessions
func getAdminSessions(c *gin.Context) {
	var sessions []Session
	db.Order("number ASC").Find(&sessions)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    sessions,
	})
}

// Create session
func createSession(c *gin.Context) {
	var session Session
	if err := c.ShouldBindJSON(&session); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db.Create(&session)

	logger.Info("Session created by admin",
		zap.Uint("session_id", session.ID),
		zap.Int64("admin_telegram_id", c.GetInt64("admin_telegram_id")))

	// Invalidate session cache
	sessionCache.InvalidateSessions()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    session,
	})
}

// Update session
func updateSession(c *gin.Context) {
	sessionID := c.Param("id")

	var session Session
	if err := db.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	if err := c.ShouldBindJSON(&session); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db.Save(&session)

	logger.Info("Session updated by admin",
		zap.Uint("session_id", session.ID),
		zap.Int64("admin_telegram_id", c.GetInt64("admin_telegram_id")))

	// Invalidate session cache
	sessionCache.InvalidateSessions()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    session,
	})
}

// Delete session (API endpoint)
func deleteSessionAPI(c *gin.Context) {
	sessionID := c.Param("id")

	var session Session
	if err := db.First(&session, sessionID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Session not found"})
		return
	}

	db.Delete(&session)

	logger.Warn("Session deleted by admin",
		zap.Uint("session_id", session.ID),
		zap.Int64("admin_telegram_id", c.GetInt64("admin_telegram_id")))

	// Invalidate session cache
	sessionCache.InvalidateSessions()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Session deleted successfully",
	})
}

// Similar implementations for Videos and Exercises...
func getAdminVideos(c *gin.Context) {
	sessionID := c.Query("session_id")

	query := db.Model(&Video{})
	if sessionID != "" {
		query = query.Where("session_id = ?", sessionID)
	}

	var videos []Video
	query.Order("number ASC").Find(&videos)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    videos,
	})
}

func createVideo(c *gin.Context) {
	var video Video
	if err := c.ShouldBindJSON(&video); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	db.Create(&video)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": video})
}

func updateVideo(c *gin.Context) {
	videoID := c.Param("id")
	var video Video
	if err := db.First(&video, videoID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Video not found"})
		return
	}
	if err := c.ShouldBindJSON(&video); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Save(&video)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": video})
}

func deleteVideoAPI(c *gin.Context) {
	videoID := c.Param("id")
	db.Delete(&Video{}, videoID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

func getAdminExercises(c *gin.Context) {
	sessionID := c.Query("session_id")
	query := db.Model(&Exercise{})
	if sessionID != "" {
		query = query.Where("session_id = ?", sessionID)
	}
	var exercises []Exercise
	query.Order("number ASC").Find(&exercises)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": exercises})
}

func createExercise(c *gin.Context) {
	var exercise Exercise
	if err := c.ShouldBindJSON(&exercise); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Create(&exercise)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": exercise})
}

func updateExercise(c *gin.Context) {
	exerciseID := c.Param("id")
	var exercise Exercise
	if err := db.First(&exercise, exerciseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Exercise not found"})
		return
	}
	if err := c.ShouldBindJSON(&exercise); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	db.Save(&exercise)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": exercise})
}

func deleteExercise(c *gin.Context) {
	exerciseID := c.Param("id")
	db.Delete(&Exercise{}, exerciseID)
	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Get licenses
func getAdminLicenses(c *gin.Context) {
	status := c.DefaultQuery("status", "pending")

	var licenses []LicenseVerification
	db.Where("status = ?", status).Order("created_at DESC").Find(&licenses)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    licenses,
	})
}

// Approve license
func approveLicenseAPI(c *gin.Context) {
	licenseID := c.Param("id")

	var license LicenseVerification
	if err := db.First(&license, licenseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "License not found"})
		return
	}

	license.Status = "approved"
	db.Save(&license)

	// Update user
	var user User
	if err := db.First(&user, license.UserID).Error; err == nil {
		user.IsVerified = true
		user.SubscriptionType = "paid"
		db.Save(&user)
	}

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Reject license
func rejectLicenseAPI(c *gin.Context) {
	licenseID := c.Param("id")

	var license LicenseVerification
	if err := db.First(&license, licenseID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "License not found"})
		return
	}

	license.Status = "rejected"
	db.Save(&license)

	c.JSON(http.StatusOK, gin.H{"success": true})
}

// Send telegram broadcast
func sendTelegramBroadcast(c *gin.Context) {
	type BroadcastRequest struct {
		Message string `json:"message"`
		Type    string `json:"type"` // text, photo, video
		FileURL string `json:"file_url,omitempty"`
	}

	var req BroadcastRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Implement actual broadcast logic (from existing broadcast system)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Broadcast queued",
	})
}

// Send SMS broadcast
func sendSMSBroadcast(c *gin.Context) {
	type SMSBroadcastRequest struct {
		Message string `json:"message"`
	}

	var req SMSBroadcastRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// TODO: Implement actual SMS broadcast logic

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "SMS broadcast queued",
	})
}

// Get blocked users
func getBlockedUsers(c *gin.Context) {
	var users []User
	db.Where("is_blocked = ?", true).Find(&users)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    users,
	})
}

// Get suspicious activity
func getSuspiciousActivity(c *gin.Context) {
	// TODO: Implement logic to detect suspicious patterns

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    []interface{}{},
	})
}

// Revenue analytics
func getRevenueAnalytics(c *gin.Context) {
	period := c.DefaultQuery("period", "month")

	data := getRevenueChartData(period)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

// User analytics
func getUserAnalytics(c *gin.Context) {
	period := c.DefaultQuery("period", "month")

	data := getUsersChartData(period)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

// Engagement analytics
func getEngagementAnalytics(c *gin.Context) {
	period := c.DefaultQuery("period", "month")

	data := getEngagementChartData(period)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    data,
	})
}

// ==========================================
// License Keys Management API
// ==========================================

// getLicenseKeysStats returns statistics about license keys
func getLicenseKeysStats(c *gin.Context) {
	var totalLicenses, usedLicenses, unusedLicenses int64

	db.Model(&License{}).Count(&totalLicenses)
	db.Model(&License{}).Where("is_used = ?", true).Count(&usedLicenses)
	db.Model(&License{}).Where("is_used = ?", false).Count(&unusedLicenses)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"total_licenses":  totalLicenses,
			"used_licenses":   usedLicenses,
			"unused_licenses": unusedLicenses,
			"usage_percentage": func() float64 {
				if totalLicenses == 0 {
					return 0
				}
				return float64(usedLicenses) * 100.0 / float64(totalLicenses)
			}(),
		},
	})
}

// getLicenseKeys returns list of license keys with filters
func getLicenseKeys(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	status := c.DefaultQuery("status", "all") // all, used, unused
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 50
	}

	offset := (page - 1) * limit

	var licenses []License
	query := db.Model(&License{})

	// Apply status filter
	if status == "used" {
		query = query.Where("is_used = ?", true)
	} else if status == "unused" {
		query = query.Where("is_used = ?", false)
	}

	// Apply search filter
	if search != "" {
		query = query.Where("license_key LIKE ?", "%"+search+"%")
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Get licenses with pagination
	if err := query.
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, telegram_id, username, first_name, last_name, phone")
		}).
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&licenses).Error; err != nil {
		logger.Error("Failed to get license keys", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get license keys",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"licenses": licenses,
			"total":    total,
			"page":     page,
			"limit":    limit,
		},
	})
}

// getLicenseKeyDetail returns details of a specific license key
func getLicenseKeyDetail(c *gin.Context) {
	licenseID := c.Param("id")

	var license License
	if err := db.
		Preload("User", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, telegram_id, username, first_name, last_name, phone")
		}).
		Preload("Admin", func(db *gorm.DB) *gorm.DB {
			return db.Select("id, telegram_id, username, first_name, last_name")
		}).
		First(&license, licenseID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "License key not found",
			})
			return
		}
		logger.Error("Failed to get license key detail", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get license key detail",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    license,
	})
}

// generateLicenseKeys generates new license keys
func generateLicenseKeys(c *gin.Context) {
	logger.Info("Generate license keys request received",
		zap.String("method", c.Request.Method),
		zap.String("path", c.Request.URL.Path),
		zap.String("remote_addr", c.ClientIP()))

	type GenerateRequest struct {
		Count int `json:"count" binding:"required,min=1,max=1000"`
	}

	var req GenerateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("Invalid generate license keys request",
			zap.Error(err))
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request. Count must be between 1 and 1000",
		})
		return
	}

	logger.Info("Generate license keys request validated",
		zap.Int("count", req.Count))

	// Get admin ID from context
	adminIDValue, exists := c.Get("admin_id")
	var adminID *uint
	if exists {
		id := adminIDValue.(uint)
		// Verify that admin exists in database
		var admin Admin
		if err := db.First(&admin, id).Error; err != nil {
			logger.Warn("Admin ID from context not found in database",
				zap.Uint("admin_id", id),
				zap.Error(err))
			// Set to nil if admin doesn't exist
			adminID = nil
		} else {
			adminID = &id
			logger.Info("Admin authenticated for generate license keys",
				zap.Uint("admin_id", id))
		}
	} else {
		logger.Warn("Admin not authenticated for generate license keys - will create without CreatedBy")
		adminID = nil
	}

	// Generate license keys
	licenses := make([]License, 0, req.Count)
	for i := 0; i < req.Count; i++ {
		licenseKey := generateLicenseKey()
		licenses = append(licenses, License{
			LicenseKey: licenseKey,
			IsUsed:     false,
			CreatedBy:  adminID, // Can be nil if admin doesn't exist
		})
	}

	// Batch insert
	if err := db.CreateInBatches(licenses, 100).Error; err != nil {
		logger.Error("Failed to generate license keys", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to generate license keys: " + err.Error(),
		})
		return
	}

	logger.Info("License keys generated successfully",
		zap.Int("count", req.Count),
		zap.Any("admin_id", adminID))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"count":    req.Count,
			"licenses": licenses,
		},
	})
}

// generateLicenseKey generates a single license key in format: XXXX-XXXXX-XXXXX-XXXXX
func generateLicenseKey() string {
	// Generate 4 groups: 4-5-5-5 characters
	groups := []int{4, 5, 5, 5}
	parts := make([]string, len(groups))

	for i, length := range groups {
		bytes := make([]byte, length)
		rand.Read(bytes)
		// Use uppercase alphanumeric characters (excluding I, O to avoid confusion)
		for j := range bytes {
			bytes[j] = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"[bytes[j]%34]
		}
		parts[i] = string(bytes)
	}

	return strings.Join(parts, "-")
}

// exportUnusedLicenseKeys exports all unused license keys as a text file
func exportUnusedLicenseKeys(c *gin.Context) {
	logger.Info("Export unused license keys request received",
		zap.String("path", c.Request.URL.Path),
		zap.String("remote_addr", c.ClientIP()))

	// Get all unused license keys
	var licenses []License
	if err := db.Where("is_used = ?", false).
		Order("created_at ASC").
		Find(&licenses).Error; err != nil {
		logger.Error("Failed to get unused license keys", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get unused license keys",
		})
		return
	}

	// Build text content
	var content strings.Builder
	content.WriteString("# لیست لایسنس‌های استفاده نشده\n")
	content.WriteString(fmt.Sprintf("# تعداد کل: %d\n", len(licenses)))
	content.WriteString(fmt.Sprintf("# تاریخ استخراج: %s\n\n", time.Now().Format("2006-01-02 15:04:05")))

	for i, license := range licenses {
		content.WriteString(license.LicenseKey)
		if i < len(licenses)-1 {
			content.WriteString("\n")
		}
	}

	// Set response headers for file download
	filename := fmt.Sprintf("unused_licenses_%s.txt", time.Now().Format("20060102_150405"))
	c.Header("Content-Type", "text/plain; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", filename))
	c.Header("Content-Length", fmt.Sprintf("%d", content.Len()))

	// Write content to response
	c.String(http.StatusOK, content.String())

	logger.Info("Unused license keys exported successfully",
		zap.Int("count", len(licenses)))
}
