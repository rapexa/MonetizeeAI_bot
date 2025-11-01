# تست Route های Payment Callback

## مشکل
اگر route های `/payment/callback` در nginx باز نمی‌شوند، احتمالاً nginx آن‌ها را به درستی پروکسی نمی‌کند.

## راه حل سریع

### 1. بررسی Port بک‌اند
ابتدا مطمئن شوید که بک‌اند روی چه پورتی اجرا می‌شود:
```bash
# چک کردن port در کد یا environment variable
grep "WEB_API_PORT" .env
# یا
grep "8080" web_api.go
```

### 2. اضافه کردن Route های Payment به nginx

در فایل nginx config خود (معمولاً `/etc/nginx/sites-available/default` یا `/etc/nginx/nginx.conf`):

**مهم**: Route های `/payment/` باید **قبل از** `/api/` قرار بگیرند!

```nginx
server {
    listen 443 ssl http2;
    server_name www.sianacademy.com;

    # SSL config here...

    # ⚠️ مهم: این بخش باید قبل از /api/ باشد
    location /payment/ {
        proxy_pass http://127.0.0.1:8080;  # Port بک‌اند خود را قرار دهید
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # برای POST requests از ZarinPal
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # بقیه route ها...
    location /api/ {
        proxy_pass http://127.0.0.1:8080;
        # ... rest of config
    }
}
```

### 3. اعمال تغییرات nginx

```bash
# تست تنظیمات
sudo nginx -t

# اگر OK بود، reload کنید
sudo systemctl reload nginx
# یا
sudo nginx -s reload
```

### 4. تست Route ها

#### تست Health Check
```bash
curl https://www.sianacademy.com/health
```

#### تست Callback Route (باید 400 یا 404 برگرداند چون Authority معتبر نیست)
```bash
curl "https://www.sianacademy.com/payment/callback?Authority=test123&Status=OK"
```

#### تست با مرورگر
```
https://www.sianacademy.com/payment/callback?Authority=A00000000000000000000000000000000000000&Status=OK
```

### 5. چک کردن Log ها

#### Nginx Logs
```bash
tail -f /var/log/nginx/sianacademy_access.log
tail -f /var/log/nginx/sianacademy_error.log
```

#### Go App Logs
```bash
# اگر از systemd استفاده می‌کنید
journalctl -u your-service-name -f

# یا log files خودتان
tail -f logs/app.log
```

### 6. Troubleshooting

#### اگر هنوز کار نمی‌کند:

1. **بررسی اینکه route در Go درست تعریف شده:**
   ```bash
   # در کد چک کنید که route ها قبل از v1 group هستند
   grep -A 5 "Payment callback routes" web_api.go
   ```

2. **بررسی firewall:**
   ```bash
   sudo ufw status
   # مطمئن شوید port 8080 باز است (یا هر port دیگری که استفاده می‌کنید)
   ```

3. **بررسی اینکه Go app در حال اجرا است:**
   ```bash
   ps aux | grep bot
   netstat -tlnp | grep 8080
   ```

4. **تست مستقیم بک‌اند (بدون nginx):**
   ```bash
   curl http://localhost:8080/payment/callback?Authority=test&Status=OK
   # اگر این کار کرد، مشکل از nginx است
   ```

### 7. نمونه Config کامل

برای مشاهده یک config کامل، به فایل `nginx_config_example.conf` مراجعه کنید.

### 8. تست کامل پرداخت

بعد از اینکه route ها کار کردند:

1. یک درخواست پرداخت ایجاد کنید (از ربات یا API)
2. لینک پرداخت را باز کنید
3. پرداخت را انجام دهید
4. بعد از پرداخت، ZarinPal به `https://www.sianacademy.com/payment/callback?Authority=XXX&Status=OK` redirect می‌کند
5. صفحه موفقیت یا خطا باید نمایش داده شود

