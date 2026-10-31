import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  onMediaCommand: (callback: (cmd: string) => void) => {
    ipcRenderer.on('media-command', (_event, cmd) => callback(cmd))
  },
  updatePlaybackState: (state: { isPlaying: boolean; title: string; artist: string; album?: string }) => {
    ipcRenderer.send('update-playback-state', state)
  },
  checkForUpdates: () => {
    ipcRenderer.send('check-for-updates')
  },
  restartAndInstall: () => {
    ipcRenderer.send('restart-and-install')
  },
  onUpdateStatus: (callback: (status: {
    status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'
    info?: any
    progress?: { percent: number; bytesPerSecond: number; transferred: number; total: number }
    error?: string
  }) => void) => {
    ipcRenderer.on('updater-status', (_event, data) => callback(data))
  }
})
