package auth

import (
	"crypto/rand"
	"encoding/base64"
	"sync"
	"time"
)

// Token 令牌结构
type Token struct {
	Value     string
	RoomID    string
	Role      string // "publisher" 或 "subscriber"
	ExpiresAt time.Time
}

// Manager 管理令牌
type Manager struct {
	tokens map[string]*Token
	mutex  sync.RWMutex
}

// NewManager 创建新的认证管理器
func NewManager() *Manager {
	return &Manager{
		tokens: make(map[string]*Token),
	}
}

// GenerateToken 生成新令牌
func (m *Manager) GenerateToken(roomID, role string, duration time.Duration) (string, error) {
	// 生成随机令牌
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	tokenValue := base64.URLEncoding.EncodeToString(b)

	// 创建令牌
	token := &Token{
		Value:     tokenValue,
		RoomID:    roomID,
		Role:      role,
		ExpiresAt: time.Now().Add(duration),
	}

	// 保存令牌
	m.mutex.Lock()
	m.tokens[tokenValue] = token
	m.mutex.Unlock()

	return tokenValue, nil
}

// ValidateToken 验证令牌
func (m *Manager) ValidateToken(tokenValue string) (*Token, bool) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	token, exists := m.tokens[tokenValue]
	if !exists {
		return nil, false
	}

	// 检查是否过期
	if time.Now().After(token.ExpiresAt) {
		return nil, false
	}

	return token, true
}

// RevokeToken 撤销令牌
func (m *Manager) RevokeToken(tokenValue string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	delete(m.tokens, tokenValue)
}

// CleanupExpired 清理过期令牌
func (m *Manager) CleanupExpired() {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	now := time.Now()
	for key, token := range m.tokens {
		if now.After(token.ExpiresAt) {
			delete(m.tokens, key)
		}
	}
}

// StartCleanupRoutine 启动定期清理任务
func (m *Manager) StartCleanupRoutine(interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			m.CleanupExpired()
		}
	}()
}
