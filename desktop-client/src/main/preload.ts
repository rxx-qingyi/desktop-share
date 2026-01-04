import { contextBridge } from 'electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 这里可以添加主进程和渲染进程之间的通信接口
  platform: process.platform,
})
