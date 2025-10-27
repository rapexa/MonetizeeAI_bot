# 📋 راهنمای اجرای Migration

## ⚠️ هشدار مهم
قبل از اجرای این اسکریپت، **حتماً بکاپ کامل** از دیتابیس بگیرید!

## 🎯 هدف
این اسکریپت کاربران قدیمی رو که `plan_name` ندارن، به سیستم جدید با `plan_name` منتقل می‌کنه.

## 📊 نوع کاربران و تبدیل‌شان

### 1️⃣ کاربران Legacy Ultimate (مادام‌العمر) 👑
**شرط**: `is_verified = 1` و `subscription_expiry = NULL`  
**نتیجه**: 
- `plan_name = 'ultimate'`
- `subscription_type = 'paid'`
- `subscription_expiry = NULL`

### 2️⃣ کاربران Free Trial 🎁
**شرط**: `subscription_type = 'free_trial'`  
**نتیجه**: `plan_name = 'free_trial'`

### 3️⃣ کاربران Paid با Expiry (Starter/Pro) 📅
**شرط**: `subscription_type = 'paid'` و `subscription_expiry IS NOT NULL`  
**نتیجه**: بر اساس روزهای باقیمانده
- **1-35 روز** → `plan_name = 'starter'`
- **36-200 روز** → `plan_name = 'pro'`
- **بیش از 200 روز** → `plan_name = 'ultimate'`

### 4️⃣ کاربران بدون اشتراک ❌
**شرط**: `is_verified = 0` و بدون expiry  
**نتیجه**: 
- `plan_name = ''`
- `subscription_type = 'none'`

## 🚀 نحوه اجرا

### روش 1: از طریق MySQL CLI
```bash
mysql -u root -p your_database_name < migration.sql
```

### روش 2: از طریق phpMyAdmin یا Adminer
1. فایل `migration.sql` رو باز کن
2. محتواش رو کپی کن
3. در phpMyAdmin → SQL Tab
4. Paste کن و Execute

### روش 3: از طریق Go Code (برنامه‌نویسی)
```go
// بذار توی تابع main بعد از db.AutoMigrate این کد رو اضافه کنی
if err := db.Exec(`
    START TRANSACTION;
    -- محتوای migration.sql
    COMMIT;
`).Error; err != nil {
    log.Fatal("Migration failed:", err)
}
```

## ✅ چک‌لیست بعد از اجرا

بعد از اجرای اسکریپت، این کوئری رو بزن تا مطمئن بشی همه چی درسته:

```sql
-- نمایش آمار کاربران بر اساس plan_name
SELECT 
    plan_name,
    COUNT(*) as total_users,
    SUM(CASE WHEN subscription_expiry IS NULL THEN 1 ELSE 0 END) as no_expiry,
    SUM(CASE WHEN subscription_expiry IS NOT NULL THEN 1 ELSE 0 END) as with_expiry
FROM users
GROUP BY plan_name
ORDER BY total_users DESC;
```

## 🔍 بررسی مشکلات احتمالی

### اگر کاربری plan_name نداره:
```sql
SELECT * FROM users WHERE plan_name = '' OR plan_name IS NULL;
```

### اگر کاربری subscription_type نداره:
```sql
SELECT * FROM users WHERE subscription_type = '' OR subscription_type IS NULL;
```

## 🔄 Rollback (در صورت نیاز)

اگه مشکلی پیش آمد، می‌تونی manual این کارها رو انجام بدی:

```sql
-- برگشت به حالت قبلی (ولی نمی‌تونیم plan_name رو حذف کنیم)
UPDATE users 
SET subscription_type = 'none' 
WHERE plan_name = '';

UPDATE users 
SET subscription_type = 'paid', 
    subscription_expiry = NULL 
WHERE plan_name = 'ultimate';
```

## 📝 نکات مهم

1. **قبل از اجرا**: حتماً بکاپ بگیر
2. **بعد از اجرا**: چک کن که همه کاربران `plan_name` دارن
3. **تست کن**: چند کاربر sample رو بررسی کن
4. **لاگ**: لاگ اجرا رو نگه دار

## 🎉 بعد از اجرای موفقیت‌آمیز

پس از اجرای موفق، می‌تونی کد Go رو آپدیت کنی و ربات رو restart کنی. همه کاربران حالا `plan_name` دارن و سیستم جدید کار می‌کنه!

