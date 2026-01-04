package signaling

import (
	"desktop-sharing/server/internal/room"
	"desktop-sharing/server/internal/webrtc"
	"encoding/json"
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // 生产环境需要验证 origin
	},
}

// Message 信令消息结构
type Message struct {
	Type      string          `json:"type"`
	RoomID    string          `json:"roomId,omitempty"`
	Role      string          `json:"role,omitempty"`
	SDP       json.RawMessage `json:"sdp,omitempty"`
	Candidate json.RawMessage `json:"candidate,omitempty"`
	Error     string          `json:"error,omitempty"`
}

// Server 信令服务器
type Server struct {
	roomManager *room.Manager
	webrtcMgr   *webrtc.Manager
}

// NewServer 创建新的信令服务器
func NewServer(roomManager *room.Manager) *Server {
	return &Server{
		roomManager: roomManager,
		webrtcMgr:   webrtc.NewManager(),
	}
}

// HandleWebSocket 处理 WebSocket 连接
func (s *Server) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	peerID := uuid.New().String()
	var currentRoomID string
	var currentRole string

	log.Printf("New WebSocket connection: %s", peerID)

	// 连接关闭时清理资源
	defer func() {
		if currentRoomID != "" {
			s.cleanupPeer(peerID, currentRoomID, currentRole)
		}
		s.webrtcMgr.ClosePeer(peerID)
		log.Printf("WebSocket connection closed: %s", peerID)
	}()

	// 处理消息循环
	for {
		var msg Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("Read error: %v", err)
			break
		}

		log.Printf("Received message from %s: type=%s, roomId=%s", peerID, msg.Type, msg.RoomID)

		// 记录房间ID和角色
		if msg.Type == "join" && msg.RoomID != "" {
			currentRoomID = msg.RoomID
			currentRole = msg.Role
		}

		// 处理不同类型的消息
		switch msg.Type {
		case "join":
			s.handleJoin(conn, peerID, &msg)
		case "offer":
			s.handleOffer(conn, peerID, &msg)
		case "answer":
			s.handleAnswer(conn, peerID, &msg)
		case "ice":
			s.handleICE(conn, peerID, &msg)
		default:
			log.Printf("Unknown message type: %s", msg.Type)
		}
	}
}

// cleanupPeer 清理断开连接的peer
func (s *Server) cleanupPeer(peerID, roomID, role string) {
	rm, exists := s.roomManager.GetRoom(roomID)
	if !exists {
		return
	}

	if role == "publisher" {
		log.Printf("Cleaning up publisher %s from room %s", peerID, roomID)
		rm.RemovePublisher()
		// 清理房间的所有tracks
		s.webrtcMgr.CleanupRoomTracks(roomID)
	} else if role == "subscriber" {
		log.Printf("Cleaning up subscriber %s from room %s", peerID, roomID)
		rm.RemoveSubscriber(peerID)
	}
}

// handleJoin 处理加入房间请求
func (s *Server) handleJoin(conn *websocket.Conn, peerID string, msg *Message) {
	rm, exists := s.roomManager.GetRoom(msg.RoomID)
	if !exists {
		s.sendError(conn, "Room not found")
		return
	}

	peer := &room.Peer{
		ID:     peerID,
		RoomID: msg.RoomID,
		Role:   msg.Role,
		Conn:   conn,
	}

	if msg.Role == "publisher" {
		if rm.HasPublisher() {
			s.sendError(conn, "Room already has a publisher")
			return
		}
		rm.SetPublisher(peer)
	} else {
		rm.AddSubscriber(peer)
	}

	// 发送成功响应
	response := Message{
		Type:   "joined",
		RoomID: msg.RoomID,
		Role:   msg.Role,
	}
	conn.WriteJSON(response)
}

// handleOffer 处理 Offer
func (s *Server) handleOffer(conn *websocket.Conn, peerID string, msg *Message) {
	rm, exists := s.roomManager.GetRoom(msg.RoomID)
	if !exists {
		s.sendError(conn, "Room not found")
		return
	}

	// 查找该 peer 的角色
	var role string
	if rm.Publisher != nil && rm.Publisher.ID == peerID {
		role = "publisher"
	} else {
		role = "subscriber"
	}

	// 创建 WebRTC PeerConnection 并生成 Answer
	answer, err := s.webrtcMgr.HandleOffer(peerID, msg.SDP, role, msg.RoomID)
	if err != nil {
		log.Printf("Failed to handle offer: %v", err)
		s.sendError(conn, "Failed to process offer")
		return
	}

	// 发送 Answer
	response := Message{
		Type: "answer",
		SDP:  answer,
	}
	conn.WriteJSON(response)
}

// handleAnswer 处理 Answer
func (s *Server) handleAnswer(conn *websocket.Conn, peerID string, msg *Message) {
	err := s.webrtcMgr.HandleAnswer(peerID, msg.SDP)
	if err != nil {
		log.Printf("Failed to handle answer: %v", err)
		s.sendError(conn, "Failed to process answer")
	}
}

// handleICE 处理 ICE Candidate
func (s *Server) handleICE(conn *websocket.Conn, peerID string, msg *Message) {
	err := s.webrtcMgr.HandleICECandidate(peerID, msg.Candidate)
	if err != nil {
		log.Printf("Failed to handle ICE candidate: %v", err)
	}
}

// sendError 发送错误消息
func (s *Server) sendError(conn *websocket.Conn, errorMsg string) {
	msg := Message{
		Type:  "error",
		Error: errorMsg,
	}
	conn.WriteJSON(msg)
}
