import { app, BrowserWindow, ipcMain, globalShortcut, Tray, Menu, nativeImage } from 'electron'
import { autoUpdater } from 'electron-updater'
import path from 'node:path'

process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(process.env.DIST, '../public')

let win: BrowserWindow | null
let tray: Tray | null
let isQuiting = false

// Konfigurasi electron-updater untuk GitHub Releases
autoUpdater.autoDownload = true
autoUpdater.autoInstallOnAppQuit = true

function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    win?.webContents.send('updater-status', { status: 'checking' })
  })

  autoUpdater.on('update-available', (info) => {
    win?.webContents.send('updater-status', { status: 'available', info })
  })

  autoUpdater.on('update-not-available', (info) => {
    win?.webContents.send('updater-status', { status: 'not-available', info })
  })

  autoUpdater.on('download-progress', (progressObj) => {
    win?.webContents.send('updater-status', {
      status: 'downloading',
      progress: {
        percent: Math.round(progressObj.percent),
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      }
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    win?.webContents.send('updater-status', { status: 'downloaded', info })
  })

  autoUpdater.on('error', (err) => {
    win?.webContents.send('updater-status', {
      status: 'error',
      error: err?.message || 'Gagal memeriksa pembaruan'
    })
  })

  ipcMain.on('check-for-updates', () => {
    if (app.isPackaged) {
      autoUpdater.checkForUpdates().catch((err) => {
        win?.webContents.send('updater-status', { status: 'error', error: err.message })
      })
    } else {
      // Mock status saat di dev mode
      win?.webContents.send('updater-status', {
        status: 'not-available',
        info: { version: app.getVersion() }
      })
    }
  })

  ipcMain.on('restart-and-install', () => {
    isQuiting = true
    autoUpdater.quitAndInstall(false, true)
  })
}

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0a0a0c',
    frame: true,
    titleBarStyle: 'default',
    title: 'Puki Music',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    const indexPath = path.join(process.env.DIST || '', 'index.html')
    win.loadFile(indexPath)
  }

  // Windows Media Keys Setup
  globalShortcut.register('MediaPlayPause', () => {
    win?.webContents.send('media-command', 'play-pause')
  })
  globalShortcut.register('MediaNextTrack', () => {
    win?.webContents.send('media-command', 'next')
  })
  globalShortcut.register('MediaPreviousTrack', () => {
    win?.webContents.send('media-command', 'prev')
  })
  globalShortcut.register('MediaStop', () => {
    win?.webContents.send('media-command', 'stop')
  })

  // Prevent app exit on close, minimize to tray
  win.on('close', (event) => {
    if (!isQuiting) {
      event.preventDefault()
      win?.hide()
    }
    return false
  })
}

app.whenReady().then(() => {
  createWindow()
  setupAutoUpdater()

  // Setup System Tray
  try {
    const iconPath = path.join(process.env.VITE_PUBLIC || '', 'icon.ico')
    tray = new Tray(iconPath)
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Tampilkan Puki Music',
        click: () => {
          win?.show()
          win?.focus()
        }
      },
      { type: 'separator' },
      {
        label: 'Keluar',
        click: () => {
          isQuiting = true
          app.quit()
        }
      }
    ])
    tray.setToolTip('Puki Music - Hi-Fi Desktop Player')
    tray.setContextMenu(contextMenu)
    tray.on('double-click', () => {
      win?.show()
      win?.focus()
    })
  } catch (e) {
    console.warn('Tray init skipped:', e)
  }

  // Taskbar Thumbnail Toolbar Controls
  ipcMain.on('update-playback-state', (_event, { isPlaying, title, artist }) => {
    if (win) {
      win.setTitle(`${title ? `${title} - ${artist} | ` : ''}Puki Music`)
      
      try {
        const prevIcon = nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC || '', 'prev.png'))
        const playPauseIcon = nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC || '', isPlaying ? 'pause.png' : 'play.png'))
        const nextIcon = nativeImage.createFromPath(path.join(process.env.VITE_PUBLIC || '', 'next.png'))

        win.setThumbarButtons([
          {
            tooltip: 'Lagu Sebelumnya',
            icon: prevIcon,
            click() { win?.webContents.send('media-command', 'prev') }
          },
          {
            tooltip: isPlaying ? 'Jeda' : 'Putar',
            icon: playPauseIcon,
            click() { win?.webContents.send('media-command', 'play-pause') }
          },
          {
            tooltip: 'Lagu Berikutnya',
            icon: nextIcon,
            click() { win?.webContents.send('media-command', 'next') }
          }
        ])
      } catch {
        // Fallback if icons not present
      }
    }
  })

  // Auto check update 5 detik setelah window terbuka
  if (app.isPackaged) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {})
    }, 5000)
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
