package main

import (
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

const SUPPORT_NUMBER = "@sian_academy_support"
const BUY_GPT_LINK = "@sian_academy_support"
const START_REFFER = "@sian_academy_support"

// Subscription limits
const FREE_TRIAL_DURATION = 3 * 24 * time.Hour // 3 days
const FREE_TRIAL_CHAT_LIMIT = 5                // 5 chat messages per day for free trial users
const FREE_TRIAL_COURSE_LIMIT = 3              // 3 course sessions

// LastChatReset tracks when chat limits were last reset (for daily reset)
type LastChatReset struct {
	gorm.Model
	TelegramID int64
	LastReset  time.Time
}

// User represents a Telegram user in our system
type User struct {
	gorm.Model
	TelegramID     int64 `gorm:"uniqueIndex"`
	Username       string
	Email          string
	FirstName      string
	LastName       string
	CurrentSession int  `gorm:"default:1"`
	IsActive       bool `gorm:"default:true"`
	IsAdmin        bool `gorm:"default:false"`
	IsBlocked      bool `gorm:"default:false"` // For blocking suspicious users
	License        string
	IsVerified     bool `gorm:"default:false"`
	Phone          string
	PhoneNumber    string `gorm:"default:''"` // Duplicate field for compatibility
	Exercises      []Exercise

	// Profile fields for miniApp
	MonthlyIncome int64 `json:"monthly_income" gorm:"default:0"` // در تومان
	Points         int  `json:"points" gorm:"default:0"`         // امتیاز کل کاربر

	// Subscription fields
	SubscriptionType   string `gorm:"default:'none'"` // none, free_trial, paid
	SubscriptionExpiry *time.Time
	PlanName           string `gorm:"default:''"` // نام پلن: starter, pro, ultimate, free_trial, lifetime
	FreeTrialUsed      bool   `gorm:"default:false"`
	ChatMessagesUsed   int    `gorm:"default:0"` // تعداد پیام‌های چت استفاده شده
	CourseSessionsUsed int    `gorm:"default:0"` // تعداد جلسات دوره استفاده شده

	// SMS tracking fields
	SignUpSMSSent          bool `gorm:"default:false"` // SMS ثبت‌نام (فقط یک بار)
	FreeTrialDayOneSMSSent bool `gorm:"default:false"` // SMS روز دوم (11 صبح)
	FreeTrialDayTwoSMSSent bool `gorm:"default:false"` // SMS روز سوم (10 صبح)
	FreeTrialExpireSMSSent bool `gorm:"default:false"` // SMS بعد از انقضا (2 ساعت بعد)
}

// Admin represents a system administrator
type Admin struct {
	gorm.Model
	TelegramID int64 `gorm:"uniqueIndex"`
	Username   string
	FirstName  string
	LastName   string
	Role       string `gorm:"default:'admin'"` // admin, super_admin
	IsActive   bool   `gorm:"default:true"`
}

// AdminAction represents admin activities for audit log
type AdminAction struct {
	gorm.Model
	AdminID    uint
	Admin      Admin `gorm:"foreignKey:AdminID"`
	Action     string
	Details    string
	TargetType string // user, session, video, exercise
	TargetID   uint
}

// Video represents a course video
type Video struct {
	gorm.Model
	Title       string
	Description string
	Date        time.Time
	VideoLink   string
	SessionID   uint
	Session     Session `gorm:"foreignKey:SessionID"`
}

// Session represents a course session
type Session struct {
	gorm.Model
	Number       int `gorm:"unique"`
	Title        string
	Description  string
	ThumbnailURL string
	IsActive     bool `gorm:"default:true"`
	IsCompleted  bool `gorm:"default:false"`
	Videos       []Video
	Exercises    []Exercise
	Users        []User `gorm:"many2many:user_sessions;"`
}

// Exercise represents a user's exercise submission
type Exercise struct {
	gorm.Model
	UserID      uint
	User        User `gorm:"foreignKey:UserID"`
	SessionID   uint
	Session     Session `gorm:"foreignKey:SessionID"`
	Content     string
	PDFFile     string // File ID or path to the PDF file
	Status      string `gorm:"default:'pending'"` // pending, approved, needs_revision
	Feedback    string
	SubmittedAt time.Time
}

// UserSession represents the many-to-many relationship between users and sessions
type UserSession struct {
	UserID    uint    `gorm:"primaryKey"`
	SessionID uint    `gorm:"primaryKey"`
	User      User    `gorm:"foreignKey:UserID"`
	Session   Session `gorm:"foreignKey:SessionID"`
}

// UserLevel represents the user's current level in the system
type UserLevel struct {
	Level       int
	Name        string
	Description string
	Emoji       string
}

// ChatMessage represents a chat message between user and AI
type ChatMessage struct {
	ID         uint      `gorm:"primaryKey" json:"id"`
	TelegramID int64     `gorm:"index" json:"telegram_id"`
	Message    string    `gorm:"type:text" json:"message"`
	Response   string    `gorm:"type:text" json:"response"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// Ticket represents a support ticket
type Ticket struct {
	gorm.Model
	TelegramID int64  `gorm:"index" json:"telegram_id"`
	Subject    string `gorm:"type:varchar(500)" json:"subject"`
	Priority   string `gorm:"type:varchar(20);default:'normal'" json:"priority"` // low, normal, high, urgent
	Status     string `gorm:"type:varchar(20);default:'open'" json:"status"`     // open, in_progress, answered, closed
	Messages   []TicketMessage `gorm:"foreignKey:TicketID" json:"messages,omitempty"`
}

// TicketMessage represents a message in a ticket conversation
type TicketMessage struct {
	gorm.Model
	TicketID   uint   `gorm:"index" json:"ticket_id"`
	Ticket     Ticket `gorm:"foreignKey:TicketID" json:"-"`
	SenderType string `gorm:"type:varchar(20)" json:"sender_type"` // user, admin
	Message    string `gorm:"type:text" json:"message"`
	TelegramID int64  `gorm:"index" json:"telegram_id,omitempty"` // For user messages
	AdminID    uint   `json:"admin_id,omitempty"`                 // For admin messages
	IsRead     bool   `gorm:"default:false" json:"is_read"`
}

var UserLevels = []UserLevel{
	{1, "کاوش‌گر فرصت‌ها", "تو ایده‌ای قابل اجرا و پول‌ساز برای خودت انتخاب کردی.", "💡"},
	{2, "سازنده نسخه اولیه", "ایده‌ات رو با ابزارهای AI به یه محصول ساده تبدیل کردی.", "🛠"},
	{3, "معمار هویت", "برند و هویت بصری خودت رو ساختی و داری حرفه‌ای دیده می‌شی.", "🎨"},
	{4, "ارائه‌دهنده حرفه‌ای", "یاد گرفتی چطور سرویس‌ت رو حرفه‌ای معرفی و پرزنت کنی.", "🖥"},
	{5, "شکارچی مشتری", "اولین مشتری واقعی‌ت رو جذب کردی و وارد دنیای فروش شدی.", "🎯"},
	{6, "اثبات‌گر نتیجه", "تونستی نتیجه ملموس و قابل اندازه‌گیری از کارت ارائه بدی.", "📈"},
	{7, "بسته‌بند فروش", "محصولت رو برای فروش نهایی پکیج و تبلیغ آماده کردی.", "📦"},
	{8, "معمار سیستم", "تیمت، ابزارها و اتوماسیون درآمدت رو ساختی.", "🤖"},
	{9, "مانیتایزر", "تو با AI به درآمد پایدار رسیدی و حالا آماده جهش بزرگ‌تری.", "👑"},
}

// GetUserLevel returns the user's current level based on completed sessions
func GetUserLevel(completedSessions int) UserLevel {
	switch {
	case completedSessions > 24:
		return UserLevels[8] // Level 9
	case completedSessions > 21:
		return UserLevels[7] // Level 8
	case completedSessions > 19:
		return UserLevels[6] // Level 7
	case completedSessions > 17:
		return UserLevels[5] // Level 6
	case completedSessions > 14:
		return UserLevels[4] // Level 5
	case completedSessions > 11:
		return UserLevels[3] // Level 4
	case completedSessions > 8:
		return UserLevels[2] // Level 3
	case completedSessions >= 6:
		return UserLevels[1] // Level 2
	default:
		return UserLevels[0] // Level 1
	}
}

// GetUserProgress returns the user's progress percentage
func GetUserProgress(completedSessions int) int {
	// Each level requires 4 sessions
	totalSessions := 29 // 9 levels * 4 sessions
	progress := (completedSessions * 100) / totalSessions
	if progress > 100 {
		progress = 100
	}
	return progress
}

// GetProgressBar returns a visual progress bar
func GetProgressBar(progress int) string {
	const totalBlocks = 10
	filledBlocks := (progress * totalBlocks) / 100
	bar := strings.Repeat("▓", filledBlocks) + strings.Repeat("░", totalBlocks-filledBlocks)
	return bar
}

// GetLevelUpMessage returns the congratulatory message for leveling up
func GetLevelUpMessage(level UserLevel) string {
	messages := map[int]string{
		1: "🎉 تبریک!\nتو به سطح 1 – کاوش‌گر فرصت‌ها (Ideater) 💡 رسیدی!\n✅ یعنی موفق شدی ایده‌ای قابل اجرا و پول‌ساز برای خودت کشف کنی\n🧠 حالا وقتشه بری سراغ ساخت اولین نسخه واقعی از ایده‌ت!",
		2: "🚀 آفرین!\nتو الان در سطح 2 – سازنده نسخه اولیه (Builder) 🛠 هستی\n✅ یعنی ایده‌ت رو به یک سرویس اولیه تبدیل کردی\n🔧 وقتشه تستش کنی و اولین بازخورد رو بگیری!",
		3: "🌟 کارت عالی بود!\nبه سطح 3 – معمار هویت (Brander) 🎨 رسیدی\n✅ برندت داره شکل می‌گیره، تو داری خاص دیده می‌شی\n🧱 حالا وقتشه تمایزت رو به تصویر بکشی",
		4: "🎙 تبریک می‌گم!\nالان تو سطح 4 – ارائه‌دهنده حرفه‌ای (Presenter) 🖥 هستی\n✅ یعنی بلدی چطوری خودت و محصولت رو معرفی کنی\n🎯 برو و اثر بذار!",
		5: "🔥 یه قدم بزرگ زدی!\nتو به سطح 5 – شکارچی مشتری (Clienter) 🎯 رسیدی\n✅ یعنی اولین مشتری واقعی رو جذب کردی\n💸 الان وقتشه وارد مسیر فروش جدی‌تر بشی!",
		6: "📈 عالیه!\nتو در سطح 6 – اثبات‌گر نتیجه (Prover) 📈 قرار گرفتی\n✅ یعنی تونستی نتیجه قابل اندازه‌گیری ارائه بدی\n🔍 وقتشه اعتبارتو تثبیت کنی",
		7: "📦 تبریک ویژه!\nتو به سطح 7 – بسته‌بند فروش (Packer) 📦 رسیدی\n✅ یعنی همه‌چی آماده فروش شد: محصول، پیشنهاد، محتوا\n💥 الان وقت کمپینه!",
		8: "🤖 حرفه‌ای شدی!\nتو الان سطح 8 – معمار سیستم (Systemer) 🤖 هستی\n✅ یعنی تیم، ابزار و فرایندتو ساختی\n🏗 حالا وقت خودکارسازی و اسکیل کردنه",
		9: "👑 افتخار بزرگیه!\nتو به سطح 9 – مانیتایزر (Moneytizer) 👑 رسیدی\n✅ یعنی با هوش مصنوعی به درآمد پایدار رسیدی\n🚀 الان وقت رشد، همکاری، فروش جدی و ساخت امپراتوریته!",
	}
	return messages[level.Level]
}

// LicenseVerification represents a pending license verification request
type LicenseVerification struct {
	gorm.Model
	UserID     uint
	User       User `gorm:"foreignKey:UserID"`
	License    string
	FirstName  string
	LastName   string
	Status     string `gorm:"default:'pending'"` // pending, approved, rejected
	IsApproved bool   `gorm:"default:false"`
	ApprovedBy *uint
	ApprovedAt *time.Time
	Admin      Admin `gorm:"foreignKey:ApprovedBy"`
}

// Subscription helper functions
func (u *User) HasActiveSubscription() bool {
	// Legacy users: If IsVerified is true and no subscription type is set, treat as lifetime license
	if u.IsVerified && (u.SubscriptionType == "" || u.SubscriptionType == "none") {
		return true // Old verified users have lifetime access
	}

	if u.SubscriptionType == "paid" {
		// For paid subscription, check if it's lifetime (no expiry) or not expired yet
		if u.SubscriptionExpiry == nil {
			return true // Lifetime license
		}
		return time.Now().Before(*u.SubscriptionExpiry)
	}
	if u.SubscriptionType == "free_trial" && u.SubscriptionExpiry != nil {
		return time.Now().Before(*u.SubscriptionExpiry)
	}
	return false
}

func (u *User) CanUseChat() bool {
	if u.HasActiveSubscription() {
		return true
	}
	return u.ChatMessagesUsed < FREE_TRIAL_CHAT_LIMIT
}

func (u *User) CanAccessCourseSession(sessionNumber int) bool {
	if u.HasActiveSubscription() {
		return true
	}
	return sessionNumber <= FREE_TRIAL_COURSE_LIMIT
}

func (u *User) StartFreeTrial() {
	expiry := time.Now().Add(FREE_TRIAL_DURATION)
	u.SubscriptionType = "free_trial"
	u.PlanName = "free_trial"
	u.SubscriptionExpiry = &expiry
	u.FreeTrialUsed = true
	u.ChatMessagesUsed = 0
	u.CourseSessionsUsed = 0
}

// GetSubscriptionStatusText returns formatted subscription status with name and duration
func (u *User) GetSubscriptionStatusText() string {
	if !u.HasActiveSubscription() {
		return "غیرفعال"
	}

	// Map plan names to Persian
	planNames := map[string]string{
		"free_trial": "آزمایشی رایگان",
		"starter":    "استارتر",
		"pro":        "پرو",
		"ultimate":   "آلتیمیت",
	}

	planDisplayName := planNames[u.PlanName]
	if planDisplayName == "" {
		planDisplayName = u.PlanName
	}

	// Handle lifetime subscription (ultimate with no expiry)
	if u.PlanName == "ultimate" && u.SubscriptionExpiry == nil {
		return fmt.Sprintf("%s (مادام‌العمر)", planDisplayName)
	}

	// Handle subscriptions with expiry date
	if u.SubscriptionExpiry != nil {
		now := time.Now()
		expiry := *u.SubscriptionExpiry

		// Calculate remaining time
		duration := expiry.Sub(now)

		if duration <= 0 {
			return "منقضی شده"
		}

		days := int(duration.Hours() / 24)

		if days >= 365 {
			years := days / 365
			if years == 1 {
				return fmt.Sprintf("%s (۱ سال باقی‌مانده)", planDisplayName)
			}
			return fmt.Sprintf("%s (%d سال باقی‌مانده)", planDisplayName, years)
		} else if days >= 30 {
			months := days / 30
			if months == 1 {
				return fmt.Sprintf("%s (۱ ماه باقی‌مانده)", planDisplayName)
			}
			return fmt.Sprintf("%s (%d ماه باقی‌مانده)", planDisplayName, months)
		} else if days > 0 {
			if days == 1 {
				return fmt.Sprintf("%s (۱ روز باقی‌مانده)", planDisplayName)
			}
			return fmt.Sprintf("%s (%d روز باقی‌مانده)", planDisplayName, days)
		} else {
			hours := int(duration.Hours())
			if hours > 0 {
				if hours == 1 {
					return fmt.Sprintf("%s (۱ ساعت باقی‌مانده)", planDisplayName)
				}
				return fmt.Sprintf("%s (%d ساعت باقی‌مانده)", planDisplayName, hours)
			}
			return fmt.Sprintf("%s (کمتر از ۱ ساعت باقی‌مانده)", planDisplayName)
		}
	}

	return fmt.Sprintf("%s (فعال)", planDisplayName)
}
