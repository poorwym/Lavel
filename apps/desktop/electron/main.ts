import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'

const isDev = !app.isPackaged

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 800,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs')  // 使用 .cjs 扩展名
    }
  })

  if (isDev) {
    // 开发环境加载 Vite 开发服务器
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    // 生产环境加载构建后的文件
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 窗口关闭事件
  win.on('closed', () => {
    // 在 macOS 上，通常应用即使在没有窗口的情况下也会保持运行
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })
}

// 应用准备就绪时创建窗口
app.whenReady().then(() => {
  createWindow()

  // macOS 特定：当应用被激活且没有窗口时，创建新窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

// 所有窗口关闭时退出应用（除了 macOS）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// IPC 处理程序
ipcMain.handle('ping', async () => {
  return 'pong from main process!'
})

ipcMain.handle('get-version', async () => {
  return app.getVersion()
})

ipcMain.handle('minimize-window', async () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) {
    win.minimize()
  }
})

ipcMain.handle('maximize-window', async () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
  }
})

ipcMain.handle('close-window', async () => {
  const win = BrowserWindow.getFocusedWindow()
  if (win) {
    win.close()
  }
})

// 文件操作示例
ipcMain.handle('open-file', async () => {
  const { dialog } = require('electron')
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'All Files', extensions: ['*'] },
      { name: 'Text Files', extensions: ['txt', 'md'] },
      { name: 'JSON Files', extensions: ['json'] }
    ]
  })
  
  if (result.canceled) {
    return null
  } else {
    return result.filePaths[0]
  }
})

ipcMain.handle('save-file', async (event, data) => {
  const { dialog } = require('electron')
  const fs = require('fs')
  
  const result = await dialog.showSaveDialog({
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'JSON Files', extensions: ['json'] }
    ]
  })
  
  if (result.canceled) {
    return false
  } else {
    try {
      fs.writeFileSync(result.filePath, data)
      return true
    } catch (error) {
      console.error('Save file error:', error)
      return false
    }
  }
})

// 在应用准备退出时进行清理
app.on('before-quit', () => {
  // 在这里进行任何必要的清理工作
}) 