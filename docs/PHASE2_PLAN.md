# Phase 2: Infrastructure Hardening Plan

**Version:** 1.0  
**Date:** January 2026  
**Goal:** Zero-downtime deployment, explicit routing, observability, and security hardening.

---

## 0. Nginx Path Contract (Canonical Approach)

**Backend routes:** `/health` and `/api/v1/*` (and `/payment/*`). Nginx must map external paths to these without stripping the wrong prefix.

### Preferred canonical external paths

| External path   | Backend path   | Notes                    |
|-----------------|----------------|--------------------------|
| `/health`       | `/health`      | Direct proxy             |
| `/api/v1/*`     | `/api/v1/*`     | Direct proxy, path preserved |
| `/payment/*`    | `/payment/*`   | Direct proxy             |

### Optional backward compat (7-day migration)

| External path     | Action                    |
|-------------------|---------------------------|
| `/api/health`     | Rewrite to `/health`      |
| `/api/api/v1/*`   | Rewrite to `/api/v1/*`    |

### ⚠️ WARNING: Generic `location /api/` strip rule

A **generic** rule like `location /api/ { proxy_pass http://backend/; }` (trailing slash on backend, no path in backend) **strips** the `/api` prefix. So `/api/v1/user` would hit the backend as `/v1/user`, which **breaks** our backend (expects `/api/v1/user`). You **must** use explicit locations:

- `location /api/v1/ { proxy_pass http://127.0.0.1:8080/api/v1/; ... }` so the full path is passed.
- Do **not** use a single catch-all `location /api/` that strips the prefix unless you explicitly rewrite to `/api/v1/...`.

---

## 1. Canonical Public Endpoints

After Phase 2, external clients (browser, curl, Telegram WebApp) should use:

| Path | Purpose | Backend Route | Response |
|------|---------|---------------|----------|
| `/miniapp/` | SPA (React app) | Nginx serves static | HTML |
| `/` | Root redirect | Nginx 302 | -> `/miniapp/` |
| `/health` | Health check | Go `/health` | JSON |
| `/api/v1/*` | API endpoints | Go `/api/v1/*` | JSON |
| `/api/health` | (Backward compat) | Rewrite -> `/health` | JSON |
| `/payment/*` | Payment callbacks | Go `/payment/*` | JSON |

### Key Changes from Pre-Phase 2

- **Old**: Frontend hardcoded `https://sianmarketing.com/api/api/v1`
- **New**: Frontend uses `VITE_API_BASE_URL` (defaults to `https://sianmarketing.com/api/v1`)
- **Nginx rewrite** `/api/api/v1/*` should be **removed** after 7-day migration window (or kept for legacy mobile clients)

---

## 2. Nginx Configuration (Safe Snippets)

### 2.1 Primary vhost: `sianmarketing.com.conf`

Below is a **recommended** Nginx configuration. **Do NOT apply without review.** Test with `nginx -t` first.

```nginx
# /etc/nginx/conf.d/sianmarketing.com.conf (example)

server {
    listen 80;
    server_name sianmarketing.com www.sianmarketing.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name sianmarketing.com www.sianmarketing.com;

    # TLS (Let's Encrypt)
    ssl_certificate     /etc/letsencrypt/live/sianmarketing.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sianmarketing.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Logging
    access_log /var/log/nginx/sianmarketing_access.log;
    error_log  /var/log/nginx/sianmarketing_error.log;

    # Custom header for debugging
    add_header X-Served-By "sianmarketing.com.conf" always;

    # -----------------------------------------------------------
    # 1. Root redirect -> /miniapp/
    # -----------------------------------------------------------
    location = / {
        return 302 /miniapp/;
    }

    # -----------------------------------------------------------
    # 2. MiniApp SPA (React)
    # -----------------------------------------------------------
    location /miniapp/ {
        alias /var/www/MonetizeeAI_bot/miniApp/dist/;
        try_files $uri $uri/ /miniapp/index.html;

        # Cache-busting for HTML
        location ~* \.html$ {
            add_header Cache-Control "no-cache, no-store, must-revalidate";
        }
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
        }
    }

    # -----------------------------------------------------------
    # 3. Health check (canonical)
    # -----------------------------------------------------------
    location = /health {
        proxy_pass http://127.0.0.1:8080/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $req_id;
    }

    # -----------------------------------------------------------
    # 4. Backward compat: /api/health -> /health (remove after 7 days)
    # -----------------------------------------------------------
    location = /api/health {
        rewrite ^ /health last;
    }

    # -----------------------------------------------------------
    # 5. Payment callbacks (must be BEFORE /api/)
    # -----------------------------------------------------------
    location /payment/ {
        proxy_pass http://127.0.0.1:8080/payment/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $req_id;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # -----------------------------------------------------------
    # 6. API v1 (canonical)
    # -----------------------------------------------------------
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8080/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-Id $req_id;

        # WebSocket support (for admin panel)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # -----------------------------------------------------------
    # 7. Backward compat: /api/api/v1/* -> /api/v1/* (remove after 7 days)
    # -----------------------------------------------------------
    location /api/api/v1/ {
        rewrite ^/api/api/v1/(.*)$ /api/v1/$1 last;
    }

    # -----------------------------------------------------------
    # 8. Static assets fallback (fonts, videos in miniApp/public)
    # -----------------------------------------------------------
    location /fonts/ {
        alias /var/www/MonetizeeAI_bot/miniApp/dist/fonts/;
        expires 30d;
    }

    # -----------------------------------------------------------
    # Security headers
    # -----------------------------------------------------------
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
}
```

### 2.2 Key `proxy_pass` Rules

| Nginx location | proxy_pass | Effect |
|----------------|------------|--------|
| `/api/v1/` | `http://127.0.0.1:8080/api/v1/` | Passes `/api/v1/user/123` -> backend `/api/v1/user/123` |
| `/health` | `http://127.0.0.1:8080/health` | Passes `/health` -> backend `/health` |
| `/payment/` | `http://127.0.0.1:8080/payment/` | Passes `/payment/callback` -> backend `/payment/callback` |

**Important**: Trailing slash matters! `/api/v1/` with trailing slash in both location and proxy_pass preserves the path correctly.

---

## 3. Request ID Propagation

### 3.1 Nginx

Use a **custom** variable for the request ID so we do not overwrite Nginx's built-in `$request_id`. Add to http block or inside server:

```nginx
# Use client X-Request-Id if present; otherwise use Nginx built-in $request_id
# Output variable MUST be $req_id (not $request_id) to avoid overwriting built-in
map $http_x_request_id $req_id {
    default   $http_x_request_id;
    ""        $request_id;
}
```

Then use `proxy_set_header X-Request-Id $req_id;` in each `location` that proxies to the backend.

### 3.2 Go Backend

The Go backend (Phase 2 changes) now:
1. Reads `X-Request-Id` header if present
2. Generates a new ID if missing
3. Sets it in the response header
4. Includes it in all API logs

Example log output:
```
2026-01-29 10:00:00 - [GET /api/v1/user/123] [rid=a1b2c3d4e5f6...]
```

---

## 4. Server Apply Steps

### 4.1 Pre-Deployment Checklist

```bash
# On server:
cd /var/www/MonetizeeAI_bot

# 1. Backup current Nginx config
sudo cp /etc/nginx/conf.d/sianmarketing.com.conf /etc/nginx/conf.d/sianmarketing.com.conf.backup.$(date +%Y%m%d_%H%M%S)

# 2. Pull latest code
git pull origin main

# 3. Build backend
./build.sh
# or: go build -o bot .

# 4. Build frontend (with new env)
cd miniApp
echo "VITE_API_BASE_URL=https://sianmarketing.com/api/v1" > .env.production
npm ci
npm run build
cd ..

# 5. Verify .env has required secrets
grep -E "^(ZARINPAL_MERCHANT_ID|IPPANEL_API_KEY)=" .env || echo "WARNING: Missing required secrets!"
```

### 4.2 Apply Nginx Changes

```bash
# 1. Edit Nginx config (use the snippet from Section 2)
sudo nano /etc/nginx/conf.d/sianmarketing.com.conf

# 2. Test config
sudo nginx -t
# If OK:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful

# 3. Reload (zero-downtime)
sudo systemctl reload nginx
```

### 4.3 Restart Backend

```bash
# If using supervisor:
sudo supervisorctl restart bot

# If using systemd:
sudo systemctl restart monetizeeai-bot

# Verify it's running:
curl -s http://localhost:8080/health | jq
```

### 4.4 Run Smoke Tests

```bash
# Run the smoke test script
./scripts/phase2-smoke.sh

# Or manually:
curl -sI https://sianmarketing.com/ | grep -E "HTTP/|Location"
curl -sI https://sianmarketing.com/miniapp/ | grep -E "HTTP/|content-type"
curl -s https://sianmarketing.com/health | jq
curl -s https://sianmarketing.com/api/v1/web/verify?telegram_id=12345 -w "\nHTTP: %{http_code}\n"
```

---

## 5. Rollback Steps

If something breaks:

### 5.1 Rollback Nginx

```bash
# Restore backup
sudo cp /etc/nginx/conf.d/sianmarketing.com.conf.backup.YYYYMMDD_HHMMSS /etc/nginx/conf.d/sianmarketing.com.conf
sudo nginx -t && sudo systemctl reload nginx
```

### 5.2 Rollback Code

```bash
cd /var/www/MonetizeeAI_bot
git log --oneline -5  # Find previous commit
git checkout <previous-commit-hash>
./build.sh
sudo supervisorctl restart bot
```

### 5.3 Rollback Frontend API Base

If the new API base breaks the frontend but backend is fine:

```bash
cd miniApp
# Build with old API base (temporary workaround)
echo "VITE_API_BASE_URL=https://sianmarketing.com/api/api/v1" > .env.production
npm run build
```

---

## 6. Migration Timeline

| Day | Action |
|-----|--------|
| 0 | Deploy Phase 2 code + Nginx with backward compat rewrites |
| 0-7 | Monitor logs for `/api/api/v1` traffic (should decrease) |
| 7+ | Remove `/api/api/v1` rewrite from Nginx if traffic is zero |
| 7+ | Remove `/api/health` -> `/health` rewrite if not needed |

---

## 7. Environment Variables Reference

### Required in Production (fail-fast if missing)

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot API token |
| `MYSQL_DSN` | MySQL connection string |
| `GROQ_API_KEY` | Groq AI API key |
| `ZARINPAL_MERCHANT_ID` | Zarinpal payment merchant ID |
| `IPPANEL_API_KEY` | IPPanel SMS API key |

### Optional with Defaults

| Variable | Default | Description |
|----------|---------|-------------|
| `DEVELOPMENT_MODE` | `false` | If `true`, allows demo secrets |
| `WEB_API_ENABLED` | `true` | Enable/disable web API |
| `WEB_API_PORT` | `8080` | Web API listen port |
| `MINI_APP_URL` | - | Telegram Mini App URL |
| `ZARINPAL_CALLBACK_URL` | `https://sianmarketing.com/payment/callback` | Payment callback URL |

---

## 8. Observability Checklist

- [x] Request ID middleware added to Go backend
- [x] Request ID included in Gin logs
- [x] Request ID returned in `X-Request-Id` response header
- [x] Health endpoint includes request_id in response
- [ ] Nginx `$req_id` propagation (map in http block; add to server config)
- [ ] Structured JSON logs (consider for future)

---

## 9. Security Checklist

- [x] Hardcoded secrets removed from code (Zarinpal, IPPanel)
- [x] `.env.sample` contains only placeholders
- [x] Fail-fast in production if secrets missing
- [x] DEVELOPMENT_MODE escape hatch for local dev
- [ ] Rotate any keys that were previously committed
- [ ] Enable HSTS header in Nginx (after confirming HTTPS works)

---

**Document End**
