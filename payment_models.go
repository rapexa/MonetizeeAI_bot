package main

import (
	"time"

	"gorm.io/gorm"
)

// PaymentTransaction represents a payment transaction with ZarinPal
type PaymentTransaction struct {
	gorm.Model
	UserID      uint   `gorm:"not null" json:"user_id"`
	User        User   `gorm:"foreignKey:UserID" json:"user"`
	Type        string `gorm:"size:50;not null" json:"type"` // Types: "starter", "pro", "ultimate"
	Amount      int    `gorm:"not null" json:"amount"`       // تومان
	Authority   string `gorm:"size:100;uniqueIndex" json:"authority"`
	RefID       string `gorm:"size:100" json:"ref_id"`
	Status      string `gorm:"size:20;default:'pending'" json:"status"` // Statuses: "pending", "success", "failed"
	Description string `gorm:"size:500" json:"description"`
	CreatedAt   time.Time
	UpdatedAt   time.Time
	DeletedAt   gorm.DeletedAt `gorm:"index"`
}

func (PaymentTransaction) TableName() string {
	return "payment_transactions"
}
