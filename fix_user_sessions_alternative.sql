-- ============================================
-- 🔧 Fix User Sessions - نسخه جایگزین (اگر exercises خالی بود)
-- ============================================
-- این کوئری از روش‌های مختلف برای پیدا کردن کاربران مشکل‌دار استفاده می‌کنه

-- ============================================
-- روش 1: استفاده از exercises (اگر exercises دارید)
-- ============================================
UPDATE users u
INNER JOIN (
    SELECT 
        e.user_id,
        MAX(s.number) AS last_completed
    FROM exercises e
    INNER JOIN sessions s ON s.id = e.session_id
    WHERE e.status = 'approved'
    GROUP BY e.user_id
) AS completed ON completed.user_id = u.id
SET u.current_session = completed.last_completed + 1
WHERE u.current_session <= completed.last_completed
  AND completed.last_completed > 0;

-- ============================================
-- روش 2: استفاده از user_sessions (اگر از این جدول استفاده می‌کنید)
-- ============================================
-- اگر جدول user_sessions دارید که نشون میده کدوم کاربر کدوم session رو complete کرده:
/*
UPDATE users u
INNER JOIN (
    SELECT 
        us.user_id,
        MAX(s.number) AS last_completed
    FROM user_sessions us
    INNER JOIN sessions s ON s.id = us.session_id
    GROUP BY us.user_id
) AS completed ON completed.user_id = u.id
SET u.current_session = completed.last_completed + 1
WHERE u.current_session <= completed.last_completed
  AND completed.last_completed > 0;
*/

-- ============================================
-- روش 3: Fix بر اساس quiz evaluation (اگر از quiz استفاده می‌کنید)
-- ============================================
-- اگر کاربران quiz pass کردن ولی current_session update نشده:
-- این کوئری کاربرانی که verified هستن ولی current_session پایین دارن رو fix می‌کنه
-- ⚠️ این روش فقط برای کاربران verified هست و باید با احتیاط استفاده بشه

/*
-- ابتدا ببینید چند کاربر مشکل دارن:
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.current_session,
    u.is_verified,
    CASE 
        WHEN u.is_verified = 1 AND u.current_session < 5 THEN '⚠️ ممکنه مشکل داشته باشه'
        ELSE '✅ احتمالاً درسته'
    END AS 'وضعیت'
FROM users u
WHERE u.is_verified = 1
  AND u.current_session < 5  -- کاربران verified معمولاً باید در session بالاتری باشن
ORDER BY u.id;
*/

-- ============================================
-- روش 4: Fix دستی برای کاربران خاص
-- ============================================
-- اگر می‌دونید کدوم کاربران مشکل دارن، می‌تونید دستی fix کنید:

/*
-- مثال: باز کردن مرحله 6 برای کاربر با telegram_id = 123456789
UPDATE users 
SET current_session = 6 
WHERE telegram_id = 123456789 
  AND current_session < 6;
*/

-- ============================================
-- روش 5: Fix همه کاربران verified (خطرناک - فقط در صورت نیاز)
-- ============================================
-- ⚠️ این روش فقط برای کاربرانی که verified هستن و current_session پایین دارن
-- ⚠️ حتماً قبل از اجرا backup بگیرید و با احتیاط استفاده کنید

/*
-- ابتدا بررسی کنید:
SELECT 
    COUNT(*) AS 'تعداد کاربران',
    AVG(current_session) AS 'میانگین current_session',
    MIN(current_session) AS 'کمترین',
    MAX(current_session) AS 'بیشترین'
FROM users
WHERE is_verified = 1;

-- اگر می‌خواید همه کاربران verified رو به یک session خاص منتقل کنید:
-- UPDATE users 
-- SET current_session = 5  -- یا هر عددی که می‌خواید
-- WHERE is_verified = 1 
--   AND current_session < 5;
*/

-- ============================================
-- 📊 بررسی نتایج بعد از هر UPDATE
-- ============================================
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.current_session AS 'current_session جدید',
    u.is_verified,
    COUNT(e.id) AS 'exercises approved',
    MAX(s.number) AS 'last completed session'
FROM users u
LEFT JOIN exercises e ON e.user_id = u.id AND e.status = 'approved'
LEFT JOIN sessions s ON s.id = e.session_id
WHERE u.is_verified = 1
GROUP BY u.id, u.telegram_id, u.username, u.current_session, u.is_verified
HAVING COUNT(e.id) > 0 OR u.current_session > 1
ORDER BY u.id
LIMIT 50;

