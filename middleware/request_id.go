package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	// ContextKeyRequestID is the key used to store request ID in Gin context.
	ContextKeyRequestID = "request_id"
	// HeaderXRequestID is the HTTP header for request ID (case-insensitive per HTTP spec).
	HeaderXRequestID = "X-Request-Id"
)

// RequestID returns middleware that reads or generates X-Request-Id, stores it in
// context, and sets it on every response. Must run before any route handlers.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		requestID := readRequestID(c)
		if requestID == "" {
			requestID = generateRequestID()
		}
		c.Set(ContextKeyRequestID, requestID)
		c.Header(HeaderXRequestID, requestID)
		c.Next()
	}
}

// readRequestID reads X-Request-Id from request (case-insensitive per HTTP spec). Returns empty if missing.
func readRequestID(c *gin.Context) string {
	return strings.TrimSpace(c.GetHeader(HeaderXRequestID))
}

// generateRequestID creates a secure random hex ID (32 chars).
func generateRequestID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err == nil {
		return hex.EncodeToString(b)
	}
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// GetRequestID returns the request ID from context, or empty string if not set.
func GetRequestID(c *gin.Context) string {
	if c == nil {
		return ""
	}
	v, _ := c.Get(ContextKeyRequestID)
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

// RequestIDFromContext is a convenience for use with context.Context.
// Gin's context implements context.Context; for native context, this would need
// a different approach. Here we accept *gin.Context for handler use.
func RequestIDFromContext(c *gin.Context) string {
	return GetRequestID(c)
}
