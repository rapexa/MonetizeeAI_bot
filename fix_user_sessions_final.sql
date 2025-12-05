-- ============================================
-- 🔧 Fix User Sessions - نسخه نهایی
-- ============================================
-- مشکل: همه exercises pending هستن (approved نیستن)
-- راه‌حل: کاربرانی که exercise دارن (حتی pending) برای session های بالاتر از current_session
-- رو پیدا می‌کنیم و current_session رو به session بعدی منتقل می‌کنیم

-- ============================================
-- 📊 STEP 1: بررسی کاربران مشکل‌دار (قبل از UPDATE)
-- ============================================
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.current_session AS 'current_session فعلی',
    MIN(s.number) AS 'اولین session با exercise',
    MAX(s.number) AS 'آخرین session با exercise',
    COUNT(e.id) AS 'تعداد exercises',
    MAX(s.number) + 1 AS 'باید باشد',
    (MAX(s.number) + 1) - u.current_session AS 'تفاوت'
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
GROUP BY u.id, u.telegram_id, u.username, u.current_session
HAVING MAX(s.number) >= u.current_session  -- کاربر exercise برای session بالاتری داره
ORDER BY u.id;

-- ============================================
-- ✅ STEP 2: UPDATE - باز کردن مرحله بعدی
-- ============================================
-- این کوئری کاربرانی که exercise دارن (حتی pending) برای session های بالاتر از current_session
-- رو پیدا می‌کنه و current_session رو به session بعدی منتقل می‌کنه

UPDATE users u
INNER JOIN (
    -- پیدا کردن آخرین session که کاربر exercise داره (حتی pending)
    SELECT 
        e.user_id,
        MAX(s.number) AS last_session_with_exercise
    FROM exercises e
    INNER JOIN sessions s ON s.id = e.session_id
    GROUP BY e.user_id
) AS user_sessions ON user_sessions.user_id = u.id
SET u.current_session = user_sessions.last_session_with_exercise + 1
WHERE u.current_session <= user_sessions.last_session_with_exercise
  AND user_sessions.last_session_with_exercise > 0;

-- ============================================
-- 📊 STEP 3: بررسی نتایج بعد از UPDATE
-- ============================================
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.current_session AS 'current_session جدید',
    MAX(s.number) AS 'آخرین session با exercise',
    CASE 
        WHEN u.current_session = MAX(s.number) + 1 THEN '✅ Fixed'
        WHEN u.current_session > MAX(s.number) + 1 THEN '✅ OK (بالاتر)'
        ELSE '⚠️ هنوز مشکل داره'
    END AS 'وضعیت'
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
GROUP BY u.id, u.telegram_id, u.username, u.current_session
ORDER BY u.id;

-- ============================================
-- 📈 آمار کلی
-- ============================================
SELECT 
    COUNT(DISTINCT u.id) AS 'تعداد کاربران fix شده',
    AVG((MAX(s.number) + 1) - u.current_session) AS 'میانگین مراحل باز شده'
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
GROUP BY u.id
HAVING MAX(s.number) >= u.current_session;

-- ============================================
-- 🔍 بررسی کاربر خاص (مثال: mohammadGarehbagh)
-- ============================================
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.current_session,
    COUNT(e.id) AS 'تعداد exercises',
    GROUP_CONCAT(DISTINCT s.number ORDER BY s.number) AS 'session های با exercise'
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
WHERE u.username = 'mohammadGarehbagh' OR u.telegram_id = 7403868937
GROUP BY u.id, u.telegram_id, u.username, u.current_session;

