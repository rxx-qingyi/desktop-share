package main

import (
	"desktop-sharing/server/internal/api"
	"desktop-sharing/server/internal/room"
	"desktop-sharing/server/internal/signaling"
	"log"
	"net/http"
	"os"
)

func main() {
	// 初始化房间管理器
	roomManager := room.NewManager()

	// 初始化信令服务器
	signalingServer := signaling.NewServer(roomManager)

	// 设置路由
	mux := http.NewServeMux()

	// WebSocket 信令端点
	mux.HandleFunc("/ws", signalingServer.HandleWebSocket)

	// HTTP API 端点
	apiHandler := api.NewHandler(roomManager)
	mux.HandleFunc("/api/rooms", apiHandler.HandleRooms)
	mux.HandleFunc("/api/rooms/create", apiHandler.HandleCreateRoom)

	// 健康检查
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// 获取端口配置
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	log.Printf("WebSocket endpoint: ws://localhost:%s/ws", port)
	log.Printf("API endpoint: http://localhost:%s/api", port)

	if err := http.ListenAndServe(":"+port, enableCORS(mux)); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

// CORS 中间件
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
