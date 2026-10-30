import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  onMediaCommand: (callback: (cmd: string) => void) => {
    ipcRenderer.on('media-command', (_event, cmd) => callback(cmd))
  },
  updatePlaybackState: (state: { isPlaying: boolean; title: string; artist: string; album?: string }) => {
    ipcRenderer.send('update-playback-state', state)
  }
})
