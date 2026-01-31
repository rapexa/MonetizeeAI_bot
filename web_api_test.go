package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"MonetizeeAI_bot/middleware"

	"github.com/gin-gonic/gin"
)

// TestHEADHealthReturns200 asserts HEAD /health returns 200 with no redirect.
func TestHEADHealthReturns200(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RequestID())
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "healthy"})
	})
	r.HEAD("/health", func(c *gin.Context) {
		c.Header("Content-Type", "application/json")
		c.Status(http.StatusOK)
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodHead, "/health", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("HEAD /health: expected 200, got %d", w.Code)
	}
	if loc := w.Header().Get("Location"); loc != "" {
		t.Errorf("HEAD /health: unexpected Location %q", loc)
	}
}

// TestHEADWebVerifyReturns401 asserts HEAD /api/v1/web/verify (no token) returns 401 and X-Request-Id.
func TestHEADWebVerifyReturns401(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RequestID())
	r.GET("/api/v1/web/verify", handleVerifyUserWebSession)
	r.HEAD("/api/v1/web/verify", handleVerifyUserWebSession)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodHead, "/api/v1/web/verify?telegram_id=123", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("HEAD /api/v1/web/verify: expected 401, got %d", w.Code)
	}
	if w.Header().Get("X-Request-Id") == "" {
		t.Error("HEAD /api/v1/web/verify: expected X-Request-Id header")
	}
}

// TestAPINoRouteReturns404JSONWithRequestID asserts NoRoute for API paths returns 404 JSON, X-Request-Id, no redirect.
func TestAPINoRouteReturns404JSONWithRequestID(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RequestID())
	r.NoRoute(noRouteHandler("./test-frontend"))

	// HEAD request
	t.Run("HEAD", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodHead, "/api/v1/does-not-exist", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("HEAD /api/v1/does-not-exist: expected 404, got %d", w.Code)
		}
		if w.Header().Get("X-Request-Id") == "" {
			t.Error("expected X-Request-Id header on API 404 response")
		}
		if loc := w.Header().Get("Location"); loc != "" {
			t.Errorf("expected no redirect; got Location %q", loc)
		}
	})

	// GET request - verify JSON body
	t.Run("GET", func(t *testing.T) {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/api/v1/does-not-exist", nil)
		r.ServeHTTP(w, req)

		if w.Code != http.StatusNotFound {
			t.Errorf("GET /api/v1/does-not-exist: expected 404, got %d", w.Code)
		}
		if w.Header().Get("X-Request-Id") == "" {
			t.Error("expected X-Request-Id header on API 404 response")
		}
		body := strings.TrimSpace(w.Body.String())
		var resp APIResponse
		if err := json.Unmarshal([]byte(body), &resp); err != nil {
			t.Errorf("expected JSON body; got %q: %v", body, err)
			return
		}
		if resp.Success || resp.Error != "Not found" {
			t.Errorf("expected {\"success\":false,\"error\":\"Not found\"}; got %+v", resp)
		}
	})
}

// TestAPINoRouteWithAuthMiddlewareReturns404 asserts that with auth middleware, unmatched API paths
// still return 404 (not 403) because FullPath=="" lets the request pass through to NoRoute.
func TestAPINoRouteWithAuthMiddlewareReturns404(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RequestID())
	r.Use(telegramWebAppAuthMiddleware())
	r.NoRoute(noRouteHandler("./test-frontend"))

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/does-not-exist", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("GET /api/v1/does-not-exist (with auth): expected 404, got %d", w.Code)
	}
	if w.Header().Get("X-Request-Id") == "" {
		t.Error("expected X-Request-Id header")
	}
	body := strings.TrimSpace(w.Body.String())
	var resp APIResponse
	if err := json.Unmarshal([]byte(body), &resp); err != nil {
		t.Errorf("expected JSON body; got %q: %v", body, err)
		return
	}
	if resp.Success || resp.Error != "Not found" {
		t.Errorf("expected {\"success\":false,\"error\":\"Not found\"}; got %+v", resp)
	}
}

// TestRealAPIRouteWithoutAuthReturns403 asserts that real API routes still get 403 when unauthenticated.
func TestRealAPIRouteWithoutAuthReturns403(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RequestID())
	r.Use(telegramWebAppAuthMiddleware())
	r.GET("/api/v1/requires-auth", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/requires-auth", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("GET /api/v1/requires-auth (no auth): expected 403, got %d", w.Code)
	}
}

// TestMetricsReturns403FromNonLocal asserts /metrics returns 403 when client IP is not in allowlist.
func TestMetricsReturns403FromNonLocal(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RequestID())
	r.GET("/metrics", handleMetrics)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	req.RemoteAddr = "192.0.2.1:12345" // non-local IP
	r.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Errorf("GET /metrics (non-local): expected 403, got %d", w.Code)
	}
	body := strings.TrimSpace(w.Body.String())
	var resp APIResponse
	if err := json.Unmarshal([]byte(body), &resp); err != nil {
		t.Errorf("expected JSON body; got %q: %v", body, err)
		return
	}
	if resp.Success || resp.Error != "Access denied" {
		t.Errorf("expected Access denied; got %+v", resp)
	}
}

// TestMetricsReturns200FromLocal asserts /metrics returns 200 when request is from localhost.
func TestMetricsReturns200FromLocal(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RequestID())
	r.GET("/metrics", handleMetrics)

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	req.RemoteAddr = "127.0.0.1:45678" // localhost
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GET /metrics (local): expected 200, got %d", w.Code)
	}
	body := w.Body.String()
	if !strings.Contains(body, "http_requests_total") && !strings.Contains(body, "go_") {
		t.Error("expected Prometheus metrics in response")
	}
}

// TestNonAPINoRouteRedirectsWithoutSession asserts non-API NoRoute redirects to /web-login when no session.
func TestNonAPINoRouteRedirectsWithoutSession(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RequestID())
	r.NoRoute(noRouteHandler("./test-frontend"))

	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/some-spa-route", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusFound {
		t.Errorf("GET /some-spa-route (no session): expected 302 redirect, got %d", w.Code)
	}
	if loc := w.Header().Get("Location"); loc != "/web-login" {
		t.Errorf("expected Location /web-login; got %q", loc)
	}
	if w.Header().Get("X-Request-Id") == "" {
		t.Error("expected X-Request-Id header on redirect response")
	}
}
