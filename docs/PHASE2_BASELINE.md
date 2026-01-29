# Phase 2 Baseline Docs Pack (Infrastructure Baseline)

**Generated from evidence only**:
- **Repository files** in this workspace (`/Users/hoseinabsian/Desktop/MonetizeeAI_bot`)
- **Server evidence commands** provided in the request (executed from this environment; failures and their outputs are included verbatim)

**No assumptions / no invented values.** Unknowns are explicitly marked as **UNKNOWN (not evidenced)**.

---

## 0. Current State Summary

### What is running (evidence-based)
- **Backend**: Go application using **Gin** (`web_api.go` uses `gin.New()`, route groups under `/api/v1`, and a `/health` endpoint). Web API starts only when `WEB_API_ENABLED=true`. See `web_api.go` excerpts in §5.
- **Frontend MiniApp**: React + TypeScript SPA built with **Vite** (`miniApp/package.json`, `miniApp/vite.config.ts`). Routes are handled client-side via `react-router-dom` `BrowserRouter` (no `basename` configured). See §4.
- **Public domain evidence** (via `curl`):
  - `https://sianmarketing.com/` responds **302** redirecting to `/miniapp/` and reports `server: nginx/1.20.1` and `x-served-by: sianmarketing.com.conf`.
  - `https://sianmarketing.com/miniapp/` responds **200** with `content-type: text/html` and `x-served-by: sianmarketing.com.conf`.
  - `https://sianmarketing.com/api/health` responds **200**.
  - `https://sianmarketing.com/api/api/v1/web/verify?telegram_id=155252981` responds **401** (expected if missing/invalid token; see §5.3).

### Key architectural implication (from evidence)
The public API base used by the frontend is **`https://sianmarketing.com/api/api/v1`** (hardcoded in `miniApp/src/services/api.ts`). The backend routes are registered at **`/api/v1/...`** (see §5.2), and backend health is **`/health`** (see §5.2).

Because external evidence shows **`/api/health` → 200**, the Nginx layer in production likely performs **path prefix mapping** for `/api/...` to backend paths (e.g., `/api/health` -> `/health`, and `/api/api/v1/...` -> `/api/v1/...`). The exact mapping **cannot be confirmed** without access to active Nginx config (`nginx -T` was not available in this environment). This is tracked as a Phase 2 risk in §9.

---

## 1. System Overview (diagram-like)

```
Internet
  |
  |  HTTPS :443  (Evidence: server header "nginx/1.20.1")
  v
Nginx (active vhost appears to be: "sianmarketing.com.conf" via x-served-by header)
  |\
  | \__ /miniapp/  -> serves SPA HTML (Evidence: GET headers show text/html)
  |
  \____ /api/*     -> reverse proxy to backend (Evidence: /api/health=200, /api/api/v1/... used by frontend)
             |
             v
        Go (Gin) API server (port **UNKNOWN** from server evidence; repo defaults to 8080)
             |
             v
           MySQL (dsn env: MYSQL_DSN)
```

---

## 2. Domains and DNS assumptions (only what we know)

### Observed domains in code + evidence
- **`sianmarketing.com`**:
  - Hardcoded frontend API base URL: `https://sianmarketing.com/api/api/v1` (`miniApp/src/services/api.ts`).
  - Backend CORS allow-list includes `https://sianmarketing.com` and `https://www.sianmarketing.com` (`web_api.go`).
  - `curl` evidence shows Nginx responding for `https://sianmarketing.com/`.
- **`sianacademy.com`**:
  - Referenced in repo Nginx examples (`nginx_config_example.conf`, `nginx_config_fixed.conf`).
  - Backend CORS allow-list includes `https://sianacademy.com` and `https://www.sianacademy.com` (`web_api.go`).
  - Payment callback default includes `https://web.sianacademy.com/payment-result.html` (`payment_service.go`).

### DNS
**UNKNOWN (not evidenced)**: No DNS records, A/AAAA, CDN, or TLS termination architecture can be confirmed from repo + provided command outputs.

---

## 3. Directory Structure and Key Paths (repo evidence)

### 3.1 Repository root overview (limited depth)

Evidence source: repository listing at `/Users/hoseinabsian/Desktop/MonetizeeAI_bot`.

```
MonetizeeAI_bot/
├── main.go                       # Go entrypoint (loads .env, starts bot, starts Web API conditionally)
├── web_api.go                    # Gin API server, routes, auth middleware, CORS, gzip, /health
├── handlers.go                   # Telegram bot handlers; mini app deep link generation
├── payment_service.go            # Zarinpal config/env and payment logic
├── sms_config.go                 # IPPanel config/env defaults
├── telegram_auth.go              # Telegram WebApp auth helpers
├── logger/logger.go              # zap logger -> logs/bot.log (JSON) + stdout
├── miniApp/                      # React/Vite SPA
├── scripts/                      # deploy + verify scripts
├── docs/                         # documentation
├── nginx_config_example.conf     # repo-provided nginx example
├── nginx_config_fixed.conf       # repo-provided nginx fixed example
├── nginx_quick_fix.conf          # repo-provided nginx snippet for payment callback ordering
├── .env.sample                   # env template (contains secrets-like values; see §5.1)
└── env_example.txt               # env template
```

### 3.2 MiniApp structure (limited depth)

Evidence source: `miniApp/` listing.

```
miniApp/
├── package.json
├── vite.config.ts
├── index.html
├── env.example
└── src/
    ├── App.tsx                   # React Router routes list
    ├── main.tsx
    ├── pages/                    # SPA route components
    ├── components/
    └── services/
        ├── api.ts                # hardcoded base URL -> https://sianmarketing.com/api/api/v1
        └── adminApi.ts
```

### 3.3 Scripts / deployment

```
scripts/
├── deploy.sh                     # builds backend + frontend; restart is manual placeholder
├── verify-all.sh
├── verify-backend.sh
└── verify.sh
```

### 3.4 Docs folder (limited depth)

```
docs/
├── ARCHITECTURE_AUDIT.md         # has a runtime diagram + references nginx/supervisor as "assumed"
├── PHASE0_REPORT.md
├── PHASE1_IMPLEMENTATION_REPORT.md
└── FRONTEND_STRUCTURE_REPORT.md
```

---

## 4. MiniApp SPA Setup

### 4.1 Build system and output

**Build tool:** Vite (`miniApp/package.json`, `miniApp/vite.config.ts`)

**Key scripts** (`miniApp/package.json`):
- `npm run dev` -> `vite` (dev server, usually `:5173` per `DEPLOY.md`)
- `npm run build` -> `vite build` (production build output: **`miniApp/dist/`** per `DEPLOY.md` and `scripts/deploy.sh`)
- `npm run preview` -> `vite preview`

**Output directory:** `miniApp/dist/` (evidenced in `DEPLOY.md` and `scripts/deploy.sh`)

### 4.2 SPA routing and routes list

Routing uses `BrowserRouter` (no `basename`), in `miniApp/src/App.tsx`.

**Routes (from `miniApp/src/App.tsx`):**
- **Full page (no Layout)**:
  - `/admin-login`
  - `/web-login`
  - `/admin-panel`
  - `/subscription-management`
  - `/guide-tutorial`
- **With Layout**:
  - `/` (Dashboard)
  - `/levels`
  - `/profile`
  - `/ai-coach`
  - `/tools`
  - `/settings`
  - `/chatbot`
  - `/growth-club`
  - `/messages`
  - `/chat/:userId`
  - `/energy-boost`
  - `/business-builder-ai`
  - `/sell-kit-ai`
  - `/client-finder-ai`
  - `/sales-path-ai`
  - `/crm`
  - `/lead-profile`
  - `/ready-prompts`
  - `/courses/:courseId`
  - `/test`

### 4.3 Base path / SPA hosting under `/miniapp/`

**Evidence:**
- Production headers show `/` redirects to `/miniapp/` and `/miniapp/` returns HTML.
- MiniApp `index.html` references assets with absolute paths like `/vite.svg`, `/fonts/...`, and entry script `/src/main.tsx` (dev-time path).
- Vite config has **no `base`** property set (`miniApp/vite.config.ts`), and router uses **no `basename`**.

**Implication:** Serving the SPA at `/miniapp/` requires correct Nginx static path + `try_files` fallback to the SPA `index.html` for all client routes under that prefix. The exact production config is **UNKNOWN** without `/etc/nginx/...` access (see §6 and §10).

---

## 5. Backend / API Setup

### 5.1 Language, framework, entrypoints, build/run

- **Language**: Go (see `go.mod`, `main.go`)
- **HTTP framework**: Gin (`web_api.go`)
- **Entrypoint**: `main.go`
  - Loads `.env` using `godotenv.Load()` and **fatals** if `.env` is missing.
  - Creates `logs/` directory and initializes zap logger writing to `logs/bot.log`.
  - Starts the Web API server via `StartWebAPI()` (but only if `WEB_API_ENABLED=true`).

**Build commands (repo evidence):**
- `./build.sh` -> `go build -o bot .`
- `scripts/deploy.sh` -> `go build -o bot .` (and makes it executable)
- `DEPLOY.md` -> suggests `go run .` for dev and `go build -o bot .` for server

### 5.2 Route prefixes and health

**Backend registers:**
- `/health` (no `/api` prefix) as JSON health check.
- `/api/v1/...` API routes under `v1 := r.Group("/api/v1")`
- `/api/v1/web/login`, `/api/v1/web/verify`, `/api/v1/web/logout` (web session endpoints)
- `/api/v1/admin/...` (admin API)
- `/admin-login` and `/web-login` which serve the frontend `index.html` from `FRONTEND_PATH` (default `./miniApp/dist`)

**Key evidence excerpts** (from `web_api.go`):

```445:676:/Users/hoseinabsian/Desktop/MonetizeeAI_bot/web_api.go
func StartWebAPI() {
  // Only start if WEB_API_ENABLED is set to true
  if strings.ToLower(os.Getenv("WEB_API_ENABLED")) != "true" {
    logger.Info("Web API is disabled")
    webAPIStarted = true
    return
  }
  // ...
  r.POST("/api/v1/admin/auth/login", handleWebLogin)
  // ...
  r.POST("/api/v1/web/login", handleUserWebLogin)
  r.GET("/api/v1/web/verify", handleVerifyUserWebSession)
  r.POST("/api/v1/web/logout", handleUserWebLogout)
  // ...
  r.GET("/health", func(c *gin.Context) {
    c.JSON(http.StatusOK, APIResponse{
      Success: true,
      Data:    map[string]string{"status": "healthy", "service": "MonetizeeAI API"},
    })
  })
  // ...
  v1 := r.Group("/api/v1")
  {
    v1.GET("/user/:telegram_id", getUserInfo)
    // ...
  }
}
```

### 5.3 Auth middleware behavior for `/api/v1/web/verify` and `/health`

**Auth bypass allow-list** includes `/health` and `/api/v1/web/verify` (and admin prefixes) inside `telegramWebAppAuthMiddleware()`.

```115:266:/Users/hoseinabsian/Desktop/MonetizeeAI_bot/web_api.go
func telegramWebAppAuthMiddleware() gin.HandlerFunc {
  return func(c *gin.Context) {
    path := c.Request.URL.Path
    // ...
    if path == "/health" ||
      strings.HasPrefix(path, "/static/") ||
      strings.HasPrefix(path, "/assets/") ||
      strings.HasPrefix(path, "/api/v1/admin/") ||
      strings.HasPrefix(path, "/v1/admin/") ||
      strings.HasPrefix(path, "/api/v1/web/login") ||
      strings.HasPrefix(path, "/api/v1/web/verify") ||
      strings.HasPrefix(path, "/api/v1/web/logout") ||
      path == "/admin-login" || strings.HasPrefix(path, "/admin-login/") ||
      path == "/admin-panel" || strings.HasPrefix(path, "/admin-panel/") ||
      path == "/web-login" || strings.HasPrefix(path, "/web-login/") {
      c.Next()
      return
    }
    // If startapp query param exists -> treat as Telegram Mini App request
    startappParam := c.Query("startapp")
    if startappParam != "" { c.Next(); return }
    // Otherwise attempt web_session_token via cookie / Authorization / query
    // ...
  }
}
```

**Web session verification endpoint behavior** (`/api/v1/web/verify`):

```3437:3563:/Users/hoseinabsian/Desktop/MonetizeeAI_bot/web_api.go
func handleVerifyUserWebSession(c *gin.Context) {
  token := c.GetHeader("Authorization")
  if token == "" { token = c.Query("token") }
  if token == "" {
    c.JSON(http.StatusUnauthorized, APIResponse{ Success: false, Error: "No token provided" })
    return
  }
  if strings.HasPrefix(token, "Bearer ") { token = strings.TrimPrefix(token, "Bearer ") }
  telegramIDStr := c.Query("telegram_id")
  telegramID, err := strconv.ParseInt(telegramIDStr, 10, 64)
  if err != nil || telegramID <= 0 {
    c.JSON(http.StatusBadRequest, APIResponse{ Success: false, Error: "Invalid telegram_id" })
    return
  }
  // session lookup and expiry handling...
  if !exists { c.JSON(http.StatusUnauthorized, APIResponse{ Success: false, Error: "Invalid token" }); return }
  if time.Now().After(session.ExpiresAt) { c.JSON(http.StatusUnauthorized, APIResponse{ Success: false, Error: "Token expired" }); return }
  if session.TelegramID != telegramID { c.JSON(http.StatusUnauthorized, APIResponse{ Success: false, Error: "Token does not match telegram_id" }); return }
  c.JSON(http.StatusOK, APIResponse{ Success: true, Data: gin.H{"valid": true, "telegram_id": session.TelegramID} })
}
```

### 5.4 CORS behavior

Backend config in `StartWebAPI()`:
- If `DEVELOPMENT_MODE=true` -> `AllowOrigins=["*"]`
- Else -> allow-list:
  - `https://web.telegram.org`, `https://k.web.telegram.org`, `https://z.web.telegram.org`, `https://a.web.telegram.org`
  - `https://sianmarketing.com`, `https://www.sianmarketing.com`
  - `https://sianacademy.com`, `https://www.sianacademy.com`

Also:
- `AllowHeaders` includes `Authorization`, `X-Telegram-Init-Data`, `X-Telegram-WebApp`, `X-Telegram-Start-Param`.

---

## 6. Nginx Setup (active + repo configs)

### 6.1 Active Nginx evidence (from provided commands)

**Root domain headers:**

Command:
```bash
curl -sS -I https://sianmarketing.com/ | egrep -i 'http/|location|x-served-by|server|content-type'
```

Output:
```text
HTTP/2 302 
server: nginx/1.20.1
content-type: text/html
location: https://sianmarketing.com/miniapp/
x-served-by: sianmarketing.com.conf
```

**MiniApp path headers:**

Command:
```bash
curl -sS -I https://sianmarketing.com/miniapp/ | egrep -i 'http/|content-type|x-served-by'
```

Output:
```text
HTTP/2 200 
content-type: text/html
x-served-by: sianmarketing.com.conf
```

### 6.2 Attempted Nginx config dump (required by baseline) — NOT AVAILABLE HERE

The following commands were executed exactly as requested, but failed in this environment (tooling/paths missing). Outputs are included verbatim:

Command:
```bash
ls -la /etc/nginx/ /etc/nginx/conf.d/
```

Output:
```text
ls: /etc/nginx/: No such file or directory
ls: /etc/nginx/conf.d/: No such file or directory
```

Command:
```bash
nginx -T | sed -n '1,220p'
```

Output:
```text
(eval):1: command not found: nginx
```

Command:
```bash
nginx -T | nl -ba | sed -n '180,340p'
```

Output:
```text
(eval):1: command not found: nginx
```

**Interpretation (no guessing):**
- We cannot include `/etc/nginx/nginx.conf`, `/etc/nginx/conf.d/sianmarketing.com.conf`, or list other enabled vhosts from this environment.
- We **do** have strong evidence that production Nginx uses a vhost named `sianmarketing.com.conf` (via `x-served-by` header), but not its contents.

### 6.3 Repo-provided Nginx configs (FULL content)

These files exist in the repository and are included here as-is (they may or may not match production).

#### `nginx_config_example.conf`
```text
# Nginx Configuration Example for MonetizeeAI Bot
# Place this in /etc/nginx/sites-available/monetizeeai or your nginx config

server {
    listen 80;
    server_name www.sianacademy.com sianacademy.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.sianacademy.com sianacademy.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/sianacademy.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sianacademy.com/privkey.pem;
    
    # SSL Settings
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logging
    access_log /var/log/nginx/sianacademy_access.log;
    error_log /var/log/nginx/sianacademy_error.log;

    # Payment callback routes (must be before /api proxy)
    # These routes are outside /api/v1 and must be accessible for ZarinPal callbacks
    location /payment/ {
        proxy_pass http://127.0.0.1:8080;  # Change port if your Go app runs on different port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Important: Don't add trailing slash for /payment/
        proxy_redirect off;
    }

    # API routes (v1 and other API endpoints)
    location /api/ {
        proxy_pass http://127.0.0.1:8080;  # Change port if your Go app runs on different port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Mini App static files (if serving from nginx)
    location /miniapp/ {
        alias /var/www/MonetizeeAI_bot/miniApp/build/;
        try_files $uri $uri/ /miniapp/index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # Default: proxy everything else to Go app (optional)
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

#### `nginx_config_fixed.conf`
```text
server {
    server_name www.sianacademy.com;

    # ACME challenges for SSL
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    # Payment callback routes - باید قبل از location / باشد
    # این route برای اطمینان از کارکرد صحیح callback های ZarinPal است
    location /payment/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # مهم برای POST requests از ZarinPal
        proxy_buffering off;
        proxy_request_buffering off;
        
        # Timeout settings برای callback های پرداخت
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Proxy everything else to backend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # برای WebSocket و سایر connection های طولانی
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/www.sianacademy.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.sianacademy.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    listen 80;
    server_name www.sianacademy.com;
    return 301 https://$server_name$request_uri;
}
```

#### `nginx_quick_fix.conf`
```text
# Quick Fix for Payment Callback Routes
# Add these location blocks to your existing nginx config BEFORE the /api/ location block

# Payment callback routes - MUST be before /api/ location
location /payment/callback {
    proxy_pass http://127.0.0.1:8080/payment/callback;  # Adjust port if needed
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Important for POST requests from ZarinPal
    proxy_set_header Content-Type $content_type;
    proxy_set_header Content-Length $content_length;
    
    # Allow both GET and POST
    proxy_method POST;
    proxy_method GET;
}

location /payment/check {
    proxy_pass http://127.0.0.1:8080/payment/check;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Your existing /api/ location block should come AFTER these
```

### 6.4 Default server / `default_server` behavior
**UNKNOWN (not evidenced)**: The active production Nginx config is not available here, so `default_server` usage and its rationale cannot be asserted.

---

## 7. Process Management and Restart Procedures

### 7.1 What’s known from repo
- `scripts/deploy.sh`:
  - Pulls git, runs verification, builds backend `bot`, builds frontend `miniApp/dist`
  - **Does not restart services automatically**; prints manual instructions (supervisor/systemd/PM2) as placeholders.
- `DEPLOY.md` documents typical commands for supervisor/systemd/PM2 but does not include actual unit files.

### 7.2 Supervisor/systemd configs
- **Supervisor config files in repo:** none found (no `supervisord.conf`, no `/etc/supervisor/...` content stored).
- **systemd unit files in repo:** none found (`*.service` search returned none).
- **Server evidence commands** for supervisor/systemd failed in this environment (see §10).

Therefore:
- **Program name**, command, working directory, autostart behavior, and log file paths for the actual process manager are **UNKNOWN (not evidenced)**.

---

## 8. Logs and Monitoring Baseline (as-is)

### 8.1 Backend logging (repo evidence)

`logger/logger.go` initializes zap with:
- **File output**: `logs/bot.log` (JSON encoder)
- **Console output**: stdout (console encoder)
- log level: `Info` for both cores

**Implications:**
- The Go process must have write permissions to `./logs/` relative to its working directory.
- If running under a process manager, stdout likely ends up in process manager logs (path depends on supervisor/systemd config; **unknown**).

### 8.2 HTTP request logging (repo evidence)

`web_api.go` includes:
- `gin.LoggerWithFormatter(...)` writing formatted lines (not JSON) to stdout.
- Additional middleware logs for any path with prefix `/api/`:
  - message: `"API request received"` with fields: method, path, remote_addr, user_agent.

### 8.3 Nginx logging
**Active log locations: UNKNOWN (not evidenced)** because `/etc/nginx/...` could not be accessed here.

Repo example (`nginx_config_example.conf`) suggests:
- `access_log /var/log/nginx/sianacademy_access.log;`
- `error_log /var/log/nginx/sianacademy_error.log;`

These are **examples only** and not confirmed for production.

### 8.4 Request IDs / tracing
**Not evidenced**:
- No explicit request-id generation observed in the excerpts collected here.
- No OpenTelemetry / tracing configuration observed in the files reviewed for this baseline.

---

## 9. Security Baseline (current behavior from evidence)

### 9.1 Web/API access control
- Backend has a Telegram WebApp auth middleware with:
  - allow-list for admin routes and web login routes (`/api/v1/web/*`) and `/health`
  - Telegram detection via:
    - `startapp` query parameter (treated as most reliable)
    - User-Agent and Referer checks
    - `X-Telegram-Init-Data` header presence (comment indicates it “should be validated”; deeper validation may exist elsewhere; **not included here**)
  - Web-session fallback:
    - accepts `web_session_token` via Cookie, Authorization header, or query param
    - issues cookie with `HttpOnly=true` and `Secure` depending on `DEVELOPMENT_MODE`

### 9.2 CORS
Documented in §5.4; production origin allow-list includes Telegram + `sianmarketing.com` + `sianacademy.com`.

### 9.3 Nginx security headers
**Active production headers: UNKNOWN (not evidenced)**.

Repo example adds:
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`

### 9.4 Secrets and configuration handling

**From `.env.sample` (repo file):**

> NOTE: Values below are redacted. The file in repo contains values that look like real tokens/keys. Treat as a leak risk.

```env
TELEGRAM_BOT_TOKEN=***REDACTED***
GROQ_API_KEY=***REDACTED***
OPENAI_API_KEY=***REDACTED***
MYSQL_DSN=***REDACTED***
DEBUG=true
PORT=8080
WEB_API_ENABLED=false
WEB_API_PORT=8080
MINI_APP_ENABLED=false
MINI_APP_URL=***REDACTED***
```

**From `env_example.txt` (repo file, redacted):**
```env
TELEGRAM_BOT_TOKEN=***REDACTED***
MYSQL_DSN=***REDACTED***
OPENAI_API_KEY=***REDACTED***
WEB_API_ENABLED=false
WEB_API_PORT=8080
MINI_APP_ENABLED=false
MINI_APP_URL=***REDACTED***
```

**Hardcoded secrets-like defaults in code (risk):**
- `payment_service.go` uses `getEnvOrDefault("ZARINPAL_MERCHANT_ID", "<hardcoded>")` and a callback URL default.
- `sms_config.go` uses `getEnvOrDefault("IPPANEL_API_KEY", "<hardcoded>")` and pattern codes as defaults.

These defaults are **present in code**; for this baseline we redact them:
- `ZARINPAL_MERCHANT_ID=***REDACTED***` (should be set via env in production)
- `IPPANEL_API_KEY=***REDACTED***` (should be set via env in production)

### 9.5 Frontend API base URL behavior

`miniApp/src/services/api.ts` sets:
- `this.baseURL = 'https://sianmarketing.com/api/api/v1'` (hardcoded)

Repo also includes `miniApp/env.example` with `VITE_API_BASE_URL=http://localhost:8080/api/v1`, but the current API client code (as read here) does **not** use this env var.

---

## 10. Runtime / Service Status Evidence (command outputs)

All commands below are executed exactly as requested. Where tools/binaries/paths are missing in this environment, the raw error output is included.

### 10.1 Identity

Command:
```bash
pwd && whoami && hostnamectl
```

Output:
```text
/Users/hoseinabsian/Desktop/MonetizeeAI_bot
hoseinabsian
(eval):1: command not found: hostnamectl
```

### 10.2 Git state on expected server path

Command:
```bash
git -C /var/www/MonetizeeAI_bot rev-parse --short HEAD && git -C /var/www/MonetizeeAI_bot status
```

Output:
```text
fatal: cannot change to '/var/www/MonetizeeAI_bot': No such file or directory
```

### 10.3 Nginx filesystem locations

Command:
```bash
ls -la /etc/nginx/ /etc/nginx/conf.d/
```

Output:
```text
ls: /etc/nginx/: No such file or directory
ls: /etc/nginx/conf.d/: No such file or directory
```

### 10.4 Nginx config dump (required)

Command:
```bash
nginx -T | sed -n '1,220p'
```

Output:
```text
(eval):1: command not found: nginx
```

Command:
```bash
nginx -T | nl -ba | sed -n '180,340p'
```

Output:
```text
(eval):1: command not found: nginx
```

### 10.5 Listening ports

Command:
```bash
ss -lntp | egrep ':80|:443|:8080|:3000|:5173|:8000|:9000' || true
```

Output:
```text
(eval):1: command not found: ss
```

### 10.6 nginx service status (systemd)

Command:
```bash
systemctl status nginx --no-pager
```

Output:
```text
(eval):1: command not found: systemctl
```

### 10.7 supervisor status

Command:
```bash
supervisorctl status || true
```

Output:
```text
(eval):1: command not found: supervisorctl
```

### 10.8 MiniApp dist listing on server path

Command:
```bash
ls -la /var/www/MonetizeeAI_bot/miniApp/dist | head
```

Output:
```text
ls: /var/www/MonetizeeAI_bot/miniApp/dist: No such file or directory
```

### 10.9 External HTTP checks (production)

Command:
```bash
curl -sS -I https://sianmarketing.com/ | egrep -i 'http/|location|x-served-by|server|content-type'
```

Output:
```text
HTTP/2 302 
server: nginx/1.20.1
content-type: text/html
location: https://sianmarketing.com/miniapp/
x-served-by: sianmarketing.com.conf
```

Command:
```bash
curl -sS -I https://sianmarketing.com/miniapp/ | egrep -i 'http/|content-type|x-served-by'
```

Output:
```text
HTTP/2 200 
content-type: text/html
x-served-by: sianmarketing.com.conf
```

Command:
```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://sianmarketing.com/api/health
```

Output:
```text
200
```

Command:
```bash
curl -sS -o /dev/null -w "%{http_code}\n" "https://sianmarketing.com/api/api/v1/web/verify?telegram_id=155252981"
```

Output:
```text
401
```

---

## 11. Known Issues / Risks (based on evidence)

### 11.1 High-risk: production Nginx config not captured here
- Required artifacts (`/etc/nginx/nginx.conf`, `/etc/nginx/conf.d/sianmarketing.com.conf`, `nginx -T`) are **not available** from this environment, so Phase 2 planning must treat Nginx internals as **unknown until collected on the actual server**.
- We only know:
  - Nginx version reported: `nginx/1.20.1`
  - Active vhost filename reported: `sianmarketing.com.conf` (via `x-served-by`)

### 11.2 High-risk: fragile path mapping between `/api/*` public and backend routes
- Frontend uses `https://sianmarketing.com/api/api/v1` (hardcoded).
- Backend registers routes at `/api/v1` and health at `/health`.
- External probe uses `/api/health` and succeeds (200).

This combination implies Nginx must be doing **URI rewriting/prefix stripping** in production. Any Nginx change that stops rewriting could break:
- `/api/health` (would hit backend `/api/health` which is not registered)
- all frontend API calls (`/api/api/v1/...` would hit backend `/api/api/v1/...` which is not registered)

### 11.3 High-risk: secrets-like values committed in repo templates / code defaults
- `.env.sample` contains a value in `GROQ_API_KEY` field that looks like a real API key format.
- `sms_config.go` contains a default value for `IPPANEL_API_KEY` and SMS pattern codes.
- `payment_service.go` contains a default `ZARINPAL_MERCHANT_ID`.

Even if these are placeholders, they appear as real secrets in code history and should be treated as a leak exposure risk.

### 11.4 Medium-risk: frontend base URL is hardcoded, ignoring `VITE_API_BASE_URL`
- `miniApp/env.example` suggests env-driven base URL, but `miniApp/src/services/api.ts` hardcodes the production URL.
- This increases deploy risk (cannot easily point to staging/alternate hosts without code change).

### 11.5 Medium-risk: Web sessions are in-memory
- Web login sessions (`userWebSessions`) are stored in-memory in the Go process with 24h expiry.
- Process restart will drop all sessions (users will be forced to login again).
- No persistence store is evidenced in repo for sessions.

### 11.6 Medium-risk: `.env` is required at startup
`main.go` calls `godotenv.Load()` and fatals if `.env` is missing. That’s deploy-fragile if the process manager doesn’t ensure `.env` is present in working dir.

---

## 12. Risks / TODOs for Phase 2 (actionable, but only based on gaps)

These are **Phase 2 planning inputs**, not claims about current production setup.

- **Collect missing production artifacts on the real server**:
  - `/etc/nginx/nginx.conf`
  - `/etc/nginx/conf.d/sianmarketing.com.conf` (and other enabled vhosts)
  - `nginx -T` full dump
  - active process manager config (supervisor `.conf` or systemd unit)
  - port bindings (`ss -lntp`)
  - cert paths + expiry (`certbot certificates` or `openssl x509 -enddate ...`) — not included in the requested commands; would need additional command list.
- **Document and lock in Nginx URI rewrite contract** for:
  - `/api/health` -> backend `/health`
  - `/api/api/v1/*` -> backend `/api/v1/*`
- **Remove/rotate and prevent secrets in repo**:
  - Ensure `.env.sample` contains placeholders only.
  - Remove hardcoded secret defaults in code; require env for `ZARINPAL_MERCHANT_ID`, `IPPANEL_API_KEY`, etc.
- **Make frontend API base configurable**:
  - Use `import.meta.env.VITE_API_BASE_URL` rather than hardcoding.
- **Observability baseline**:
  - Add request IDs at Nginx and Go, and ensure logs include them (not currently evidenced).

---

## 13. Missing Pieces Checklist (not found / not collectible here)

### Missing due to environment/tooling
- `hostnamectl` not available here.
- `nginx` binary not available here, so `nginx -T` cannot be produced.
- `ss` not available here.
- `systemctl` and `supervisorctl` not available here.

### Missing because server paths are not present in this environment
- `/var/www/MonetizeeAI_bot` does not exist here, so server-side git status and `miniApp/dist` listing cannot be collected.
- `/etc/nginx/` is not present here, so active Nginx configs cannot be collected.

