package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"time"

	"MonetizeeAI_bot/logger"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"go.uber.org/zap"
)

// WebSocket upgrader with compression
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Will be validated by Telegram auth
	},
	EnableCompression: true, // Enable Gzip compression
}

// Admin client connection
type AdminClient struct {
	conn       *websocket.Conn
	send       chan []byte
	telegramID int64
	mu         sync.Mutex
}

// Admin Hub manages all admin connections
type AdminHub struct {
	clients    map[int64]*AdminClient
	broadcast  chan []byte
	register   chan *AdminClient
	unregister chan *AdminClient
	mu         sync.RWMutex
}

var adminHub = &AdminHub{
	clients:    make(map[int64]*AdminClient),
	broadcast:  make(chan []byte, 256),
	register:   make(chan *AdminClient),
	unregister: make(chan *AdminClient),
}

// Start the admin hub
func (h *AdminHub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.telegramID] = client
			h.mu.Unlock()
			logger.Info("Admin client connected",
				zap.Int64("telegram_id", client.telegramID))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client.telegramID]; ok {
				delete(h.clients, client.telegramID)
				close(client.send)
			}
			h.mu.Unlock()
			logger.Info("Admin client disconnected",
				zap.Int64("telegram_id", client.telegramID))

		case message := <-h.broadcast:
			h.mu.RLock()
			for _, client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client.telegramID)
				}
			}
			h.mu.RUnlock()
		}
	}
}

// WebSocket message types
type WSMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// Real-time stats payload
type StatsPayload struct {
	TotalUsers           int64                `json:"totalUsers"`
	ActiveUsers          int64                `json:"activeUsers"`
	ActiveUsersToday     int64                `json:"activeUsersToday"`
	FreeTrialUsers       int64                `json:"freeTrialUsers"`
	PaidUsers            int64                `json:"paidUsers"`
	TodayRevenue         int                  `json:"todayRevenue"`
	MonthRevenue         int                  `json:"monthRevenue"`
	OnlineAdmins         int                  `json:"onlineAdmins"`
	PendingLicenses      int64                `json:"pendingLicenses"`
	ActiveLicenses       int64                `json:"activeLicenses"`
	TotalLicenseKeys     int64                `json:"totalLicenseKeys"`     // Total pre-generated license keys
	UsedLicenseKeys      int64                `json:"usedLicenseKeys"`      // Used license keys
	UnusedLicenseKeys    int64                `json:"unusedLicenseKeys"`   // Unused license keys
	AverageProgress      float64              `json:"averageProgress"`      // Average progress percentage across 29 stages
	AITotalRequests      int64                `json:"aiTotalRequests"`      // Total AI requests count
	RecentUsers          []User               `json:"recentUsers"`
	RecentPayments       []PaymentTransaction `json:"recentPayments"`
	RecentErrors         []ErrorLog           `json:"recentErrors"`         // Recent error logs
	Alerts               []Alert              `json:"alerts"`               // System alerts
	Timestamp            time.Time            `json:"timestamp"`
}

// ErrorLog represents an error log entry
type ErrorLog struct {
	ID        uint      `json:"id"`
	Level     string    `json:"level"`     // error, warning, info
	Message   string    `json:"message"`
	Source    string    `json:"source"`    // API, Payment, Server, etc.
	CreatedAt time.Time `json:"createdAt"`
}

// Alert represents a system alert
type Alert struct {
	ID        uint      `json:"id"`
	Type      string    `json:"type"`      // api, payment, server, etc.
	Severity  string    `json:"severity"`  // critical, warning, info
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"createdAt"`
}

// Handle WebSocket connection for admin
func handleAdminWebSocket(c *gin.Context) {
	logger.Info("Admin WebSocket connection attempt",
		zap.String("path", c.Request.URL.Path),
		zap.String("remote_addr", c.ClientIP()),
		zap.String("user_agent", c.GetHeader("User-Agent")))

	// Validate admin authentication
	telegramID, isAdmin, err := validateAdminWebSocket(c)
	if err != nil || !isAdmin {
		initDataPresent := "no"
		if c.GetHeader("X-Telegram-Init-Data") != "" || c.Query("init_data") != "" {
			initDataPresent = "yes"
		}
		logger.Error("Unauthorized WebSocket connection attempt",
			zap.Error(err),
			zap.Bool("is_admin", isAdmin),
			zap.String("path", c.Request.URL.Path),
			zap.String("init_data_present", initDataPresent))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Upgrade HTTP to WebSocket
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logger.Error("Failed to upgrade WebSocket",
			zap.Error(err))
		return
	}

	// Create admin client
	client := &AdminClient{
		conn:       conn,
		send:       make(chan []byte, 256),
		telegramID: telegramID,
	}

	// Register client
	adminHub.register <- client

	// Start goroutines
	go client.writePump()
	go client.readPump()

	// Send initial stats
	go sendStatsToClient(client)
}

// Validate admin WebSocket connection
func validateAdminWebSocket(c *gin.Context) (int64, bool, error) {
	telegramID, err := getTelegramIDFromRequest(c)
	if err != nil {
		return 0, false, err
	}

	var admin Admin
	if err := db.Where("telegram_id = ? AND is_active = ?", telegramID, true).First(&admin).Error; err != nil {
		return 0, false, err
	}

	return telegramID, true, nil
}

// Write pump sends messages to WebSocket
func (c *AdminClient) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.mu.Lock()
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				c.mu.Unlock()
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				c.mu.Unlock()
				return
			}
			w.Write(message)

			// Add queued messages
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				c.mu.Unlock()
				return
			}
			c.mu.Unlock()

		case <-ticker.C:
			c.mu.Lock()
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				c.mu.Unlock()
				return
			}
			c.mu.Unlock()
		}
	}
}

// Read pump reads messages from WebSocket
func (c *AdminClient) readPump() {
	defer func() {
		adminHub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				logger.Error("WebSocket error", zap.Error(err))
			}
			break
		}

		// Handle incoming admin commands
		handleAdminWSCommand(c, message)
	}
}

// Handle admin WebSocket commands
func handleAdminWSCommand(client *AdminClient, message []byte) {
	var msg WSMessage
	if err := json.Unmarshal(message, &msg); err != nil {
		logger.Error("Failed to parse WebSocket message", zap.Error(err))
		return
	}

	switch msg.Type {
	case "ping":
		sendWSMessage(client, "pong", map[string]string{"status": "ok"})
	case "request_stats":
		sendStatsToClient(client)
	case "request_users":
		sendUsersToClient(client)
	case "request_payments":
		sendPaymentsToClient(client)
	default:
		logger.Warn("Unknown WebSocket command", zap.String("type", msg.Type))
	}
}

// Send WebSocket message to client
func sendWSMessage(client *AdminClient, msgType string, payload interface{}) {
	msg := WSMessage{
		Type:    msgType,
		Payload: payload,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		logger.Error("Failed to marshal WebSocket message", zap.Error(err))
		return
	}

	select {
	case client.send <- data:
	default:
		logger.Warn("Client send buffer full, dropping message")
	}
}

// Send real-time stats to client
func sendStatsToClient(client *AdminClient) {
	stats := getRealtimeStats()
	sendWSMessage(client, "stats", stats)
}

// Get real-time stats
func getRealtimeStats() StatsPayload {
	var totalUsers, activeUsers, freeTrialUsers, paidUsers int64

	// Count users
	db.Model(&User{}).Count(&totalUsers)
	db.Model(&User{}).Where("is_active = ?", true).Count(&activeUsers)
	db.Model(&User{}).Where("subscription_type = ?", "free_trial").Count(&freeTrialUsers)
	db.Model(&User{}).Where("subscription_type = ?", "paid").Count(&paidUsers)

	// Active users today (users who were active today - updated_at in last 24 hours)
	today := time.Now().Truncate(24 * time.Hour)
	var activeUsersToday int64
	db.Model(&User{}).
		Where("is_active = ? AND updated_at >= ?", true, today).
		Count(&activeUsersToday)

	// Calculate revenue
	var todayRevenue, monthRevenue int
	monthStart := time.Date(time.Now().Year(), time.Now().Month(), 1, 0, 0, 0, 0, time.Now().Location())

	db.Model(&PaymentTransaction{}).
		Where("status = ? AND created_at >= ?", "success", today).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&todayRevenue)

	db.Model(&PaymentTransaction{}).
		Where("status = ? AND created_at >= ?", "success", monthStart).
		Select("COALESCE(SUM(amount), 0)").
		Scan(&monthRevenue)

	// Pending and active licenses (old verification system)
	var pendingLicenses, activeLicenses int64
	db.Model(&LicenseVerification{}).Where("status = ?", "pending").Count(&pendingLicenses)
	db.Model(&LicenseVerification{}).Where("status = ?", "approved").Count(&activeLicenses)

	// License keys statistics (new pre-generated license system)
	var totalLicenseKeys, usedLicenseKeys, unusedLicenseKeys int64
	db.Model(&License{}).Count(&totalLicenseKeys)
	db.Model(&License{}).Where("is_used = ?", true).Count(&usedLicenseKeys)
	db.Model(&License{}).Where("is_used = ?", false).Count(&unusedLicenseKeys)

	// Calculate average progress percentage (based on current_session out of 29 stages)
	var avgProgress float64
	var progressResult struct {
		Average float64
	}
	db.Model(&User{}).
		Where("is_active = ? AND current_session > 0", true).
		Select("AVG(current_session) * 100.0 / 29.0 as average").
		Scan(&progressResult)
	avgProgress = progressResult.Average
	if avgProgress > 100 {
		avgProgress = 100
	}

	// Count total AI requests (from ChatMessage table)
	var aiTotalRequests int64
	db.Model(&ChatMessage{}).Count(&aiTotalRequests)

	// Recent users (last 10)
	var recentUsers []User
	db.Order("created_at DESC").Limit(10).Find(&recentUsers)

	// Recent payments (last 10)
	var recentPayments []PaymentTransaction
	db.Order("created_at DESC").Limit(10).Find(&recentPayments)

	// Recent errors (from AdminAction or logger - simplified for now)
	recentErrors := getRecentErrors()

	// System alerts
	alerts := getSystemAlerts()

	// Online admins count
	adminHub.mu.RLock()
	onlineAdmins := len(adminHub.clients)
	adminHub.mu.RUnlock()

	return StatsPayload{
		TotalUsers:        totalUsers,
		ActiveUsers:       activeUsers,
		ActiveUsersToday:  activeUsersToday,
		FreeTrialUsers:    freeTrialUsers,
		PaidUsers:         paidUsers,
		TodayRevenue:      todayRevenue,
		MonthRevenue:      monthRevenue,
		OnlineAdmins:      onlineAdmins,
		PendingLicenses:   pendingLicenses,
		ActiveLicenses:    activeLicenses,
		TotalLicenseKeys:  totalLicenseKeys,
		UsedLicenseKeys:   usedLicenseKeys,
		UnusedLicenseKeys: unusedLicenseKeys,
		AverageProgress:   avgProgress,
		AITotalRequests:   aiTotalRequests,
		RecentUsers:       recentUsers,
		RecentPayments:    recentPayments,
		RecentErrors:      recentErrors,
		Alerts:            alerts,
		Timestamp:         time.Now(),
	}
}

// Get recent errors from system
func getRecentErrors() []ErrorLog {
	// For now, return empty array - can be extended to read from logger files or database
	// TODO: Implement reading from logger or error log table
	return []ErrorLog{}
}

// Get system alerts
func getSystemAlerts() []Alert {
	var alerts []Alert
	
	// Check API connectivity (simplified - always assume OK for now)
	// TODO: Implement actual API health checks
	
	// Check for failed payments
	var failedPayments int64
	today := time.Now().Truncate(24 * time.Hour)
	db.Model(&PaymentTransaction{}).
		Where("status = ? AND created_at >= ?", "failed", today).
		Count(&failedPayments)
	
	if failedPayments > 5 {
		alerts = append(alerts, Alert{
			Type:     "payment",
			Severity: "warning",
			Message:  fmt.Sprintf("%d پرداخت ناموفق در امروز", failedPayments),
			CreatedAt: time.Now(),
		})
	}
	
	// Check for database connectivity (simplified - if we got here, DB is OK)
	
	return alerts
}

// Send users list to client
func sendUsersToClient(client *AdminClient) {
	var users []User
	db.Order("created_at DESC").Limit(100).Find(&users)
	sendWSMessage(client, "users", users)
}

// Send payments list to client
func sendPaymentsToClient(client *AdminClient) {
	var payments []PaymentTransaction
	db.Order("created_at DESC").Limit(100).Find(&payments)
	sendWSMessage(client, "payments", payments)
}

// Broadcast stats to all connected admins
func BroadcastStatsToAdmins() {
	stats := getRealtimeStats()
	msg := WSMessage{
		Type:    "stats",
		Payload: stats,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		logger.Error("Failed to marshal broadcast stats", zap.Error(err))
		return
	}

	adminHub.broadcast <- data
}

// Start stats broadcaster (every 5 seconds)
func startStatsBroadcaster() {
	ticker := time.NewTicker(5 * time.Second)
	go func() {
		for range ticker.C {
			BroadcastStatsToAdmins()
		}
	}()
}
