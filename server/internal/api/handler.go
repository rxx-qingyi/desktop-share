package api

import (
	"desktop-sharing/server/internal/room"
	"encoding/json"
	"net/http"
)

// Handler API 处理器
type Handler struct {
	roomManager *room.Manager
}

// NewHandler 创建新的 API 处理器
func NewHandler(roomManager *room.Manager) *Handler {
	return &Handler{
		roomManager: roomManager,
	}
}

// RoomInfo 房间信息
type RoomInfo struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	HasPublisher  bool   `json:"hasPublisher"`
	SubscriberCount int    `json:"subscriberCount"`
}

// CreateRoomRequest 创建房间请求
type CreateRoomRequest struct {
	Name string `json:"name"`
}

// CreateRoomResponse 创建房间响应
type CreateRoomResponse struct {
	RoomID string `json:"roomId"`
	Name   string `json:"name"`
}

// HandleRooms 处理房间列表请求
func (h *Handler) HandleRooms(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	rooms := h.roomManager.ListRooms()
	roomInfos := make([]RoomInfo, 0, len(rooms))

	for _, rm := range rooms {
		roomInfos = append(roomInfos, RoomInfo{
			ID:              rm.ID,
			Name:            rm.Name,
			HasPublisher:    rm.HasPublisher(),
			SubscriberCount: len(rm.GetSubscribers()),
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(roomInfos)
}

// HandleCreateRoom 处理创建房间请求
func (h *Handler) HandleCreateRoom(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req CreateRoomRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Name == "" {
		req.Name = "Unnamed Room"
	}

	rm := h.roomManager.CreateRoom(req.Name)

	response := CreateRoomResponse{
		RoomID: rm.ID,
		Name:   rm.Name,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(response)
}
