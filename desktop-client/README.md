# Desktop Sharing - Desktop Client

基于 Electron + React + TypeScript + Tailwind CSS 的桌面推流客户端。

## 技术栈

- Electron
- React 18
- TypeScript
- Tailwind CSS
- Vite
- WebRTC API

## 功能特性

- 屏幕采集和推流
- 房间创建和选择
- 实时推流状态显示
- 本地视频预览
- 跨平台支持（Windows、macOS、Linux）

## 开发

### 安装依赖

```bash
npm install
```

### 启动开发模式

```bash
npm run dev
```

这将同时启动：
- Electron 主进程
- Vite 开发服务器（渲染进程）

### 构建

```bash
npm run build
```

### 打包应用

```bash
npm run package
```

打包后的应用将在 `release/` 目录中。

## 项目结构

```
src/
├── main/              # Electron 主进程
│   ├── main.ts        # 主进程入口
│   └── preload.ts     # 预加载脚本
└── renderer/          # 渲染进程（React 应用）
    ├── components/    # React 组件
    │   ├── RoomSelector.tsx
    │   └── Publisher.tsx
    ├── services/      # 服务层
    │   ├── api.ts
    │   ├── signaling.ts
    │   └── webrtc.ts
    ├── types/         # TypeScript 类型
    │   └── index.ts
    ├── App.tsx        # 主应用组件
    ├── main.tsx       # 渲染进程入口
    └── index.css      # 全局样式
```

## 使用说明

1. 启动后端服务（Go server）
2. 启动桌面客户端
3. 创建或选择房间
4. 点击"开始推流"
5. 选择要共享的屏幕或窗口
6. 开始推流

## 权限要求

### macOS
需要授予以下权限：
- 屏幕录制权限
- 辅助功能权限（可选）

在 系统偏好设置 → 安全性与隐私 → 隐私 中配置

### Windows
可能需要管理员权限来访问某些屏幕采集功能

### Linux
需要 X11 或 Wayland 屏幕捕获支持

## 配置

后端服务地址配置在：
- `src/renderer/services/api.ts` - HTTP API 地址
- `src/renderer/components/Publisher.tsx` - WebSocket 地址

默认配置：
```typescript
API_BASE_URL = 'http://localhost:8080/api'
WS_URL = 'ws://localhost:8080/ws'
```

## 开发注意事项

- 主进程代码在 `src/main/` 中，使用 Node.js API
- 渲染进程代码在 `src/renderer/` 中，使用浏览器 API
- 主进程和渲染进程通过 IPC 通信
- 安全起见，渲染进程已禁用 Node.js 集成
