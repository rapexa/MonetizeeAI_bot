# Deployment Guide

This document describes the standard deployment workflow for MonetizeeAI Bot.

## Project Structure

- **Frontend:** `miniApp/` (Vite + React + TypeScript)
- **Backend:** Root directory (Go)
- **Scripts:** `scripts/` (verification and deployment scripts)

## Local Development

### Prerequisites

- **Frontend:** Node.js 20+ and npm
- **Backend:** Go 1.24+ (check `go.mod` for exact version)

### Setup

1. **Install frontend dependencies:**
   ```bash
   cd miniApp
   npm install
   ```

2. **Verify Go installation:**
   ```bash
   go version
   ```

3. **Install backend dependencies:**
   ```bash
   go mod download
   ```

### Development Workflow

#### Frontend Development

```bash
cd miniApp
npm run dev
```

- Starts Vite dev server (usually `http://localhost:5173`)
- Hot module replacement enabled
- TypeScript type checking in watch mode

#### Backend Development

```bash
go run .
```

- Runs the Go application
- Requires `.env` file with proper configuration
- Check logs for startup errors

### Pre-Commit Workflow

Git hooks are automatically installed when you run `npm install` in `miniApp/`:

- **Pre-commit:** Runs `eslint --fix` on staged `.ts`/`.tsx` files
- **Pre-push:** Runs full verification (`npm run verify`)

See `miniApp/DEVELOPMENT.md` for details.

## Pre-Deploy Verification

### Full Verification (Recommended)

Before deploying, run the full verification script:

```bash
./scripts/verify-all.sh
```

This runs:
1. Backend verification (format, test, build)
2. Frontend verification (type-check, lint, build)

**Expected output:**
- ✅ Exit code 0 = All checks passed
- ❌ Exit code 1 = One or more checks failed

### Individual Verification

#### Backend Only

```bash
./scripts/verify-backend.sh
```

Checks:
- Go code formatting (`gofmt -l`)
- Go tests (`go test ./...`)
- Go build (`go build -o bot .`)

#### Frontend Only

```bash
cd miniApp
npm run verify
```

Checks:
- TypeScript type check (`tsc --noEmit`)
- ESLint (`eslint .`)
- Production build (`vite build`)

## Server Deployment

### Prerequisites on Server

- Node.js 20+ installed
- Go 1.24+ installed (check `go.mod`)
- Git access to repository
- Process manager (supervisor/systemd/PM2) configured
- Web server (nginx/apache) configured

### Deployment Steps

#### 1. Pull Latest Code

```bash
cd /var/www/MonetizeeAI_bot
git pull origin main  # or your deployment branch
```

#### 2. Verify Before Deploy

```bash
# Full verification
./scripts/verify-all.sh

# If verification fails, DO NOT deploy
# Fix issues first, then retry
```

#### 3. Build Backend

```bash
# Build Go binary
go build -o bot .

# Verify binary was created
ls -la bot
```

#### 4. Build Frontend

```bash
cd miniApp
npm ci  # Clean install (uses package-lock.json)
npm run build  # Production build

# Verify build output
ls -la dist/
```

#### 5. Deploy Frontend Build

Copy frontend build to web server directory:

```bash
# Example for nginx
sudo cp -r miniApp/dist/* /var/www/html/miniApp/

# Or for Apache
sudo cp -r miniApp/dist/* /var/www/html/miniApp/
```

**Note:** Adjust paths based on your web server configuration.

#### 6. Restart Backend Service

**If using supervisor:**
```bash
sudo supervisorctl restart bot
```

**If using systemd:**
```bash
sudo systemctl restart monetizeeai-bot
```

**If using PM2:**
```bash
pm2 restart monetizeeai-bot
```

**If running manually:**
```bash
# Stop current process (find PID first)
kill <PID>

# Start new process
./bot
```

#### 7. Reload Web Server

**If using nginx:**
```bash
sudo systemctl reload nginx
```

**If using Apache:**
```bash
sudo systemctl reload apache2
```

#### 8. Verify Deployment

1. **Check backend logs:**
   ```bash
   # Supervisor
   sudo supervisorctl tail -f bot

   # Systemd
   sudo journalctl -u monetizeeai-bot -f

   # PM2
   pm2 logs monetizeeai-bot
   ```

2. **Test frontend:**
   - Open browser and navigate to frontend URL
   - Check browser console for errors
   - Verify API endpoints are accessible

3. **Test API endpoints:**
   ```bash
   curl http://your-domain/api/health
   ```

## Automated Deployment Script

A deployment script is available at `scripts/deploy.sh`:

```bash
# Dry run (test mode)
DRY_RUN=1 ./scripts/deploy.sh

# Actual deployment
./scripts/deploy.sh
```

**Note:** The script handles git pull, verification, and builds. Service restart must be done manually (see script output for instructions).

## Rollback Procedure

If deployment fails or causes issues:

### 1. Rollback Code

```bash
cd /var/www/MonetizeeAI_bot
git log --oneline -10  # Find previous working commit
git checkout <previous-commit-hash>
```

### 2. Rebuild and Restart

```bash
# Rebuild backend
go build -o bot .

# Rebuild frontend
cd miniApp
npm run build
sudo cp -r dist/* /var/www/html/miniApp/

# Restart services
sudo supervisorctl restart bot  # or your process manager
sudo systemctl reload nginx     # or apache2
```

## Troubleshooting

### Verification Fails

**Problem:** `./scripts/verify-all.sh` fails

**Solutions:**
1. Check error messages - they indicate which check failed
2. Fix the specific issue:
   - Type errors: Fix TypeScript issues
   - Lint errors: Fix ESLint issues
   - Build errors: Fix build issues
   - Test failures: Fix test code
3. Re-run verification

### Build Fails on Server

**Problem:** Build succeeds locally but fails on server

**Common causes:**
- Different Node.js/Go versions
- Missing dependencies
- Environment variables not set
- File permissions

**Solutions:**
1. Check versions match:
   ```bash
   node --version
   go version
   ```
2. Clean install:
   ```bash
   cd miniApp
   rm -rf node_modules package-lock.json
   npm install
   ```
3. Check environment variables
4. Check file permissions

### Service Won't Start

**Problem:** Backend service fails to start

**Solutions:**
1. Check logs (see "Verify Deployment" section)
2. Verify binary exists and is executable:
   ```bash
   ls -la bot
   chmod +x bot
   ```
3. Check `.env` file exists and has correct values
4. Verify database connection
5. Check port availability

## Environment Variables

Backend requires `.env` file with:

```
MYSQL_DSN=...
TELEGRAM_BOT_TOKEN=...
# ... other required variables
```

**Never commit `.env` files to git!**

## Best Practices

1. **Always verify before deploying:**
   ```bash
   ./scripts/verify-all.sh
   ```

2. **Test locally first:**
   - Run full verification locally
   - Test backend and frontend locally
   - Only deploy if everything works

3. **Use version control:**
   - Tag releases: `git tag v1.0.0`
   - Keep deployment branch clean
   - Document deployment in commit messages

4. **Monitor after deployment:**
   - Check logs immediately after deploy
   - Monitor error rates
   - Test critical features

5. **Have a rollback plan:**
   - Know how to rollback quickly
   - Keep previous working build available
   - Document rollback procedure

---

## Phase 2: Infrastructure Hardening

Phase 2 introduces standardized API routing, observability, and security hardening.

### Key Changes

1. **API Base URL**: Frontend now uses `VITE_API_BASE_URL` (no hardcoded URL)
2. **Canonical endpoints**: `/api/v1/*` (not `/api/api/v1/*`)
3. **Request ID**: All API requests include `X-Request-Id` in logs and response
4. **Secrets**: `ZARINPAL_MERCHANT_ID` and `IPPANEL_API_KEY` are required (fail-fast)

### Phase 2 Deployment Steps

```bash
# 1. Pull and build
cd /var/www/MonetizeeAI_bot
git pull origin main
./build.sh

# 2. Build frontend with production API base
cd miniApp
echo "VITE_API_BASE_URL=https://sianmarketing.com/api/v1" > .env.production
npm ci
npm run build
cd ..

# 3. Verify .env has required secrets
grep -E "^(ZARINPAL_MERCHANT_ID|IPPANEL_API_KEY)=" .env

# 4. Restart backend
sudo supervisorctl restart bot

# 5. Run smoke tests
./scripts/phase2-smoke.sh
```

### Phase 2 Smoke Tests

```bash
# Quick manual checks:
curl -sI https://sianmarketing.com/ | grep Location        # Should redirect to /miniapp/
curl -s https://sianmarketing.com/health | jq .data.status  # Should return "healthy"
curl -sI https://sianmarketing.com/health | grep X-Request-Id  # Should have request ID
```

### Phase 2 Rollback

If issues occur:

```bash
# Rollback code
git checkout <previous-commit>
./build.sh
sudo supervisorctl restart bot

# Rollback Nginx (if changed)
sudo cp /etc/nginx/conf.d/sianmarketing.com.conf.backup.* /etc/nginx/conf.d/sianmarketing.com.conf
sudo nginx -t && sudo systemctl reload nginx
```

**Full Phase 2 documentation:** `docs/PHASE2_PLAN.md`

---

**For frontend-specific development, see:** `miniApp/DEVELOPMENT.md`
