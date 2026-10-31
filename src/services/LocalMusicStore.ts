import { Track, Playlist } from './YouTubeMusicService'

export interface SyncSettings {
  relayUrl: string
  vaultId: string
  syncSecret: string
  isEnabled: boolean
  autoDownloadFavorites: boolean
  autoDownloadPlaylists: boolean
}

export class LocalMusicStore {
  private static KEY_FAVORITES = 'puki_favorites_v1'
  private static KEY_PLAYLISTS = 'puki_playlists_v1'
  private static KEY_HISTORY = 'puki_history_v1'
  private static KEY_SETTINGS = 'puki_settings_v1'
  private static KEY_DOWNLOADS = 'puki_offline_downloads_v1'

  private static listeners: Set<() => void> = new Set()

  static subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private static notify() {
    this.listeners.forEach(fn => fn())
  }

  // ── Favorites ──────────────────────────────────────────────
  static getFavorites(): Track[] {
    try {
      const raw = localStorage.getItem(this.KEY_FAVORITES)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  static isFavorite(trackId: string): boolean {
    const list = this.getFavorites()
    return list.some(t => t.id === trackId)
  }

  static toggleFavorite(track: Track): boolean {
    const list = this.getFavorites()
    const index = list.findIndex(t => t.id === track.id)
    let isFav = false

    if (index >= 0) {
      list.splice(index, 1)
      isFav = false
    } else {
      list.unshift(track)
      isFav = true
    }

    localStorage.setItem(this.KEY_FAVORITES, JSON.stringify(list))
    this.notify()
    return isFav
  }

  // ── Playlists ──────────────────────────────────────────────
  static getPlaylists(): Playlist[] {
    try {
      const raw = localStorage.getItem(this.KEY_PLAYLISTS)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  static createPlaylist(name: string, autoDownload: boolean = false): Playlist {
    const list = this.getPlaylists()
    const newPl: Playlist = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      name: name.trim() || 'Playlist Baru',
      trackCount: 0,
      autoDownload,
      createdAt: Date.now(),
      tracks: []
    }
    list.unshift(newPl)
    localStorage.setItem(this.KEY_PLAYLISTS, JSON.stringify(list))
    this.notify()
    return newPl
  }

  static addTrackToPlaylist(playlistId: string, track: Track) {
    const list = this.getPlaylists()
    const pl = list.find(p => p.id === playlistId)
    if (pl) {
      if (!pl.tracks.some(t => t.id === track.id)) {
        pl.tracks.push(track)
        pl.trackCount = pl.tracks.length
        localStorage.setItem(this.KEY_PLAYLISTS, JSON.stringify(list))
        this.notify()
      }
    }
  }

  static removeTrackFromPlaylist(playlistId: string, trackId: string) {
    const list = this.getPlaylists()
    const pl = list.find(p => p.id === playlistId)
    if (pl) {
      pl.tracks = pl.tracks.filter(t => t.id !== trackId)
      pl.trackCount = pl.tracks.length
      localStorage.setItem(this.KEY_PLAYLISTS, JSON.stringify(list))
      this.notify()
    }
  }

  static deletePlaylist(playlistId: string) {
    const list = this.getPlaylists().filter(p => p.id !== playlistId)
    localStorage.setItem(this.KEY_PLAYLISTS, JSON.stringify(list))
    this.notify()
  }

  // ── Play History ───────────────────────────────────────────
  static getHistory(): Track[] {
    try {
      const raw = localStorage.getItem(this.KEY_HISTORY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  static recordPlay(track: Track) {
    let list = this.getHistory()
    list = list.filter(t => t.id !== track.id)
    list.unshift(track)
    if (list.length > 50) list = list.slice(0, 50)
    localStorage.setItem(this.KEY_HISTORY, JSON.stringify(list))
    this.notify()
  }

  // ── Settings ───────────────────────────────────────────────
  static getSettings(): SyncSettings {
    try {
      const raw = localStorage.getItem(this.KEY_SETTINGS)
      if (raw) return JSON.parse(raw)
    } catch {}

    return {
      relayUrl: '',
      vaultId: '',
      syncSecret: '',
      isEnabled: false,
      autoDownloadFavorites: true,
      autoDownloadPlaylists: false
    }
  }

  static saveSettings(settings: Partial<SyncSettings>) {
    const current = this.getSettings()
    const updated = { ...current, ...settings }
    localStorage.setItem(this.KEY_SETTINGS, JSON.stringify(updated))
    this.notify()
  }

  // ── Offline Downloads Registry ─────────────────────────────
  static getDownloads(): Track[] {
    try {
      const raw = localStorage.getItem(this.KEY_DOWNLOADS)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  static isDownloaded(trackId: string): boolean {
    const list = this.getDownloads()
    return list.some(t => t.id === trackId)
  }

  static recordDownload(track: Track) {
    const list = this.getDownloads()
    if (!list.some(t => t.id === track.id)) {
      list.unshift(track)
      localStorage.setItem(this.KEY_DOWNLOADS, JSON.stringify(list))
      this.notify()
    }
  }

  static removeDownload(trackId: string) {
    const list = this.getDownloads().filter(t => t.id !== trackId)
    localStorage.setItem(this.KEY_DOWNLOADS, JSON.stringify(list))
    this.notify()
  }
}
