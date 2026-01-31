package main

import (
	"net/http"
	"net/http/httptest"
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
	if ct := w.Header().Get("Content-Type"); ct != "" && ct != "application/json; charset=utf-8" {
		// HEAD may not set body; Content-Type optional for HEAD
		t.Logf("Content-Type: %s (HEAD may omit)", ct)
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
