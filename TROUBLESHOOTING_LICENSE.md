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

## مشکل Foreign Key Constraint

اگر خطای زیر را دریافت کردید:
```
Error 1452 (23000): Cannot add or update a child row: a foreign key constraint fails
```

### راه‌حل:

1. **اجرای SQL Script برای اصلاح Foreign Key:**

```bash
mysql -u your_username -p your_database < fix_license_foreign_key.sql
```

یا مستقیماً در MySQL:

```sql
-- Drop existing foreign key constraint
ALTER TABLE `licenses` 
DROP FOREIGN KEY IF EXISTS `fk_licenses_admin`;

-- Add new foreign key constraint with ON DELETE SET NULL
ALTER TABLE `licenses`
ADD CONSTRAINT `fk_licenses_admin` 
FOREIGN KEY (`created_by`) 
REFERENCES `admins` (`id`) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- Ensure created_by column allows NULL
ALTER TABLE `licenses` 
MODIFY COLUMN `created_by` INT UNSIGNED NULL;
```

2. **Restart Backend:**
```bash
# بعد از اجرای SQL، backend را restart کنید
sudo systemctl restart your-service-name
```

### توضیح:

مشکل از این است که:
- Foreign key constraint به صورت strict تنظیم شده بود
- `created_by` نمی‌توانست NULL باشد
- اگر admin_id در جدول `admins` وجود نداشت، خطا می‌داد

با این تغییرات:
- `created_by` می‌تواند NULL باشد
- اگر admin حذف شود، `created_by` به NULL تبدیل می‌شود
- اگر admin_id معتبر نباشد، لایسنس بدون `created_by` ایجاد می‌شود

## تماس با پشتیبانی

اگر مشکل حل نشد، لطفاً اطلاعات زیر را ارسال کنید:
1. لاگ‌های console مرورگر
2. لاگ‌های backend
3. Response از API (از Network tab در DevTools)
4. نسخه nginx و configuration
5. خروجی `SHOW CREATE TABLE licenses;` از MySQL

