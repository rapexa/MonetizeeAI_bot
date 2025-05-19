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
    pdf_file VARCHAR(512),
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

INSERT INTO sessions (number, title, description, thumbnail_url) VALUES
(1, '1️⃣ [مرحله ۱ از مسیر MonetizeAI | سطح ۱: پیدا کردن ایده پول‌ساز] | ایده، نقطه شروع! 🚀💡', 'تو این مرحله متوجه می‌شی چرا انتخاب ایده اولین و مهم‌ترین قدمه.
اینجا یاد می‌گیری چطور ذهن‌ت رو برای ساخت یه مسیر واقعی پول‌سازی با AI آماده کنی و از همون اول، مسیرتو درست بچینی.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j1.png'),
(2, '2️⃣ [مرحله ۲ از مسیر MonetizeAI | سطح ۱: پیدا کردن ایده پول‌ساز] | یه ایده پول‌ساز چه شکلیه؟ 💰✨', 'تو این مرحله دقیق یاد می‌گیری یه ایده خوب باید چه ویژگی‌هایی داشته باشه تا واقعاً با هوش مصنوعی قابل اجرا باشه، مشتری براش وجود داشته باشه و به درآمد برسه.
اینجا قراره عین یه کارآگاه، ایده‌ها رو بررسی کنی و بفهمی کدوماشون ارزش پیگیری دارن!

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j2.png'),
(3, '3️⃣ [مرحله ۳ از مسیر MonetizeAI | سطح ۱: پیدا کردن ایده پول‌ساز] | جادوی ایده‌سازی با GPT 🤖🧠', 'وقتشه وارد زمین بازی AI بشی! تو این مرحله یاد می‌گیری چطور با کمک GPT برای خودت ایده‌هایی خاص، شخصی‌سازی‌شده و متفاوت تولید کنی که دقیقاً به درد خودت بخوره.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j3.png'),
(4, '4️⃣ [مرحله ۴ از مسیر MonetizeAI | سطح ۱: پیدا کردن ایده پول‌ساز] | انتخاب نهایی؛ بیزینس تو از اینجا شروع میشه! 🎯✅', 'حالا که کلی ایده ساختی، وقت انتخابه. تو این مرحله تمرین می‌کنی چطور بین ایده‌هات مقایسه دقیق انجام بدی و یکی رو به‌عنوان مسیر اصلی‌ت انتخاب کنی.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j4.png'),
(5, '5️⃣ [مرحله ۵ از مسیر MonetizeAI | سطح ۱: پیدا کردن ایده پول‌ساز] | پیش‌نمایش سرویس؛ قراره دقیقاً چه مشکلی رو حل کنی؟ 🔍🛠', 'تو این مرحله می‌ری سراغ اصل ماجرا: ایده‌ت قراره چه درد و نیازی رو حل کنه؟ چه کسی بهش نیاز داره؟ با چه مدلی قراره اجرا بشه؟
یاد می‌گیری چطور همه‌ی اینا رو تو یه پیش‌نمایش قانع‌کننده خلاصه کنی.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j5.png'),
(6, '6️⃣ [مرحله ۶ از مسیر MonetizeAI | سطح ۲: ساخت سرویس اولیه] | سرویس واقعی بساز، نه صرفاً یه ایده! 🛠🤖', 'تو این مرحله یاد می‌گیری چطور ایده‌ت رو تبدیل به یه سرویس واقعی و قابل ارائه کنی.
سرویسی که بشه باهاش تست گرفت، فروخت و ازش پول درآورد – با کمک AI!

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j6.png'),
(7, '7️⃣ [مرحله ۷ از مسیر MonetizeAI | سطح ۲: ساخت سرویس اولیه] | چرا مشتری باید از تو بخره؟ 🔥💬', 'تو این مرحله قراره مزیت رقابتی سرویس‌ت رو بشناسی.
چه چیزی باعث می‌شه مشتری به تو اعتماد کنه و نه بقیه؟
اینجا یاد می‌گیری چطور تمایز واقعی بسازی.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j7.png'),
(8, '8️⃣ [مرحله ۸ از مسیر MonetizeAI | سطح ۲: ساخت سرویس اولیه] | معرفی کامل سرویس در یک پاراگراف 💎📄', 'تو این مرحله تمرین می‌کنی معرفی سرویست رو به شکلی کوتاه، جذاب و کامل بنویسی.
یه معرفی ۲۰ ثانیه‌ای که می‌تونه مخاطب رو قانع کنه ادامه بده.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j8.png'),
(9, '9️⃣ [مرحله ۹ از مسیر MonetizeAI | سطح ۳: ساخت برند حرفه‌ای با AI] | اسم برند، شعار، پیام! 🧠🔤', 'تو این مرحله یاد می‌گیری چطور با کمک GPT یه اسم حرفه‌ای، شعار تأثیرگذار و پیام برند بسازی که تو ذهن بمونه و هویتت رو مشخص کنه.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j9.png'),
(10, '🔟 [مرحله ۱۰ از مسیر MonetizeAI | سطح ۳: ساخت برند حرفه‌ای با AI] | رنگ، فونت، شخصیت برند 🎨✍️', 'تو این مرحله با هوش مصنوعی یه هویت بصری برای برندت طراحی می‌کنی؛
از رنگ سازمانی گرفته تا فونت و لحن شخصیت برند.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j10.png'),
(11, '1️⃣1️⃣ [مرحله ۱۱ از مسیر MonetizeAI | سطح ۳: ساخت برند حرفه‌ای با AI] | لوگو، آواتار، گرافیک برند با AI 🖼🤖', 'تو این مرحله یاد می‌گیری چطور با ابزارهای هوش مصنوعی لوگو، آواتار حرفه‌ای و تم گرافیکی پیجت رو بسازی، حتی اگه طراحی بلد نباشی.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j11.png'),
(12, '2️⃣1️⃣ [مرحله ۱۲ از مسیر MonetizeAI | سطح ۴: ساخت زیرساخت فروش] | پیج اینستاگرامی بفروش، نه ویترین! 📱💼', 'تو این مرحله یاد می‌گیری چطور یه پیج اینستاگرامی حرفه‌ای و هدفمند طراحی کنی
که مخاطب جذب کنه، اعتماد بسازه و مقدمات فروش رو بچینه.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j12.png'),
(13, '3️⃣1️⃣ [مرحله ۱۳ از مسیر MonetizeAI | سطح ۴: ساخت زیرساخت فروش] | بایو و پروفایل فروشنده‌ساز ✍️👤', 'تو این مرحله تمرین می‌کنی با کمک GPT یه بایو حرفه‌ای و پروفایلی طراحی کنی
که به جای تو حرف بزنه، اعتماد بسازه و مشتری جذب کنه.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j13.png'),
(14, '4️⃣1️⃣ [مرحله ۱۴ از مسیر MonetizeAI | سطح ۴: ساخت زیرساخت فروش] | پست‌هایی که می‌فروشن! 📸🧲', 'تو این مرحله یاد می‌گیری چه پست‌ها و استوری‌هایی باعث می‌شن مخاطب بهت اعتماد کنه، مشارکت کنه
و ازت خرید کنه – حتی بدون فالوئر زیاد!

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j14.png'),
(15, '5️⃣1️⃣ [مرحله ۱۵ از مسیر MonetizeAI | سطح ۵: جذب اولین مشتری] | نمونه‌کار بدون مشتری؟ ممکنه! 💼🎯', 'تو این مرحله یاد می‌گیری چطور حتی بدون داشتن مشتری رسمی،
یه نمونه‌کار قوی و قابل ارائه برای جلب اعتماد مشتری‌ها بسازی.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j15.png'),
(16, '6️⃣1️⃣ [مرحله ۱۶ از مسیر MonetizeAI | سطح ۵: جذب اولین مشتری] | طراحی مسیر مشتری؛ از آگاهی تا خرید 🧭🛒', 'تو این مرحله مسیر ذهنی و عملی مشتری رو می‌سازی.
از لحظه‌ای که باهات آشنا می‌شه تا لحظه‌ای که بهت پول می‌ده – همه چی باید هدفمند باشه.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j16.png'),
(17, '7️⃣1️⃣ [مرحله ۱۷ از مسیر MonetizeAI | سطح ۵: جذب اولین مشتری] | گرفتن پروژه حتی با صفر سابقه رسمی 🚪🤝', 'تو این مرحله یاد می‌گیری چطور اولین پروژه‌ت رو بگیری حتی اگه هیچی رزومه نداری.
تکنیک‌های ورود حرفه‌ای با کمک پیام‌های GPT‌محور رو اینجا می‌بینی.

ویدیوی این مرحله منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j17.png'),
(18, '8️⃣1️⃣ [مرحله ۱۸ از مسیر MonetizeAI | سطح ۶: دریافت پول از مشتری خارجی] | بدون بلد بودن زبان، با مشتری کار کن! 🌍💬', 'تو این جلسه یاد می‌گیری چطور حتی اگه زبانت خوب نیست، با ابزارهای هوش مصنوعی ارتباط حرفه‌ای با مشتری بین‌المللی برقرار کنی و کار رو جلو ببری.

ویدیوی این جلسه منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j18.png'),
(19, '9️⃣1️⃣ [مرحله ۱۹ از مسیر MonetizeAI | سطح ۶: دریافت پول از مشتری خارجی] | قرارداد حرفه‌ای با کمک GPT 📄🤖', 'تو این جلسه یاد می‌گیری چطور با کمک GPT یه قرارداد حرفه‌ای، کامل و مطمئن بنویسی که هم تو راحت باشی، هم مشتری خارجی با خیال راحت پول بده.

ویدیوی این جلسه منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j19.png'),
(20, '0️⃣2️⃣[مرحله ۲۰ از مسیر MonetizeAI | سطح ۶: دریافت پول از مشتری خارجی] | نقد کردن پول؛ راحت، سریع، بی‌دردسر 💸🌐', 'تو این جلسه روش‌های نقد کردن درآمد دلاری از مشتری خارجی رو یاد می‌گیری، حتی اگه ساکن ایران باشی و حساب بین‌المللی نداشته باشی.

ویدیوی این جلسه منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j20.png'),
(21, '1️⃣2️⃣ [مرحله ۲۱ از مسیر MonetizeAI | سطح ۷: ساخت سیستم ارتباط و فروش خودکار] | پیام بده، بفروش… بدون دخالت تو! 🤖💬', 'تو این جلسه یاد می‌گیری چطور یه سیستم پیام‌رسان خودکار طراحی کنی که بعد از ورود مشتری، همه‌چیو خودش دنبال کنه؛ از معرفی سرویس تا دعوت به خرید!

ویدیوی این جلسه منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j21.png'),
(22, '2️⃣2️⃣ [مرحله ۲۲ از مسیر MonetizeAI | سطح ۷: ساخت سیستم ارتباط و فروش خودکار] | GoHighLevel: بازاریاب شبانه‌روزی تو! ⏰🧠', 'تو این جلسه می‌ری سراغ GoHighLevel یا ابزارهای مشابه، و یاد می‌گیری چطور یه ماشین فروش هوشمند بسازی که خودش لیدها رو پیگیری و مشتری تبدیل کنه.

ویدیوی این جلسه منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀
', 'http://quantnano.ir/wp-content/uploads/2025/05/j22.png'),
(23, '3️⃣2️⃣ [مرحله ۲۳ از مسیر MonetizeAI | سطح ۷: ساخت سیستم ارتباط و فروش خودکار] | ارتباط هوشمند با ایمیل، واتساپ، دایرکت 📲💌', 'تو این جلسه یاد می‌گیری چطور سیستم اتوماسیون پیام‌رسانی رو از طریق ایمیل، واتساپ یا دایرکت پیاده‌سازی کنی تا حتی وقتی خوابی، فروش در جریان باشه.

ویدیوی این جلسه منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j23.png'),
(24, '4️⃣2️⃣ [مرحله ۲۴ از مسیر MonetizeAI | سطح ۸: تیم فروش هوش مصنوعی] | تیم فروشی از آواتارهای AI بساز! 🧑‍💼🧠', 'تو این جلسه یاد می‌گیری چطور با کمک آواتارها و کاراکترهای هوش مصنوعی،
یه تیم فروش کاملاً خودکار بسازی که به‌جای تو حرف بزنه، معرفی کنه و بفروشه!

ویدیوی این جلسه منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j24.png'),
(25, '5️⃣2️⃣ [مرحله ۲۵ از مسیر MonetizeAI | سطح ۸: تیم فروش هوش مصنوعی] | تماس فروش خودکار با VoiceBot 📞🤖', 'تو این جلسه می‌سازی یه VoiceBot یا AI Caller که خودش به مشتری زنگ می‌زنه،
اطلاعات می‌ده و راهنمایی‌ش می‌کنه – بدون اینکه تو حتی گوشی برداری!

ویدیوی این جلسه منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j25.png'),
(26, '6️⃣2️⃣ [مرحله ۲۶ از مسیر MonetizeAI | سطح ۸: تیم فروش هوش مصنوعی] | بستن فروش با تیم هوش مصنوعی 🔐💸', 'تو این جلسه می‌چینی یک مسیر فروش کامل و اتومات با کمک تمام ابزارهای AI که تا الان ساختی،
از لید تا تبدیل نهایی – مثل یه کمپین حرفه‌ای.

ویدیوی این جلسه منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j26.png'),
(27, '7️⃣2️⃣ [مرحله ۲۷ از مسیر MonetizeAI | سطح ۹: جهش درآمدی و ساخت سیستم پایدار] | بازار درست = درآمد بیشتر 🌍🎯', 'تو این جلسه یاد می‌گیری چطور بازار بین‌المللی مناسب برای سرویس‌ت رو انتخاب کنی؛
جایی که هم مشتری هست، هم رقابت کمتر، هم درآمد بالاتر!

ویدیوی این جلسه منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j27.png'),
(28, '8️⃣2️⃣ [مرحله ۲۸ از مسیر MonetizeAI | سطح ۹: جهش درآمدی و ساخت سیستم پایدار] | ساخت زیرساخت تیمی برای رشد ۱۰ برابری 🏗📈', 'تو این جلسه سیستم و تیمی طراحی می‌کنی که بتونه در آینده حجم بالای مشتری و فروش رو مدیریت کنه؛
از ابزار گرفته تا همکاری.

ویدیوی این جلسه منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j28.png'),
(29, '9️⃣2️⃣ [مرحله ۲۹ از مسیر MonetizeAI | سطح ۹: جهش درآمدی و ساخت سیستم پایدار] | نقشه رشد ۹۰ روزه برای جهش واقعی 🗺🔥', 'تو این جلسه یه نقشه اجرایی ۹۰ روزه طراحی می‌کنی؛
با قدم‌های واضح، تاریخ‌دار و قابل پیگیری تا بتونی سریع‌تر و هوشمندانه‌تر رشد کنی.

ویدیوی این جلسه منتظرته… همین حالا شروع کن 👇🎥
قدم بعدی موفقیتت اینجاست – ببینش! 💼🚀', 'http://quantnano.ir/wp-content/uploads/2025/05/j29.png');


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