# Phase 3 Implementation Report - Request ID + Logging + Propagation

**Date:** January 2026  
**Goal:** Request ID middleware, standard request logger, and propagation across all responses.

---

## 1. Summary of Changes

### 1.1 New Files

| File | Description |
|------|-------------|
| `middleware/request_id.go` | Request ID middleware + `GetRequestID(c)` / `RequestIDFromContext(c)` helpers |
| `middleware/request_logger.go` | Standard structured request logger (one line per request, Zap fields) |

### 1.2 Modified Files

| File | Change |
|------|--------|
| `web_api.go` | Uses `middleware.RequestID()` and `middleware.RequestLogger()`; global `noRouteHandler` for API 404 JSON; removed inline request-id, `gin.LoggerWithFormatter`, and debug middleware |
| `web_api_test.go` | Uses `middleware.RequestID()` in tests; added `TestAPINoRouteReturns404JSONWithRequestID` and `TestNonAPINoRouteRedirectsWithoutSession` |

---

## 2. How It Works

### 2.1 Request ID Middleware (`middleware.RequestID()`)

- **Order:** Runs first (after CORS), before any route handlers.
- **Behavior:**
  1. Reads `X-Request-Id` header (case-insensitive via HTTP spec).
  2. If missing or empty: generates secure 32-char hex ID via `crypto/rand`.
  3. Stores in context: `c.Set("request_id", id)`.
  4. Sets response header: `X-Request-Id: <id>` on every response.
- **Works for:** GET, HEAD, POST, errors, 404, redirects (e.g. NoRoute → /web-login).

### 2.2 Request Logger Middleware (`middleware.RequestLogger()`)

- **Order:** Immediately after Request ID.
- **Behavior:** Logs one structured line per request **after** completion (post-`c.Next()`).
- **Fields:** `request_id`, `method`, `path`, `status`, `latency_ms`, `client_ip`, `user_agent` (trimmed to 200 chars), optional `referer`, optional `query`, optional `error` (Gin errors).
- **Logger:** Uses `logger.Log` (Zap) for structured JSON/console output.

### 2.3 Handler Helper

```go
rid := middleware.GetRequestID(c)
// or
rid := middleware.RequestIDFromContext(c)
```

Use in handlers when adding request-level log fields.

### 2.4 NoRoute / 404

- **Global NoRoute** registered for all unmatched routes. Request ID middleware runs before it, so `X-Request-Id` is on every response.
- **API paths** (`/api/` or `/api/v1/`): 404 JSON `{"success":false,"error":"Not found"}`, `Content-Type: application/json; charset=utf-8`, no redirect.
- **Non-API paths**: Preserved behavior — no session → redirect to `/web-login`; with session → serve SPA `index.html` or "Frontend not found" 404.


---

## 3. Middleware Order

```
CORS → RequestID → RequestLogger → Recovery → Gzip → PathNorm → (routes)
```

---

## 4. Sample Log Line (Example)

```
{"level":"INFO","timestamp":"2026-01-31T04:10:00.000Z","msg":"request","request_id":"a1b2c3d4e5f6789012345678901234ab","method":"GET","path":"/health","status":200,"latency_ms":2,"client_ip":"127.0.0.1","user_agent":"curl/7.88.1"}
```

---

## 5. Commands to Run Locally

```bash
./scripts/verify-backend.sh
./scripts/verify-all.sh
```

### Acceptance Tests (manual, server must be running)

With backend running on `http://127.0.0.1:8080`:

```bash
# A1: Health returns 200 and X-Request-Id
curl -sS -I http://127.0.0.1:8080/health | egrep -i 'http/|x-request-id'

# A2: Custom ID propagated
curl -sS -I -H 'X-Request-Id: test-123' http://127.0.0.1:8080/health | egrep -i 'x-request-id'

# A3: 404 includes X-Request-Id
curl -sS -I http://127.0.0.1:8080/does-not-exist | egrep -i 'http/|x-request-id'

# A4: Verify route returns 401 with X-Request-Id
curl -sS -I "http://127.0.0.1:8080/api/v1/web/verify?telegram_id=123" | egrep -i 'http/|x-request-id'
```

---

## 6. Verification

- ✅ `./scripts/verify-backend.sh` — passes (fmt, test, build)
- ✅ `./scripts/verify-all.sh` — passes (backend + frontend)
- ✅ No new lint/test failures
- ✅ CI/test mode `.env` optional behavior preserved

---

**End of report.**
