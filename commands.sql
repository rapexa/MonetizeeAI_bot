-- Create the database
CREATE DATABASE IF NOT EXISTS monetizeeai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create new user and grant privileges
CREATE USER IF NOT EXISTS 'monetizeeai_user'@'localhost' IDENTIFIED BY 'monetizeeai_pass';
GRANT ALL PRIVILEGES ON monetizeeai.* TO 'monetizeeai_user'@'localhost';
FLUSH PRIVILEGES;

-- Use the database
USE monetizeeai;

-- Create users table (GORM will handle this, but here's the structure for reference)
CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    telegram_id BIGINT UNIQUE,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    current_session INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    number INT UNIQUE,
    title VARCHAR(255),
    description TEXT,
    thumbnail_url VARCHAR(512)
);

-- Create videos table
CREATE TABLE IF NOT EXISTS videos (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    title VARCHAR(255),
    description TEXT,
    date TIMESTAMP,
    video_link VARCHAR(512),
    session_id BIGINT UNSIGNED,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Create exercises table
CREATE TABLE IF NOT EXISTS exercises (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    user_id BIGINT UNSIGNED,
    session_id BIGINT UNSIGNED,
    content TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    feedback TEXT,
    submitted_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Create user_sessions table for many-to-many relationship
CREATE TABLE IF NOT EXISTS user_sessions (
    user_id BIGINT UNSIGNED,
    session_id BIGINT UNSIGNED,
    PRIMARY KEY (user_id, session_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Insert all sessions with the same thumbnail
INSERT INTO sessions (number, title, description, thumbnail_url) VALUES
-- فصل ۱: انتخاب ایده
(1, 'ایده، نقطه شروع! 🚀💡', 'تو این جلسه متوجه می‌شی چرا انتخاب ایده اولین و مهم‌ترین قدمه. اینجا یاد می‌گیری چطور ذهن‌ت رو برای ساخت یه مسیر واقعی پول‌سازی با AI آماده کنی و از همون اول، مسیرتو درست بچینی.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(2, 'یه ایده پول‌ساز چه شکلیه؟ 💰✨', 'تو این جلسه دقیق یاد می‌گیری یه ایده خوب باید چه ویژگی‌هایی داشته باشه تا واقعاً با هوش مصنوعی قابل اجرا باشه، مشتری براش وجود داشته باشه و به درآمد برسه.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(3, 'جادوی ایده‌سازی با GPT 🤖🧠', 'وقتشه وارد زمین بازی AI بشی! تو این جلسه یاد می‌گیری چطور با کمک GPT برای خودت ایده‌هایی خاص، شخصی‌سازی‌شده و متفاوت تولید کنی که دقیقاً به درد خودت بخوره.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(4, 'انتخاب نهایی؛ بیزینس تو از اینجا شروع میشه! 🎯✅', 'حالا که کلی ایده ساختی، وقت انتخابه. تو این جلسه تمرین می‌کنی چطور بین ایده‌هات مقایسه دقیق انجام بدی و یکی رو به‌عنوان مسیر اصلی‌ت انتخاب کنی.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(5, 'پیش‌نمایش سرویس؛ قراره دقیقاً چه مشکلی رو حل کنی؟ 🔍🛠', 'تو این جلسه می‌ری سراغ اصل ماجرا: ایده‌ت قراره چه درد و نیازی رو حل کنه؟ چه کسی بهش نیاز داره؟ با چه مدلی قراره اجرا بشه؟', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),

-- فصل ۲: ساخت سرویس اولیه با AI
(6, 'سرویس واقعی بساز، نه صرفاً یه ایده! 🛠🤖', 'تو این جلسه یاد می‌گیری چطور ایده‌ت رو تبدیل به یه سرویس واقعی و قابل ارائه کنی. سرویسی که بشه باهاش تست گرفت، فروخت و ازش پول درآورد – با کمک AI!', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(7, 'چرا مشتری باید از تو بخره؟ 🔥💬', 'تو این جلسه قراره مزیت رقابتی سرویس‌ت رو بشناسی. چه چیزی باعث می‌شه مشتری به تو اعتماد کنه و نه بقیه؟ اینجا یاد می‌گیری چطور تمایز واقعی بسازی.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(8, 'معرفی کامل سرویس در یک پاراگراف 💎📄', 'تو این جلسه تمرین می‌کنی معرفی سرویست رو به شکلی کوتاه، جذاب و کامل بنویسی. یه معرفی ۲۰ ثانیه‌ای که می‌تونه مخاطب رو قانع کنه ادامه بده.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),

-- فصل ۳: ساخت برند حرفه‌ای با کمک AI
(9, 'اسم برند، شعار، پیام! 🧠🔤', 'تو این جلسه یاد می‌گیری چطور با کمک GPT یه اسم حرفه‌ای، شعار تأثیرگذار و پیام برند بسازی که تو ذهن بمونه و هویتت رو مشخص کنه.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(10, 'رنگ، فونت، شخصیت برند 🎨✍️', 'تو این جلسه با هوش مصنوعی یه هویت بصری برای برندت طراحی می‌کنی؛ از رنگ سازمانی گرفته تا فونت و لحن شخصیت برند.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(11, 'لوگو، آواتار، گرافیک برند با AI 🖼🤖', 'تو این جلسه یاد می‌گیری چطور با ابزارهای هوش مصنوعی لوگو، آواتار حرفه‌ای و تم گرافیکی پیجت رو بسازی، حتی اگه طراحی بلد نباشی.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),

-- فصل ۴: ساخت زیرساخت فروش
(12, 'پیج اینستاگرامی بفروش، نه ویترین! 📱��', 'تو این جلسه یاد می‌گیری چطور یه پیج اینستاگرامی حرفه‌ای و هدفمند طراحی کنی که مخاطب جذب کنه، اعتماد بسازه و مقدمات فروش رو بچینه.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(13, 'بایو و پروفایل فروشنده‌ساز ✍️👤', 'تو این جلسه تمرین می‌کنی با کمک GPT یه بایو حرفه‌ای و پروفایلی طراحی کنی که به جای تو حرف بزنه، اعتماد بسازه و مشتری جذب کنه.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(14, 'پست‌هایی که می‌فروشن! 📸��', 'تو این جلسه یاد می‌گیری چه پست‌ها و استوری‌هایی باعث می‌شن مخاطب بهت اعتماد کنه، مشارکت کنه و ازت خرید کنه – حتی بدون فالوئر زیاد!', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),

-- فصل ۵: جذب اولین مشتری
(15, 'نمونه‌کار بدون مشتری؟ ممکنه! 💼��', 'تو این جلسه یاد می‌گیری چطور حتی بدون داشتن مشتری رسمی، یه نمونه‌کار قوی و قابل ارائه برای جلب اعتماد مشتری‌ها بسازی.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(16, 'طراحی مسیر مشتری؛ از آگاهی تا خرید 🧭🛒', 'تو این جلسه مسیر ذهنی و عملی مشتری رو می‌سازی. از لحظه‌ای که باهات آشنا می‌شه تا لحظه‌ای که بهت پول می‌ده – همه چی باید هدفمند باشه.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(17, 'گرفتن پروژه حتی با صفر سابقه رسمی 🚪🤝', 'تو این جلسه یاد می‌گیری چطور اولین پروژه‌ت رو بگیری حتی اگه هیچی رزومه نداری. تکنیک‌های ورود حرفه‌ای با کمک پیام‌های GPT‌محور رو اینجا می‌بینی.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),

-- فصل ۶: دریافت پول از مشتری خارجی
(18, 'بدون بلد بودن زبان، با مشتری کار کن! 🌍💬', 'تو این جلسه یاد می‌گیری چطور حتی اگه زبانت خوب نیست، با ابزارهای هوش مصنوعی ارتباط حرفه‌ای با مشتری بین‌المللی برقرار کنی و کار رو جلو ببری.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(19, 'قرارداد حرفه‌ای با کمک GPT 📄🤖', 'تو این جلسه یاد می‌گیری چطور با کمک GPT یه قرارداد حرفه‌ای، کامل و مطمئن بنویسی که هم تو راحت باشی، هم مشتری خارجی با خیال راحت پول بده.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(20, 'نقد کردن پول؛ راحت، سریع، بی‌دردسر 💸🌐', 'تو این جلسه روش‌های نقد کردن درآمد دلاری از مشتری خارجی رو یاد می‌گیری، حتی اگه ساکن ایران باشی و حساب بین‌المللی نداشته باشی.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),

-- فصل ۷: ساخت سیستم ارتباط و فروش خودکار
(21, 'پیام بده، بفروش… بدون دخالت تو! 🤖💬', 'تو این جلسه یاد می‌گیری چطور یه سیستم پیام‌رسان خودکار طراحی کنی که بعد از ورود مشتری، همه‌چیو خودش دنبال کنه؛ از معرفی سرویس تا دعوت به خرید!', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(22, 'GoHighLevel: بازاریاب شبانه‌روزی تو! ⏰🧠', 'تو این جلسه می‌ری سراغ GoHighLevel یا ابزارهای مشابه، و یاد می‌گیری چطور یه ماشین فروش هوشمند بسازی که خودش لیدها رو پیگیری و مشتری تبدیل کنه.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(23, 'ارتباط هوشمند با ایمیل، واتساپ، دایرکت 📲💌', 'تو این جلسه یاد می‌گیری چطور سیستم اتوماسیون پیام‌رسانی رو از طریق ایمیل، واتساپ یا دایرکت پیاده‌سازی کنی تا حتی وقتی خوابی، فروش در جریان باشه.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),

-- فصل ۸: تیم فروش هوش مصنوعی
(24, 'تیم فروشی از آواتارهای AI بساز! ��‍💼🧠', 'تو این جلسه یاد می‌گیری چطور با کمک آواتارها و کاراکترهای هوش مصنوعی، یه تیم فروش کاملاً خودکار بسازی که به‌جای تو حرف بزنه، معرفی کنه و بفروشه!', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(25, 'تماس فروش خودکار با VoiceBot 📞🤖', 'تو این جلسه می‌سازی یه VoiceBot یا AI Caller که خودش به مشتری زنگ می‌زنه، اطلاعات می‌ده و راهنمایی‌ش می‌کنه – بدون اینکه تو حتی گوشی برداری!', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(26, 'بستن فروش با تیم هوش مصنوعی 🔐💸', 'تو این جلسه می‌چینی یک مسیر فروش کامل و اتومات با کمک تمام ابزارهای AI که تا الان ساختی، از لید تا تبدیل نهایی – مثل یه کمپین حرفه‌ای.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),

-- فصل ۹: جهش درآمدی و ساخت سیستم پایدار
(27, 'بازار درست = درآمد بیشتر 🌍🎯', 'تو این جلسه یاد می‌گیری چطور بازار بین‌المللی مناسب برای سرویس‌ت رو انتخاب کنی؛ جایی که هم مشتری هست، هم رقابت کمتر، هم درآمد بالاتر!', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(28, 'ساخت زیرساخت تیمی برای رشد ۱۰ برابری 🏗📈', 'تو این جلسه سیستم و تیمی طراحی می‌کنی که بتونه در آینده حجم بالای مشتری و فروش رو مدیریت کنه؛ از ابزار گرفته تا همکاری.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png'),
(29, 'نقشه رشد ۹۰ روزه برای جهش واقعی 🗺🔥', 'تو این جلسه یه نقشه اجرایی ۹۰ روزه طراحی می‌کنی؛ با قدم‌های واضح، تاریخ‌دار و قابل پیگیری تا بتونی سریع‌تر و هوشمندانه‌تر رشد کنی.', 'https://cdn.prod.website-files.com/655741af3f04e006606d26ad/667ed686d454868b6554bc69_image%20312-min.png');

-- Insert sample videos for each session
INSERT INTO videos (title, description, date, video_link, session_id) VALUES
('ویدیوی جلسه ۱', 'آموزش کامل جلسه اول', NOW(), 'https://example.com/video1', 1),
('ویدیوی جلسه ۲', 'آموزش کامل جلسه دوم', NOW(), 'https://example.com/video2', 2),
('ویدیوی جلسه ۳', 'آموزش کامل جلسه سوم', NOW(), 'https://example.com/video3', 3),
('ویدیوی جلسه ۴', 'آموزش کامل جلسه چهارم', NOW(), 'https://example.com/video4', 4),
('ویدیوی جلسه ۵', 'آموزش کامل جلسه پنجم', NOW(), 'https://example.com/video5', 5),
('ویدیوی جلسه ۶', 'آموزش کامل جلسه ششم', NOW(), 'https://example.com/video6', 6),
('ویدیوی جلسه ۷', 'آموزش کامل جلسه هفتم', NOW(), 'https://example.com/video7', 7),
('ویدیوی جلسه ۸', 'آموزش کامل جلسه هشتم', NOW(), 'https://example.com/video8', 8),
('ویدیوی جلسه ۹', 'آموزش کامل جلسه نهم', NOW(), 'https://example.com/video9', 9),
('ویدیوی جلسه ۱۰', 'آموزش کامل جلسه دهم', NOW(), 'https://example.com/video10', 10),
('ویدیوی جلسه ۱۱', 'آموزش کامل جلسه یازدهم', NOW(), 'https://example.com/video11', 11),
('ویدیوی جلسه ۱۲', 'آموزش کامل جلسه دوازدهم', NOW(), 'https://example.com/video12', 12),
('ویدیوی جلسه ۱۳', 'آموزش کامل جلسه سیزدهم', NOW(), 'https://example.com/video13', 13),
('ویدیوی جلسه ۱۴', 'آموزش کامل جلسه چهاردهم', NOW(), 'https://example.com/video14', 14),
('ویدیوی جلسه ۱۵', 'آموزش کامل جلسه پانزدهم', NOW(), 'https://example.com/video15', 15),
('ویدیوی جلسه ۱۶', 'آموزش کامل جلسه شانزدهم', NOW(), 'https://example.com/video16', 16),
('ویدیوی جلسه ۱۷', 'آموزش کامل جلسه هفدهم', NOW(), 'https://example.com/video17', 17),
('ویدیوی جلسه ۱۸', 'آموزش کامل جلسه هجدهم', NOW(), 'https://example.com/video18', 18),
('ویدیوی جلسه ۱۹', 'آموزش کامل جلسه نوزدهم', NOW(), 'https://example.com/video19', 19),
('ویدیوی جلسه ۲۰', 'آموزش کامل جلسه بیستم', NOW(), 'https://example.com/video20', 20),
('ویدیوی جلسه ۲۱', 'آموزش کامل جلسه بیست و یکم', NOW(), 'https://example.com/video21', 21),
('ویدیوی جلسه ۲۲', 'آموزش کامل جلسه بیست و دوم', NOW(), 'https://example.com/video22', 22),
('ویدیوی جلسه ۲۳', 'آموزش کامل جلسه بیست و سوم', NOW(), 'https://example.com/video23', 23),
('ویدیوی جلسه ۲۴', 'آموزش کامل جلسه بیست و چهارم', NOW(), 'https://example.com/video24', 24),
('ویدیوی جلسه ۲۵', 'آموزش کامل جلسه بیست و پنجم', NOW(), 'https://example.com/video25', 25),
('ویدیوی جلسه ۲۶', 'آموزش کامل جلسه بیست و ششم', NOW(), 'https://example.com/video26', 26),
('ویدیوی جلسه ۲۷', 'آموزش کامل جلسه بیست و هفتم', NOW(), 'https://example.com/video27', 27),
('ویدیوی جلسه ۲۸', 'آموزش کامل جلسه بیست و هشتم', NOW(), 'https://example.com/video28', 28),
('ویدیوی جلسه ۲۹', 'آموزش کامل جلسه بیست و نهم', NOW(), 'https://example.com/video29', 29);

-- Create indexes for better performance
CREATE INDEX idx_users_telegram_id ON users(telegram_id);
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_exercises_session_id ON exercises(session_id);
CREATE INDEX idx_videos_session_id ON videos(session_id); 