# Desktop Sharing / Live Streaming System

基于 WebRTC 的桌面共享和直播系统，支持低延迟实时传输。

## 项目结构

```
.
├── server/           # Go 后端服务（信令 + SFU）
├── web-client/       # Web 观看端（React + TypeScript + Tailwind）
├── desktop-client/   # 桌面推流端（Electron + TypeScript + Tailwind）
└── README.md
```

## 技术栈

### 后端
- Go 1.21+
- pion/webrtc v3
- WebSocket

### Web 客户端
- React 18
- TypeScript
- Tailwind CSS
- WebRTC API

### 桌面客户端
- Electron
- TypeScript
- Tailwind CSS
- WebRTC API

## 快速开始

### 1. 启动后端服务

```bash
cd server
go mod download
go run cmd/server/main.go
```

### 2. 启动 Web 客户端

```bash
cd web-client
npm install
npm run dev
```

### 3. 启动桌面客户端

```bash
cd desktop-client
npm install
npm run dev
```

## 功能特性

- ✅ 低延迟（200ms ~ 500ms）
- ✅ 1 对 N 多人观看
- ✅ 权限控制
- ✅ SFU 架构
- ✅ NAT 穿透（STUN/TURN）

## 系统架构

```
桌面客户端（推流）
    ↓ WebRTC
Go 后端（SFU + 信令）
    ↓ WebRTC
Web 浏览器（观看）
```

## 性能指标

| 指标 | 目标 |
|------|------|
| 延迟 | < 500ms |
| 帧率 | 30 FPS |
| 分辨率 | 1080p |

## 许可证

MIT
