package main

import (
	"time"

	"gorm.io/gorm"
)

const SUPPORT_NUMBER = "+989129121212"

// User represents a Telegram user in our system
type User struct {
	gorm.Model
	TelegramID     int64 `gorm:"uniqueIndex"`
	Username       string
	FirstName      string
	LastName       string
	CurrentSession int  `gorm:"default:1"`
	IsActive       bool `gorm:"default:true"`
	IsAdmin        bool `gorm:"default:false"`
	Exercises      []Exercise
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
