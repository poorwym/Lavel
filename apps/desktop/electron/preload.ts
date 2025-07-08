import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'

// 通过 contextBridge 安全地暴露 API 给渲染进程
contextBridge.exposeInMainWorld('lavel', {
  // 基本 ping 测试
  ping: () => ipcRenderer.invoke('ping'),
  
  // 系统信息相关 API
  platform: process.platform,
  
  // 应用版本信息
  getVersion: () => ipcRenderer.invoke('get-version'),
  
  // 窗口控制 API
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  
  // 文件操作 API（示例）
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (data: any) => ipcRenderer.invoke('save-file', data),
  
  // 监听器管理
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => {
    // 添加安全检查，只允许特定的频道
    const validChannels = ['app-update', 'window-focus', 'window-blur']
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, listener)
    }
  },
  
  off: (channel: string, listener: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, listener)
  },
  
  // 移除所有监听器
  removeAllListeners: (channel: string) => {
    ipcRenderer.removeAllListeners(channel)
  }
})

// 定义暴露给渲染进程的类型
export interface LavelAPI {
  ping: () => Promise<string>
  platform: string
  getVersion: () => Promise<string>
  minimizeWindow: () => Promise<void>
  maximizeWindow: () => Promise<void>
  closeWindow: () => Promise<void>
  openFile: () => Promise<string | null>
  saveFile: (data: any) => Promise<boolean>
  on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => void
  off: (channel: string, listener: (...args: any[]) => void) => void
  removeAllListeners: (channel: string) => void
} 