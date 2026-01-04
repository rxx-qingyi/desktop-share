package room

import (
	"sync"

	"github.com/google/uuid"
)

// Room 代表一个直播房间
type Room struct {
	ID          string
	Name        string
	Publisher   *Peer // 推流者
	Subscribers map[string]*Peer // 订阅者
	mutex       sync.RWMutex
}

// Peer 代表一个连接的用户
type Peer struct {
	ID       string
	RoomID   string
	Role     string // "publisher" 或 "subscriber"
	Conn     interface{} // WebSocket 连接
	PeerConn interface{} // WebRTC PeerConnection
}

// Manager 管理所有房间
type Manager struct {
	rooms map[string]*Room
	mutex sync.RWMutex
}

// NewManager 创建新的房间管理器
func NewManager() *Manager {
	return &Manager{
		rooms: make(map[string]*Room),
	}
}

// CreateRoom 创建新房间
func (m *Manager) CreateRoom(name string) *Room {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	roomID := uuid.New().String()
	room := &Room{
		ID:          roomID,
		Name:        name,
		Subscribers: make(map[string]*Peer),
	}

	m.rooms[roomID] = room
	return room
}

// GetRoom 获取房间
func (m *Manager) GetRoom(roomID string) (*Room, bool) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	room, exists := m.rooms[roomID]
	return room, exists
}

// ListRooms 列出所有房间
func (m *Manager) ListRooms() []*Room {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	rooms := make([]*Room, 0, len(m.rooms))
	for _, room := range m.rooms {
		rooms = append(rooms, room)
	}
	return rooms
}

// DeleteRoom 删除房间
func (m *Manager) DeleteRoom(roomID string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	delete(m.rooms, roomID)
}

// SetPublisher 设置推流者
func (r *Room) SetPublisher(peer *Peer) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	r.Publisher = peer
}

// RemovePublisher 移除推流者
func (r *Room) RemovePublisher() {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	r.Publisher = nil
}

// AddSubscriber 添加订阅者
func (r *Room) AddSubscriber(peer *Peer) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	r.Subscribers[peer.ID] = peer
}

// RemoveSubscriber 移除订阅者
func (r *Room) RemoveSubscriber(peerID string) {
	r.mutex.Lock()
	defer r.mutex.Unlock()

	delete(r.Subscribers, peerID)
}

// GetSubscribers 获取所有订阅者
func (r *Room) GetSubscribers() []*Peer {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	subscribers := make([]*Peer, 0, len(r.Subscribers))
	for _, sub := range r.Subscribers {
		subscribers = append(subscribers, sub)
	}
	return subscribers
}

// HasPublisher 检查是否有推流者
func (r *Room) HasPublisher() bool {
	r.mutex.RLock()
	defer r.mutex.RUnlock()

	return r.Publisher != nil
}
