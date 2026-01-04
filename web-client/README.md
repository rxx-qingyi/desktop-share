# Desktop Sharing - Web Client

基于 React + TypeScript + Tailwind CSS 的 Web 观看端。

## 技术栈

- React 18
- TypeScript
- Tailwind CSS
- Vite
- React Router
- WebRTC API

## 功能特性

- 房间列表浏览
- 创建新房间
- 加入房间观看直播
- 实时连接状态显示
- 响应式设计

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动。

### 构建生产版本

```bash
npm run build
```

### 预览生产构建

```bash
npm run preview
```

## 项目结构

```
src/
├── components/       # 可复用组件
├── hooks/           # 自定义 Hooks
│   └── useWebRTC.ts # WebRTC 连接 Hook
├── pages/           # 页面组件
│   ├── HomePage.tsx # 房间列表页
│   └── RoomPage.tsx # 观看页面
├── services/        # 服务层
│   ├── api.ts       # HTTP API 调用
│   ├── signaling.ts # WebSocket 信令
│   └── webrtc.ts    # WebRTC 管理
├── types/           # TypeScript 类型定义
│   └── index.ts
├── App.tsx          # 主应用组件
├── main.tsx         # 入口文件
└── index.css        # 全局样式
```

## 使用说明

1. 启动后端服务（Go server）
2. 启动 Web 客户端
3. 在浏览器中打开 http://localhost:3000
4. 浏览房间列表或创建新房间
5. 点击"加入观看"进入直播间

## 配置

API 和 WebSocket 端点在 `vite.config.ts` 中配置代理：

```typescript
proxy: {
  '/api': 'http://localhost:8080',
  '/ws': 'ws://localhost:8080'
}
```

## 注意事项

- 确保后端服务已启动
- WebRTC 需要 HTTPS 或 localhost 环境
- 浏览器需要支持 WebRTC API
