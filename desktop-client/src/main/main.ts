import { app, BrowserWindow, desktopCapturer, session } from 'electron'
import * as path from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  })

  // 设置屏幕捕获处理器
  mainWindow.webContents.session.setDisplayMediaRequestHandler(
    (request, callback) => {
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        // 选择第一个可用的屏幕源
        const primarySource = sources.find(source => source.id.startsWith('screen'))
        if (primarySource) {
          callback({ video: primarySource, audio: 'loopback' })
        } else if (sources.length > 0) {
          callback({ video: sources[0], audio: 'loopback' })
        } else {
          callback({})
        }
      })
    }
  )

  // 开发模式加载 Vite 开发服务器
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5174')
    mainWindow.webContents.openDevTools()
  } else {
    // 生产模式加载构建后的文件
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
