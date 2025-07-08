import { IpcRendererEvent } from 'electron'

export {}

declare global {
  interface Window {
    lavel: {
      // 基本 ping 测试
      ping: () => Promise<string>
      
      // 系统信息相关 API
      platform: string
      
      // 应用版本信息
      getVersion: () => Promise<string>
      
      // 窗口控制 API
      minimizeWindow: () => Promise<void>
      maximizeWindow: () => Promise<void>
      closeWindow: () => Promise<void>
      
      // 文件操作 API
      openFile: () => Promise<string | null>
      saveFile: (data: any) => Promise<boolean>
      
      // 监听器管理
      on: (channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) => void
      off: (channel: string, listener: (...args: any[]) => void) => void
      removeAllListeners: (channel: string) => void
    }
  }
} 