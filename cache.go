package main

import (
	"sync"
	"time"
)

// UserCache stores frequently accessed user data in memory
type UserCache struct {
	users map[int64]*CachedUser
	mu    sync.RWMutex
}

type CachedUser struct {
	User      *User
	ExpiresAt time.Time
}

var userCache = &UserCache{
	users: make(map[int64]*CachedUser),
}

// GetUser retrieves user from cache or database
func (uc *UserCache) GetUser(telegramID int64) (*User, error) {
	uc.mu.RLock()
	cached, exists := uc.users[telegramID]
	uc.mu.RUnlock()

	// Return from cache if valid
	if exists && time.Now().Before(cached.ExpiresAt) {
		return cached.User, nil
	}

	// Fetch from database - only select needed fields for better performance
	var user User
	if err := db.Select("telegram_id", "username", "first_name", "last_name", "current_session", 
		"is_verified", "is_active", "subscription_type", "plan_name", "subscription_expiry", 
		"free_trial_used", "chat_messages_used", "course_sessions_used", "points", "created_at", "updated_at").
		Where("telegram_id = ?", telegramID).First(&user).Error; err != nil {
		return nil, err
	}

	// Cache for 5 minutes
	uc.mu.Lock()
	uc.users[telegramID] = &CachedUser{
		User:      &user,
		ExpiresAt: time.Now().Add(5 * time.Minute),
	}
	uc.mu.Unlock()

	return &user, nil
}

// InvalidateUser removes user from cache (call after updates)
func (uc *UserCache) InvalidateUser(telegramID int64) {
	uc.mu.Lock()
	delete(uc.users, telegramID)
	uc.mu.Unlock()
}

// CleanupExpired removes expired cache entries periodically
func (uc *UserCache) CleanupExpired() {
	ticker := time.NewTicker(10 * time.Minute)
	go func() {
		for range ticker.C {
			uc.mu.Lock()
			now := time.Now()
			for id, cached := range uc.users {
				if now.After(cached.ExpiresAt) {
					delete(uc.users, id)
				}
			}
			uc.mu.Unlock()
		}
	}()
}

// SessionCache stores frequently accessed session data in memory
type SessionCache struct {
	allSessions []Session
	sessions    map[int]*Session
	mu          sync.RWMutex
	expiresAt   time.Time
}

var sessionCache = &SessionCache{
	sessions: make(map[int]*Session),
}

// GetAllSessions retrieves all sessions from cache or database
func (sc *SessionCache) GetAllSessions() ([]Session, error) {
	sc.mu.RLock()
	expired := time.Now().After(sc.expiresAt)
	sc.mu.RUnlock()

	if !expired && len(sc.allSessions) > 0 {
		return sc.allSessions, nil
	}

	// Fetch from database - only select needed fields
	var sessions []Session
	if err := db.Select("id", "number", "title", "description", "is_active", "is_completed").
		Order("number ASC").Find(&sessions).Error; err != nil {
		return nil, err
	}

	// Cache for 30 minutes (sessions don't change often)
	sc.mu.Lock()
	sc.allSessions = sessions
	sc.expiresAt = time.Now().Add(30 * time.Minute)
	// Also update individual session cache
	for i := range sessions {
		sc.sessions[sessions[i].Number] = &sessions[i]
	}
	sc.mu.Unlock()

	return sessions, nil
}

// GetSessionByNumber retrieves a specific session from cache or database
func (sc *SessionCache) GetSessionByNumber(number int) (*Session, error) {
	sc.mu.RLock()
	cached, exists := sc.sessions[number]
	expired := time.Now().After(sc.expiresAt)
	sc.mu.RUnlock()

	if exists && !expired {
		return cached, nil
	}

	// Fetch from database
	var session Session
	if err := db.Select("id", "number", "title", "description", "is_active", "is_completed").
		Where("number = ?", number).First(&session).Error; err != nil {
		return nil, err
	}

	// Cache it
	sc.mu.Lock()
	sc.sessions[number] = &session
	sc.expiresAt = time.Now().Add(30 * time.Minute)
	sc.mu.Unlock()

	return &session, nil
}

// InvalidateSessions clears session cache (call after admin updates)
func (sc *SessionCache) InvalidateSessions() {
	sc.mu.Lock()
	sc.allSessions = nil
	sc.sessions = make(map[int]*Session)
	sc.expiresAt = time.Time{}
	sc.mu.Unlock()
}


