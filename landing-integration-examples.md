# 🔗 نمونه‌های ادغام لندینگ پیج با سیستم MonetizeAI

## 📋 فهرست

1. [ادغام با Web API](#1-ادغام-با-web-api)
2. [ادغام با ربات تلگرام](#2-ادغام-با-ربات-تلگرام)
3. [ادغام با Mini App](#3-ادغام-با-mini-app)
4. [راه‌اندازی به عنوان صفحه مستقل](#4-راهاندازی-به-عنوان-صفحه-مستقل)

---

## 1. ادغام با Web API

### روش A: اضافه کردن Route جدید در `web_api.go`

```go
// در فایل web_api.go، در تابع StartWebAPI، این route را اضافه کنید:

func StartWebAPI() {
    // ... کد قبلی
    
    // Route برای لندینگ پیج فروش
    r.GET("/landing/sale", func(c *gin.Context) {
        c.File("./landing-sale.html")
    })
    
    // API endpoint برای ایجاد پرداخت از لندینگ
    r.POST("/api/v1/landing/purchase", handleLandingPurchase)
    
    // ... بقیه کد
}

// Handler برای پرداخت از لندینگ
func handleLandingPurchase(c *gin.Context) {
    var req struct {
        TelegramID int64  `json:"telegram_id"`
        PlanType   string `json:"plan_type"`
        Email      string `json:"email,omitempty"`
        Phone      string `json:"phone,omitempty"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, APIResponse{
            Success: false,
            Error:   "Invalid request",
        })
        return
    }
    
    // بررسی کاربر
    var user User
    if err := db.Where("telegram_id = ?", req.TelegramID).First(&user).Error; err != nil {
        c.JSON(http.StatusNotFound, APIResponse{
            Success: false,
            Error:   "User not found",
        })
        return
    }
    
    // ایجاد درخواست پرداخت
    paymentService := NewPaymentService(db)
    transaction, paymentURL, err := paymentService.CreatePaymentRequest(
        user.ID,
        req.PlanType,
    )
    
    if err != nil {
        logger.Error("Failed to create payment",
            zap.Int64("telegram_id", req.TelegramID),
            zap.Error(err))
        c.JSON(http.StatusInternalServerError, APIResponse{
            Success: false,
            Error:   "Failed to create payment request",
        })
        return
    }
    
    c.JSON(http.StatusOK, APIResponse{
        Success: true,
        Data: map[string]interface{}{
            "transaction_id": transaction.ID,
            "authority":      transaction.Authority,
            "payment_url":    paymentURL,
            "amount":         transaction.Amount,
            "plan_type":      req.PlanType,
        },
    })
}
```

### روش B: Serve به عنوان Static File

```go
// در web_api.go
func StartWebAPI() {
    // ... کد قبلی
    
    // Serve کردن فایل HTML لندینگ
    r.StaticFile("/landing", "./landing-sale.html")
    
    // یا serve کردن کل پوشه
    r.Static("/landing-assets", "./landing-assets")
    
    // ... بقیه کد
}
```

---

## 2. ادغام با ربات تلگرام

### الف) اضافه کردن دستور `/landing` به ربات

```go
// در فایل handlers.go، در تابع handleMessage

if update.Message.IsCommand() {
    switch update.Message.Command() {
    case "start":
        // ... کد قبلی
        
    case "landing":
        handleLandingCommand(update.Message.Chat.ID)
        return
        
    // ... بقیه commands
    }
}

// تابع جدید برای ارسال لینک لندینگ
func handleLandingCommand(chatID int64) {
    msg := tgbotapi.NewMessage(chatID, 
        "🚀 برای مشاهده جزئیات اشتراک ویژه و تخفیف‌های کارگاه، روی دکمه زیر کلیک کنید:")
    
    keyboard := tgbotapi.NewInlineKeyboardMarkup(
        tgbotapi.NewInlineKeyboardRow(
            tgbotapi.NewInlineKeyboardButtonURL(
                "💎 مشاهده پیشنهاد ویژه",
                "https://sianmarketing.com/landing/sale",
            ),
        ),
    )
    msg.ReplyMarkup = keyboard
    bot.Send(msg)
}
```

### ب) ارسال لینک لندینگ بعد از اتمام کارگاه

```go
// تابع برای ارسال لینک بعد از کارگاه
func sendWorkshopCompletionMessage(userID int64) {
    msg := tgbotapi.NewMessage(userID,
        "🎉 تبریک! کارگاه 90 دقیقه‌ای رو کامل دیدی!\n\n"+
        "حالا وقتشه که سیستم درآمدزایی خودکارت رو فعال کنی.\n\n"+
        "✨ فقط برای شرکت‌کنندگان کارگاه، یک تخفیف ویژه داریم که فقط برای 3 ساعت فعاله!\n\n"+
        "👇 همین الان مشاهده کن:")
    
    keyboard := tgbotapi.NewInlineKeyboardMarkup(
        tgbotapi.NewInlineKeyboardRow(
            tgbotapi.NewInlineKeyboardButtonURL(
                "🔥 مشاهده تخفیف ویژه (فقط 3 ساعت)",
                "https://sianmarketing.com/landing/sale",
            ),
        ),
    )
    msg.ReplyMarkup = keyboard
    bot.Send(msg)
}
```

### ج) اضافه کردن به منوی اصلی ربات

```go
// در فایل handlers.go، تابع getMainMenuKeyboard

func getMainMenuKeyboard(user *User) tgbotapi.ReplyKeyboardMarkup {
    keyboard := tgbotapi.NewReplyKeyboard(
        tgbotapi.NewKeyboardButtonRow(
            tgbotapi.NewKeyboardButton("📚 جلسات آموزشی"),
            tgbotapi.NewKeyboardButton("💬 چت با راهنما"),
        ),
        tgbotapi.NewKeyboardButtonRow(
            tgbotapi.NewKeyboardButton("🌐 Mini App"),
            tgbotapi.NewKeyboardButton("💎 پیشنهاد ویژه"), // 👈 جدید
        ),
        tgbotapi.NewKeyboardButtonRow(
            tgbotapi.NewKeyboardButton("👤 پروفایل من"),
            tgbotapi.NewKeyboardButton("⚙️ تنظیمات"),
        ),
    )
    keyboard.ResizeKeyboard = true
    return keyboard
}

// در handleMessage، اضافه کنید:
if update.Message.Text == "💎 پیشنهاد ویژه" {
    handleLandingCommand(update.Message.Chat.ID)
    return
}
```

---

## 3. ادغام با Mini App

### الف) اضافه کردن Route به React Router

```typescript
// در miniApp/src/App.tsx

import LandingSale from './pages/LandingSale';

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/landing-sale" element={<LandingSale />} /> {/* 👈 جدید */}
      <Route path="/subscription-management" element={<SubscriptionManagement />} />
      {/* ... بقیه routes */}
    </Routes>
  );
}
```

### ب) ساخت Component جدید

```typescript
// miniApp/src/pages/LandingSale.tsx

import React from 'react';

const LandingSale: React.FC = () => {
  // اینجا می‌تونید HTML لندینگ رو به JSX تبدیل کنید
  // یا از iframe استفاده کنید:
  
  return (
    <div style={{ width: '100%', height: '100vh' }}>
      <iframe 
        src="/landing-sale.html"
        style={{ 
          width: '100%', 
          height: '100%', 
          border: 'none' 
        }}
        title="Landing Sale"
      />
    </div>
  );
};

export default LandingSale;
```

### ج) اضافه کردن لینک در Navigation

```typescript
// در miniApp/src/components/Layout.tsx یا BottomNav.tsx

<Link to="/landing-sale" className="nav-item">
  <span className="icon">💎</span>
  <span className="label">پیشنهاد ویژه</span>
</Link>
```

### د) باز کردن لندینگ با start_param

```typescript
// در miniApp/src/App.tsx

useEffect(() => {
  // Check if Telegram WebApp has start_param
  if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initDataUnsafe?.start_param) {
    const startParam = window.Telegram.WebApp.initDataUnsafe.start_param;
    
    // اگر start_param برابر "landing" بود، به لندینگ برو
    if (startParam === 'landing' && location.pathname !== '/landing-sale') {
      navigate('/landing-sale', { replace: true });
    }
  }
}, [navigate, location.pathname]);
```

حالا می‌تونید لینک زیر رو به کاربران بدید:
```
https://t.me/YOUR_BOT_NAME/miniapp?startapp=landing
```

---

## 4. راه‌اندازی به عنوان صفحه مستقل

### الف) استفاده از Netlify (رایگان)

1. فایل `landing-sale.html` را آپلود کنید به Netlify
2. یا از Git استفاده کنید:

```bash
# ساخت پوشه جدید
mkdir monetizeai-landing
cd monetizeai-landing

# کپی فایل
cp landing-sale.html index.html

# Git init
git init
git add .
git commit -m "Initial landing page"

# Push به GitHub
git remote add origin YOUR_GITHUB_REPO
git push -u origin main

# در Netlify:
# - New site from Git
# - انتخاب repo
# - Deploy!
```

### ب) استفاده از Nginx (سرور خودتان)

```nginx
# /etc/nginx/sites-available/landing

server {
    listen 80;
    server_name landing.yourdomain.com;

    root /var/www/landing;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }
    
    # SSL (اختیاری ولی توصیه می‌شه)
    # listen 443 ssl;
    # ssl_certificate /etc/letsencrypt/live/landing.yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/landing.yourdomain.com/privkey.pem;
}
```

```bash
# فعال کردن سایت
sudo ln -s /etc/nginx/sites-available/landing /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# کپی فایل
sudo mkdir -p /var/www/landing
sudo cp landing-sale.html /var/www/landing/index.html
sudo chown -R www-data:www-data /var/www/landing
```

### ج) استفاده از Apache

```apache
# /etc/apache2/sites-available/landing.conf

<VirtualHost *:80>
    ServerName landing.yourdomain.com
    DocumentRoot /var/www/landing
    
    <Directory /var/www/landing>
        Options Indexes FollowSymLinks
        AllowOverride All
        Require all granted
    </Directory>
    
    ErrorLog ${APACHE_LOG_DIR}/landing-error.log
    CustomLog ${APACHE_LOG_DIR}/landing-access.log combined
</VirtualHost>
```

```bash
# فعال کردن
sudo a2ensite landing.conf
sudo systemctl reload apache2

# کپی فایل
sudo mkdir -p /var/www/landing
sudo cp landing-sale.html /var/www/landing/index.html
```

---

## 5. اتصال لندینگ به سیستم پرداخت

### الف) استفاده از JavaScript برای ارسال درخواست

در فایل `landing-sale.html`, دکمه‌های CTA را تغییر دهید:

```html
<!-- قبل از </body> -->
<script>
// تابع برای دریافت Telegram ID از URL
function getTelegramIdFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('telegram_id') || localStorage.getItem('telegram_id');
}

// تابع برای ایجاد درخواست پرداخت
async function handlePurchase(planType) {
    const telegramId = getTelegramIdFromURL();
    
    if (!telegramId) {
        alert('لطفاً از طریق ربات تلگرام وارد شوید');
        // یا redirect به ربات
        window.location.href = 'https://t.me/YOUR_BOT_NAME';
        return;
    }
    
    try {
        // نمایش loading
        const button = event.target;
        button.textContent = '⏳ در حال انتقال...';
        button.disabled = true;
        
        // ارسال درخواست به API
        const response = await fetch('https://sianmarketing.com/api/api/v1/payment/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_id: parseInt(telegramId),
                plan_type: planType
            })
        });
        
        const data = await response.json();
        
        if (data.success && data.data.payment_url) {
            // انتقال به صفحه پرداخت
            window.location.href = data.data.payment_url;
        } else {
            throw new Error(data.error || 'خطا در ایجاد درخواست پرداخت');
        }
    } catch (error) {
        console.error('Payment error:', error);
        alert('خطا در ایجاد درخواست پرداخت. لطفاً دوباره تلاش کنید.');
        button.textContent = '🚀 فعالسازی اشتراک';
        button.disabled = false;
    }
}

// اضافه کردن event listener به دکمه‌ها
document.querySelectorAll('.cta-button').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        handlePurchase('ultimate'); // یا planType دلخواه
    });
});
</script>
```

### ب) ارسال Telegram ID از ربات

```go
// در ربات، هنگام ارسال لینک:
func sendLandingLink(userID int64) {
    landingURL := fmt.Sprintf(
        "https://sianmarketing.com/landing/sale?telegram_id=%d&source=workshop",
        userID,
    )
    
    msg := tgbotapi.NewMessage(userID,
        "🎉 پیشنهاد ویژه برای تو آماده است!\n\n"+
        "👇 برای مشاهده کلیک کن:")
    
    keyboard := tgbotapi.NewInlineKeyboardMarkup(
        tgbotapi.NewInlineKeyboardRow(
            tgbotapi.NewInlineKeyboardButtonURL(
                "💎 مشاهده پیشنهاد ویژه",
                landingURL,
            ),
        ),
    )
    msg.ReplyMarkup = keyboard
    bot.Send(msg)
}
```

---

## 6. Tracking و Analytics

### الف) Track کردن تبدیل‌ها

```javascript
// در landing-sale.html، بعد از ایجاد موفق پرداخت:

// Google Analytics Event
gtag('event', 'purchase_initiated', {
  'event_category': 'ecommerce',
  'event_label': 'ultimate_plan',
  'value': 4900000
});

// Facebook Pixel Event
fbq('track', 'InitiateCheckout', {
  value: 4900000,
  currency: 'IRR',
  content_name: 'MonetizeAI Ultimate'
});
```

### ب) Track کردن scroll depth

```javascript
let scrollDepth = 0;

window.addEventListener('scroll', function() {
    const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
    
    if (scrollPercent > 25 && scrollDepth < 25) {
        scrollDepth = 25;
        gtag('event', 'scroll_depth', { depth: '25%' });
    } else if (scrollPercent > 50 && scrollDepth < 50) {
        scrollDepth = 50;
        gtag('event', 'scroll_depth', { depth: '50%' });
    } else if (scrollPercent > 75 && scrollDepth < 75) {
        scrollDepth = 75;
        gtag('event', 'scroll_depth', { depth: '75%' });
    } else if (scrollPercent > 90 && scrollDepth < 90) {
        scrollDepth = 90;
        gtag('event', 'scroll_depth', { depth: '100%' });
    }
});
```

---

## 7. A/B Testing با Google Optimize

```html
<!-- اضافه کردن در <head> -->
<script src="https://www.googleoptimize.com/optimize.js?id=OPT-XXXXXX"></script>

<!-- متغیرهای مختلف برای تست -->
<script>
// Variant A: دکمه صورتی
// Variant B: دکمه سبز
// Variant C: دکمه نارنجی

// Google Optimize این رو خودکار انجام می‌ده
</script>
```

---

## 🎯 نتیجه‌گیری

بسته به نیاز پروژه، می‌تونید از یکی از روش‌های بالا استفاده کنید:

- **برای سرعت:** روش 4 (صفحه مستقل)
- **برای یکپارچگی:** روش 1 یا 3 (Web API / Mini App)
- **برای راحتی کاربر:** روش 2 (ربات تلگرام)

هر کدوم رو که انتخاب کنید، حتماً:
1. ✅ لینک‌ها رو درست تنظیم کنید
2. ✅ Telegram ID رو صحیح ارسال کنید
3. ✅ سیستم پرداخت رو تست کنید
4. ✅ Analytics رو نصب کنید

**موفق باشید! 🚀**

