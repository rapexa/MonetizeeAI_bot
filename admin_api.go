package main

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"MonetizeeAI_bot/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// Setup admin API routes
func setupAdminAPIRoutes(r *gin.Engine) {
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

		// Licenses
		admin.GET("/licenses", getAdminLicenses)
		admin.POST("/licenses/:id/approve", approveLicenseAPI)
		admin.POST("/licenses/:id/reject", rejectLicenseAPI)

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
	}
}

// Admin authentication middleware
func adminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 🔒 SECURITY: Admin Panel MUST be accessed through Telegram ONLY

		// Check 1: Must have Telegram WebApp data
		initData := getTelegramInitDataFromRequest(c)
		telegramWebApp := c.GetHeader("X-Telegram-WebApp")
		startParam := c.GetHeader("X-Telegram-Start-Param")

		if initData == "" && telegramWebApp == "" {
			logger.Warn("Admin Panel access denied - No Telegram data",
				zap.String("remote_addr", c.ClientIP()),
				zap.String("user_agent", c.GetHeader("User-Agent")))
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Access Denied",
				"message": "Admin Panel is only accessible through Telegram",
			})
			c.Abort()
			return
		}

		// Check 2: Validate Telegram init data and extract telegram_id
		telegramID, err := getTelegramIDFromRequest(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error":   "Unauthorized",
				"message": "Invalid Telegram authentication",
			})
			c.Abort()
			return
		}

		// Check 3: Verify user is an active admin
		var admin Admin
		if err := db.Where("telegram_id = ? AND is_active = ?", telegramID, true).First(&admin).Error; err != nil {
			logger.Warn("Admin Panel access denied - User is not an admin",
				zap.Int64("telegram_id", telegramID),
				zap.String("remote_addr", c.ClientIP()))
			c.JSON(http.StatusForbidden, gin.H{
				"error":   "Forbidden",
				"message": "Admin access required",
			})
			c.Abort()
			return
		}

		// Check 4 (Optional): Log start_param for debugging
		if strings.HasPrefix(startParam, "admin_") {
			logger.Info("Admin Panel access with start_param",
				zap.Int64("admin_telegram_id", telegramID),
				zap.String("start_param", startParam))
		}

		// Log successful admin access
		logger.Info("Admin Panel access granted",
			zap.Int64("admin_telegram_id", telegramID),
			zap.String("admin_username", admin.Username),
			zap.String("path", c.Request.URL.Path))

		c.Set("admin_id", admin.ID)
		c.Set("admin_telegram_id", telegramID)
		c.Set("admin_username", admin.Username)
		c.Next()
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
		query = query.Where("username LIKE ? OR first_name LIKE ? OR phone_number LIKE ?",
			"%"+search+"%", "%"+search+"%", "%"+search+"%")
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
	query.Count(&total)

	var users []User
	query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&users)

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

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user":     user,
			"payments": payments,
			"progress": progress,
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
		user.SubscriptionType = "free_trial"
		user.PlanName = ""
		user.SubscriptionExpiry = nil
	case "starter":
		expiry := time.Now().AddDate(0, 1, 0)
		user.SubscriptionType = "paid"
		user.PlanName = "starter"
		user.SubscriptionExpiry = &expiry
		user.IsVerified = true
	case "pro":
		expiry := time.Now().AddDate(0, 6, 0)
		user.SubscriptionType = "paid"
		user.PlanName = "pro"
		user.SubscriptionExpiry = &expiry
		user.IsVerified = true
	case "ultimate":
		user.SubscriptionType = "paid"
		user.PlanName = "ultimate"
		user.SubscriptionExpiry = nil
		user.IsVerified = true
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid plan type"})
		return
	}

	db.Save(&user)

	logger.Info("User plan changed by admin",
		zap.Uint("user_id", user.ID),
		zap.String("new_plan", req.PlanType),
		zap.Int64("admin_telegram_id", c.GetInt64("admin_telegram_id")))

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User plan changed successfully",
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
	query.Count(&total)

	var payments []PaymentTransaction
	query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&payments)

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
