package main

import (
	"time"

	"gorm.io/gorm"
)

// User represents a Telegram user in our system
type User struct {
	gorm.Model
	TelegramID    int64  `gorm:"uniqueIndex"`
	Username      string
	FirstName     string
	LastName      string
	CurrentSession int    `gorm:"default:1"`
	IsActive      bool   `gorm:"default:true"`
	Sessions      []Session
	Exercises     []Exercise
}

// Video represents a course video
type Video struct {
	gorm.Model
	Title       string
	Description string
	Date        time.Time
	VideoLink   string
	SessionID   uint
	Session     Session
}

// Session represents a course session
type Session struct {
	gorm.Model
	Number      int    `gorm:"uniqueIndex"`
	Title       string
	Description string
	Videos      []Video
	Users       []User
	Exercises   []Exercise
}

// Exercise represents a user's exercise submission
type Exercise struct {
	gorm.Model
	UserID      uint
	User        User
	SessionID   uint
	Session     Session
	Content     string
	Status      string `gorm:"default:'pending'"` // pending, approved, needs_revision
	Feedback    string
	SubmittedAt time.Time
} 