import { Track } from './YouTubeMusicService'
import { StreamResolverService } from './StreamResolverService'
import { LocalMusicStore } from './LocalMusicStore'

export interface DownloadQueueStatus {
  isProcessing: boolean
  pendingCount: number
  currentTrackTitle?: string
}

export class DownloadEngineService {
  private static activeDownloads = new Set<string>()
  private static downloadQueue: Track[] = []
  private static isProcessingQueue = false
  private static currentProcessingTrack: Track | null = null
  private static listeners: Set<(s: DownloadQueueStatus) => void> = new Set()

  static subscribe(fn: (s: DownloadQueueStatus) => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private static notify() {
    const status: DownloadQueueStatus = {
      isProcessing: this.isProcessingQueue,
      pendingCount: this.downloadQueue.length,
      currentTrackTitle: this.currentProcessingTrack?.title
    }
    this.listeners.forEach(fn => fn(status))
  }

  static getQueueStatus(): DownloadQueueStatus {
    return {
      isProcessing: this.isProcessingQueue,
      pendingCount: this.downloadQueue.length,
      currentTrackTitle: this.currentProcessingTrack?.title
    }
  }

  /**
   * Masukkan banyak lagu sekaligus ke antrean unduhan offline di background
   */
  static queueBatch(tracks: Track[]) {
    for (const t of tracks) {
      if (!LocalMusicStore.isDownloaded(t.id) && !this.downloadQueue.some(q => q.id === t.id)) {
        this.downloadQueue.push(t)
      }
    }
    this.notify()
    this.processQueue()
  }

  static queueTrack(track: Track) {
    if (!LocalMusicStore.isDownloaded(track.id) && !this.downloadQueue.some(q => q.id === track.id)) {
      this.downloadQueue.push(track)
      this.notify()
      this.processQueue()
    }
  }

  private static async processQueue() {
    if (this.isProcessingQueue) return
    this.isProcessingQueue = true
    this.notify()

    while (this.downloadQueue.length > 0) {
      const nextTrack = this.downloadQueue.shift()!
      this.currentProcessingTrack = nextTrack
      this.notify()

      try {
        await this.downloadTrack(nextTrack)
      } catch (err) {
        console.warn(`Gagal unduh antrean track: ${nextTrack.title}`, err)
      }

      // Beri jeda 1 detik antar track agar aman dari rate-limit network
      await new Promise(r => setTimeout(r, 1000))
    }

    this.currentProcessingTrack = null
    this.isProcessingQueue = false
    this.notify()
  }

  static async downloadTrack(track: Track): Promise<boolean> {
    if (this.activeDownloads.has(track.id) || LocalMusicStore.isDownloaded(track.id)) {
      return true
    }

    this.activeDownloads.add(track.id)
    try {
      const streamUrl = await StreamResolverService.resolveStreamUrl(
        track.id,
        track.title,
        track.artist,
        track.durationSeconds
      )

      if (!streamUrl) {
        console.warn('Gagal mendapatkan stream URL untuk unduhan offline:', track.title)
        return false
      }

      // Download payload audio blob
      const res = await fetch(streamUrl)
      if (!res.ok) return false
      const blob = await res.blob()

      // Simpan ke IndexedDB / Offline Storage
      await this.saveToIndexedDB(track.id, blob)
      LocalMusicStore.recordDownload(track)
      return true
    } catch (err) {
      console.error('Error saat download track:', err)
      return false
    } finally {
      this.activeDownloads.delete(track.id)
    }
  }

  private static async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('puki_offline_audio_db', 1)
      req.onupgradeneeded = () => {
        const db = req.result
        if (!db.objectStoreNames.contains('audio_files')) {
          db.createObjectStore('audio_files', { keyPath: 'id' })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }

  private static async saveToIndexedDB(id: string, blob: Blob): Promise<void> {
    const db = await this.openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('audio_files', 'readwrite')
      const store = tx.objectStore('audio_files')
      store.put({ id, blob, timestamp: Date.now() })
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  static async getOfflineAudioUrl(id: string): Promise<string | null> {
    try {
      const db = await this.openDB()
      return new Promise((resolve) => {
        const tx = db.transaction('audio_files', 'readonly')
        const store = tx.objectStore('audio_files')
        const req = store.get(id)
        req.onsuccess = () => {
          if (req.result?.blob) {
            resolve(URL.createObjectURL(req.result.blob))
          } else {
            resolve(null)
          }
        }
        req.onerror = () => resolve(null)
      })
    } catch {
      return null
    }
  }

  static async clearAllCache(): Promise<void> {
    const db = await this.openDB()
    return new Promise((resolve, reject) => {
      const tx = db.transaction('audio_files', 'readwrite')
      const store = tx.objectStore('audio_files')
      store.clear()
      tx.oncomplete = () => {
        localStorage.removeItem('puki_offline_downloads_v1')
        resolve()
      }
      tx.onerror = () => reject(tx.error)
    })
  }
}
