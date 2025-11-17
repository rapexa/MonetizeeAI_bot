# 🔒 راهنمای امنیت MonetizeeAI Mini App

## خلاصه تغییرات امنیتی

این سند تغییرات امنیتی اعمال شده برای محافظت از Mini App در برابر دسترسی مستقیم از اینترنت را شرح می‌دهد.

## 🛡️ لایه‌های امنیتی پیاده‌سازی شده

### 1. Backend Security (Go)

#### Telegram WebApp Authentication Middleware
- **فایل**: `web_api.go`
- **عملکرد**: تشخیص و تأیید درخواست‌های Telegram WebApp
- **روش‌های تشخیص**:
  - بررسی User-Agent برای الگوهای Telegram
  - بررسی Referer برای دامنه‌های Telegram
  - بررسی header های `X-Telegram-Init-Data`
  - بررسی header های `X-Telegram-WebApp`
  - بررسی header های `X-Telegram-Start-Param`

#### CORS محدودیت‌ها
- **Development**: تمام origins مجاز
- **Production**: فقط دامنه‌های Telegram و دامنه‌های خودی

```go
// Production CORS Origins
"https://web.telegram.org"
"https://k.web.telegram.org" 
"https://z.web.telegram.org"
"https://a.web.telegram.org"
"https://sianmarketing.com"
"https://www.sianmarketing.com"
"https://sianacademy.com"
"https://www.sianacademy.com"
```

### 2. Frontend Security (React)

#### TelegramWebAppGuard Component
- **فایل**: `miniApp/src/components/TelegramWebAppGuard.tsx`
- **عملکرد**: محافظت از تمام صفحات Mini App
- **ویژگی‌ها**:
  - تشخیص محیط Telegram WebApp
  - نمایش صفحه خطا برای دسترسی غیرمجاز
  - اجازه دسترسی در حالت development (localhost)

#### API Service Headers
- **فایل**: `miniApp/src/services/api.ts`
- **تغییرات**: اضافه کردن header های Telegram به تمام درخواست‌ها
- **Header های اضافه شده**:
  - `X-Telegram-Init-Data`
  - `X-Telegram-WebApp: true`
  - `X-Telegram-Start-Param`

## 🔧 تنظیمات Environment Variables

### متغیرهای جدید

```env
# حالت توسعه - فقط برای development
DEVELOPMENT_MODE=false

# متغیرهای موجود
WEB_API_ENABLED=true
WEB_API_PORT=8080
```

### تنظیمات Production

```env
DEVELOPMENT_MODE=false
WEB_API_ENABLED=true
WEB_API_PORT=8080
```

### تنظیمات Development

```env
DEVELOPMENT_MODE=true
WEB_API_ENABLED=true
WEB_API_PORT=8080
```

## 🚀 نحوه استقرار

### 1. Backend (Go)

```bash
# Build
go build -o monetizeeai_bot.exe

# Set environment variables
set DEVELOPMENT_MODE=false
set WEB_API_ENABLED=true
set WEB_API_PORT=8080

# Run
./monetizeeai_bot.exe
```

### 2. Frontend (React)

```bash
# Build for production
cd miniApp
npm run build

# Deploy built files to web server
# Files will be in miniApp/dist/
```

## 🔍 تست امنیت

### فایل تست
- **فایل**: `test_access.html`
- **استفاده**: برای تست دسترسی از مرورگر معمولی
- **انتظار**: باید دسترسی مسدود شود

### مراحل تست

1. **تست از مرورگر معمولی**:
   - باز کردن `test_access.html` در مرورگر
   - انتظار: نمایش پیام "دسترسی محدود شده"

2. **تست از Telegram WebApp**:
   - دسترسی از طریق ربات Telegram
   - انتظار: دسترسی عادی به Mini App

3. **تست API**:
   - درخواست مستقیم به API endpoints
   - انتظار: پاسخ 403 Forbidden برای درخواست‌های غیر-Telegram

## 📊 لاگ‌های امنیتی

### نمونه لاگ‌های مفید

```
✅ Telegram WebApp access granted
🚫 Non-Telegram access blocked - IP: 1.2.3.4
🔒 CORS: Production mode - restricted origins
🔧 CORS: Development mode - allowing all origins
```

### مانیتورینگ

- تمام درخواست‌های مسدود شده لاگ می‌شوند
- IP addresses مشکوک ثبت می‌شوند
- User-Agent های غیرعادی شناسایی می‌شوند

## 🛠️ عیب‌یابی

### مشکلات رایج

1. **Mini App در Telegram باز نمی‌شود**:
   - بررسی `DEVELOPMENT_MODE=false` در production
   - بررسی CORS origins
   - بررسی لاگ‌های سرور

2. **API درخواست‌ها fail می‌شوند**:
   - بررسی header های Telegram
   - بررسی middleware authentication
   - بررسی CORS settings

3. **Development mode کار نمی‌کند**:
   - تنظیم `DEVELOPMENT_MODE=true`
   - دسترسی از localhost
   - بررسی لاگ‌های CORS

## 🔐 نکات امنیتی

### بهترین روش‌ها

1. **هرگز `DEVELOPMENT_MODE=true` در production نگذارید**
2. **CORS origins را به حداقل برسانید**
3. **لاگ‌های امنیتی را مانیتور کنید**
4. **IP های مشکوک را block کنید**

### هشدارها

- ⚠️ تغییر CORS origins بدون دقت می‌تواند Mini App را خراب کند
- ⚠️ حذف middleware authentication امنیت را از بین می‌برد
- ⚠️ فعال کردن DEVELOPMENT_MODE در production خطرناک است

## 📞 پشتیبانی

در صورت بروز مشکل:
1. بررسی لاگ‌های سرور
2. تست با `test_access.html`
3. بررسی environment variables
4. تماس با تیم توسعه

---

**تاریخ آخرین به‌روزرسانی**: نوامبر 2024
**نسخه امنیت**: 1.0
**وضعیت**: فعال و تست شده ✅
