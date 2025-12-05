-- ============================================
-- 🔧 Fix User Sessions - نسخه ساده و ایمن
-- ============================================
-- این کوئری کاربرانی که یک مرحله رو کامل کردن ولی مرحله بعدی براشون باز نشده رو fix می‌کنه

-- ⚠️ مهم: قبل از اجرا حتماً backup بگیرید!
-- ⚠️ پیشنهاد: ابتدا کوئری SELECT رو اجرا کنید و نتایج رو بررسی کنید

-- ============================================
-- 📊 STEP 1: بررسی کاربران مشکل‌دار (قبل از UPDATE)
-- ============================================
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.current_session AS 'مرحله فعلی',
    MAX(s.number) AS 'آخرین مرحله کامل شده',
    MAX(s.number) + 1 AS 'باید باشد',
    (MAX(s.number) + 1) - u.current_session AS 'تفاوت'
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
WHERE e.status = 'approved'
  AND u.current_session <= s.number
GROUP BY u.id, u.telegram_id, u.username, u.current_session
ORDER BY u.id;

-- ============================================
-- ✅ STEP 2: UPDATE - باز کردن مرحله بعدی
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
WHERE u.current_session <= completed.last_completed;

-- ============================================
-- 📊 STEP 3: بررسی نتایج (بعد از UPDATE)
-- ============================================
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.current_session AS 'مرحله فعلی جدید',
    MAX(s.number) AS 'آخرین مرحله کامل شده',
    CASE 
        WHEN u.current_session = MAX(s.number) + 1 THEN '✅ درست'
        ELSE '⚠️ هنوز مشکل داره'
    END AS 'وضعیت'
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
WHERE e.status = 'approved'
GROUP BY u.id, u.telegram_id, u.username, u.current_session
ORDER BY u.id;

-- ============================================
-- 📈 آمار کلی
-- ============================================
SELECT 
    COUNT(DISTINCT u.id) AS 'تعداد کاربران fix شده',
    SUM((MAX(s.number) + 1) - u.current_session) AS 'تعداد مراحل باز شده'
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
WHERE e.status = 'approved'
  AND u.current_session <= s.number
GROUP BY u.id;

