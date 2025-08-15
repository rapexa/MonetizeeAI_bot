# راهنمای ادغام Mini App با ربات تلگرام MonetizeeAI

این راهنما مراحل نصب و راه‌اندازی Mini App را شرح می‌دهد تا به صورت ایمن با ربات تلگرام ادغام شود.

## 🔧 پیش‌نیازها

- Go 1.21 یا بالاتر
- Node.js 18 یا بالاتر  
- MySQL 5.7 یا بالاتر
- دامنه HTTPS (برای Mini App)

## 📋 مرحله 1: راه‌اندازی Web API

### 1.1 نصب dependencies جدید

```bash
cd C:\Users\Rapexa\Desktop\MonetizeeAI_bot
go mod tidy
```

### 1.2 پیکربندی environment variables

فایل `.env` خود را ویرایش کنید:

```env
# Web API (فعلا غیرفعال)
WEB_API_ENABLED=false
WEB_API_PORT=8080

# Mini App (فعلا غیرفعال)  
MINI_APP_ENABLED=false
MINI_APP_URL=
```

### 1.3 تست ربات بدون تغییرات

```bash
go run .
```

✅ **اطمینان حاصل کنید که ربات مثل قبل کار می‌کند**

## 📋 مرحله 2: آماده‌سازی Mini App

### 2.1 نصب dependencies

```bash
cd miniApp
npm install
```

### 2.2 پیکربندی محیط توسعه

فایل `.env.local` بسازید:

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_DEV_TELEGRAM_ID=YOUR_TELEGRAM_ID
VITE_ENVIRONMENT=development
VITE_DEBUG=true
```

### 2.3 تست Mini App محلی

```bash
npm run dev
```

Mini App روی `http://localhost:5173` اجرا می‌شود

## 📋 مرحله 3: فعال‌سازی Web API (تست محلی)

### 3.1 فعال کردن API

در `.env` تغییر دهید:

```env
WEB_API_ENABLED=true
WEB_API_PORT=8080
```

### 3.2 راه‌اندازی ربات + API

```bash
go run .
```

حالا دو سرویس اجرا می‌شوند:
- ربات تلگرام (همیشگی)
- Web API روی پورت 8080

### 3.3 تست API

```bash
curl http://localhost:8080/api/v1/health
```

باید پاسخ زیر را بگیرید:

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "MonetizeeAI API"
  }
}
```

## 📋 مرحله 4: تست ادغام محلی

### 4.1 راه‌اندازی ربات + API

```bash
cd C:\Users\Rapexa\Desktop\MonetizeeAI_bot
go run .
```

### 4.2 راه‌اندازی Mini App

```bash
cd miniApp
npm run dev
```

### 4.3 تست اتصال

1. مینی اپ را در مرورگر باز کنید
2. در console مرورگر پیام‌های زیر را ببینید:

```
API not available, using default data
```
یا
```
✅ Successfully synced with API
```

## 📋 مرحله 5: Deploy Production (اختیاری)

### 5.1 Build Mini App

```bash
cd miniApp
npm run build
```

فایل‌های build شده در `dist/` قرار می‌گیرند.

### 5.2 Host کردن Mini App

فایل‌های `dist/` را روی یک وب سرور HTTPS آپلود کنید.

### 5.3 فعال کردن Mini App در ربات

در `.env` تغییر دهید:

```env
MINI_APP_ENABLED=true
MINI_APP_URL=https://yourdomain.com/miniapp
```

### 5.4 Restart ربات

```bash
go run .
```

حالا دکمه "🌐 Mini App (جدید!)" در منوی ربات ظاهر می‌شود.

## 🔍 عیب‌یابی

### مشکل: API اتصال برقرار نمی‌کند

```bash
# چک کردن health API
curl http://localhost:8080/api/v1/health

# چک کردن logs ربات
# پیام "Starting Web API server" باید ظاهر شود
```

### مشکل: Mini App داده نمایش نمی‌دهد

1. Console مرورگر را چک کنید
2. Network tab را بررسی کنید
3. مطمئن شوید CORS فعال است

### مشکل: دکمه Mini App ظاهر نمی‌شود

1. `MINI_APP_ENABLED=true` باشد
2. `MINI_APP_URL` تنظیم شده باشد
3. ربات restart شده باشد

## ⚠️ نکات مهم ایمنی

1. **هرگز Web API را قبل از تست کامل فعال نکنید**
2. **همیشه backup دیتابیس بگیرید**
3. **environment variables حساس را در فایل `.env` نگذارید**
4. **CORS را در production محدود کنید**

## 📞 پشتیبانی

اگر مشکلی پیش آمد:

1. Log های ربات را چک کنید
2. Console مرورگر را بررسی کنید  
3. مراحل بالا را دوباره بررسی کنید

## 🎯 نتیجه

بعد از تکمیل این مراحل:

✅ ربات تلگرام مثل قبل کار می‌کند  
✅ Web API اختیاری فعال است  
✅ Mini App به API متصل می‌شود  
✅ دکمه Mini App در منوی ربات ظاهر می‌شود  
✅ کاربران می‌توانند از هر دو استفاده کنند
