-- ===============================================
-- Migration Script: Update Users to New Plan System
-- تاریخ: 2025-01-XX
-- توضیحات: این اسکریپت کاربران قدیمی رو به سیستم جدید PlanName منتقل می‌کنه
-- ===============================================

-- ⚠️ هشدار: قبل از اجرا، بکاپ از دیتابیس بگیرید!
-- ⚠️ WARNING: Take a backup before running this script!

-- شروع تراکنش
START TRANSACTION;

-- ==========================================
-- مرحله 1: کاربران Legacy Ultimate (مادام‌العمر)
-- کسانی که IsVerified = 1 هستند و SubscriptionExpiry ندارن
-- ==========================================
UPDATE users 
SET 
    plan_name = 'ultimate',
    subscription_type = 'paid',
    subscription_expiry = NULL,
    updated_at = NOW()
WHERE 
    is_verified = 1 
    AND (subscription_type = '' OR subscription_type = 'none' OR subscription_type IS NULL)
    AND subscription_expiry IS NULL;

-- نمایش تعداد کاربرانی که آپدیت شدن
SELECT CONCAT('✅ مرحله 1 تکمیل شد: ', ROW_COUNT(), ' کاربر Legacy Ultimate آپدیت شدند') AS status;


-- ==========================================
-- مرحله 2: کاربران Paid بدون SubscriptionExpiry
-- (کسایی که قبلاً توی کد paid بودن ولی expiry نداشتن)
-- ==========================================
UPDATE users 
SET 
    plan_name = 'ultimate',
    subscription_expiry = NULL,
    updated_at = NOW()
WHERE 
    subscription_type = 'paid' 
    AND subscription_expiry IS NULL
    AND (plan_name = '' OR plan_name IS NULL);

SELECT CONCAT('✅ مرحله 2 تکمیل شد: ', ROW_COUNT(), ' کاربر Paid به Ultimate تبدیل شدند') AS status;


-- ==========================================
-- مرحله 3: کاربران Free Trial
-- ==========================================
UPDATE users 
SET 
    plan_name = 'free_trial',
    updated_at = NOW()
WHERE 
    subscription_type = 'free_trial'
    AND (plan_name = '' OR plan_name IS NULL);

SELECT CONCAT('✅ مرحله 3 تکمیل شد: ', ROW_COUNT(), ' کاربر Free Trial آپدیت شدند') AS status;


-- ==========================================
-- مرحله 4: کاربران با اشتراک محدود (Starter/Pro)
-- بر اساس روزهای باقیمانده تعیین می‌شه
-- ==========================================
UPDATE users 
SET 
    plan_name = CASE 
        WHEN DATEDIFF(subscription_expiry, NOW()) BETWEEN 1 AND 35 THEN 'starter'
        WHEN DATEDIFF(subscription_expiry, NOW()) BETWEEN 36 AND 200 THEN 'pro'
        WHEN DATEDIFF(subscription_expiry, NOW()) > 200 THEN 'ultimate'
        ELSE 'starter'  -- fallback
    END,
    updated_at = NOW()
WHERE 
    subscription_type = 'paid' 
    AND subscription_expiry IS NOT NULL
    AND subscription_expiry > NOW()
    AND (plan_name = '' OR plan_name IS NULL);

SELECT CONCAT('✅ مرحله 4 تکمیل شد: ', ROW_COUNT(), ' کاربر Paid با Expiry آپدیت شدند') AS status;


-- ==========================================
-- مرحله 5: کاربران بدون اشتراک فعال
-- (کاربران verified نیستن)
-- ==========================================
UPDATE users 
SET 
    plan_name = '',
    subscription_type = COALESCE(subscription_type, 'none'),
    updated_at = NOW()
WHERE 
    is_verified = 0 
    AND (subscription_type = '' OR subscription_type IS NULL)
    AND subscription_expiry IS NULL;

SELECT CONCAT('✅ مرحله 5 تکمیل شد: ', ROW_COUNT(), ' کاربر بدون اشتراک آپدیت شدند') AS status;


-- ==========================================
-- نمایش خلاصه تغییرات
-- ==========================================
SELECT 
    plan_name,
    COUNT(*) as count,
    CASE 
        WHEN plan_name = 'ultimate' THEN '👑 مادام‌العمر'
        WHEN plan_name = 'starter' THEN '🚀 Starter'
        WHEN plan_name = 'pro' THEN '⚡ Pro'
        WHEN plan_name = 'free_trial' THEN '🎁 Free Trial'
        WHEN plan_name = '' OR plan_name IS NULL THEN '❌ بدون اشتراک'
        ELSE plan_name
    END as display_name
FROM users
GROUP BY plan_name
ORDER BY count DESC;


-- ==========================================
-- تأیید نهایی (اگر همه چیز درست بود، COMMIT کن)
-- اگه مشکلی بود، دستی ROLLBACK بزن
-- ==========================================

-- برای commit کردن تغییرات:
-- COMMIT;

-- برای rollback کردن (اگه مشکلی بود):
-- ROLLBACK;

SELECT '⚠️ تغییرات آماده هستند. برای commit کردن بنویسید: COMMIT;' AS instruction;

