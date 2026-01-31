package main

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"MonetizeeAI_bot/logger"
	"MonetizeeAI_bot/metrics"
	"MonetizeeAI_bot/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-contrib/gzip"
	"github.com/gin-gonic/gin"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// 🔒 SECURITY: Global variables for Mini App security
var (
	// Rate limiting for Mini App API calls
	miniAppRateLimits = make(map[int64]time.Time)
	miniAppCallCounts = make(map[int64]int)
	rateLimitMutex    sync.RWMutex // ⚡ PERFORMANCE: Add mutex for thread-safe access

	// User blocking for Mini App
	miniAppBlockedUsers            = make(map[int64]bool)
	miniAppSuspiciousActivityCount = make(map[int64]int)
	blockedUsersMutex              sync.RWMutex // ⚡ PERFORMANCE: Add mutex for thread-safe access
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
// ⚡ PERFORMANCE: Thread-safe with mutex
func checkMiniAppRateLimit(telegramID int64) bool {
	now := time.Now()
	rateLimitMutex.Lock()
	defer rateLimitMutex.Unlock()

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
// ⚡ PERFORMANCE: Improved cleanup with mutex protection
func cleanupMiniAppRateLimitCache() {
	ticker := time.NewTicker(5 * time.Minute)
	go func() {
		for range ticker.C {
			now := time.Now()
			rateLimitMutex.Lock()
			for telegramID, lastCallTime := range miniAppRateLimits {
				if now.Sub(lastCallTime) > 10*time.Minute {
					delete(miniAppRateLimits, telegramID)
					delete(miniAppCallCounts, telegramID)
				}
			}
			rateLimitMutex.Unlock()
		}
	}()
}

// 🔒 SECURITY: Telegram WebApp Authentication Middleware
func telegramWebAppAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// If no route matched (FullPath empty), let NoRoute handle it → 404 JSON for API paths.
		if c.FullPath() == "" {
			c.Next()
			return
		}
		// Skip authentication for health check, static files, admin routes, and admin login page
		// Admin routes have their own authentication middleware
		// Admin login page should be accessible from web without Telegram
		path := c.Request.URL.Path

		// Log all requests for debugging (can be removed in production)
		logger.Debug("🔍 Middleware check",
			zap.String("path", path),
			zap.String("method", c.Request.Method),
			zap.String("ip", c.ClientIP()))
		// Normalize path (remove double slashes and trailing slashes)
		// Handle cases like //admin-login or /admin-login/
		for strings.Contains(path, "//") {
			path = strings.ReplaceAll(path, "//", "/")
		}
		path = strings.TrimSuffix(path, "/")
		if path == "" {
			path = "/"
		}

		// Check if path should be allowed without Telegram auth
		// Admin routes, web login routes, and static files are allowed
		if path == "/health" ||
			strings.HasPrefix(path, "/static/") ||
			strings.HasPrefix(path, "/assets/") ||
			strings.HasPrefix(path, "/api/v1/admin/") || // Only admin API routes, not all /api/
			strings.HasPrefix(path, "/v1/admin/") ||
			strings.HasPrefix(path, "/api/v1/web/login") || // Web login endpoint
			strings.HasPrefix(path, "/api/v1/web/verify") || // Web verify endpoint
			strings.HasPrefix(path, "/api/v1/web/logout") || // Web logout endpoint
			path == "/admin-login" ||
			strings.HasPrefix(path, "/admin-login/") ||
			path == "/admin-panel" ||
			strings.HasPrefix(path, "/admin-panel/") ||
			path == "/web-login" ||
			strings.HasPrefix(path, "/web-login/") {
			logger.Info("✅ Allowing access without Telegram auth",
				zap.String("path", path),
				zap.String("original_path", c.Request.URL.Path))
			c.Next()
			return
		}

		// 🎯 BEST METHOD: Check for startapp query parameter FIRST
		// If startapp parameter exists, it means the request came from Telegram
		// This is the most reliable way to detect Telegram Mini App access
		// If startapp exists, no need to check web session - allow access directly
		startappParam := c.Query("startapp")
		if startappParam != "" {
			// Request came from Telegram - allow access
			logger.Info("✅ Telegram Mini App detected via startapp parameter",
				zap.String("path", path),
				zap.String("startapp", startappParam),
				zap.String("ip", c.ClientIP()))
			c.Set("telegram_id", 0) // Will be set from initData later
			c.Set("from_telegram", true)
			c.Next()
			return
		}

		// IMPORTANT:
		// - Root path "/" requires Telegram or web session
		// - All other API routes (like /api/v1/user/*) require Telegram or web session
		// - All other paths require Telegram or web session
		// Only admin routes are allowed without Telegram/web session

		// Check for valid web session token (for regular users, not admins)
		// This allows web users to access the app if they have a valid session
		// Only check web session if startapp parameter is NOT present
		// Try multiple methods to get token (in order of priority):
		// 1. Cookie (for HTML requests from frontend - most reliable for page loads)
		// 2. Authorization header (for API requests)
		// 3. Query parameter (fallback)
		var token string
		// First try cookie (for HTML page requests)
		cookieToken, err := c.Cookie("web_session_token")
		if err == nil && cookieToken != "" {
			token = cookieToken
			logger.Debug("🔍 Web session token found in cookie",
				zap.String("path", path),
				zap.String("token_prefix", func() string {
					if len(token) > 8 {
						return token[:8] + "..."
					}
					return token
				}()))
		} else {
			logger.Debug("🔍 No web session token in cookie",
				zap.String("path", path),
				zap.Error(err))
		}
		// If no cookie, try Authorization header (for API requests)
		if token == "" {
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" {
				token = authHeader
				logger.Debug("🔍 Web session token found in Authorization header",
					zap.String("path", path))
			}
		}
		// If still no token, try query parameter (fallback)
		if token == "" {
			queryToken := c.Query("token")
			if queryToken != "" {
				token = queryToken
				logger.Debug("🔍 Web session token found in query parameter",
					zap.String("path", path))
			}
		}
		if token != "" {
			// Remove "Bearer " prefix if present
			if strings.HasPrefix(token, "Bearer ") {
				token = strings.TrimPrefix(token, "Bearer ")
			}

			userWebSessionsMutex.RLock()
			session, exists := userWebSessions[token]
			userWebSessionsMutex.RUnlock()

			if exists && time.Now().Before(session.ExpiresAt) {
				// Valid web session found - set telegram_id in context and allow access
				c.Set("telegram_id", session.TelegramID)
				c.Set("web_session", true)
				logger.Info("✅ Web session authenticated",
					zap.Int64("telegram_id", session.TelegramID),
					zap.String("path", path))
				c.Next()
				return
			} else if exists {
				logger.Warn("⚠️ Web session expired",
					zap.String("path", path),
					zap.Time("expires_at", session.ExpiresAt))
			} else {
				logger.Debug("⚠️ Web session token not found in sessions",
					zap.String("path", path),
					zap.String("token_prefix", func() string {
						if len(token) > 8 {
							return token[:8] + "..."
						}
						return token
					}()))
			}
		}

		// Check for Telegram WebApp indicators
		// ⚠️ SECURITY: Do NOT trust X-Telegram-WebApp or X-Telegram-Start-Param headers
		// because the frontend always sends them, even from web browsers
		// Only trust: startapp query parameter, X-Telegram-Init-Data (validated), User-Agent, and Referer
		userAgent := c.GetHeader("User-Agent")
		referer := c.GetHeader("Referer")
		initData := c.GetHeader("X-Telegram-Init-Data")

		// Log the request for debugging
		// Debug logging removed for production
		// logger.Debug("🔍 WebApp Auth Check",
		//	zap.String("path", c.Request.URL.Path),
		//	zap.String("user_agent", userAgent),
		//	zap.String("referer", referer),
		//	zap.Bool("has_init_data", initData != ""),
		//	zap.String("remote_addr", c.ClientIP()))

		// Check if request comes from Telegram WebApp
		isTelegramWebApp := false

		// Method 1: Check User-Agent for Telegram indicators (reliable - cannot be faked by frontend)
		if strings.Contains(strings.ToLower(userAgent), "telegram") {
			isTelegramWebApp = true
			logger.Debug("✅ Telegram detected in User-Agent",
				zap.String("user_agent", userAgent))
		}

		// Method 2: Check Referer for Telegram domains (reliable - cannot be faked by frontend)
		if referer != "" && (strings.Contains(referer, "t.me") ||
			strings.Contains(referer, "telegram.org") ||
			strings.Contains(referer, "telegram.me")) {
			isTelegramWebApp = true
			logger.Debug("✅ Telegram detected in Referer",
				zap.String("referer", referer))
		}

		// Method 3: Check for Telegram WebApp init data header (should be validated)
		// Note: This should be cryptographically validated, but for now we check if it exists
		// TODO: Add proper cryptographic validation of initData
		if initData != "" {
			// Only trust initData if it's not empty and looks valid
			// Basic check: initData should contain user data
			if strings.Contains(initData, "user=") || strings.Contains(initData, "hash=") {
				isTelegramWebApp = true
				logger.Debug("✅ Telegram init data found (basic validation passed)")
			}
		}

		// ⚠️ REMOVED: X-Telegram-WebApp header check
		// Frontend always sends this header, even from web browsers
		// DO NOT TRUST THIS HEADER

		// ⚠️ REMOVED: X-Telegram-Start-Param header check
		// Frontend might send this header, but it's not reliable
		// Use startapp query parameter instead (already checked above)

		// Method 4: Check for specific Telegram WebApp User-Agent patterns (reliable)
		telegramPatterns := []string{
			"TelegramBot",
			"Telegram",
			"tdesktop",
			"Telegram Desktop",
			"Telegram Web",
		}

		for _, pattern := range telegramPatterns {
			if strings.Contains(userAgent, pattern) {
				isTelegramWebApp = true
				logger.Debug("✅ Telegram pattern matched",
					zap.String("pattern", pattern),
					zap.String("user_agent", userAgent))
				break
			}
		}

		// Allow requests from localhost for development (only if DEVELOPMENT_MODE is enabled)
		isDevelopment := strings.ToLower(os.Getenv("DEVELOPMENT_MODE")) == "true"
		if isDevelopment && (strings.Contains(c.ClientIP(), "127.0.0.1") ||
			strings.Contains(c.ClientIP(), "::1") ||
			c.ClientIP() == "localhost") {
			// logger.Debug("✅ Localhost access allowed for development")
			c.Next()
			return
		}

		// Block non-Telegram requests without web session
		// If we reach here, it means:
		// 1. No startapp parameter (not from Telegram Mini App)
		// 2. No valid web session
		// 3. No Telegram WebApp indicators (User-Agent, Referer, or validated Init-Data)
		// Note: X-Telegram-WebApp header is IGNORED because frontend always sends it
		if !isTelegramWebApp {
			logger.Warn("🚫 Access blocked - no startapp, no web session, and no reliable Telegram indicators",
				zap.String("ip", c.ClientIP()),
				zap.String("user_agent", userAgent),
				zap.String("referer", referer),
				zap.String("path", c.Request.URL.Path),
				zap.String("normalized_path", path),
				zap.String("startapp", c.Query("startapp")),                       // Log startapp value (should be empty)
				zap.String("x_telegram_webapp", c.GetHeader("X-Telegram-WebApp")), // Log but don't trust
				zap.Bool("has_init_data", initData != ""),
				zap.Bool("is_api", strings.HasPrefix(c.Request.URL.Path, "/api/")),
				zap.String("cookie_token", func() string {
					if _, err := c.Cookie("web_session_token"); err == nil {
						return "present"
					}
					return "missing"
				}()))

			// For API requests, return JSON error
			if strings.HasPrefix(c.Request.URL.Path, "/api/") {
				c.JSON(http.StatusForbidden, APIResponse{
					Success: false,
					Error:   "Access denied. Please login via /web-login or use Telegram Mini App.",
				})
				c.Abort()
				return
			} else {
				// For frontend routes (non-API), redirect to /web-login if not already there
				// CRITICAL: Check normalized path, not original path
				if path != "/web-login" && path != "/web-login/" && !strings.HasPrefix(path, "/web-login/") {
					logger.Info("🔄 Redirecting to /web-login - no startapp, no web session, and no Telegram",
						zap.String("original_path", c.Request.URL.Path),
						zap.String("normalized_path", path),
						zap.String("ip", c.ClientIP()),
						zap.String("method", c.Request.Method),
						zap.String("startapp", c.Query("startapp")))
					c.Redirect(http.StatusFound, "/web-login")
					c.Abort()
					return
				}
				// If already on /web-login, allow it (will be served by route handler before middleware)
				c.Next()
				return
			}
		}

		// logger.Debug("✅ Telegram WebApp access granted")
		c.Next()
	}
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
	Points             int        `json:"points"`
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

// noRouteHandler returns the NoRoute handler. API paths get 404 JSON; non-API preserve redirect/SPA behavior.
func noRouteHandler(frontendPath string) gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path
		for strings.Contains(path, "//") {
			path = strings.ReplaceAll(path, "//", "/")
		}

		if strings.HasPrefix(path, "/api/") || strings.HasPrefix(path, "/api/v1/") {
			c.Header("Content-Type", "application/json; charset=utf-8")
			c.JSON(http.StatusNotFound, APIResponse{Success: false, Error: "Not found"})
			return
		}

		hasWebSession := c.GetBool("web_session")
		hasTelegramID := c.GetInt64("telegram_id") > 0
		if !hasWebSession && !hasTelegramID {
			c.Redirect(http.StatusFound, "/web-login")
			c.Abort()
			return
		}

		indexPath := frontendPath + "/index.html"
		if _, err := os.Stat(indexPath); err == nil {
			c.File(indexPath)
			return
		}
		c.JSON(http.StatusNotFound, APIResponse{Success: false, Error: "Frontend not found"})
	}
}

// StartWebAPI initializes and starts the web API server
// CRITICAL: This function must be called only once, from main().
// Calling it multiple times will cause "handlers are already registered" panic.
var webAPIStarted bool
var webAPIMutex sync.Mutex

func StartWebAPI() {
	webAPIMutex.Lock()
	defer webAPIMutex.Unlock()

	// Prevent multiple calls to StartWebAPI
	if webAPIStarted {
		logger.Warn("StartWebAPI called multiple times - ignoring duplicate call")
		return
	}

	// Only start if WEB_API_ENABLED is set to true
	if strings.ToLower(os.Getenv("WEB_API_ENABLED")) != "true" {
		logger.Info("Web API is disabled")
		webAPIStarted = true // Mark as started even if disabled to prevent re-initialization
		return
	}

	webAPIStarted = true

	// 🔒 SECURITY: Start cleanup for Mini App rate limiting
	cleanupMiniAppRateLimitCache()

	// Start user web session cleanup
	startUserWebSessionCleanup()

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()

	// 🔐 CRITICAL: Register admin auth routes FIRST, before ANY middleware
	// This ensures they are matched before anything else
	r.POST("/api/v1/admin/auth/login", handleWebLogin)
	r.GET("/api/v1/admin/auth/check", handleCheckAuth)
	r.POST("/api/v1/admin/auth/logout", handleWebLogout)
	r.GET("/api/v1/admin/auth/test", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Admin auth endpoint is reachable",
			"path":    c.Request.URL.Path,
			"method":  c.Request.Method,
		})
	})

	// 🔐 User web login routes (for regular users, not admins)
	r.POST("/api/v1/web/login", handleUserWebLogin)
	r.GET("/api/v1/web/verify", handleVerifyUserWebSession)
	r.HEAD("/api/v1/web/verify", handleVerifyUserWebSession)
	r.POST("/api/v1/web/logout", handleUserWebLogout)

	// Add CORS middleware
	config := cors.DefaultConfig()
	// Restrict CORS origins for production
	if strings.ToLower(os.Getenv("DEVELOPMENT_MODE")) == "true" {
		config.AllowOrigins = []string{"*"} // Allow all origins in development
		// logger.Debug("🔧 CORS: Development mode - allowing all origins")
	} else {
		// Production: Only allow Telegram domains and our own domains
		config.AllowOrigins = []string{
			"https://web.telegram.org",
			"https://k.web.telegram.org",
			"https://z.web.telegram.org",
			"https://a.web.telegram.org",
			"https://sianmarketing.com",
			"https://www.sianmarketing.com",
			"https://sianacademy.com",
			"https://www.sianacademy.com",
		}
		// logger.Debug("🔒 CORS: Production mode - restricted origins")
	}
	config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Telegram-Init-Data", "X-Telegram-WebApp", "X-Telegram-Start-Param", "X-Request-Id"}
	r.Use(cors.New(config))

	// 📌 REQUEST ID MIDDLEWARE (Phase 3: Observability)
	// Reads X-Request-Id or generates one; sets in context and response header.
	r.Use(middleware.RequestID())

	// Standard request logger - one structured line per request after completion
	r.Use(middleware.RequestLogger())

	// Prometheus HTTP metrics (after logger, before recovery)
	r.Use(middleware.PromMetrics())

	// Recovery middleware
	r.Use(gin.Recovery())

	// ⚡ PERFORMANCE: Enable Gzip compression for faster response times
	r.Use(gzip.Gzip(gzip.DefaultCompression))

	// Path normalization middleware - normalize double slashes and trailing slashes
	r.Use(func(c *gin.Context) {
		path := c.Request.URL.Path
		// Remove double slashes
		for strings.Contains(path, "//") {
			path = strings.ReplaceAll(path, "//", "/")
		}
		// Remove trailing slash (except for root)
		if path != "/" && strings.HasSuffix(path, "/") {
			path = strings.TrimSuffix(path, "/")
		}
		// Update request path if changed
		if path != c.Request.URL.Path {
			c.Request.URL.Path = path
		}
		c.Next()
	})

	// Health check endpoint (before auth middleware)
	// GET returns 200 JSON; HEAD returns 200 with no body (no redirect)
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, APIResponse{
			Success: true,
			Data: map[string]string{
				"status":     "healthy",
				"service":    "MonetizeeAI API",
				"request_id": middleware.GetRequestID(c),
			},
		})
	})
	r.HEAD("/health", func(c *gin.Context) {
		c.Header("Content-Type", "application/json")
		c.Status(http.StatusOK)
	})

	// Prometheus /metrics - IP allowlist only (127.0.0.1, ::1, METRICS_ALLOWLIST)
	r.GET("/metrics", handleMetrics)

	// Admin auth routes are already registered at the very beginning (before all middleware)
	// No need to register them again here

	// Serve admin-login page (before auth middleware - must be accessible from web)
	frontendPath := os.Getenv("FRONTEND_PATH")
	if frontendPath == "" {
		frontendPath = "./miniApp/dist"
	}

	// Admin login route - accessible without Telegram
	r.GET("/admin-login", func(c *gin.Context) {
		indexPath := frontendPath + "/index.html"
		if _, err := os.Stat(indexPath); err == nil {
			c.File(indexPath)
		} else {
			// If index.html not found, return simple HTML response
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.String(http.StatusOK, `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Admin Login - MonetizeAI</title>
</head>
<body>
	<div style="text-align: center; padding: 50px;">
		<h1>Admin Login</h1>
		<p>Frontend files not found. Please build the frontend first.</p>
	</div>
</body>
</html>`)
		}
	})

	// Web login route - accessible without Telegram
	r.GET("/web-login", func(c *gin.Context) {
		indexPath := frontendPath + "/index.html"
		if _, err := os.Stat(indexPath); err == nil {
			c.File(indexPath)
		} else {
			// If index.html not found, return simple HTML response
			c.Header("Content-Type", "text/html; charset=utf-8")
			c.String(http.StatusOK, `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Web Login - MonetizeAI</title>
</head>
<body>
	<div style="text-align: center; padding: 50px;">
		<h1>Web Login</h1>
		<p>Frontend files not found. Please build the frontend first.</p>
	</div>
</body>
</html>`)
		}
	})

	// 🔒 SECURITY: Telegram WebApp Authentication Middleware
	// Enabled: Only allow Telegram access for non-admin routes
	r.Use(telegramWebAppAuthMiddleware())

	// NOTE: Admin auth routes (/api/v1/admin/auth/login, /check, /logout) are already
	// registered at the beginning of this function (lines 294-296) before any middleware.
	// DO NOT register them again here to avoid "handlers are already registered" panic.

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

		// Ticket endpoints
		v1.POST("/tickets", handleCreateTicket)
		v1.GET("/user/:telegram_id/tickets", handleGetUserTickets)
		v1.GET("/tickets/:id", handleGetTicket)
		v1.POST("/tickets/:id/reply", handleReplyTicket)
		v1.POST("/tickets/:id/close", handleCloseTicket)
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

	// 🔐 Admin Panel API routes (WebSocket + REST)
	// NOTE: Admin auth routes are already registered above (before static files)
	// Setup all other admin routes
	setupAdminAPIRoutes(r)
	logger.Info("Admin Panel API routes configured",
		zap.String("admin_auth_login", "/api/v1/admin/auth/login"),
		zap.String("admin_auth_check", "/api/v1/admin/auth/check"))

	// Serve frontend static files (for admin-login and other frontend routes)
	// This allows frontend React app to handle routing
	// Note: /admin-login route is already defined above (before auth middleware)

	if _, err := os.Stat(frontendPath); err == nil {
		// CRITICAL: Add middleware to prevent API routes from being intercepted by static file serving
		r.Use(func(c *gin.Context) {
			// If this is an API route, skip static file serving
			if strings.HasPrefix(c.Request.URL.Path, "/api/") {
				c.Next()
				return
			}
			// For non-API routes, continue to static file serving
			c.Next()
		})

		// Serve static assets (only for non-API routes due to middleware above)
		r.Static("/static", frontendPath+"/assets")
		r.Static("/assets", frontendPath+"/assets")
		r.StaticFile("/favicon.ico", frontendPath+"/favicon.ico")

		// Serve fonts
		r.Static("/fonts", frontendPath+"/fonts")

		logger.Info("Frontend static files configured", zap.String("path", frontendPath))
	} else {
		logger.Warn("Frontend directory not found, skipping static file serving", zap.String("path", frontendPath))
	}

	// NoRoute handler - global, runs for all unmatched routes.
	// RequestID middleware runs before this, so X-Request-Id is on all responses.
	// API paths: 404 JSON, no redirect. Non-API: preserve current behavior (redirect or SPA).
	r.NoRoute(noRouteHandler(frontendPath))

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

	// ⚡ PERFORMANCE: Get user from cache
	user, err := userCache.GetUser(requestData.TelegramID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "User not found. Please use the Telegram bot first to register.",
			})
			return
		}
		logger.Error("Database error in authentication", zap.Error(err))
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
		Points:             user.Points,
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

	// ⚡ PERFORMANCE: Get user from cache
	user, err := userCache.GetUser(telegramID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "User not found",
			})
			return
		}
		logger.Error("Database error in getUserInfo", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
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
		Points:             user.Points,
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

	// ⚡ PERFORMANCE: Get user from cache
	user, err := userCache.GetUser(telegramID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "User not found",
			})
			return
		}
		logger.Error("Database error in getUserProgress", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
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
	// ⚡ PERFORMANCE: Get sessions from cache
	sessions, err := sessionCache.GetAllSessions()
	if err != nil {
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

	// ⚡ PERFORMANCE: Get session from cache
	session, err := sessionCache.GetSessionByNumber(number)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "Session not found",
			})
			return
		}
		logger.Error("Database error in getSessionByNumber", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
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

	// ⚡ PERFORMANCE: Get user from cache (reduces database queries)
	user, err := userCache.GetUser(requestData.TelegramID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "User not found",
			})
			return
		}
		logger.Error("Database error in chat request", zap.Error(err))
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
	response := handleChatGPTMessageAPI(user, requestData.Message)

	// Increment chat message count for free trial users and users without subscription type
	if user.SubscriptionType == "free_trial" || user.SubscriptionType == "none" || user.SubscriptionType == "" {
		user.ChatMessagesUsed++
		if err := db.Model(&User{}).Where("telegram_id = ?", requestData.TelegramID).Update("chat_messages_used", user.ChatMessagesUsed).Error; err != nil {
			logger.Error("Failed to increment chat messages used", zap.Error(err))
		} else {
			// ⚡ PERFORMANCE: Invalidate cache after update
			userCache.InvalidateUser(requestData.TelegramID)
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

	// ⚡ PERFORMANCE: Get user from cache
	user, err := userCache.GetUser(telegramID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "User not found",
			})
			return
		}
		logger.Error("Database error in getting user profile", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
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

	// ⚡ PERFORMANCE: Get user from cache
	user, err := userCache.GetUser(telegramID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "User not found",
			})
			return
		}
		logger.Error("Database error in updateUserProfile", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
		})
		return
	}

	// Update profile fields (only requested fields)
	updates := make(map[string]interface{})
	if requestData.Username != "" {
		updates["username"] = requestData.Username
	}
	updates["phone"] = requestData.Phone
	updates["email"] = requestData.Email
	updates["monthly_income"] = requestData.MonthlyIncome

	// ⚡ PERFORMANCE: Use Update instead of Save for better performance
	if err := db.Model(&user).Updates(updates).Error; err != nil {
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

	// ⚡ PERFORMANCE: Get user from cache
	user, err := userCache.GetUser(req.TelegramID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "کاربر یافت نشد",
			})
			return
		}
		logger.Error("Database error in finding user for business builder", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
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
	response := handleChatGPTMessageAPI(user, prompt)

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

	// ⚡ PERFORMANCE: Get user from cache
	user, err := userCache.GetUser(req.TelegramID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "کاربر یافت نشد",
			})
			return
		}
		logger.Error("Database error in finding user for sellkit", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
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
	response := handleChatGPTMessageAPI(user, prompt)

	// Extract JSON from response (handle markdown code blocks)
	cleanResponse := extractJSONFromResponse(response)
	logger.Info("ChatGPT response for sellkit",
		zap.String("raw_response", response),
		zap.String("clean_response", cleanResponse))

	// Try to parse the JSON response
	var sellKit SellKitResponse

	// First try to fix malformed JSON with empty keys
	fixedResponse := fixMalformedSellKitJSON(cleanResponse)

	if err := json.Unmarshal([]byte(fixedResponse), &sellKit); err != nil {
		// If JSON parsing fails, log detailed error and return fallback response
		logger.Error("Failed to parse ChatGPT JSON response for sellkit",
			zap.Error(err),
			zap.String("response", response),
			zap.String("clean_response", cleanResponse),
			zap.String("fixed_response", fixedResponse),
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

	// ⚡ PERFORMANCE: Get user from cache
	user, err := userCache.GetUser(req.TelegramID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "کاربر یافت نشد",
			})
			return
		}
		logger.Error("Database error in finding user for clientfinder", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
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
	response := handleChatGPTMessageAPI(user, prompt)

	// Extract JSON from response (handle markdown code blocks)
	cleanResponse := extractJSONFromResponse(response)
	logger.Info("ChatGPT response for clientfinder",
		zap.String("raw_response", response),
		zap.String("clean_response", cleanResponse))

	// Try to parse the JSON response
	var clientFinder ClientFinderResponse

	// First try to fix malformed JSON with empty keys
	fixedResponse := fixMalformedClientFinderJSON(cleanResponse)

	if err := json.Unmarshal([]byte(fixedResponse), &clientFinder); err != nil {
		// If JSON parsing fails, log detailed error and return fallback response
		logger.Error("Failed to parse ChatGPT JSON response for clientfinder",
			zap.Error(err),
			zap.String("response", response),
			zap.String("clean_response", cleanResponse),
			zap.String("fixed_response", fixedResponse),
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

	// ⚡ PERFORMANCE: Get user from cache
	user, err := userCache.GetUser(req.TelegramID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "کاربر یافت نشد",
			})
			return
		}
		logger.Error("Database error in finding user for salespath", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
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
	response := handleChatGPTMessageAPI(user, prompt)

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

	// First try to fix malformed JSON with empty keys
	fixedResponse := fixMalformedSalesPathJSON(cleanResponse)

	if err := json.Unmarshal([]byte(fixedResponse), &salesPath); err != nil {
		// If JSON parsing fails, log detailed error and return default response for testing
		logger.Error("Failed to parse ChatGPT JSON response for salespath",
			zap.Error(err),
			zap.String("response", response),
			zap.String("clean_response", cleanResponse),
			zap.String("fixed_response", fixedResponse),
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

// fixMalformedBusinessJSON fixes JSON with empty field names by simple string replacement
func fixMalformedBusinessJSON(jsonStr string) string {
	// If JSON doesn't have empty keys, return as is
	if !strings.Contains(jsonStr, `"":`) {
		return jsonStr
	}

	// Simple approach: replace empty keys with placeholders first, then replace placeholders
	result := jsonStr

	// Replace empty keys with unique placeholders
	result = strings.Replace(result, `"":`, `"__FIELD1__":`, 1)
	result = strings.Replace(result, `"":`, `"__FIELD2__":`, 1)
	result = strings.Replace(result, `"":`, `"__FIELD3__":`, 1)
	result = strings.Replace(result, `"":`, `"__FIELD4__":`, 1)
	result = strings.Replace(result, `"":`, `"__FIELD5__":`, 1)
	result = strings.Replace(result, `"":`, `"__FIELD6__":`, 1)
	result = strings.Replace(result, `"":`, `"__FIELD7__":`, 1)

	// Replace placeholders with correct field names
	result = strings.Replace(result, `"__FIELD1__":`, `"businessName":`, 1)
	result = strings.Replace(result, `"__FIELD2__":`, `"tagline":`, 1)
	result = strings.Replace(result, `"__FIELD3__":`, `"description":`, 1)
	result = strings.Replace(result, `"__FIELD4__":`, `"targetAudience":`, 1)
	result = strings.Replace(result, `"__FIELD5__":`, `"products":`, 1)
	result = strings.Replace(result, `"__FIELD6__":`, `"monetization":`, 1)
	result = strings.Replace(result, `"__FIELD7__":`, `"firstAction":`, 1)

	return result
}

// fixMalformedSellKitJSON fixes JSON with empty field names for SellKit
func fixMalformedSellKitJSON(jsonStr string) string {
	// If JSON doesn't have empty keys, return as is
	if !strings.Contains(jsonStr, `"":`) {
		return jsonStr
	}

	result := jsonStr

	// Replace empty keys with unique placeholders (SellKit has 7 fields)
	result = strings.Replace(result, `"":`, `"__FIELD1__":`, 1) // title
	result = strings.Replace(result, `"":`, `"__FIELD2__":`, 1) // headline
	result = strings.Replace(result, `"":`, `"__FIELD3__":`, 1) // description
	result = strings.Replace(result, `"":`, `"__FIELD4__":`, 1) // benefits (array)
	result = strings.Replace(result, `"":`, `"__FIELD5__":`, 1) // priceRange
	result = strings.Replace(result, `"":`, `"__FIELD6__":`, 1) // offer
	result = strings.Replace(result, `"":`, `"__FIELD7__":`, 1) // visualSuggestion

	// Replace placeholders with correct field names
	result = strings.Replace(result, `"__FIELD1__":`, `"title":`, 1)
	result = strings.Replace(result, `"__FIELD2__":`, `"headline":`, 1)
	result = strings.Replace(result, `"__FIELD3__":`, `"description":`, 1)
	result = strings.Replace(result, `"__FIELD4__":`, `"benefits":`, 1)
	result = strings.Replace(result, `"__FIELD5__":`, `"priceRange":`, 1)
	result = strings.Replace(result, `"__FIELD6__":`, `"offer":`, 1)
	result = strings.Replace(result, `"__FIELD7__":`, `"visualSuggestion":`, 1)

	return result
}

// fixMalformedClientFinderJSON fixes JSON with empty field names for ClientFinder
func fixMalformedClientFinderJSON(jsonStr string) string {
	// If JSON doesn't have empty keys, return as is
	if !strings.Contains(jsonStr, `"":`) {
		return jsonStr
	}

	result := jsonStr

	// ClientFinder has nested structure with many empty keys
	// Main structure: channels (array), outreachMessage (string), hashtags (array), actionPlan (array)
	// Each channel object also has empty keys: name, reason

	// Replace main level empty keys first
	result = strings.Replace(result, `"":`, `"channels":`, 1) // First main field

	// Replace nested empty keys in channels array (name, reason for each channel)
	result = strings.Replace(result, `"":`, `"name":`, 1)   // First channel name
	result = strings.Replace(result, `"":`, `"reason":`, 1) // First channel reason
	result = strings.Replace(result, `"":`, `"name":`, 1)   // Second channel name
	result = strings.Replace(result, `"":`, `"reason":`, 1) // Second channel reason
	result = strings.Replace(result, `"":`, `"name":`, 1)   // Third channel name
	result = strings.Replace(result, `"":`, `"reason":`, 1) // Third channel reason

	// Replace remaining main level fields
	result = strings.Replace(result, `"":`, `"outreachMessage":`, 1) // Second main field
	result = strings.Replace(result, `"":`, `"hashtags":`, 1)        // Third main field
	result = strings.Replace(result, `"":`, `"actionPlan":`, 1)      // Fourth main field

	return result
}

// fixMalformedSalesPathJSON fixes JSON with empty field names for SalesPath
func fixMalformedSalesPathJSON(jsonStr string) string {
	// If JSON doesn't have empty keys, return as is
	if !strings.Contains(jsonStr, `"":`) {
		return jsonStr
	}

	result := jsonStr

	// SalesPath has nested structure with many empty keys
	// Main structure: dailyPlan (array), salesTips (array), engagement (array)
	// Each dailyPlan object has empty keys: day, action, content

	// Replace main level empty keys first
	result = strings.Replace(result, `"":`, `"dailyPlan":`, 1) // First main field

	// Replace nested empty keys in dailyPlan array (day, action, content for each day - 7 days)
	result = strings.Replace(result, `"":`, `"day":`, 1)     // Day 1 day
	result = strings.Replace(result, `"":`, `"action":`, 1)  // Day 1 action
	result = strings.Replace(result, `"":`, `"content":`, 1) // Day 1 content
	result = strings.Replace(result, `"":`, `"day":`, 1)     // Day 2 day
	result = strings.Replace(result, `"":`, `"action":`, 1)  // Day 2 action
	result = strings.Replace(result, `"":`, `"content":`, 1) // Day 2 content
	result = strings.Replace(result, `"":`, `"day":`, 1)     // Day 3 day
	result = strings.Replace(result, `"":`, `"action":`, 1)  // Day 3 action
	result = strings.Replace(result, `"":`, `"content":`, 1) // Day 3 content
	result = strings.Replace(result, `"":`, `"day":`, 1)     // Day 4 day
	result = strings.Replace(result, `"":`, `"action":`, 1)  // Day 4 action
	result = strings.Replace(result, `"":`, `"content":`, 1) // Day 4 content
	result = strings.Replace(result, `"":`, `"day":`, 1)     // Day 5 day
	result = strings.Replace(result, `"":`, `"action":`, 1)  // Day 5 action
	result = strings.Replace(result, `"":`, `"content":`, 1) // Day 5 content
	result = strings.Replace(result, `"":`, `"day":`, 1)     // Day 6 day
	result = strings.Replace(result, `"":`, `"action":`, 1)  // Day 6 action
	result = strings.Replace(result, `"":`, `"content":`, 1) // Day 6 content
	result = strings.Replace(result, `"":`, `"day":`, 1)     // Day 7 day
	result = strings.Replace(result, `"":`, `"action":`, 1)  // Day 7 action
	result = strings.Replace(result, `"":`, `"content":`, 1) // Day 7 content

	// Replace remaining main level fields
	result = strings.Replace(result, `"":`, `"salesTips":`, 1)  // Second main field
	result = strings.Replace(result, `"":`, `"engagement":`, 1) // Third main field

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

	// ⚡ PERFORMANCE: Get user from cache
	user, err := userCache.GetUser(req.TelegramID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusInternalServerError, APIResponse{
				Success: false,
				Error:   "User not found",
			})
			return
		}
		logger.Error("Database error in quiz evaluation", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
		})
		return
	}

	// ⚡ PERFORMANCE: Get session from cache
	session, err := sessionCache.GetSessionByNumber(req.StageID)
	if err != nil {
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
	logger.Info("Starting quiz evaluation",
		zap.Int64("user_id", user.TelegramID),
		zap.Int("stage_id", req.StageID),
		zap.String("session_title", session.Title),
		zap.Int("answers_count", len(req.Answers)))

	var approved bool
	var feedback string
	var score int

	approved, feedback, evalErr := groqClient.GenerateExerciseEvaluation(
		session.Title,
		session.Description,
		"",
		"",
		answersStr,
	)

	// Fallback logic: If AI evaluation fails or returns unclear result, do basic validation
	if evalErr != nil {
		logger.Error("Groq evaluation error",
			zap.Int64("user_id", user.TelegramID),
			zap.Int("stage_id", req.StageID),
			zap.Error(evalErr))

		// Fallback: Basic validation based on answer length and content
		answersLength := len(answersStr)
		if answersLength > 100 {
			// Substantial answers, likely good
			approved = true
			score = 75
			feedback = "پاسخ‌های شما دریافت شد. با توجه به تلاش شما، این مرحله تایید شد. ادامه دهید!"
		} else if answersLength > 50 {
			// Some effort, give partial pass
			approved = true
			score = 65
			feedback = "پاسخ‌های شما دریافت شد. می‌توانید به مرحله بعد بروید، اما پیشنهاد می‌کنم محتوا را دوباره مرور کنید."
		} else {
			// Too short, need more
			approved = false
			score = 30
			feedback = "پاسخ‌های شما خیلی کوتاه است. لطفاً با جزئیات بیشتر پاسخ دهید تا بتوانم ارزیابی دقیق‌تری انجام دهم."
		}

		logger.Info("Using fallback evaluation",
			zap.Int64("user_id", user.TelegramID),
			zap.Int("stage_id", req.StageID),
			zap.Bool("approved", approved),
			zap.Int("score", score),
			zap.Int("answers_length", answersLength))
	} else {
		logger.Info("Quiz evaluation completed",
			zap.Int64("user_id", user.TelegramID),
			zap.Int("stage_id", req.StageID),
			zap.Bool("approved", approved),
			zap.Int("feedback_length", len(feedback)))

		// Additional validation: If AI says no but answers are substantial, reconsider
		if !approved && len(answersStr) > 150 {
			logger.Warn("AI rejected but answers are substantial, reconsidering...",
				zap.Int64("user_id", user.TelegramID),
				zap.Int("stage_id", req.StageID),
				zap.Int("answers_length", len(answersStr)))

			// If answers are substantial, give benefit of doubt
			approved = true
			score = 70
			if feedback == "" {
				feedback = "پاسخ‌های شما دریافت شد. با توجه به تلاش شما، این مرحله تایید شد."
			}

			logger.Info("Reconsidered and approved based on answer length",
				zap.Int64("user_id", user.TelegramID),
				zap.Int("stage_id", req.StageID))
		}
	}
	// Calculate score based on approval and answer quality (only if not set in fallback)
	if score == 0 {
		if approved {
			// If approved, give a good score (70-90 range)
			// Check answer quality from feedback
			feedbackLower := strings.ToLower(feedback)
			if strings.Contains(feedbackLower, "عالی") ||
				strings.Contains(feedbackLower, "کامل") ||
				strings.Contains(feedbackLower, "عالیه") {
				score = 90
			} else if strings.Contains(feedbackLower, "خوب") ||
				strings.Contains(feedbackLower, "مناسب") {
				score = 80
			} else {
				score = 70 // Minimum passing score
			}
		} else {
			// If not approved, give partial credit based on effort
			// Check if there's any meaningful content in answers
			if len(answersStr) > 100 {
				// Substantial answer, give partial credit
				score = 40
			} else if len(answersStr) > 50 {
				// Some effort, give minimal credit
				score = 30
			} else {
				// Very little or no effort
				score = 20
			}
		}
	}

	logger.Info("Calculated quiz score",
		zap.Int64("user_id", user.TelegramID),
		zap.Int("stage_id", req.StageID),
		zap.Bool("approved", approved),
		zap.Int("score", score),
		zap.Int("answers_length", len(answersStr)))

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
		newSession := user.CurrentSession + 1

		logger.Info("Attempting to update user session",
			zap.Int64("user_id", user.TelegramID),
			zap.Int("old_session", user.CurrentSession),
			zap.Int("new_session", newSession))

		// Update in database - MUST use explicit WHERE clause
		// Update both current_session and points
		updates := map[string]interface{}{
			"current_session": newSession,
			"points":          user.Points + score, // Add quiz score to total points
		}
		if err := db.Model(&User{}).Where("telegram_id = ?", user.TelegramID).Updates(updates).Error; err != nil {
			logger.Error("Failed to update user session and points after quiz",
				zap.Int64("user_id", user.TelegramID),
				zap.Int("new_session", newSession),
				zap.Int("score", score),
				zap.Error(err))
			// Even if update fails, don't set nextStageUnlocked to true
			nextStageUnlocked = false
		} else {
			// CRITICAL: Update the user object in memory too
			user.CurrentSession = newSession
			user.Points += score
			nextStageUnlocked = true

			// ⚡ PERFORMANCE: Invalidate cache to force refresh on next request
			userCache.InvalidateUser(user.TelegramID)

			// Verify the update by reading from database
			var verifyUser User
			if err := db.Where("telegram_id = ?", user.TelegramID).First(&verifyUser).Error; err != nil {
				logger.Error("Failed to verify user session update",
					zap.Int64("user_id", user.TelegramID),
					zap.Error(err))
				// If verification fails, still consider it unlocked since update succeeded
			} else {
				if verifyUser.CurrentSession == newSession {
					logger.Info("✅ User session updated successfully - next stage unlocked",
						zap.Int64("user_id", user.TelegramID),
						zap.Int("stage_id", req.StageID),
						zap.Int("old_session", user.CurrentSession-1),
						zap.Int("new_session", verifyUser.CurrentSession),
						zap.Int("next_stage_id", newSession+1),
						zap.Int("score", score),
						zap.Bool("verified", true))
				} else {
					logger.Warn("⚠️ User session update verification mismatch",
						zap.Int64("user_id", user.TelegramID),
						zap.Int("expected_session", newSession),
						zap.Int("actual_session", verifyUser.CurrentSession))
					// Still consider it unlocked since update succeeded
				}
			}
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

// metricsAllowlist returns true if clientIP is allowed to access /metrics.
// Default: 127.0.0.1, ::1 only. METRICS_ALLOWLIST adds entries (comma-separated IPs or CIDRs, e.g. 172.18.0.0/16).
func metricsAllowlist(clientIP string) bool {
	ip := net.ParseIP(clientIP)
	if ip == nil {
		return false
	}
	// Use IPv4 form for matching if IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
	if ip4 := ip.To4(); ip4 != nil {
		ip = ip4
	}

	// Default: localhost only
	allowlist := []string{"127.0.0.1/32", "::1/128"}
	if extra := os.Getenv("METRICS_ALLOWLIST"); extra != "" {
		for _, s := range strings.Split(extra, ",") {
			s = strings.TrimSpace(s)
			if s != "" {
				allowlist = append(allowlist, s)
			}
		}
	}

	for _, entry := range allowlist {
		if strings.Contains(entry, "/") {
			_, ipNet, err := net.ParseCIDR(entry)
			if err != nil {
				continue
			}
			if ipNet.Contains(ip) {
				return true
			}
		} else {
			allowedIP := net.ParseIP(entry)
			if allowedIP == nil {
				continue
			}
			if allowedIP4 := allowedIP.To4(); allowedIP4 != nil {
				allowedIP = allowedIP4
			}
			if ip.Equal(allowedIP) {
				return true
			}
		}
	}
	return false
}

// handleMetrics serves Prometheus metrics. Returns 403 JSON if client IP not in allowlist.
func handleMetrics(c *gin.Context) {
	if !metricsAllowlist(c.ClientIP()) {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   "Access denied",
		})
		return
	}
	promhttp.HandlerFor(metrics.Registry, promhttp.HandlerOpts{DisableCompression: true}).ServeHTTP(c.Writer, c.Request)
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

// ==========================================
// Ticket Handlers
// ==========================================

// handleCreateTicket creates a new support ticket
func handleCreateTicket(c *gin.Context) {
	var requestData struct {
		TelegramID int64  `json:"telegram_id" binding:"required"`
		Subject    string `json:"subject" binding:"required"`
		Priority   string `json:"priority" binding:"required"`
		Message    string `json:"message" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request data",
		})
		return
	}

	// Validate priority
	validPriorities := map[string]bool{"low": true, "normal": true, "high": true, "urgent": true}
	if !validPriorities[requestData.Priority] {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid priority. Must be: low, normal, high, or urgent",
		})
		return
	}

	// Check if user exists
	var user User
	if err := db.Where("telegram_id = ?", requestData.TelegramID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, APIResponse{
			Success: false,
			Error:   "User not found",
		})
		return
	}

	// Create ticket
	ticket := Ticket{
		TelegramID: requestData.TelegramID,
		Subject:    requestData.Subject,
		Priority:   requestData.Priority,
		Status:     "open",
	}

	if err := db.Create(&ticket).Error; err != nil {
		logger.Error("Failed to create ticket", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Failed to create ticket",
		})
		return
	}

	// Create first message
	message := TicketMessage{
		TicketID:   ticket.ID,
		SenderType: "user",
		Message:    requestData.Message,
		TelegramID: requestData.TelegramID,
	}

	if err := db.Create(&message).Error; err != nil {
		logger.Error("Failed to create ticket message", zap.Error(err))
		// Delete ticket if message creation fails
		db.Delete(&ticket)
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Failed to create ticket message",
		})
		return
	}

	// Load ticket with message
	db.Preload("Messages").First(&ticket, ticket.ID)

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    ticket,
	})
}

// handleGetUserTickets returns all tickets for a user
func handleGetUserTickets(c *gin.Context) {
	telegramIDStr := c.Param("telegram_id")
	telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid telegram_id",
		})
		return
	}

	var tickets []Ticket
	if err := db.Where("telegram_id = ?", telegramID).
		Preload("Messages").
		Order("created_at DESC").
		Find(&tickets).Error; err != nil {
		logger.Error("Failed to get user tickets", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Failed to get tickets",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    tickets,
	})
}

// handleGetTicket returns a specific ticket with all messages
func handleGetTicket(c *gin.Context) {
	ticketIDStr := c.Param("id")
	ticketID, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid ticket ID",
		})
		return
	}

	var ticket Ticket
	if err := db.Preload("Messages", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at ASC")
	}).First(&ticket, ticketID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "Ticket not found",
			})
			return
		}
		logger.Error("Failed to get ticket", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Failed to get ticket",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    ticket,
	})
}

// handleReplyTicket adds a reply to a ticket
func handleReplyTicket(c *gin.Context) {
	ticketIDStr := c.Param("id")
	ticketID, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid ticket ID",
		})
		return
	}

	var requestData struct {
		TelegramID int64  `json:"telegram_id" binding:"required"`
		Message    string `json:"message" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request data",
		})
		return
	}

	// Get ticket
	var ticket Ticket
	if err := db.First(&ticket, ticketID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "Ticket not found",
			})
			return
		}
		logger.Error("Failed to get ticket", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Failed to get ticket",
		})
		return
	}

	// Check if ticket is closed
	if ticket.Status == "closed" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Cannot reply to a closed ticket",
		})
		return
	}

	// Verify user owns this ticket
	if ticket.TelegramID != requestData.TelegramID {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   "You don't have permission to reply to this ticket",
		})
		return
	}

	// Create message
	message := TicketMessage{
		TicketID:   ticket.ID,
		SenderType: "user",
		Message:    requestData.Message,
		TelegramID: requestData.TelegramID,
	}

	if err := db.Create(&message).Error; err != nil {
		logger.Error("Failed to create ticket message", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Failed to create message",
		})
		return
	}

	// Update ticket status
	if ticket.Status == "answered" {
		ticket.Status = "open" // Reopen if it was answered
	}
	db.Save(&ticket)

	// Load ticket with messages
	db.Preload("Messages", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at ASC")
	}).First(&ticket, ticket.ID)

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    ticket,
	})
}

// handleCloseTicket closes a ticket
func handleCloseTicket(c *gin.Context) {
	ticketIDStr := c.Param("id")
	ticketID, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid ticket ID",
		})
		return
	}

	var requestData struct {
		TelegramID int64 `json:"telegram_id" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request data",
		})
		return
	}

	// Get ticket
	var ticket Ticket
	if err := db.First(&ticket, ticketID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, APIResponse{
				Success: false,
				Error:   "Ticket not found",
			})
			return
		}
		logger.Error("Failed to get ticket", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Failed to get ticket",
		})
		return
	}

	// Verify user owns this ticket
	if ticket.TelegramID != requestData.TelegramID {
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   "You don't have permission to close this ticket",
		})
		return
	}

	// Close ticket
	ticket.Status = "closed"
	if err := db.Save(&ticket).Error; err != nil {
		logger.Error("Failed to close ticket", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Failed to close ticket",
		})
		return
	}

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    ticket,
	})
}

// ==================== User Web Login Handlers ====================

// handleUserWebLogin handles user web login (not admin)
func handleUserWebLogin(c *gin.Context) {
	type LoginRequest struct {
		TelegramID int64  `json:"telegram_id" binding:"required"`
		Password   string `json:"password" binding:"required"`
	}

	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		logger.Warn("User web login failed - invalid JSON",
			zap.Error(err),
			zap.String("remote_addr", c.ClientIP()))
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid request",
		})
		return
	}

	// Validate telegram_id is positive
	if req.TelegramID <= 0 {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "Invalid telegram_id",
		})
		return
	}

	// Check if password matches telegram_id (password is the telegram_id as string)
	expectedPassword := fmt.Sprintf("%d", req.TelegramID)
	if req.Password != expectedPassword {
		logger.Warn("User web login failed - invalid password",
			zap.Int64("telegram_id", req.TelegramID),
			zap.String("remote_addr", c.ClientIP()))
		c.JSON(http.StatusUnauthorized, APIResponse{
			Success: false,
			Error:   "Invalid password",
		})
		return
	}

	// Check if user exists and is registered in bot
	var user User
	if err := db.Where("telegram_id = ?", req.TelegramID).First(&user).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			logger.Warn("User web login failed - user not registered",
				zap.Int64("telegram_id", req.TelegramID),
				zap.String("remote_addr", c.ClientIP()))
			c.JSON(http.StatusUnauthorized, APIResponse{
				Success: false,
				Error:   "User not registered in bot. Please register first in Telegram bot.",
			})
			return
		}
		logger.Error("Database error in user web login", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Database error",
		})
		return
	}

	// Check if user is active
	if !user.IsActive {
		logger.Warn("User web login failed - user is blocked",
			zap.Int64("telegram_id", req.TelegramID),
			zap.String("remote_addr", c.ClientIP()))
		c.JSON(http.StatusForbidden, APIResponse{
			Success: false,
			Error:   "User account is blocked",
		})
		return
	}

	// Generate session token
	token, err := generateUserWebSessionToken()
	if err != nil {
		logger.Error("Failed to generate user web session token", zap.Error(err))
		c.JSON(http.StatusInternalServerError, APIResponse{
			Success: false,
			Error:   "Internal server error",
		})
		return
	}

	// Create session (24 hours expiry)
	session := UserWebSession{
		TelegramID: req.TelegramID,
		ExpiresAt:  time.Now().Add(24 * time.Hour),
		CreatedAt:  time.Now(),
	}

	userWebSessionsMutex.Lock()
	userWebSessions[token] = session
	userWebSessionsMutex.Unlock()

	// Clean up expired sessions
	go cleanupExpiredUserWebSessions()

	logger.Info("User web login successful",
		zap.Int64("telegram_id", req.TelegramID),
		zap.String("remote_addr", c.ClientIP()))

	// Set cookie for HTML requests (24 hours expiry)
	// In production, use secure cookies (HTTPS only)
	// Domain is empty to allow cookie to work on all subdomains
	secure := strings.ToLower(os.Getenv("DEVELOPMENT_MODE")) != "true"
	c.SetCookie("web_session_token", token, 24*60*60, "/", "", secure, true) // HttpOnly=true, Secure in production

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data: gin.H{
			"token":       token,
			"telegram_id": req.TelegramID,
		},
	})
}

// handleVerifyUserWebSession verifies user web session.
// GET returns JSON body; HEAD returns same status code with no body (X-Request-Id set by middleware).
func handleVerifyUserWebSession(c *gin.Context) {
	headOnly := c.Request.Method == "HEAD"

	respond := func(statusCode int, body APIResponse) {
		if headOnly {
			c.AbortWithStatus(statusCode)
			return
		}
		c.JSON(statusCode, body)
	}

	token := c.GetHeader("Authorization")
	if token == "" {
		token = c.Query("token")
	}
	if token == "" {
		metrics.IncVerify("no_token")
		respond(http.StatusUnauthorized, APIResponse{Success: false, Error: "No token provided"})
		return
	}

	if strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimPrefix(token, "Bearer ")
	}

	telegramIDStr := c.Query("telegram_id")
	telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64)
	if err != nil || telegramID <= 0 {
		metrics.IncVerify("bad_request")
		respond(http.StatusBadRequest, APIResponse{Success: false, Error: "Invalid telegram_id"})
		return
	}

	userWebSessionsMutex.RLock()
	session, exists := userWebSessions[token]
	userWebSessionsMutex.RUnlock()

	if !exists {
		metrics.IncVerify("invalid_token")
		respond(http.StatusUnauthorized, APIResponse{Success: false, Error: "Invalid token"})
		return
	}

	if time.Now().After(session.ExpiresAt) {
		userWebSessionsMutex.Lock()
		delete(userWebSessions, token)
		userWebSessionsMutex.Unlock()
		metrics.IncVerify("expired")
		respond(http.StatusUnauthorized, APIResponse{Success: false, Error: "Token expired"})
		return
	}

	if session.TelegramID != telegramID {
		metrics.IncVerify("mismatch")
		respond(http.StatusUnauthorized, APIResponse{Success: false, Error: "Token does not match telegram_id"})
		return
	}

	metrics.IncVerify("ok")
	respond(http.StatusOK, APIResponse{
		Success: true,
		Data: gin.H{
			"valid":       true,
			"telegram_id": session.TelegramID,
		},
	})
}

// handleUserWebLogout handles user web logout
func handleUserWebLogout(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if token == "" {
		c.JSON(http.StatusBadRequest, APIResponse{
			Success: false,
			Error:   "No token provided",
		})
		return
	}

	// Remove "Bearer " prefix if present
	if strings.HasPrefix(token, "Bearer ") {
		token = strings.TrimPrefix(token, "Bearer ")
	}

	userWebSessionsMutex.Lock()
	delete(userWebSessions, token)
	userWebSessionsMutex.Unlock()

	c.JSON(http.StatusOK, APIResponse{
		Success: true,
		Data:    gin.H{"message": "Logged out successfully"},
	})
}

// Helper functions for user web sessions
func generateUserWebSessionToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func cleanupExpiredUserWebSessions() {
	userWebSessionsMutex.Lock()
	defer userWebSessionsMutex.Unlock()

	now := time.Now()
	for token, session := range userWebSessions {
		if now.After(session.ExpiresAt) {
			delete(userWebSessions, token)
		}
	}
}

func startUserWebSessionCleanup() {
	ticker := time.NewTicker(1 * time.Hour)
	go func() {
		for range ticker.C {
			cleanupExpiredUserWebSessions()
		}
	}()
}
