# Phase 2 Implementation Report

**Date:** January 2026  
**Goal:** Verify and harden Phase 2 implementation end-to-end with evidence.

---

## 1. Repo Audit Evidence

### 1.1 No hardcoded production API base (MiniApp)

Searched for: `sianmarketing.com/api/api/v1`, `api/api/v1`, `sianmarketing.com/api`, `http://127.0.0.1:8080`

**Result:** No occurrences of `api/api/v1` or `127.0.0.1:8080` in miniApp. The only `sianmarketing.com/api` is the **canonical** default `https://sianmarketing.com/api/v1` (documented production default), used when `VITE_API_BASE_URL` is unset.

**Evidence (grep):**
```
miniApp/src/services/api.ts     -> getConfiguredApiBaseURL() default 'https://sianmarketing.com/api/v1'
miniApp/src/services/adminApi.ts -> same via baseUrl
miniApp/src/components/TelegramWebAppGuard.tsx -> same via baseUrl
miniApp/env.example             -> comment only (production URL in comment)
```

All API clients use `import.meta.env.VITE_API_BASE_URL` with a safe default (production URL without double `api`).

### 1.2 `.env.sample` placeholders only

**Evidence:** `.env.sample` contains only placeholder values:
- `TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here`
- `GROQ_API_KEY=your_groq_api_key_here`
- `ZARINPAL_MERCHANT_ID=your_zarinpal_merchant_id_here`
- `IPPANEL_API_KEY=your_ippanel_api_key_here`
- No real-looking keys or tokens.

### 1.3 Backend fail-fast for secrets

**Evidence:**
- `sms_config.go`: `getRequiredEnv("IPPANEL_API_KEY", "DEMO_SMS_KEY")` — in production (when `DEVELOPMENT_MODE` is not `true`), missing env causes `log.Fatalf("❌ FATAL: Required environment variable IPPANEL_API_KEY is not set...")`.
- `payment_service.go`: `getRequiredEnv("ZARINPAL_MERCHANT_ID", "DEMO_MERCHANT_ID")` — same behavior for Zarinpal.
- No hardcoded real merchant IDs or API keys in code.

---

## 2. Frontend: Standardized API Base

### 2.1 Single helper: `miniApp/src/services/baseUrl.ts`

- **`normalizeBaseURL(raw)`**: trims and removes trailing slashes; result has **no** trailing slash.
- **`getConfiguredApiBaseURL()`**: reads `VITE_API_BASE_URL`, falls back to `https://sianmarketing.com/api/v1` (production build default). Dev uses env only (e.g. in `env.example`: `http://localhost:8080/api/v1`), not hardcoded in source.
- **`getOriginFromApiBaseURL(apiBase)`**: returns origin for health checks.

### 2.2 Consumers

| File | Change |
|------|--------|
| `miniApp/src/services/api.ts` | Imports `getConfiguredApiBaseURL`, `getOriginFromApiBaseURL` from `./baseUrl`; removed local duplicate helpers. |
| `miniApp/src/services/adminApi.ts` | Imports `getConfiguredApiBaseURL` from `./baseUrl`; admin base = `getConfiguredApiBaseURL() + '/admin'`. |
| `miniApp/src/components/TelegramWebAppGuard.tsx` | Imports `getConfiguredApiBaseURL` from `../services/baseUrl`; uses it for `/web/verify` fetch. |

All requests target canonical `/api/v1/...` (no `/api/api/v1/...`).

---

## 3. Backend: Request-ID Middleware

**Location:** `web_api.go` (after CORS, before logger).

**Behavior:**
1. Reads `X-Request-Id` header; if empty, generates ID (16 bytes hex or UnixNano).
2. `c.Set("request_id", requestID)` and `c.Header("X-Request-Id", requestID)`.
3. Gin logger formatter includes `[rid=%s]` from `param.Keys["request_id"]`.
4. Debug middleware for `/api/` and `/health` logs `request_id` in structured logs (zap).
5. `/health` JSON response includes `"request_id": "<value>"`.

**Middleware order:** Request-ID → Logger → Recovery → Gzip → Path norm → API log → routes. Auth is applied on route groups, not globally, so order is correct.

---

## 4. Docs: Nginx Request-ID and Path Contract

### 4.1 Nginx map snippet fix

**Issue:** Using map output variable `$request_id` overwrites Nginx’s built-in `$request_id`.

**Fix in `docs/PHASE2_PLAN.md`:**
- Map output variable set to **`$req_id`**:
  ```nginx
  map $http_x_request_id $req_id {
      default   $http_x_request_id;
      ""        $request_id;
  }
  ```
- All examples use `proxy_set_header X-Request-Id $req_id;`.

### 4.2 Nginx path contract (new Section 0)

- **Canonical:** `/health` → backend `/health`; `/api/v1/*` → backend `/api/v1/*`.
- **Optional backward compat (7 days):** `/api/health` → `/health`; `/api/api/v1/*` → `/api/v1/*`.
- **Warning:** A generic `location /api/ { proxy_pass http://backend/; }` strips `/api` and would send `/api/v1/user` to backend as `/v1/user`, breaking the API. Explicit `location /api/v1/` with full path proxy is required.

---

## 5. Scripts: `scripts/phase2-smoke.sh`

- **Exists and executable:** Yes.
- **Checks:**
  - `/` → 302 redirect to `/miniapp/`.
  - `/miniapp/` → 200 and HTML (`<!DOCTYPE`).
  - `/health` → 200 and JSON with `healthy`.
  - `/api/v1/web/verify` without token → 401 (expected).
  - X-Request-Id header on `/health`.
  - X-Request-Id header on `/api/v1/web/verify` (observability).
  - X-Served-By on `/miniapp/` (optional).
- **Backward compat:** `/api/health` and `/api/api/v1/...` are **optional**; script only echoes their status and does not fail on 404.
- **Output:** Human-readable (PASS/FAIL per test). Exit non-zero on any required test failure.

---

## 6. Smoke Script Output Format (Example)

```
==========================================
Phase 2 Smoke Tests
Base URL: https://sianmarketing.com
==========================================

--- Redirect Tests ---
Testing: Root -> /miniapp/ ... PASS (HTTP 302 -> /miniapp/)

--- SPA Tests ---
Testing: MiniApp index ... PASS (HTTP 200, content OK)
Testing: MiniApp SPA route (deep) ... PASS (HTTP 200, content OK)

--- Health Check Tests ---
Testing: Health (canonical) ... PASS (HTTP 200, content OK)

--- API Tests ---
Testing: API verify (no token) ... PASS (HTTP 401)
Testing: X-Request-Id on API verify ... PASS (X-Request-Id: ...)

--- Backward compat (optional; may 404 if Nginx rewrites not enabled) ---
  /api/health -> 200 OK (backward compat enabled)
  /api/api/v1/... -> 401 (backward compat OK)

--- Header Tests ---
Testing: X-Request-Id on /health ... PASS (X-Request-Id: ...)
Testing: X-Served-By header ... PASS (X-Served-By: ...)

==========================================
Results: N passed, 0 failed
==========================================
All tests passed!
```

---

## 7. Files Changed (This Verification Pass)

| File | Change |
|------|--------|
| `miniApp/src/services/baseUrl.ts` | **New.** Single helper: `normalizeBaseURL`, `getConfiguredApiBaseURL`, `getOriginFromApiBaseURL`. |
| `miniApp/src/services/api.ts` | Use `baseUrl`; removed duplicate helpers. |
| `miniApp/src/services/adminApi.ts` | Use `baseUrl`; removed duplicate helpers. |
| `miniApp/src/components/TelegramWebAppGuard.tsx` | Use `baseUrl`; removed duplicate helpers. |
| `docs/PHASE2_PLAN.md` | Section 0: Nginx path contract + warning; Nginx map fixed to `$req_id`; all examples use `$req_id`. |
| `scripts/phase2-smoke.sh` | X-Request-Id check on `/api/v1/web/verify`; backward-compat tests optional (echo only); removed mandatory `/api/health` and old path tests. |
| `docs/PHASE2_IMPLEMENTATION_REPORT.md` | **New.** This report. |

**No changes:** Backend request-id middleware and fail-fast secrets were already correct; `.env.sample` already placeholder-only.

---

## 8. Verification

- **Backend:** `./scripts/verify-backend.sh` — go fmt, go test ./..., go build.
- **Frontend:** `npm run verify` in miniApp (type-check, lint, build).
- **Full:** `./scripts/verify-all.sh` runs both and exits 0 on success.

Run after changes:
```bash
./scripts/verify-all.sh
```

---

**End of report.**
