import { BrowserWindow, screen, ipcMain } from 'electron'
import path from 'path'

export class InputWindow {
  private static instance: InputWindow | null = null
  private window: BrowserWindow | null = null
  private readonly isDev = !require('electron').app.isPackaged

  private constructor() {
    this.setupIpcHandlers()
  }

  public static getInstance(): InputWindow {
    if (!InputWindow.instance) {
      InputWindow.instance = new InputWindow()
    }
    return InputWindow.instance
  }

  public async show(): Promise<void> {
    if (this.window) {
      // 如果窗口已存在，直接显示并聚焦
      this.window.show()
      this.window.focus()
      return
    }

    await this.createWindow()
  }

  public hide(): void {
    if (this.window) {
      this.window.hide()
    }
  }

  public close(): void {
    if (this.window) {
      this.window.close()
      this.window = null
    }
  }

  public isVisible(): boolean {
    return this.window ? this.window.isVisible() : false
  }

  private async createWindow(): Promise<void> {
    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize
    
    // 窗口尺寸
    const windowWidth = 500
    const windowHeight = 200
    
    // 计算居中位置
    const x = Math.round((screenWidth - windowWidth) / 2)
    const y = Math.round((screenHeight - windowHeight) / 3) // 偏上一些，不完全居中

    this.window = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x,
      y,
      frame: false, // 无边框
      alwaysOnTop: true, // 总在最上
      resizable: false, // 不可调整大小
      minimizable: false, // 不可最小化
      maximizable: false, // 不可最大化
      skipTaskbar: true, // 不在任务栏显示
      show: false, // 初始不显示，创建完成后再显示
      transparent: true, // 透明背景
      hasShadow: true, // 有阴影
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        preload: path.join(__dirname, '../preload.cjs')
      }
    })

    // 加载快速输入页面
    if (this.isDev) {
      await this.window.loadURL('http://localhost:5173/quick-input')
    } else {
      await this.window.loadFile(path.join(__dirname, '../../dist/quick-input.html'))
    }

    // 窗口事件处理
    this.window.on('blur', () => {
      // 失焦时关闭窗口
      // this.close()
    })

    this.window.on('closed', () => {
      this.window = null
    })

    // 显示窗口并聚焦
    this.window.show()
    this.window.focus()
  }

  private setupIpcHandlers(): void {
    // 处理快速输入提交
    ipcMain.handle('quick-input-submit', async (event, content: string) => {
      console.log('快速输入内容:', content)
      
      // 发送给主窗口（如果需要）
      const mainWindow = BrowserWindow.getAllWindows().find(win => 
        win !== this.window && win.isVisible()
      )
      
      if (mainWindow) {
        mainWindow.webContents.send('quick-input-received', content)
      }

      // 这里可以添加其他处理逻辑，比如：
      // - 发送到后端API
      // - 写入本地文件
      // - 触发其他业务逻辑
      
      // 关闭快速输入窗口
      this.close()
      
      return { success: true }
    })

    // 处理快速输入取消
    ipcMain.handle('quick-input-cancel', async () => {
      this.close()
    })
  }
} 