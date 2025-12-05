-- ============================================
-- 🔧 Fix User Sessions - نسخه سریع و ساده
-- ============================================
-- این کوئری کاربرانی که exercise دارن (حتی pending) برای session های بالاتر از current_session
-- رو پیدا می‌کنه و current_session رو به session بعدی منتقل می‌کنه

-- ⚠️ مهم: قبل از اجرا حتماً backup بگیرید!
-- ⚠️ پیشنهاد: ابتدا کوئری SELECT رو اجرا کنید و نتایج رو بررسی کنید

-- ============================================
-- 📊 بررسی قبل از UPDATE
-- ============================================
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.current_session AS 'فعلی',
    MAX(s.number) AS 'آخرین session با exercise',
    MAX(s.number) + 1 AS 'باید باشد',
    (MAX(s.number) + 1) - u.current_session AS 'تفاوت'
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
GROUP BY u.id, u.telegram_id, u.username, u.current_session
HAVING MAX(s.number) >= u.current_session
ORDER BY u.id;

-- ============================================
-- ✅ UPDATE - Fix کردن کاربران
-- ============================================
UPDATE users u
INNER JOIN (
    SELECT 
        e.user_id,
        MAX(s.number) AS last_session
    FROM exercises e
    INNER JOIN sessions s ON s.id = e.session_id
    GROUP BY e.user_id
) AS user_max ON user_max.user_id = u.id
SET u.current_session = user_max.last_session + 1
WHERE u.current_session <= user_max.last_session;

-- ============================================
-- 📊 بررسی بعد از UPDATE
-- ============================================
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.current_session AS 'جدید',
    MAX(s.number) AS 'آخرین session',
    CASE 
        WHEN u.current_session = MAX(s.number) + 1 THEN '✅ OK'
        ELSE '⚠️ مشکل'
    END AS 'وضعیت'
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
GROUP BY u.id, u.telegram_id, u.username, u.current_session
ORDER BY u.id;

