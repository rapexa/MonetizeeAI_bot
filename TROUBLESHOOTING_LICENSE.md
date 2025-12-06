# راهنمای رفع مشکل تولید لایسنس

## مشکل: پیام "systemctl reload nginx" نمایش داده می‌شود

اگر هنگام کلیک روی دکمه "تولید لایسنس" پیام "systemctl reload nginx" نمایش داده می‌شود، احتمالاً مشکل از یکی از موارد زیر است:

### 1. بررسی Route در Backend

مطمئن شوید که route به درستی register شده است:

```go
// در admin_api.go باید این route وجود داشته باشد:
admin.POST("/license-keys/generate", generateLicenseKeys)
```

### 2. بررسی Nginx Configuration

مطمئن شوید که nginx درست تنظیم شده است و API requests را به backend forward می‌کند:

```nginx
location /api/ {
    proxy_pass http://localhost:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### 3. بررسی Console Logs

در مرورگر، Console را باز کنید (F12) و بررسی کنید:
- آیا request به درستی ارسال می‌شود؟
- Response چیست؟
- آیا خطای CORS وجود دارد؟

### 4. بررسی Backend Logs

در سرور، لاگ‌های backend را بررسی کنید:

```bash
# اگر از systemd استفاده می‌کنید:
journalctl -u your-service-name -f

# یا اگر مستقیماً اجرا می‌کنید:
# لاگ‌ها را در console بررسی کنید
```

### 5. تست مستقیم API

می‌توانید API را مستقیماً تست کنید:

```bash
curl -X POST http://localhost:8080/api/v1/admin/license-keys/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"count": 10}'
```

### 6. بررسی Authentication

مطمئن شوید که:
- شما به عنوان admin لاگین کرده‌اید
- Token معتبر است
- Session منقضی نشده است

### 7. راه‌حل سریع

اگر مشکل از nginx است:

```bash
# بررسی configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# یا restart
sudo systemctl restart nginx
```

### 8. بررسی Frontend

مطمئن شوید که:
- فایل `adminApi.ts` به درستی import شده
- Base URL درست است
- Headers به درستی ارسال می‌شوند

### 9. Debug Mode

برای debug بیشتر، در `AdminPanel.tsx` console.log اضافه شده است. بررسی کنید:
- آیا request ارسال می‌شود؟
- Response چیست؟
- آیا error وجود دارد؟

## لاگ‌های اضافه شده

در کد جدید، لاگ‌های زیر اضافه شده‌اند:

### Backend (admin_api.go):
- لاگ درخواست دریافت شده
- لاگ validation
- لاگ authentication
- لاگ موفقیت/خطا

### Frontend (AdminPanel.tsx):
- لاگ قبل از ارسال request
- لاگ response
- لاگ errors

## تماس با پشتیبانی

اگر مشکل حل نشد، لطفاً اطلاعات زیر را ارسال کنید:
1. لاگ‌های console مرورگر
2. لاگ‌های backend
3. Response از API (از Network tab در DevTools)
4. نسخه nginx و configuration

