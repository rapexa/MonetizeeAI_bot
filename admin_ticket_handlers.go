package main

import (
	"fmt"
	"net/http"
	"os"
	"strconv"

	"MonetizeeAI_bot/logger"

	tgbotapi "github.com/go-telegram-bot-api/telegram-bot-api/v5"
	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ==========================================
// Admin Ticket Management Handlers
// ==========================================

// getAdminTickets returns all tickets with filters
func getAdminTickets(c *gin.Context) {
	status := c.DefaultQuery("status", "all")
	priority := c.DefaultQuery("priority", "all")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	offset := (page - 1) * pageSize

	var tickets []Ticket
	query := db.Model(&Ticket{})

	// Apply status filter
	if status != "all" {
		query = query.Where("status = ?", status)
	}

	// Apply priority filter
	if priority != "all" {
		query = query.Where("priority = ?", priority)
	}

	// Apply search filter
	if search != "" {
		query = query.Where("subject LIKE ?", "%"+search+"%")
	}

	// Get total count
	var total int64
	query.Count(&total)

	// Get tickets with pagination
	if err := query.
		Preload("Messages", func(db *gorm.DB) *gorm.DB {
			return db.Order("created_at ASC")
		}).
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&tickets).Error; err != nil {
		logger.Error("Failed to get admin tickets", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get tickets",
		})
		return
	}

	// Get user info for each ticket
	type TicketWithUser struct {
		Ticket
		UserInfo struct {
			Username  string `json:"username"`
			FirstName string `json:"first_name"`
			LastName  string `json:"last_name"`
		} `json:"user_info"`
	}

	var ticketsWithUser []TicketWithUser
	for _, ticket := range tickets {
		var user User
		if err := db.Where("telegram_id = ?", ticket.TelegramID).First(&user).Error; err == nil {
			ticketWithUser := TicketWithUser{
				Ticket: ticket,
			}
			ticketWithUser.UserInfo.Username = user.Username
			ticketWithUser.UserInfo.FirstName = user.FirstName
			ticketWithUser.UserInfo.LastName = user.LastName
			ticketsWithUser = append(ticketsWithUser, ticketWithUser)
		} else {
			// Add ticket without user info if user not found
			ticketsWithUser = append(ticketsWithUser, TicketWithUser{Ticket: ticket})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"tickets":   ticketsWithUser,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// getAdminTicketDetail returns a specific ticket with all messages
func getAdminTicketDetail(c *gin.Context) {
	ticketIDStr := c.Param("id")
	ticketID, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid ticket ID",
		})
		return
	}

	var ticket Ticket
	if err := db.Preload("Messages", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at ASC")
	}).First(&ticket, ticketID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Ticket not found",
			})
			return
		}
		logger.Error("Failed to get admin ticket", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get ticket",
		})
		return
	}

	// Get user info
	var user User
	userInfo := gin.H{
		"telegram_id": ticket.TelegramID,
	}
	if err := db.Where("telegram_id = ?", ticket.TelegramID).First(&user).Error; err == nil {
		userInfo["username"] = user.Username
		userInfo["first_name"] = user.FirstName
		userInfo["last_name"] = user.LastName
		userInfo["phone"] = user.Phone
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"ticket":    ticket,
			"user_info": userInfo,
		},
	})
}

// adminReplyTicket allows admin to reply to a ticket
func adminReplyTicket(c *gin.Context) {
	ticketIDStr := c.Param("id")
	ticketID, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid ticket ID",
		})
		return
	}

	var requestData struct {
		Message string `json:"message" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request data",
		})
		return
	}

	// Get admin ID from context
	adminIDValue, exists := c.Get("admin_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Admin not authenticated",
		})
		return
	}
	adminID := adminIDValue.(uint)

	// Get ticket
	var ticket Ticket
	if err := db.First(&ticket, ticketID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Ticket not found",
			})
			return
		}
		logger.Error("Failed to get ticket", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get ticket",
		})
		return
	}

	// Create admin message
	message := TicketMessage{
		TicketID:   ticket.ID,
		SenderType: "admin",
		Message:    requestData.Message,
		AdminID:    adminID,
	}

	if err := db.Create(&message).Error; err != nil {
		logger.Error("Failed to create admin ticket message", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create message",
		})
		return
	}

	// Update ticket status to "answered" when admin replies
	ticket.Status = "answered"
	db.Save(&ticket)

	// Load ticket with messages
	db.Preload("Messages", func(db *gorm.DB) *gorm.DB {
		return db.Order("created_at ASC")
	}).First(&ticket, ticket.ID)

	// Send notification to user via Telegram
	go func() {
		// Get user info
		var user User
		if err := db.Where("telegram_id = ?", ticket.TelegramID).First(&user).Error; err != nil {
			logger.Error("Failed to get user for ticket notification", zap.Error(err))
			return
		}

		// Get mini app URL - use the full Telegram Mini App format
		miniAppURL := os.Getenv("MINI_APP_URL")
		if miniAppURL == "" {
			miniAppURL = "https://t.me/MonetizeeAI_bot/MonetizeAI"
		}

		// Create Mini App URL with startapp parameter to open tickets section
		// Format: https://t.me/bot_username/app_name?startapp=tickets
		miniAppWithTickets := fmt.Sprintf("%s?startapp=tickets", miniAppURL)

		// Create notification message
		notificationText := "تیکت شما توسط پشتیبان جواب داده شد ✅\n\nمشاهده تیکت👇🏼"

		// Create inline keyboard with button to open Mini App tickets section
		keyboard := tgbotapi.NewInlineKeyboardMarkup(
			tgbotapi.NewInlineKeyboardRow(
				tgbotapi.NewInlineKeyboardButtonURL("مشاهده تیکت", miniAppWithTickets),
			),
		)

		msg := tgbotapi.NewMessage(ticket.TelegramID, notificationText)
		msg.ReplyMarkup = keyboard

		if _, err := bot.Send(msg); err != nil {
			logger.Error("Failed to send ticket notification to user",
				zap.Int64("telegram_id", ticket.TelegramID),
				zap.Uint("ticket_id", ticket.ID),
				zap.Error(err))
		} else {
			logger.Info("Ticket notification sent to user",
				zap.Int64("telegram_id", ticket.TelegramID),
				zap.Uint("ticket_id", ticket.ID))
		}
	}()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    ticket,
	})
}

// adminChangeTicketStatus allows admin to change ticket status
func adminChangeTicketStatus(c *gin.Context) {
	ticketIDStr := c.Param("id")
	ticketID, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid ticket ID",
		})
		return
	}

	var requestData struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&requestData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request data",
		})
		return
	}

	// Validate status
	validStatuses := map[string]bool{"open": true, "in_progress": true, "answered": true, "closed": true}
	if !validStatuses[requestData.Status] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid status. Must be: open, in_progress, answered, or closed",
		})
		return
	}

	// Get ticket
	var ticket Ticket
	if err := db.First(&ticket, ticketID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Ticket not found",
			})
			return
		}
		logger.Error("Failed to get ticket", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get ticket",
		})
		return
	}

	// Update status
	ticket.Status = requestData.Status
	if err := db.Save(&ticket).Error; err != nil {
		logger.Error("Failed to update ticket status", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update ticket status",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    ticket,
	})
}

