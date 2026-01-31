package middleware

import (
	"net/http"
	"time"

	"MonetizeeAI_bot/metrics"

	"github.com/gin-gonic/gin"
)

const noroutePath = "__noroute__"

// responseWriter wraps gin.ResponseWriter to capture status code.
type responseWriter struct {
	gin.ResponseWriter
	status int
}

func (w *responseWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *responseWriter) Status() int {
	if w.status == 0 {
		return http.StatusOK
	}
	return w.status
}

// PromMetrics returns middleware that records HTTP metrics (inflight, duration, requests total).
// Use stable path label: FullPath when matched, __noroute__ when not.
func PromMetrics() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		method := c.Request.Method

		metrics.IncInflight()
		defer metrics.DecInflight()

		// Wrap writer to capture status
		blw := &responseWriter{ResponseWriter: c.Writer, status: 0}
		c.Writer = blw

		c.Next()

		status := blw.Status()
		path := c.FullPath()
		if path == "" {
			path = noroutePath
		}
		duration := time.Since(start)
		metrics.ObserveHTTPRequest(method, path, status, duration)
	}
}
