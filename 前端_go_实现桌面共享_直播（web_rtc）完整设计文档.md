# 前端 + Go 实现桌面共享 / 直播（WebRTC）完整设计文档

> 目标：实现 **桌面端推流（桌面共享 / 直播） → Web 浏览器实时观看**
>
> 特点：低延迟、跨平台、可扩展、工程可落地

---

## 1. 项目背景与目标

### 1.1 背景

- 需要将 **桌面端画面实时共享** 给 Web 用户
- 推流端可以是桌面应用
- 接收端必须是浏览器（无需插件）
- 延迟要求低（演示 / 会议 / 协作）

### 1.2 目标

- 延迟控制在 **200ms ~ 500ms**
- 支持 **1 → N** 多人观看
- 支持权限控制
- 架构清晰，可持续扩展

---

## 2. 技术选型

### 2.1 总体方案

| 模块 | 技术 | 说明 |
|----|----|----|
| 桌面端 | Electron + WebRTC | 采集屏幕并推流 |
| Web 端 | React + WebRTC | 播放实时画面 |
| 后端 | Go + pion/webrtc | 信令 + SFU |
| 通信 | WebSocket | WebRTC 信令 |
| NAT 穿透 | STUN / TURN | 网络兼容 |

> **核心协议：WebRTC**

---

## 3. 系统整体架构

```text
┌────────────────┐
│  桌面客户端    │  Electron
│  屏幕采集      │
└───────┬────────┘
        │ WebRTC
        ▼
┌────────────────┐
│   Go WebRTC    │  pion/webrtc
│   SFU 服务     │
│ 信令 / 转发    │
└───────┬────────┘
        │ WebRTC
        ▼
┌────────────────┐
│    Web 浏览器  │  React / HTML5
│    实时播放    │
└────────────────┘
```

---

## 4. 角色与职责划分

### 4.1 桌面端（推流端）

- 屏幕采集
- 音视频编码（浏览器内置）
- WebRTC 推流
- 不直接面对多个观众

### 4.2 Go 服务端

- WebRTC **信令服务器**
- WebRTC **SFU（Selective Forwarding Unit）**
- 房间管理
- 用户鉴权
- 不解码、不渲染视频

### 4.3 Web 端（接收端）

- WebRTC 拉流
- 视频播放
- UI / 权限展示

---

## 5. 桌面端设计（Electron）

### 5.1 桌面端架构

- 基于 Chromium
- 使用浏览器原生 WebRTC API

### 5.2 屏幕采集

```ts
const stream = await navigator.mediaDevices.getDisplayMedia({
  video: {
    frameRate: 30,
    width: 1920,
    height: 1080
  },
  audio: false
})
```

### 5.3 WebRTC 推流流程

1. 创建 `RTCPeerConnection`
2. 添加屏幕轨道
3. 生成 Offer
4. 通过 WebSocket 发送给 Go 服务
5. 接收 Answer
6. 建立连接

---

## 6. Web 端设计

### 6.1 技术栈

- React
- 原生 WebRTC API

### 6.2 播放逻辑

```ts
const pc = new RTCPeerConnection()

pc.ontrack = (event) => {
  videoRef.current.srcObject = event.streams[0]
}
```

---

## 7. Go 后端设计（核心）

### 7.1 技术选型

- Go 1.21+
- pion/webrtc v3
- WebSocket

### 7.2 模块划分

```text
/cmd/server
/internal
  ├─ signaling   // WebSocket 信令
  ├─ webrtc      // pion 封装
  ├─ room        // 房间管理
  ├─ auth        // 鉴权
  └─ api         // HTTP API
```

---

## 8. 信令设计

### 8.1 通信方式

- WebSocket
- JSON 消息

### 8.2 信令消息结构

#### Offer

```json
{
  "type": "offer",
  "roomId": "room-1",
  "sdp": "..."
}
```

#### Answer

```json
{
  "type": "answer",
  "sdp": "..."
}
```

#### ICE Candidate

```json
{
  "type": "ice",
  "candidate": { }
}
```

---

## 9. WebRTC 协商流程

```text
客户端            Go 服务
  |   Offer   →      |
  |              创建 PeerConnection
  |   ← Answer      |
  |   ICE →         |
  |         ← ICE   |
```

---

## 10. SFU 设计说明

### 10.1 SFU 原理

- 推流端只发送 **一份流**
- Go 服务复制 RTP
- 多个观看端独立接收

### 10.2 优点

- 推流端压力小
- 延迟低
- 易扩展

---

## 11. NAT 穿透设计

### 11.1 STUN

- 用于获取公网地址

```txt
stun:stun.l.google.com:19302
```

### 11.2 TURN（生产必需）

- NAT 严格时中继流量
- 推荐 coturn

---

## 12. 安全与权限设计

- Token 鉴权
- 房间级权限控制
- 推流 / 观看角色区分

---

## 13. 扩展能力设计

### 13.1 多人会议

- 多路推流
- SFU 转发

### 13.2 远程控制（可选）

- Web → WebSocket → 桌面端
- 键盘 / 鼠标事件

### 13.3 录制

- WebRTC RTP → 文件
- 或推送 FFmpeg

---

## 14. 性能指标

| 指标 | 目标 |
|----|----|
| 延迟 | < 500ms |
| 帧率 | 30 FPS |
| 分辨率 | 1080p |

---

## 15. 部署建议

- Go 服务部署在公网
- TURN 服务独立部署
- HTTPS + WSS

---

## 16. 总结

- WebRTC 是桌面共享 + Web 观看的最优解
- Go 只做控制面，不碰媒体数据
- 架构清晰，易扩展

---

> 后续可在此文档基础上继续拆：
> - 信令状态机
> - SFU 核心代码
> - Electron 工程模板

