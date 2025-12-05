-- ============================================
-- 🔍 تشخیص مشکل - بررسی دقیق وضعیت کاربران
-- ============================================

-- 📊 STEP 1: بررسی وجود exercises
SELECT 
    COUNT(*) AS 'تعداد کل exercises',
    COUNT(CASE WHEN status = 'approved' THEN 1 END) AS 'تعداد approved',
    COUNT(CASE WHEN status = 'pending' THEN 1 END) AS 'تعداد pending',
    COUNT(CASE WHEN status = 'needs_revision' THEN 1 END) AS 'تعداد needs_revision'
FROM exercises;

-- 📊 STEP 2: بررسی exercises به تفکیک session
SELECT 
    s.number AS 'شماره session',
    COUNT(e.id) AS 'تعداد کل exercises',
    COUNT(CASE WHEN e.status = 'approved' THEN 1 END) AS 'تعداد approved',
    COUNT(DISTINCT e.user_id) AS 'تعداد کاربران'
FROM exercises e
INNER JOIN sessions s ON s.id = e.session_id
GROUP BY s.number
ORDER BY s.number;

-- 📊 STEP 3: بررسی کاربرانی که exercise approved دارن
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.current_session,
    COUNT(e.id) AS 'تعداد exercises approved',
    GROUP_CONCAT(DISTINCT s.number ORDER BY s.number) AS 'session های کامل شده'
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
WHERE e.status = 'approved'
GROUP BY u.id, u.telegram_id, u.username, u.current_session
ORDER BY u.id
LIMIT 20;

-- 📊 STEP 4: بررسی کاربرانی که current_session کمتر از session کامل شده دارن
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.current_session AS 'current_session فعلی',
    MAX(s.number) AS 'آخرین session کامل شده',
    MAX(s.number) + 1 AS 'باید باشد',
    (MAX(s.number) + 1) - u.current_session AS 'تفاوت'
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
WHERE e.status = 'approved'
GROUP BY u.id, u.telegram_id, u.username, u.current_session
HAVING MAX(s.number) + 1 > u.current_session  -- کاربر باید در مرحله بعدی باشه
ORDER BY u.id;

-- 📊 STEP 5: بررسی کاربرانی که quiz pass کردن ولی current_session update نشده
-- (اگر از quiz evaluation استفاده می‌کنید)
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.current_session,
    COUNT(e.id) AS 'exercises approved',
    MAX(s.number) AS 'max completed session',
    CASE 
        WHEN u.current_session <= MAX(s.number) THEN '⚠️ مشکل داره'
        ELSE '✅ درسته'
    END AS 'وضعیت'
FROM users u
LEFT JOIN exercises e ON e.user_id = u.id AND e.status = 'approved'
LEFT JOIN sessions s ON s.id = e.session_id
WHERE u.is_verified = 1  -- فقط کاربران verified
GROUP BY u.id, u.telegram_id, u.username, u.current_session
HAVING COUNT(e.id) > 0  -- کاربرانی که حداقل یک exercise approved دارن
ORDER BY u.id
LIMIT 50;

-- 📊 STEP 6: بررسی توزیع current_session در کاربران
SELECT 
    current_session AS 'مرحله فعلی',
    COUNT(*) AS 'تعداد کاربران',
    GROUP_CONCAT(DISTINCT id ORDER BY id LIMIT 10) AS 'نمونه user_id ها'
FROM users
WHERE is_verified = 1
GROUP BY current_session
ORDER BY current_session;

-- 📊 STEP 7: بررسی کاربرانی که exercise دارن ولی current_session پایین هست
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.current_session,
    MIN(s.number) AS 'اولین session با exercise',
    MAX(s.number) AS 'آخرین session با exercise',
    COUNT(DISTINCT CASE WHEN e.status = 'approved' THEN s.number END) AS 'تعداد session های approved'
FROM users u
INNER JOIN exercises e ON e.user_id = u.id
INNER JOIN sessions s ON s.id = e.session_id
GROUP BY u.id, u.telegram_id, u.username, u.current_session
HAVING MAX(s.number) > u.current_session  -- کاربر session بالاتری complete کرده
ORDER BY u.id
LIMIT 30;

