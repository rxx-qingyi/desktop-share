# Desktop Sharing Server (Go)

基于 Go + pion/webrtc 的 WebRTC 信令服务器和 SFU。

## 功能

- WebSocket 信令服务
- WebRTC SFU（Selective Forwarding Unit）
- 房间管理
- 基础鉴权
- HTTP API

## 模块结构

```
server/
├── cmd/server/         # 入口文件
│   └── main.go
├── internal/
│   ├── api/           # HTTP API
│   ├── auth/          # 鉴权模块
│   ├── room/          # 房间管理
│   ├── signaling/     # WebSocket 信令
│   └── webrtc/        # pion WebRTC 封装
└── go.mod
```

## 快速开始

### 安装依赖

```bash
go mod download
```

### 运行服务

```bash
go run cmd/server/main.go
```

服务将在 8080 端口启动。

### 自定义端口

```bash
PORT=9000 go run cmd/server/main.go
```

## API 端点

### WebSocket 信令

```
ws://localhost:8080/ws
```

### HTTP API

- `GET /api/rooms` - 获取房间列表
- `POST /api/rooms/create` - 创建房间
- `GET /health` - 健康检查

## 信令消息格式

### 加入房间

```json
{
  "type": "join",
  "roomId": "room-id",
  "role": "publisher" // 或 "subscriber"
}
```

### Offer

```json
{
  "type": "offer",
  "roomId": "room-id",
  "sdp": { ... }
}
```

### Answer

```json
{
  "type": "answer",
  "sdp": { ... }
}
```

### ICE Candidate

```json
{
  "type": "ice",
  "candidate": { ... }
}
```

## 环境变量

- `PORT` - 服务端口（默认 8080）

## 开发

### 运行测试

```bash
go test ./...
```

### 构建

```bash
go build -o server cmd/server/main.go
```
