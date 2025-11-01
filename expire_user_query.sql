-- ============================================================================
-- QUERY برای EXPIRE کردن کاربر با Telegram ID: 76599340
-- ============================================================================
-- این فایل شامل query های لازم برای expire کردن و تست کردن پروسه expire است
-- 
-- کاربر:
--   - Telegram ID: 76599340
--   - First Name: RAPEXA
--   - Username: @Rapexam
--
-- ============================================================================

-- ============================================================================
-- مرحله 1: بررسی وضعیت فعلی کاربر
-- ============================================================================
SELECT 
    id,
    telegram_id,
    first_name,
    last_name,
    username,
    is_verified,
    subscription_type,
    plan_name,
    subscription_expiry,
    is_active,
    created_at,
    updated_at,
    -- محاسبه وضعیت اشتراک
    CASE 
        -- Legacy users: IsVerified = true و subscription_type = '' یا 'none' = Lifetime
        WHEN is_verified = 1 AND (subscription_type = '' OR subscription_type = 'none') THEN 'Lifetime (Legacy)'
        -- Lifetime license: subscription_type = 'paid' و subscription_expiry IS NULL
        WHEN subscription_type = 'paid' AND subscription_expiry IS NULL THEN 'Lifetime'
        -- Paid subscription با expiry
        WHEN subscription_type = 'paid' AND subscription_expiry IS NOT NULL THEN
            CASE 
                WHEN subscription_expiry < NOW() THEN 'Expired (Paid)'
                ELSE 'Active (Paid)'
            END
        -- Free trial
        WHEN subscription_type = 'free_trial' AND subscription_expiry IS NOT NULL THEN
            CASE 
                WHEN subscription_expiry < NOW() THEN 'Expired (Free Trial)'
                ELSE 'Active (Free Trial)'
            END
        -- No subscription
        ELSE 'No Subscription'
    END as current_subscription_status
FROM users
WHERE telegram_id = 76599340;

-- ============================================================================
-- مرحله 2: EXPIRE کردن کاربر
-- ============================================================================

-- گزینه 1: اگر کاربر subscription_expiry دارد (paid یا free_trial)، آن را expire کنید:
UPDATE users
SET 
    subscription_expiry = DATE_SUB(NOW(), INTERVAL 2 DAY)
WHERE telegram_id = 76599340
  AND subscription_expiry IS NOT NULL;

-- گزینه 2: اگر کاربر Lifetime license دارد (subscription_expiry = NULL یا subscription_type = 'none'):
-- باید آن را به paid تبدیل کنیم و expiry تنظیم کنیم:
UPDATE users
SET 
    subscription_type = 'paid',
    plan_name = 'starter',
    subscription_expiry = DATE_SUB(NOW(), INTERVAL 2 DAY),
    -- حفظ is_verified = true (کاربر قبلاً verified بوده)
    is_verified = 1
WHERE telegram_id = 76599340
  AND (
    subscription_expiry IS NULL 
    OR subscription_type = '' 
    OR subscription_type = 'none'
    OR (is_verified = 1 AND subscription_type = '')
  );

-- گزینه 3: یک query جامع که همه حالات را پوشش می‌دهد:
UPDATE users
SET 
    subscription_type = 'paid',
    plan_name = COALESCE(NULLIF(plan_name, ''), 'starter'),
    subscription_expiry = DATE_SUB(NOW(), INTERVAL 2 DAY),
    is_verified = 1
WHERE telegram_id = 76599340;

-- ============================================================================
-- مرحله 3: بررسی نهایی - اطمینان از expire شدن
-- ============================================================================
-- این query باید نشان دهد که HasActiveSubscription() برای این کاربر false برمی‌گرداند

SELECT 
    id,
    telegram_id,
    first_name,
    username,
    is_verified,
    subscription_type,
    plan_name,
    subscription_expiry,
    is_active,
    -- وضعیت اشتراک (مطابق منطق HasActiveSubscription)
    CASE 
        -- Legacy users: IsVerified = true و subscription_type = '' یا 'none' = Lifetime (Active)
        WHEN is_verified = 1 AND (subscription_type = '' OR subscription_type = 'none') THEN '✅ Active (Legacy Lifetime)'
        -- Lifetime license: subscription_type = 'paid' و subscription_expiry IS NULL = Active
        WHEN subscription_type = 'paid' AND subscription_expiry IS NULL THEN '✅ Active (Lifetime)'
        -- Paid subscription: چک کردن expiry
        WHEN subscription_type = 'paid' AND subscription_expiry IS NOT NULL THEN
            CASE 
                WHEN subscription_expiry < NOW() THEN '❌ Expired (Paid)'
                ELSE '✅ Active (Paid)'
            END
        -- Free trial: چک کردن expiry
        WHEN subscription_type = 'free_trial' AND subscription_expiry IS NOT NULL THEN
            CASE 
                WHEN subscription_expiry < NOW() THEN '❌ Expired (Free Trial)'
                ELSE '✅ Active (Free Trial)'
            END
        -- No subscription
        ELSE '❌ No Subscription'
    END as has_active_subscription,
    -- محاسبه HasActiveSubscription() در Go:
    -- این باید false برگرداند برای کاربر expire شده
    CASE 
        WHEN is_verified = 1 AND (subscription_type = '' OR subscription_type = 'none') THEN 1
        WHEN subscription_type = 'paid' AND subscription_expiry IS NULL THEN 1
        WHEN subscription_type = 'paid' AND subscription_expiry IS NOT NULL AND subscription_expiry >= NOW() THEN 1
        WHEN subscription_type = 'free_trial' AND subscription_expiry IS NOT NULL AND subscription_expiry >= NOW() THEN 1
        ELSE 0
    END as has_active_subscription_bool
FROM users
WHERE telegram_id = 76599340;

-- ============================================================================
-- مرحله 4: تست رفتار سیستم با کاربر expire شده
-- ============================================================================
-- بعد از اجرای query های بالا، رفتارهای زیر باید اتفاق بیفتند:

-- 1. در Telegram Bot:
--    - اگر کاربر هر دکمه‌ای بزند (غیر از "🆘 پشتیبانی" و "🏠 منوی اصلی"):
--      پیام: "⚠️ اشتراک شما به پایان رسید! ..."
--      دو گزینه: "🔐 وارد کردن لایسنس" یا "💳 خرید اشتراک"
--
-- 2. اگر کاربر "🏠 منوی اصلی" بزند:
--    - پیام: "🏠 منوی اصلی:\n\n⚠️ اشتراک شما به پایان رسید! ..."
--    - دکمه‌ها: "🔐 وارد کردن لایسنس" و "💳 خرید اشتراک"
--
-- 3. اگر کاربر "💳 خرید اشتراک" بزند:
--    - سه پلن نمایش داده می‌شود: Starter, Pro, Ultimate
--    - کاربر می‌تواند یکی را انتخاب کند و پرداخت انجام دهد
--
-- 4. در Mini App:
--    - اگر کاربر بخواهد وارد Mini App شود:
--      - API به صورت 403 Forbidden برمی‌گرداند
--      - پیام: "Your subscription has expired. Please return to the bot..."
--      - Mini App overlay نمایش می‌دهد: "اشتراک شما به پایان رسید!"
--      - دکمه: "🔙 بازگشت به ربات و خرید اشتراک"
--
-- 5. API Endpoints:
--    - همه endpoint های /api/v1/ به صورت 403 برمی‌گردانند
--    - پیام خطا: "Your subscription has expired..."

-- ============================================================================
-- مرحله 5: برگرداندن کاربر به حالت عادی (در صورت نیاز برای تست مجدد)
-- ============================================================================
-- برای برگرداندن کاربر به حالت فعال، این query را اجرا کنید:

-- UPDATE users
-- SET 
--     subscription_type = 'paid',
--     plan_name = 'starter',
--     subscription_expiry = DATE_ADD(NOW(), INTERVAL 1 MONTH),
--     is_verified = 1,
--     is_active = 1
-- WHERE telegram_id = 76599340;

-- ============================================================================
-- نکات مهم:
-- ============================================================================
-- 1. بعد از expire کردن، باید ربات را restart کنید یا منتظر بمانید تا کاربر
--    پیامی بفرستد تا checkSubscriptionExpiry() اجرا شود
--
-- 2. برای تست کامل:
--    - ابتدا query های expire را اجرا کنید
--    - سپس با اکانت کاربر در Telegram وارد شوید
--    - یک پیام بفرستید یا یک دکمه را بزنید
--    - ببینید که پیام expire نمایش داده می‌شود
--    - Mini App را باز کنید و ببینید که overlay نمایش داده می‌شود
--
-- 3. اگر کاربر Lifetime license داشته باشد (IsVerified = 1 و subscription_type = 'none'):
--    باید آن را به 'paid' تبدیل کنید و expiry تنظیم کنید
--
-- 4. مطمئن شوید که is_verified = 1 باشد (اگر قبلاً verified بوده)
--    تا سیستم به درستی تشخیص دهد که این یک کاربر expire شده است (نه unverified)

