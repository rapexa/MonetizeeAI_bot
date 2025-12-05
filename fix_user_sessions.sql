-- ============================================
-- 🔧 Fix User Sessions - باز کردن مرحله بعدی برای کاربرانی که مرحله قبلی رو کامل کردن
-- ============================================
-- این کوئری کاربرانی که یک مرحله رو کامل کردن ولی مرحله بعدی براشون باز نشده رو پیدا می‌کنه
-- و current_session اونها رو به مرحله بعدی تغییر می‌ده

-- 📊 ابتدا ببینیم چند کاربر مشکل دارن:
SELECT 
    u.id AS user_id,
    u.telegram_id,
    u.username,
    u.current_session AS current_session_old,
    MAX(s.number) AS completed_session_number,
    MAX(s.number) + 1 AS should_be_session,
    COUNT(e.id) AS approved_exercises_count
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
WHERE e.status = 'approved'
  AND u.current_session <= s.number  -- کاربر هنوز در مرحله قبلی یا همون مرحله هست
GROUP BY u.id, u.telegram_id, u.username, u.current_session
HAVING MAX(s.number) >= u.current_session  -- کاربر حداقل یک مرحله رو کامل کرده
ORDER BY u.id;

-- ============================================
-- ✅ UPDATE: باز کردن مرحله بعدی برای کاربران مشکل‌دار
-- ============================================
-- ⚠️ قبل از اجرا، حتماً backup بگیرید!
-- ⚠️ این کوئری فقط کاربرانی که exercise approved دارن ولی current_session به‌روز نشده رو fix می‌کنه

UPDATE users u
INNER JOIN (
    -- پیدا کردن آخرین session که کاربر complete کرده
    SELECT 
        e.user_id,
        MAX(s.number) AS last_completed_session
    FROM exercises e
    INNER JOIN sessions s ON s.id = e.session_id
    WHERE e.status = 'approved'
    GROUP BY e.user_id
) AS completed ON completed.user_id = u.id
SET u.current_session = completed.last_completed_session + 1
WHERE u.current_session <= completed.last_completed_session
  AND completed.last_completed_session > 0;  -- فقط کاربرانی که حداقل یک session complete کردن

-- ============================================
-- 📊 بررسی نتایج بعد از UPDATE
-- ============================================
SELECT 
    u.id AS user_id,
    u.telegram_id,
    u.username,
    u.current_session AS new_current_session,
    MAX(s.number) AS last_completed_session,
    CASE 
        WHEN u.current_session = MAX(s.number) + 1 THEN '✅ Fixed'
        ELSE '⚠️ Still has issue'
    END AS status
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
WHERE e.status = 'approved'
GROUP BY u.id, u.telegram_id, u.username, u.current_session
HAVING MAX(s.number) > 0
ORDER BY u.id;

-- ============================================
-- 🔍 کوئری جایگزین (اگر جدول exercises ندارید یا می‌خواید از user_sessions استفاده کنید)
-- ============================================
-- اگر از جدول user_sessions برای track کردن progress استفاده می‌کنید:

/*
UPDATE users u
INNER JOIN (
    SELECT 
        us.user_id,
        MAX(s.number) AS last_completed_session
    FROM user_sessions us
    INNER JOIN sessions s ON s.id = us.session_id
    GROUP BY us.user_id
) AS completed ON completed.user_id = u.id
SET u.current_session = completed.last_completed_session + 1
WHERE u.current_session <= completed.last_completed_session
  AND completed.last_completed_session > 0;
*/

-- ============================================
-- 📝 توضیحات:
-- ============================================
-- 1. کوئری اول: فقط برای بررسی و دیدن کاربران مشکل‌دار
-- 2. کوئری UPDATE: کاربرانی که exercise approved دارن ولی current_session به‌روز نشده رو fix می‌کنه
-- 3. کوئری بررسی: بعد از UPDATE برای اطمینان از درستی تغییرات
--
-- منطق:
-- - اگر کاربر exercise با status='approved' برای session 5 داره
-- - ولی current_session اون 5 یا کمتر هست
-- - پس باید current_session رو به 6 تغییر بدیم (session بعدی)
--
-- مثال:
-- کاربر A: exercise approved برای session 5 داره، current_session = 5
-- بعد از UPDATE: current_session = 6 ✅
--
-- کاربر B: exercise approved برای session 3 داره، current_session = 2
-- بعد از UPDATE: current_session = 4 ✅

