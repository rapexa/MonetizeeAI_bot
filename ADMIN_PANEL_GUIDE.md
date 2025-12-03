# 🎛️ **Admin Panel - راهنمای کامل**

## 📋 **فهرست**

1. [معرفی](#معرفی)
2. [معماری سیستم](#معماری-سیستم)
3. [نصب و راه‌اندازی](#نصب-و-راه‌اندازی)
4. [امکانات](#امکانات)
5. [نحوه استفاده](#نحوه-استفاده)
6. [امنیت](#امنیت)
7. [API Endpoints](#api-endpoints)
8. [WebSocket Protocol](#websocket-protocol)
9. [توسعه و سفارشی‌سازی](#توسعه-و-سفارشی‌سازی)

---

## 🎯 **معرفی**

**Admin Panel** یک پنل مدیریت Real-time با معماری WebSocket + REST API است که فقط از طریق **Telegram** قابل دسترسی است. این پنل امکان مدیریت کامل کاربران، پرداخت‌ها، محتوا و آنالیتیکس را با سرعت بالا و به صورت لحظه‌ای فراهم می‌کند.

### ✨ **ویژگی‌های کلیدی:**

- ⚡ **Real-time Updates** با WebSocket
- 🗜️ **Gzip Compression** برای سرعت بالا
- 🔐 **Telegram-only Access** (امنیت بالا)
- 📊 **Live Dashboard** با آمار لحظه‌ای
- 👥 **User Management** (مسدود/رفع مسدودیت، تغییر پلن، حذف)
- 💳 **Payment Management** (مشاهده، بررسی وضعیت)
- 📦 **Content Management** (Sessions, Videos, Exercises)
- 📈 **Analytics** (نمودارهای درآمد، کاربران، تعامل)

---

## 🏗️ **معماری سیستم**

```
┌─────────────────────────────────────────────────────────┐
│                    Telegram Bot                         │
│  (/admin_panel command → WebApp Button)                 │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ↓ start_param=admin_panel
┌─────────────────────────────────────────────────────────┐
│              Mini App (React/TypeScript)                 │
│  - AdminPanel.tsx                                       │
│  - WebSocket Client                                      │
│  - Real-time Dashboard                                   │
└──────────────────┬──────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ↓ WebSocket         ↓ REST API
┌─────────────────┐  ┌─────────────────┐
│  admin_websocket│  │   admin_api.go  │
│     .go         │  │                 │
│                 │  │  - Stats        │
│  - Hub          │  │  - Users        │
│  - Clients      │  │  - Payments     │
│  - Broadcasting │  │  - Content      │
│  - Real-time    │  │  - Analytics    │
└─────────────────┘  └─────────────────┘
         │                   │
         └─────────┬─────────┘
                   ↓
          ┌─────────────────┐
          │  MySQL Database │
          │  - GORM         │
          │  - Connection   │
          │    Pool         │
          └─────────────────┘
```

### **Components:**

#### **Backend (Go):**
1. **`admin_websocket.go`** - WebSocket handler برای Real-time updates
2. **`admin_api.go`** - REST API endpoints برای CRUD operations
3. **Gzip Middleware** - فشرده‌سازی خودکار responses
4. **Admin Auth Middleware** - احراز هویت و authorization

#### **Frontend (React):**
1. **`AdminPanel.tsx`** - صفحه اصلی پنل
2. **WebSocket Client** - اتصال Real-time به backend
3. **Dashboard Components** - نمایش آمار و نمودارها
4. **Management Pages** - مدیریت کاربران، پرداخت‌ها، محتوا

---

## 🚀 **نصب و راه‌اندازی**

### **1. نصب Dependency:**

```bash
cd c:\Users\Rapexa\Desktop\MonetizeeAI_bot
go get github.com/gorilla/websocket
```

### **2. Build Backend:**

```bash
go build
```

### **3. Run Server:**

```bash
./MonetizeeAI_bot.exe
```

یا با ویرایش `.env`:
```env
WEB_API_ENABLED=true
WEB_API_PORT=8080
```

### **4. Build Frontend (Mini App):**

```bash
cd miniApp
npm install
npm run build
```

### **5. Deploy:**

Frontend build را در `miniApp/dist/` روی سرور خود قرار دهید.

---

## 🎯 **امکانات**

### **1. Dashboard (داشبورد)**

- 📊 **آمار لحظه‌ای:**
  - کل کاربران / کاربران فعال
  - درآمد ماه / درآمد امروز
  - کاربران پولی / تست رایگان
  - ادمین‌های آنلاین / لایسنس‌های در انتظار

- 👥 **کاربران اخیر** (10 نفر آخر)
- 💳 **پرداخت‌های اخیر** (10 تراکنش آخر)

### **2. Users Management (مدیریت کاربران)**

- 📋 لیست کاربران با pagination
- 🔍 جستجوی کاربر (نام، شماره تلفن)
- 🚫 مسدود کردن / رفع مسدودیت
- 💎 تغییر پلن اشتراک (Free, Starter, Pro, Ultimate)
- 🗑️ حذف کاربر (Soft Delete)
- 👁️ مشاهده جزئیات (پرداخت‌ها، پیشرفت)

### **3. Payment Management (مدیریت پرداخت‌ها)**

- 📊 لیست تمام تراکنش‌ها
- 🔍 فیلتر بر اساس وضعیت (Success, Pending, Failed)
- 👁️ مشاهده جزئیات تراکنش
- 👤 مشاهده اطلاعات کاربر پرداخت‌کننده

### **4. Content Management (مدیریت محتوا)**

#### **Sessions:**
- ➕ ایجاد Session جدید
- ✏️ ویرایش Session
- 🗑️ حذف Session

#### **Videos:**
- ➕ اضافه کردن ویدیو به Session
- ✏️ ویرایش ویدیو
- 🗑️ حذف ویدیو

#### **Exercises:**
- ➕ ایجاد تمرین جدید
- ✏️ ویرایش تمرین
- 🗑️ حذف تمرین

### **5. Analytics (آنالیتیکس)**

- 📈 **نمودار درآمد** (روزانه، هفتگی، ماهانه)
- 👥 **نمودار کاربران جدید**
- 🔥 **نمودار تعامل** (Chat messages, Completed tasks)

---

## 📚 **نحوه استفاده**

### **ورود به پنل مدیریت:**

1. **در Telegram Bot ادمین:**
   ```
   /admin_panel
   ```

2. **کلیک روی دکمه "🎛️ ورود به پنل مدیریت"**

3. **Mini App باز می‌شود** با `start_param=admin_panel`

4. **WebSocket اتصال برقرار می‌شود** و آمار لحظه‌ای نمایش داده می‌شود

### **استفاده از داشبورد:**

- **Tabs:** بین بخش‌های مختلف جابجا شوید (Dashboard, Users, Payments, Content, Analytics)
- **Refresh Button:** برای دریافت آمار جدید
- **Connection Status:** وضعیت اتصال WebSocket (متصل/قطع شده)
- **Real-time Updates:** آمار هر 5 ثانیه به صورت خودکار به‌روزرسانی می‌شود

---

## 🔐 **امنیت**

### **1. Telegram-only Access:**

- پنل **فقط از طریق Telegram** قابل دسترسی است
- WebApp authentication با `initData` از Telegram
- بدون دسترسی مستقیم از مرورگر

### **2. Admin Authorization:**

```go
// admin_api.go - adminAuthMiddleware
func adminAuthMiddleware() gin.HandlerFunc {
  return func(c *gin.Context) {
    // Check Telegram auth
    telegramID := c.GetInt64("telegram_id")
    
    // Verify admin in database
    var admin Admin
    if err := db.Where("telegram_id = ? AND is_active = ?", 
                        telegramID, true).First(&admin).Error; err != nil {
      c.JSON(403, gin.H{"error": "Forbidden"})
      c.Abort()
      return
    }
    
    c.Next()
  }
}
```

### **3. WebSocket Security:**

- **Connection validation** با Telegram initData
- **Admin-only clients** - فقط ادمین‌های تایید شده
- **Automatic disconnection** در صورت عدم اعتبار

### **4. Rate Limiting:**

- محدودیت درخواست برای هر endpoint
- جلوگیری از Abuse

---

## 🔌 **API Endpoints**

### **Base URL:** `/api/v1/admin`

#### **WebSocket:**
```
GET /api/v1/admin/ws
```

#### **Stats:**
```
GET /api/v1/admin/stats
GET /api/v1/admin/stats/chart?type=revenue&period=week
```

#### **Users:**
```
GET    /api/v1/admin/users?page=1&limit=50&search=&type=all
GET    /api/v1/admin/users/:id
POST   /api/v1/admin/users/:id/block
POST   /api/v1/admin/users/:id/unblock
POST   /api/v1/admin/users/:id/change-plan
DELETE /api/v1/admin/users/:id
```

#### **Payments:**
```
GET /api/v1/admin/payments?page=1&limit=50&status=all
GET /api/v1/admin/payments/:id
```

#### **Sessions:**
```
GET    /api/v1/admin/sessions
POST   /api/v1/admin/sessions
PUT    /api/v1/admin/sessions/:id
DELETE /api/v1/admin/sessions/:id
```

#### **Videos:**
```
GET    /api/v1/admin/videos?session_id=1
POST   /api/v1/admin/videos
PUT    /api/v1/admin/videos/:id
DELETE /api/v1/admin/videos/:id
```

#### **Exercises:**
```
GET    /api/v1/admin/exercises?session_id=1
POST   /api/v1/admin/exercises
PUT    /api/v1/admin/exercises/:id
DELETE /api/v1/admin/exercises/:id
```

#### **Analytics:**
```
GET /api/v1/admin/analytics/revenue?period=month
GET /api/v1/admin/analytics/users?period=month
GET /api/v1/admin/analytics/engagement?period=month
```

---

## 📡 **WebSocket Protocol**

### **Message Format:**

```typescript
interface WSMessage {
  type: string;
  payload: any;
}
```

### **Client → Server:**

#### **Request Stats:**
```json
{
  "type": "request_stats"
}
```

#### **Request Users:**
```json
{
  "type": "request_users"
}
```

#### **Request Payments:**
```json
{
  "type": "request_payments"
}
```

#### **Ping:**
```json
{
  "type": "ping"
}
```

### **Server → Client:**

#### **Stats Update:**
```json
{
  "type": "stats",
  "payload": {
    "totalUsers": 1250,
    "activeUsers": 890,
    "freeTrialUsers": 120,
    "paidUsers": 770,
    "todayRevenue": 5900000,
    "monthRevenue": 125000000,
    "onlineAdmins": 2,
    "pendingLicenses": 5,
    "recentUsers": [...],
    "recentPayments": [...],
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

#### **Pong:**
```json
{
  "type": "pong",
  "payload": {
    "status": "ok"
  }
}
```

### **Broadcasting:**

Server به صورت خودکار هر **5 ثانیه** آمار جدید را به تمام کلاینت‌های متصل ارسال می‌کند:

```go
// admin_websocket.go
func startStatsBroadcaster() {
  ticker := time.NewTicker(5 * time.Second)
  go func() {
    for range ticker.C {
      BroadcastStatsToAdmins()
    }
  }()
}
```

---

## 🛠️ **توسعه و سفارشی‌سازی**

### **اضافه کردن Tab جدید:**

#### **1. Frontend - AdminPanel.tsx:**

```typescript
const [activeTab, setActiveTab] = useState<
  'dashboard' | 'users' | 'payments' | 'content' | 'analytics' | 'new_tab'
>('dashboard');

// Add new tab button
{ id: 'new_tab', label: 'تب جدید', icon: NewIcon }
```

#### **2. Backend - admin_api.go:**

```go
// Add new endpoint
admin.GET("/new-feature", getNewFeature)

func getNewFeature(c *gin.Context) {
  // Implementation
  c.JSON(http.StatusOK, gin.H{
    "success": true,
    "data": data,
  })
}
```

### **اضافه کردن WebSocket Event جدید:**

#### **Backend - admin_websocket.go:**

```go
func handleAdminWSCommand(client *AdminClient, message []byte) {
  var msg WSMessage
  json.Unmarshal(message, &msg)
  
  switch msg.Type {
  case "new_event":
    handleNewEvent(client, msg.Payload)
  }
}

func handleNewEvent(client *AdminClient, payload interface{}) {
  // Process and send response
  sendWSMessage(client, "new_event_response", data)
}
```

#### **Frontend - AdminPanel.tsx:**

```typescript
ws.onmessage = (event) => {
  const message: WSMessage = JSON.parse(event.data);
  
  switch (message.type) {
    case 'new_event_response':
      handleNewEventResponse(message.payload);
      break;
  }
};

// Request new event
ws.send(JSON.stringify({ type: 'new_event', payload: {...} }));
```

---

## 📝 **نکات مهم**

### ✅ **Do's:**
- همیشه از Telegram برای دسترسی استفاده کنید
- WebSocket را پس از عدم استفاده disconnect کنید
- Error handling مناسب برای API calls
- Loading states برای بهبود UX

### ❌ **Don'ts:**
- هرگز از URL مستقیم در مرورگر استفاده نکنید
- Admin credentials را در frontend ذخیره نکنید
- بدون validation داده ارسال نکنید
- WebSocket را بدون cleanup رها نکنید

---

## 🐛 **Troubleshooting**

### **مشکل: WebSocket متصل نمی‌شود**

**Solution:**
1. Check که از Telegram وارد شده‌اید
2. Check که user شما admin است
3. Check console برای error messages
4. Check که backend در حال اجرا است

### **مشکل: "Unauthorized" error**

**Solution:**
1. مطمئن شوید که admin در database ثبت شده
2. `is_active = true` برای admin
3. Telegram auth صحیح است

### **مشکل: Stats به‌روزرسانی نمی‌شود**

**Solution:**
1. Check WebSocket connection status
2. Check که broadcaster در backend فعال است
3. Manual refresh با دکمه Refresh

---

## 📞 **Support**

اگر سوال یا مشکلی دارید:

- 📧 **Email:** support@monetizeai.com
- 💬 **Telegram:** @sian_academy_support
- 📖 **Documentation:** این فایل

---

## 🎉 **Complete!**

پنل مدیریت شما آماده است! 🚀

- ✅ WebSocket + REST API
- ✅ Real-time Updates
- ✅ Gzip Compression
- ✅ Telegram-only Access
- ✅ Comprehensive Management
- ✅ Analytics & Reports

**Enjoy managing your MonetizeAI bot!** 🎛️💜

