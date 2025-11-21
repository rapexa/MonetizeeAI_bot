# 🚀 راهنمای استفاده از لندینگ پیج MonetizeAI

## 📁 فایل‌های ایجاد شده

### 1. `landing-sale.html`
فایل HTML کامل و آماده استفاده لندینگ پیج. این فایل شامل:
- ✅ HTML کامل
- ✅ CSS داخلی (Inline Styles)
- ✅ JavaScript تایمر شمارش معکوس
- ✅ طراحی ریسپانسیو
- ✅ انیمیشن‌های تعاملی

### 2. `landing-content.txt`
محتوای خام و ساختاریافته شامل:
- ✅ تمام متن‌های بخش‌های مختلف
- ✅ نکات طراحی و رنگ‌ها
- ✅ راهنمای تبدیل (Conversion Tips)
- ✅ چک‌لیست قبل از انتشار

---

## 🎯 نحوه استفاده

### روش 1: استفاده مستقیم (ساده‌ترین)

1. فایل `landing-sale.html` را باز کنید
2. لینک‌های CTA را با لینک واقعی خود جایگزین کنید:
   ```html
   <!-- پیدا کنید: -->
   <a href="https://sianmarketing.com" class="cta-button">
   
   <!-- جایگزین کنید با: -->
   <a href="YOUR_ACTUAL_LINK" class="cta-button">
   ```
3. فایل را روی سرور خود آپلود کنید
4. لینک را تست کنید!

### روش 2: ادغام با سیستم فعلی

اگر می‌خواهید این لندینگ را در پلتفرم MonetizeAI ادغام کنید:

#### الف) استفاده به عنوان صفحه استاتیک:

```bash
# فایل را در پوشه miniApp/dist کپی کنید
cp landing-sale.html miniApp/dist/landing.html
```

سپس از طریق Nginx یا سرور خود، این فایل را serve کنید:

```nginx
# مثال Nginx config
location /landing {
    alias /path/to/miniApp/dist/landing.html;
}
```

#### ب) استفاده به عنوان React Component:

1. محتوای HTML را به JSX تبدیل کنید
2. استایل‌ها را به فایل CSS جدا منتقل کنید
3. Component را در `miniApp/src/pages/` قرار دهید

---

## 🔧 سفارشی‌سازی

### تغییر رنگ‌ها

رنگ‌های اصلی در بخش `:root` یا متغیرهای CSS تعریف شده‌اند:

```css
/* رنگ‌های فعلی */
--color-primary: #ec4899;     /* صورتی */
--color-secondary: #8b5cf6;   /* بنفش */
--color-accent: #06b6d4;      /* آبی */
--bg-dark: #0a0118;           /* پس‌زمینه تیره */
```

### تنظیم تایمر

تایمر پیش‌فرض روی 3 ساعت تنظیم شده. برای تغییر:

```javascript
// پیدا کنید (در انتهای فایل HTML):
const timerEndTime = new Date().getTime() + (3 * 60 * 60 * 1000);

// برای 2 ساعت:
const timerEndTime = new Date().getTime() + (2 * 60 * 60 * 1000);

// برای 4 ساعت:
const timerEndTime = new Date().getTime() + (4 * 60 * 60 * 1000);
```

### تغییر قیمت

```html
<!-- پیدا کنید: -->
<div class="price-original">قیمت عادی: 7,500,000 تومان</div>
<div class="price-special">4,900,000 تومان</div>

<!-- با قیمت دلخواه جایگزین کنید -->
```

### تغییر تستیمونیال‌ها

```html
<!-- هر کارت تستیمونیال را پیدا و ویرایش کنید: -->
<div class="testimonial-card">
    <p class="testimonial-text">
        "متن تستیمونیال شما..."
    </p>
    <div class="testimonial-author">
        <div class="author-avatar">ا</div>
        <div class="author-info">
            <div class="author-name">نام کاربر</div>
            <div class="author-role">سمت یا تخصص</div>
        </div>
    </div>
</div>
```

---

## 🔗 اتصال به سیستم پرداخت

### گزینه 1: لینک مستقیم به صفحه اشتراک Mini App

```html
<a href="https://t.me/YOUR_BOT_NAME/miniapp?startapp=subscription" class="cta-button">
    🚀 فعالسازی اشتراک
</a>
```

### گزینه 2: لینک به ربات تلگرام با دستور خاص

```html
<a href="https://t.me/YOUR_BOT_NAME?start=buy_ultimate" class="cta-button">
    🚀 فعالسازی اشتراک
</a>
```

### گزینه 3: لینک مستقیم به API پرداخت

```javascript
// در صورت نیاز به ایجاد درخواست پرداخت از طریق JavaScript:
async function handlePurchase() {
    const response = await fetch('https://sianmarketing.com/api/api/v1/payment/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            telegram_id: USER_TELEGRAM_ID,
            plan_type: 'ultimate'
        })
    });
    
    const data = await response.json();
    if (data.success) {
        window.location.href = data.data.payment_url;
    }
}
```

---

## 📊 افزودن Google Analytics / Facebook Pixel

### Google Analytics

قبل از `</head>` اضافه کنید:

```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

### Facebook Pixel

قبل از `</head>` اضافه کنید:

```html
<!-- Facebook Pixel -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>
```

---

## 🎨 بهینه‌سازی عملکرد

### 1. فشرده‌سازی HTML

```bash
# استفاده از minifier آنلاین یا:
npm install -g html-minifier
html-minifier --collapse-whitespace --remove-comments landing-sale.html -o landing-sale.min.html
```

### 2. بهینه‌سازی تصاویر

اگر تصاویری اضافه کردید، از WebP استفاده کنید:

```html
<picture>
  <source srcset="image.webp" type="image/webp">
  <img src="image.jpg" alt="توضیح">
</picture>
```

### 3. Lazy Loading

برای تصاویر در پایین صفحه:

```html
<img src="image.jpg" loading="lazy" alt="توضیح">
```

---

## 📱 تست کردن

### چک‌لیست تست:

- [ ] باز کردن در Chrome Desktop
- [ ] باز کردن در Safari Desktop
- [ ] باز کردن در موبایل (iOS)
- [ ] باز کردن در موبایل (Android)
- [ ] تست تایمر (صبر کنید 1-2 دقیقه ببینید کار می‌کند)
- [ ] کلیک روی تمام دکمه‌های CTA
- [ ] تست FAQ (باز و بسته شدن)
- [ ] تست Smooth Scroll
- [ ] تست سرعت لود (باید < 2 ثانیه باشد)
- [ ] تست در اینترنت کند

### ابزارهای تست توصیه شده:

1. **Google PageSpeed Insights**: https://pagespeed.web.dev/
2. **GTmetrix**: https://gtmetrix.com/
3. **BrowserStack**: برای تست در دستگاه‌های مختلف
4. **Lighthouse** (داخل Chrome DevTools)

---

## 🐛 رفع مشکلات رایج

### مشکل: تایمر کار نمی‌کند

**راه حل:**
- کنسول مرورگر را چک کنید (F12)
- مطمئن شوید JavaScript در مرورگر فعال است
- کد JavaScript را از دو تگ `<script>` کپی کنید

### مشکل: استایل‌ها درست نمایش نمی‌شوند

**راه حل:**
- Cache مرورگر را پاک کنید (Ctrl+F5 یا Cmd+Shift+R)
- مطمئن شوید تگ `<style>` در `<head>` قرار دارد
- مطمئن شوید فایل به درستی UTF-8 ذخیره شده

### مشکل: فونت‌ها فارسی نیستند

**راه حل:**
- فونت Google (Inter) پشتیبان فارسی را لود می‌کند
- اگر می‌خواهید فونت خاص استفاده کنید، باید آن را اضافه کنید:

```css
@font-face {
  font-family: 'IranSansX';
  src: url('fonts/IRANSansX-Regular.woff2') format('woff2');
}

body {
  font-family: 'IranSansX', 'Inter', sans-serif;
}
```

### مشکل: صفحه در موبایل بریده می‌شود

**راه حل:**
- مطمئن شوید این متاتگ در `<head>` هست:

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

---

## 🚀 نکات بهینه‌سازی نرخ تبدیل

### A/B Testing پیشنهادی:

1. **تست رنگ دکمه:**
   - Variant A: صورتی-بنفش (فعلی)
   - Variant B: سبز (#10b981)
   - Variant C: نارنجی (#f97316)

2. **تست متن CTA:**
   - "فعالسازی اشتراک"
   - "شروع کن الان"
   - "دریافت دسترسی"

3. **تست تایمر:**
   - 2 ساعت vs 3 ساعت vs 4 ساعت
   - با تایمر vs بدون تایمر

4. **تست قیمت:**
   - نمایش قیمت قبل/بعد
   - فقط قیمت تخفیف‌خورده
   - نمایش قسطی

### نکات روانشناسی:

- ✅ استفاده از اعداد فرد در قیمت (4,900,000 بهتر از 5,000,000)
- ✅ تاکید بر "Lifetime" و "یکبار پرداخت"
- ✅ استفاده از حس فوریت (تایمر، محدودیت)
- ✅ اثبات اجتماعی واقعی و معتبر
- ✅ تضمین بازگشت وجه واضح

---

## 📞 پشتیبانی و سوالات

اگر سوال یا مشکلی داشتید:

1. فایل `landing-content.txt` را مطالعه کنید
2. کد HTML را با دقت بررسی کنید
3. از کنسول مرورگر برای دیباگ استفاده کنید

---

## 📄 لایسنس

این لندینگ پیج برای استفاده در پروژه MonetizeAI طراحی شده است.

---

**موفق باشید! 🚀**

برای هرگونه بهبود یا سفارشی‌سازی بیشتر، می‌توانید کد را ویرایش کنید.

