# 💳 راهنمای اتصال لندینگ پیج به سیستم پرداخت ZarinPal

## 📋 مروری بر سیستم پرداخت فعلی

پروژه MonetizeAI در حال حاضر یک سیستم پرداخت کامل با ZarinPal دارد که شامل:

- ✅ `payment_service.go` - سرویس پرداخت
- ✅ `payment_handler.go` - Handler های callback
- ✅ `payment_models.go` - مدل‌های دیتابیس
- ✅ API endpoint های پرداخت در `web_api.go`

---

## 🎯 هدف: اتصال لندینگ به سیستم پرداخت موجود

### مراحل اصلی:

1. ✅ کاربر لندینگ را مشاهده می‌کند
2. ✅ روی دکمه CTA کلیک می‌کند
3. ✅ درخواست به API پرداخت ارسال می‌شود
4. ✅ API با ZarinPal ارتباط برقرار می‌کند
5. ✅ کاربر به درگاه پرداخت منتقل می‌شود
6. ✅ بعد از پرداخت، به callback برمی‌گردد
7. ✅ اشتراک کاربر فعال می‌شود

---

## 🔧 پیاده‌سازی گام‌به‌گام

### گام 1: اضافه کردن Route لندینگ به `web_api.go`

```go
// در تابع StartWebAPI، این خطوط را اضافه کنید:

func StartWebAPI() {
    // ... کد قبلی
    
    gin.SetMode(gin.ReleaseMode)
    r := gin.New()
    
    // ... middleware ها
    
    // 🆕 Serve کردن لندینگ پیج
    r.GET("/landing", func(c *gin.Context) {
        c.File("./landing-sale.html")
    })
    
    // 🆕 API endpoint برای ایجاد پرداخت از لندینگ
    r.POST("/api/v1/landing/create-payment", func(c *gin.Context) {
        handleLandingPayment(c)
    })
    
    // ... بقیه routes
}
```

### گام 2: پیاده‌سازی Handler پرداخت

```go
// اضافه کردن به فایل web_api.go

// LandingPaymentRequest - درخواست پرداخت از لندینگ
type LandingPaymentRequest struct {
    TelegramID int64  `json:"telegram_id" binding:"required"`
    PlanType   string `json:"plan_type" binding:"required"`
    Source     string `json:"source,omitempty"` // برای tracking (مثلاً "workshop")
}

// handleLandingPayment - مدیریت درخواست پرداخت از لندینگ
func handleLandingPayment(c *gin.Context) {
    var req LandingPaymentRequest
    
    if err := c.ShouldBindJSON(&req); err != nil {
        logger.Error("Invalid landing payment request",
            zap.Error(err))
        c.JSON(http.StatusBadRequest, APIResponse{
            Success: false,
            Error:   "درخواست نامعتبر است",
        })
        return
    }
    
    // 🔒 SECURITY: Rate limiting
    if !checkMiniAppRateLimit(req.TelegramID) {
        c.JSON(http.StatusTooManyRequests, APIResponse{
            Success: false,
            Error:   "تعداد درخواست‌های شما از حد مجاز گذشته. لطفاً کمی صبر کنید.",
        })
        return
    }
    
    // بررسی وجود کاربر
    var user User
    if err := db.Where("telegram_id = ?", req.TelegramID).First(&user).Error; err != nil {
        logger.Error("User not found for landing payment",
            zap.Int64("telegram_id", req.TelegramID))
        c.JSON(http.StatusNotFound, APIResponse{
            Success: false,
            Error:   "کاربر یافت نشد. لطفاً ابتدا از طریق ربات ثبت‌نام کنید.",
        })
        return
    }
    
    // بررسی اینکه آیا کاربر قبلاً Ultimate دارد
    if user.PlanName == "ultimate" {
        c.JSON(http.StatusBadRequest, APIResponse{
            Success: false,
            Error:   "شما قبلاً اشتراک مادام‌العمر دارید.",
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
        logger.Error("Failed to create payment from landing",
            zap.Int64("telegram_id", req.TelegramID),
            zap.String("plan_type", req.PlanType),
            zap.Error(err))
        c.JSON(http.StatusInternalServerError, APIResponse{
            Success: false,
            Error:   "خطا در ایجاد درخواست پرداخت. لطفاً دوباره تلاش کنید.",
        })
        return
    }
    
    // ثبت source برای tracking
    if req.Source != "" {
        // می‌تونید source رو در دیتابیس ذخیره کنید
        logger.Info("Payment created from landing",
            zap.Int64("telegram_id", req.TelegramID),
            zap.String("source", req.Source),
            zap.Uint("transaction_id", transaction.ID))
    }
    
    c.JSON(http.StatusOK, APIResponse{
        Success: true,
        Data: map[string]interface{}{
            "transaction_id": transaction.ID,
            "authority":      transaction.Authority,
            "payment_url":    paymentURL,
            "amount":         transaction.Amount,
            "plan_type":      req.PlanType,
            "description":    transaction.Description,
        },
    })
}
```

### گام 3: به‌روزرسانی فایل `landing-sale.html`

در انتهای فایل HTML، قبل از `</body>`:

```html
<script>
// ========================================
// سیستم پرداخت - اتصال به API
// ========================================

// دریافت Telegram ID
function getTelegramId() {
    // روش 1: از URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const urlId = urlParams.get('telegram_id');
    if (urlId) {
        localStorage.setItem('telegram_id', urlId);
        return parseInt(urlId);
    }
    
    // روش 2: از localStorage
    const storedId = localStorage.getItem('telegram_id');
    if (storedId) {
        return parseInt(storedId);
    }
    
    // روش 3: از Telegram WebApp (اگر در Mini App باشد)
    if (typeof window.Telegram !== 'undefined' && window.Telegram.WebApp) {
        const webAppUser = window.Telegram.WebApp.initDataUnsafe?.user;
        if (webAppUser && webAppUser.id) {
            localStorage.setItem('telegram_id', webAppUser.id.toString());
            return webAppUser.id;
        }
    }
    
    return null;
}

// تابع اصلی پرداخت
async function initiatePurchase(planType = 'ultimate') {
    const telegramId = getTelegramId();
    
    // بررسی Telegram ID
    if (!telegramId) {
        alert('⚠️ لطفاً از طریق ربات تلگرام وارد شوید.\n\nبرای دسترسی به این پیشنهاد، باید از طریق ربات MonetizeAI وارد شوید.');
        
        // انتقال به ربات
        setTimeout(() => {
            window.location.href = 'https://t.me/YOUR_BOT_NAME'; // 👈 جایگزین کنید
        }, 2000);
        return;
    }
    
    // نمایش loading
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = '⏳ در حال اتصال به درگاه پرداخت...';
    button.disabled = true;
    button.style.opacity = '0.6';
    button.style.cursor = 'not-allowed';
    
    try {
        // ارسال درخواست به API
        const response = await fetch('https://sianmarketing.com/api/api/v1/landing/create-payment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                telegram_id: telegramId,
                plan_type: planType,
                source: 'workshop_landing' // برای tracking
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'خطا در ارتباط با سرور');
        }
        
        if (data.success && data.data.payment_url) {
            // ذخیره transaction_id برای بعد
            localStorage.setItem('last_transaction_id', data.data.transaction_id);
            
            // Track event (اگر Google Analytics دارید)
            if (typeof gtag !== 'undefined') {
                gtag('event', 'begin_checkout', {
                    transaction_id: data.data.transaction_id,
                    value: data.data.amount,
                    currency: 'IRR',
                    items: [{
                        item_id: planType,
                        item_name: 'MonetizeAI ' + planType,
                        price: data.data.amount
                    }]
                });
            }
            
            // نمایش پیام موفقیت
            button.textContent = '✅ در حال انتقال به درگاه پرداخت...';
            
            // انتقال به صفحه پرداخت ZarinPal
            setTimeout(() => {
                window.location.href = data.data.payment_url;
            }, 500);
            
        } else {
            throw new Error(data.error || 'خطا در دریافت لینک پرداخت');
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        
        // نمایش خطا به کاربر
        let errorMessage = 'خطا در ایجاد درخواست پرداخت.\n';
        
        if (error.message.includes('کاربر یافت نشد')) {
            errorMessage += '\nلطفاً ابتدا از طریق ربات تلگرام ثبت‌نام کنید.';
            setTimeout(() => {
                window.location.href = 'https://t.me/YOUR_BOT_NAME'; // 👈 جایگزین کنید
            }, 2000);
        } else if (error.message.includes('اشتراک مادام‌العمر')) {
            errorMessage = '✅ شما قبلاً اشتراک مادام‌العمر خریداری کرده‌اید.';
        } else {
            errorMessage += '\nلطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.';
        }
        
        alert(errorMessage);
        
        // بازگرداندن دکمه به حالت اول
        button.textContent = originalText;
        button.disabled = false;
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
    }
}

// اضافه کردن event listener به تمام دکمه‌های CTA
document.addEventListener('DOMContentLoaded', function() {
    const ctaButtons = document.querySelectorAll('.cta-button');
    
    ctaButtons.forEach(button => {
        // حذف href برای جلوگیری از redirect
        button.removeAttribute('href');
        
        // اضافه کردن event
        button.addEventListener('click', function(e) {
            e.preventDefault();
            initiatePurchase('ultimate'); // پلن پیش‌فرض
        });
    });
    
    // نمایش Telegram ID در console برای debug
    const telegramId = getTelegramId();
    if (telegramId) {
        console.log('✅ Telegram ID detected:', telegramId);
    } else {
        console.warn('⚠️ Telegram ID not found. User should access via Telegram bot.');
    }
});

// تابع کمکی برای چک کردن وضعیت پرداخت (اختیاری)
async function checkPaymentStatus(authority) {
    try {
        const response = await fetch(
            `https://sianmarketing.com/api/api/v1/payment/status?authority=${authority}`
        );
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error checking payment status:', error);
        return null;
    }
}
</script>
```

### گام 4: ارسال لینک لندینگ از ربات با Telegram ID

```go
// در فایل handlers.go یا admin_handlers.go

// تابع برای ارسال لینک لندینگ به کاربر
func sendLandingPageToUser(userID int64, source string) {
    // ساخت URL با Telegram ID
    baseURL := os.Getenv("LANDING_PAGE_URL")
    if baseURL == "" {
        baseURL = "https://sianmarketing.com/landing"
    }
    
    landingURL := fmt.Sprintf("%s?telegram_id=%d&source=%s", 
        baseURL, userID, source)
    
    msg := tgbotapi.NewMessage(userID,
        "🎉 *پیشنهاد ویژه فقط برای تو!*\n\n"+
        "✨ تخفیف ویژه شرکت‌کنندگان کارگاه\n"+
        "⏰ فقط برای 3 ساعت فعال است\n\n"+
        "👇 برای مشاهده و فعالسازی کلیک کن:")
    msg.ParseMode = "Markdown"
    
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
    
    logger.Info("Landing page sent to user",
        zap.Int64("user_id", userID),
        zap.String("source", source))
}

// مثال استفاده:
// sendLandingPageToUser(user.TelegramID, "workshop_complete")
```

### گام 5: اضافه کردن دستور Admin برای ارسال لندینگ

```go
// در admin_handlers.go

func handleSendLandingToUser(admin *Admin, args []string) string {
    if len(args) < 1 {
        return "❌ لطفاً Telegram ID کاربر را وارد کنید\n\nمثال: /send_landing 123456789"
    }
    
    userID, err := strconv.ParseInt(args[0], 10, 64)
    if err != nil {
        return "❌ Telegram ID نامعتبر است"
    }
    
    // بررسی وجود کاربر
    var user User
    if err := db.Where("telegram_id = ?", userID).First(&user).Error; err != nil {
        return fmt.Sprintf("❌ کاربر با ID %d یافت نشد", userID)
    }
    
    // ارسال لینک لندینگ
    sendLandingPageToUser(userID, "admin_sent")
    
    // ثبت در لاگ ادمین
    logAdminAction(admin, "send_landing", 
        fmt.Sprintf("Sent landing page to user %d", userID), 
        "user", user.ID)
    
    return fmt.Sprintf("✅ لینک لندینگ پیج برای کاربر %s (%d) ارسال شد", 
        user.FirstName, userID)
}

// اضافه کردن به لیست دستورات ادمین:
var adminCommands = []AdminCommand{
    // ... دستورات قبلی
    {
        Command:     "/send_landing",
        Description: "📤 ارسال لینک لندینگ به کاربر",
        Handler:     handleSendLandingToUser,
    },
}
```

### گام 6: ارسال خودکار بعد از اتمام کارگاه

```go
// فانکشن برای ارسال خودکار بعد از complete شدن کارگاه

func onWorkshopComplete(userID int64) {
    // منطق تشخیص complete شدن کارگاه
    // مثلاً: تعداد جلسات دیده شده، تمرین‌های انجام شده، و...
    
    var user User
    if err := db.Where("telegram_id = ?", userID).First(&user).Error; err != nil {
        return
    }
    
    // بررسی شرایط ارسال لندینگ
    // مثلاً: حداقل 3 جلسه دیده باشد و هنوز اشتراک نخریده
    if user.CurrentSession >= 3 && user.PlanName != "ultimate" {
        // ارسال پیام تبریک
        congratsMsg := tgbotapi.NewMessage(userID,
            "🎉 *تبریک!*\n\n"+
            "تو با موفقیت بخش عمده‌ای از کارگاه رو کامل کردی!\n\n"+
            "حالا وقتشه که سیستم درآمدزایی کامل رو فعال کنی.\n\n"+
            "یک پیشنهاد ویژه فقط برای تو آماده کردیم... 👇")
        congratsMsg.ParseMode = "Markdown"
        bot.Send(congratsMsg)
        
        // صبر 2 ثانیه
        time.Sleep(2 * time.Second)
        
        // ارسال لینک لندینگ
        sendLandingPageToUser(userID, "workshop_complete")
        
        logger.Info("Workshop completion landing sent",
            zap.Int64("user_id", userID),
            zap.Int("session", user.CurrentSession))
    }
}

// این تابع را در جایی که کاربر جلسه را کامل می‌کند، فراخوانی کنید
// مثلاً در handleNextSession یا پس از تایید تمرین
```

---

## 📊 Tracking و Analytics

### ثبت لاگ پرداخت‌های لندینگ

```go
// در payment_service.go، بعد از ایجاد موفق transaction:

// ثبت در log برای tracking
logger.Info("Payment created from landing",
    zap.Uint("transaction_id", transaction.ID),
    zap.Int64("user_id", userID),
    zap.String("plan_type", planType),
    zap.Int("amount", amount),
    zap.String("source", "landing"))
```

### آمار فروش از لندینگ

```go
// تابع برای گرفتن آمار فروش لندینگ
func getLandingPaymentStats() map[string]interface{} {
    var stats struct {
        TotalSales      int64
        SuccessfulSales int64
        TotalRevenue    int64
        ConversionRate  float64
    }
    
    // تعداد کل کلیک‌ها (باید در جای دیگه track بشه)
    var totalClicks int64 = 1000 // مثال
    
    // تعداد پرداخت‌های موفق از لندینگ
    db.Model(&PaymentTransaction{}).
        Where("status = ? AND description LIKE ?", "success", "%landing%").
        Count(&stats.SuccessfulSales)
    
    // مجموع درآمد
    db.Model(&PaymentTransaction{}).
        Where("status = ? AND description LIKE ?", "success", "%landing%").
        Select("COALESCE(SUM(amount), 0)").
        Scan(&stats.TotalRevenue)
    
    // محاسبه نرخ تبدیل
    if totalClicks > 0 {
        stats.ConversionRate = float64(stats.SuccessfulSales) / float64(totalClicks) * 100
    }
    
    return map[string]interface{}{
        "total_sales":      stats.SuccessfulSales,
        "total_revenue":    stats.TotalRevenue,
        "conversion_rate":  stats.ConversionRate,
        "avg_order_value":  stats.TotalRevenue / max(stats.SuccessfulSales, 1),
    }
}
```

---

## 🔐 امنیت

### 1. Rate Limiting برای API لندینگ

```go
// در web_api.go، قبل از handleLandingPayment:

var landingPaymentRateLimits = make(map[int64]time.Time)
var landingPaymentCounts = make(map[int64]int)

func checkLandingPaymentRateLimit(telegramID int64) bool {
    now := time.Now()
    
    if lastTime, exists := landingPaymentRateLimits[telegramID]; exists {
        if now.Sub(lastTime) < time.Minute {
            if landingPaymentCounts[telegramID] >= 3 {
                return false // بیش از 3 درخواست در دقیقه
            }
            landingPaymentCounts[telegramID]++
        } else {
            landingPaymentCounts[telegramID] = 1
            landingPaymentRateLimits[telegramID] = now
        }
    } else {
        landingPaymentCounts[telegramID] = 1
        landingPaymentRateLimits[telegramID] = now
    }
    
    return true
}
```

### 2. اعتبارسنجی Telegram ID

```go
// در handleLandingPayment:

// بررسی اینکه Telegram ID واقعی است
if req.TelegramID < 1000000 {
    c.JSON(http.StatusBadRequest, APIResponse{
        Success: false,
        Error:   "Telegram ID نامعتبر است",
    })
    return
}
```

### 3. جلوگیری از خرید مکرر

```go
// چک کردن اینکه کاربر در 5 دقیقه اخیر درخواست پرداخت نداده باشد
var recentTransaction PaymentTransaction
err := db.Where("user_id = ? AND status = ? AND created_at > ?",
    user.ID, "pending", time.Now().Add(-5*time.Minute)).
    First(&recentTransaction).Error

if err == nil {
    // تراکنش pending وجود دارد
    c.JSON(http.StatusConflict, APIResponse{
        Success: false,
        Error:   "شما یک درخواست پرداخت در حال انتظار دارید. لطفاً آن را تکمیل کنید.",
        Data: map[string]interface{}{
            "pending_payment_url": fmt.Sprintf(
                "https://www.zarinpal.com/pg/StartPay/%s",
                *recentTransaction.Authority,
            ),
        },
    })
    return
}
```

---

## ✅ چک‌لیست نهایی

قبل از انتشار، این موارد را بررسی کنید:

- [ ] API endpoint `/api/v1/landing/create-payment` کار می‌کند
- [ ] Telegram ID به درستی از URL پارس می‌شود
- [ ] Rate limiting فعال است
- [ ] لینک‌های CTA در HTML به تابع `initiatePurchase()` متصل هستند
- [ ] پس از پرداخت، callback به درستی کار می‌کند
- [ ] اشتراک کاربر به درستی فعال می‌شود
- [ ] پیام موفقیت به کاربر در تلگرام ارسال می‌شود
- [ ] Analytics و tracking نصب شده
- [ ] تست روی موبایل و دسکتاپ انجام شده
- [ ] تست با کاربر واقعی (sandbox mode)
- [ ] لاگ‌ها به درستی ثبت می‌شوند

---

## 🎯 نتیجه

با انجام این مراحل، لندینگ پیج شما به طور کامل به سیستم پرداخت ZarinPal متصل می‌شود و می‌تواند:

✅ درخواست پرداخت ایجاد کند  
✅ کاربر را به درگاه منتقل کند  
✅ پرداخت را verify کند  
✅ اشتراک را فعال کند  
✅ پیام موفقیت ارسال کند  

**موفق باشید! 🚀**

