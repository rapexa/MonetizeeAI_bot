# 📋 لیست Route های Admin در Frontend

## Route های Admin در فرانت‌اند

بر اساس فایل `miniApp/src/App.tsx`، route های مربوط به بخش admin عبارتند از:

### 1. Admin Login
- **Route**: `/admin-login`
- **Component**: `AdminLogin`
- **توضیحات**: صفحه لاگین ادمین - بدون نیاز به Layout

### 2. Admin Panel
- **Route**: `/admin-panel`
- **Component**: `AdminPanel`
- **توضیحات**: صفحه اصلی پنل ادمین - بدون نیاز به Layout

## Route های API Admin

همه route های API که با `/api/v1/admin/` شروع می‌شوند نیز باید بدون نیاز به Telegram auth قابل دسترسی باشند:

- `/api/v1/admin/auth/login` - POST
- `/api/v1/admin/auth/check` - GET
- `/api/v1/admin/auth/logout` - POST
- `/api/v1/admin/auth/test` - GET
- `/api/v1/admin/stats` - GET
- `/api/v1/admin/stats/chart` - GET
- `/api/v1/admin/users` - GET
- `/api/v1/admin/payments` - GET
- `/api/v1/admin/ws` - WebSocket
- و سایر endpoint های admin...

## تنظیمات Backend

در فایل `web_api.go`، در تابع `telegramWebAppAuthMiddleware`، این path ها باید به لیست allowed paths اضافه شوند:

```go
if path == "/health" ||
    strings.HasPrefix(path, "/static/") ||
    strings.HasPrefix(path, "/assets/") ||
    strings.HasPrefix(path, "/api/") ||
    strings.HasPrefix(path, "/v1/admin/") ||
    path == "/admin-login" ||
    strings.HasPrefix(path, "/admin-login/") ||
    path == "/admin-panel" ||
    strings.HasPrefix(path, "/admin-panel/") {
    // Allow access
    c.Next()
    return
}
```

## نکات مهم

1. ⚠️ **Trailing Slash**: باید هم `/admin-login` و هم `/admin-login/` را پوشش دهید
2. ⚠️ **API Routes**: همه route های `/api/` باید بدون auth باشند
3. ⚠️ **Static Files**: فایل‌های static هم باید بدون auth باشند
