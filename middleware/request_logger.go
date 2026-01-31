package middleware

import (
	"time"

	"MonetizeeAI_bot/logger"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

const (
	// maxUserAgentLen truncates user_agent to avoid log spam.
	maxUserAgentLen = 200
)

// RequestLogger returns middleware that logs one structured line per request after completion.
// Requires RequestID middleware to run first. Uses the project's zap logger.
func RequestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		raw := c.Request.URL.RawQuery
		clientIP := c.ClientIP()
		method := c.Request.Method
		userAgent := trimString(c.Request.UserAgent(), maxUserAgentLen)
		referer := c.GetHeader("Referer")

		c.Next()

		latency := time.Since(start)
		status := c.Writer.Status()
		errMsg := c.Errors.ByType(gin.ErrorTypePrivate).String()
		requestID := GetRequestID(c)

		fields := []zap.Field{
			zap.String("request_id", requestID),
			zap.String("method", method),
			zap.String("path", path),
			zap.Int("status", status),
			zap.Int64("latency_ms", latency.Milliseconds()),
			zap.String("client_ip", clientIP),
			zap.String("user_agent", userAgent),
		}
		if referer != "" {
			fields = append(fields, zap.String("referer", referer))
		}
		if raw != "" {
			fields = append(fields, zap.String("query", raw))
		}
		if errMsg != "" {
			fields = append(fields, zap.String("error", errMsg))
		}

		logger.Log.Info("request", fields...)
	}
}

func trimString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen] + "..."
}
