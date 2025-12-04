# 🔧 راهنمای کامل رفع مشکل Admin Login

## مشکل
درخواست‌های `/api/v1/admin/auth/login` به endpoint نمی‌رسند و HTML (index.html) برمی‌گردانند.

## علت اصلی
**nginx همه درخواست‌ها را به frontend می‌دهد و به backend نمی‌رسد.**

## راه حل کامل

### مرحله 1: بررسی تنظیمات nginx

فایل nginx config خود را پیدا کنید:
```bash
sudo nano /etc/nginx/sites-available/default
# یا
sudo nano /etc/nginx/nginx.conf
```

### مرحله 2: تنظیم nginx برای proxy کردن API routes

**⚠️ CRITICAL**: location block برای `/api/` باید **قبل از** location `/` قرار بگیرد!

```nginx
server {
    listen 443 ssl http2;
    server_name sianmarketing.com www.sianmarketing.com;

    # SSL config here...

    # ⚠️ CRITICAL: API routes MUST be before location /
    location /api/ {
        proxy_pass http://127.0.0.1:8080;  # Port backend شما
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # برای POST requests
        proxy_set_header Content-Type $content_type;
        proxy_set_header Content-Length $content_length;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Disable buffering for API requests
        proxy_buffering off;
    }

    # Health check
    location /health {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Payment callbacks (if needed)
    location /payment/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend - این باید آخر باشد
    location / {
        # اگر frontend را از nginx serve می‌کنید:
        root /path/to/miniApp/dist;
        try_files $uri $uri/ /index.html;
        
        # یا اگر همه چیز را به Go app proxy می‌کنید:
        # proxy_pass http://127.0.0.1:8080;
        # proxy_http_version 1.1;
        # proxy_set_header Host $host;
        # proxy_set_header X-Real-IP $remote_addr;
        # proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### مرحله 3: اعمال تغییرات

```bash
# تست تنظیمات
sudo nginx -t

# اگر OK بود، reload کنید
sudo systemctl reload nginx
# یا
sudo nginx -s reload
```

### مرحله 4: تست endpoints

#### تست Health Check
```bash
curl https://sianmarketing.com/health
```

باید JSON برگرداند:
```json
{"success":true,"data":{"status":"healthy","service":"MonetizeeAI API"}}
```

#### تست Admin Auth Test Endpoint
```bash
curl https://sianmarketing.com/api/v1/admin/auth/test
```

باید JSON برگرداند:
```json
{"success":true,"message":"Admin auth endpoint is reachable",...}
```

#### تست Login Endpoint
```bash
curl -X POST https://sianmarketing.com/api/v1/admin/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

باید JSON با token برگرداند:
```json
{"success":true,"data":{"token":"...","username":"admin"}}
```

### مرحله 5: بررسی Logs

#### Backend Logs
```bash
# اگر با systemd اجرا می‌کنید:
sudo journalctl -u monetizeai -f
# یا
sudo journalctl -u bot -f

# یا اگر به صورت دستی اجرا می‌کنید:
tail -f bot.log
```

باید این log را ببینید:
```
✅ handleWebLogin called - route matched!
```

#### Nginx Logs
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### مرحله 6: اگر هنوز مشکل دارید

1. **بررسی کنید که backend روی port 8080 اجرا می‌شود:**
   ```bash
   sudo netstat -tlnp | grep 8080
   # یا
   sudo ss -tlnp | grep 8080
   ```

2. **بررسی کنید که nginx درست proxy می‌کند:**
   ```bash
   curl -v https://sianmarketing.com/api/v1/admin/auth/test
   ```

3. **بررسی کنید که route در backend register شده:**
   - در backend logs باید ببینید: `Admin Panel API routes configured`

4. **بررسی کنید که firewall درخواست‌ها را block نمی‌کند:**
   ```bash
   sudo ufw status
   # یا
   sudo iptables -L
   ```

## نکات مهم

- ⚠️ **ترتیب location blocks مهم است**: `/api/` باید قبل از `/` باشد
- ⚠️ **Port backend**: مطمئن شوید که port درست است (معمولاً 8080)
- ⚠️ **Firewall**: مطمئن شوید که firewall درخواست‌ها را block نمی‌کند
- ⚠️ **Backend running**: مطمئن شوید که backend در حال اجرا است

## خلاصه

مشکل اصلی از nginx است که همه درخواست‌ها را به frontend می‌دهد. باید nginx را طوری تنظیم کنید که درخواست‌های `/api/` را به backend proxy کند.

