import { Track, Playlist } from './YouTubeMusicService'

export interface SyncSettings {
  relayUrl: string
  vaultId: string
  syncSecret: string
  isEnabled: boolean
  autoDownloadFavorites: boolean
  autoDownloadPlaylists: boolean
}

export interface OutboxItem {
  id: string
  action: 'TOGGLE_FAVORITE' | 'UPDATE_PLAYLIST' | 'RECORD_PLAY'
  device_id: string
  device_type: 'windows'
  timestamp: number
  data: any
}

export function normalizeTrack(raw: any): Track {
  let id = raw?.id || ''
  if (typeof id === 'string') {
    if (id.includes('watch?v=')) {
      const match = id.match(/watch\?v=([a-zA-Z0-9_-]+)/)
      if (match) id = match[1]
    } else if (id.includes('youtu.be/')) {
      const match = id.match(/youtu\.be\/([a-zA-Z0-9_-]+)/)
      if (match) id = match[1]
    }
  }

  const durationSeconds = typeof raw?.durationSeconds === 'number'
    ? raw.durationSeconds
    : (typeof raw?.duration === 'number' ? raw.duration : 0)

  return {
    id: String(id || ''),
    title: String(raw?.title || 'Unknown Title'),
    artist: String(raw?.artist || 'Unknown Artist'),
    durationSeconds: Number(durationSeconds),
    thumbnailUrl: String(raw?.thumbnailUrl || raw?.coverUrl || '')
  }
}

export class LocalMusicStore {
  private static KEY_FAVORITES = 'puki_favorites_v1'
  private static KEY_PLAYLISTS = 'puki_playlists_v1'
  private static KEY_HISTORY = 'puki_history_v1'
  private static KEY_SETTINGS = 'puki_settings_v1'
  private static KEY_DOWNLOADS = 'puki_offline_downloads_v1'
  private static KEY_OUTBOX = 'puki_outbox_v1'
  private static KEY_DEVICE_ID = 'puki_device_id_v1'

  private static listeners: Set<() => void> = new Set()

  static subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  static notify() {
    this.listeners.forEach(fn => fn())
  }

  static getDeviceId(): string {
    let id = localStorage.getItem(this.KEY_DEVICE_ID)
    if (!id) {
      id = 'win_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36)
      localStorage.setItem(this.KEY_DEVICE_ID, id)
    }
    return id
  }

  // ── Outbox Queue ───────────────────────────────────────────
  static getOutbox(): OutboxItem[] {
    try {
      const raw = localStorage.getItem(this.KEY_OUTBOX)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  static queueOutbox(action: OutboxItem['action'], data: any) {
    const list = this.getOutbox()
    const item: OutboxItem = {
      id: 'evt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      action,
      device_id: this.getDeviceId(),
      device_type: 'windows',
      timestamp: Date.now(),
      data
    }
    list.push(item)
    localStorage.setItem(this.KEY_OUTBOX, JSON.stringify(list))
  }

  static removeOutboxItems(sentIds: Set<string>) {
    const list = this.getOutbox().filter(item => !sentIds.has(item.id))
    localStorage.setItem(this.KEY_OUTBOX, JSON.stringify(list))
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
    const cleanId = normalizeTrack({ id: trackId }).id
    const list = this.getFavorites()
    return list.some(t => t.id === cleanId || t.id === trackId)
  }

  static toggleFavorite(track: Track, fromSync = false): boolean {
    const cleanTrack = normalizeTrack(track)
    const list = this.getFavorites()
    const index = list.findIndex(t => t.id === cleanTrack.id)
    let isFav = false

    if (index >= 0) {
      list.splice(index, 1)
      isFav = false
    } else {
      list.unshift(cleanTrack)
      isFav = true
    }

    localStorage.setItem(this.KEY_FAVORITES, JSON.stringify(list))

    if (!fromSync) {
      this.queueOutbox('TOGGLE_FAVORITE', {
        isLiked: isFav,
        track: cleanTrack
      })
    }

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

  static createPlaylist(name: string, autoDownload: boolean = false, customId?: string, fromSync = false): Playlist {
    const list = this.getPlaylists()
    const id = customId || ('pl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6))
    const newPl: Playlist = {
      id,
      name: name.trim() || 'Playlist Baru',
      trackCount: 0,
      autoDownload,
      createdAt: Date.now(),
      tracks: []
    }
    list.unshift(newPl)
    localStorage.setItem(this.KEY_PLAYLISTS, JSON.stringify(list))

    if (!fromSync) {
      this.queueOutbox('UPDATE_PLAYLIST', {
        playlistId: id,
        name: newPl.name,
        operation: 'CREATE'
      })
    }

    this.notify()
    return newPl
  }

  static addTrackToPlaylist(playlistId: string, track: Track, fromSync = false) {
    const cleanTrack = normalizeTrack(track)
    const list = this.getPlaylists()
    const pl = list.find(p => p.id === playlistId)
    if (pl) {
      if (!pl.tracks.some(t => t.id === cleanTrack.id)) {
        pl.tracks.push(cleanTrack)
        pl.trackCount = pl.tracks.length
        localStorage.setItem(this.KEY_PLAYLISTS, JSON.stringify(list))

        if (!fromSync) {
          this.queueOutbox('UPDATE_PLAYLIST', {
            playlistId,
            operation: 'ADD_TRACK',
            track: cleanTrack
          })
        }

        this.notify()
      }
    }
  }

  static removeTrackFromPlaylist(playlistId: string, trackId: string, fromSync = false) {
    const cleanId = normalizeTrack({ id: trackId }).id
    const list = this.getPlaylists()
    const pl = list.find(p => p.id === playlistId)
    if (pl) {
      pl.tracks = pl.tracks.filter(t => t.id !== cleanId && t.id !== trackId)
      pl.trackCount = pl.tracks.length
      localStorage.setItem(this.KEY_PLAYLISTS, JSON.stringify(list))

      if (!fromSync) {
        this.queueOutbox('UPDATE_PLAYLIST', {
          playlistId,
          operation: 'REMOVE_TRACK',
          track: { id: cleanId }
        })
      }

      this.notify()
    }
  }

  static deletePlaylist(playlistId: string, fromSync = false) {
    const list = this.getPlaylists().filter(p => p.id !== playlistId)
    localStorage.setItem(this.KEY_PLAYLISTS, JSON.stringify(list))

    if (!fromSync) {
      this.queueOutbox('UPDATE_PLAYLIST', {
        playlistId,
        operation: 'DELETE'
      })
    }

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

  static recordPlay(track: Track, fromSync = false) {
    const cleanTrack = normalizeTrack(track)
    let list = this.getHistory()
    list = list.filter(t => t.id !== cleanTrack.id)
    list.unshift(cleanTrack)
    if (list.length > 50) list = list.slice(0, 50)
    localStorage.setItem(this.KEY_HISTORY, JSON.stringify(list))

    if (!fromSync) {
      this.queueOutbox('RECORD_PLAY', cleanTrack)
    }

    this.notify()
  }

  // ── Sync Engine Remote Batch Processor ─────────────────────
  static applySyncBatch(events: Array<{ action: string; data: any; timestamp?: number }>) {
    let favs = this.getFavorites()
    let playlists = this.getPlaylists()
    let history = this.getHistory()
    let changed = false

    // Urutkan event berdasarkan timestamp secara kronologis
    const sorted = [...events].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0))

    for (const ev of sorted) {
      if (!ev || !ev.action) continue
      const action = ev.action
      const d = ev.data
      if (!d) continue

      if (action === 'TOGGLE_FAVORITE') {
        const rawTrack = d.track || d
        const track = normalizeTrack(rawTrack)
        if (!track.id) continue

        const isLiked = d.isLiked !== undefined ? Boolean(d.isLiked) : true
        const idx = favs.findIndex(t => t.id === track.id)

        if (isLiked) {
          if (idx >= 0) {
            favs[idx] = { ...favs[idx], ...track }
          } else {
            favs.unshift(track)
          }
          changed = true
        } else {
          if (idx >= 0) {
            favs.splice(idx, 1)
            changed = true
          }
        }
      } else if (action === 'FAVORITE_ADD') {
        const track = normalizeTrack(d.track || d)
        if (track.id && !favs.some(t => t.id === track.id)) {
          favs.unshift(track)
          changed = true
        }
      } else if (action === 'FAVORITE_REMOVE') {
        const track = normalizeTrack(d.track || d)
        if (track.id) {
          favs = favs.filter(t => t.id !== track.id)
          changed = true
        }
      } else if (action === 'UPDATE_PLAYLIST') {
        const playlistId = d.playlistId
        if (!playlistId) continue
        const op = d.operation || (d.name ? 'CREATE' : '')

        if (op === 'CREATE' || (!op && d.name)) {
          let pl = playlists.find(p => p.id === playlistId)
          if (!pl) {
            pl = {
              id: playlistId,
              name: d.name || 'Playlist',
              trackCount: 0,
              autoDownload: false,
              createdAt: d.createdAt || Date.now(),
              tracks: []
            }
            playlists.push(pl)
            changed = true
          } else if (d.name && pl.name !== d.name) {
            pl.name = d.name
            changed = true
          }
        } else if (op === 'ADD_TRACK' && d.track) {
          let pl = playlists.find(p => p.id === playlistId)
          if (!pl) {
            pl = {
              id: playlistId,
              name: d.name || 'Playlist',
              trackCount: 0,
              autoDownload: false,
              createdAt: Date.now(),
              tracks: []
            }
            playlists.push(pl)
          }
          const track = normalizeTrack(d.track)
          if (!pl.tracks.some(t => t.id === track.id)) {
            pl.tracks.push(track)
            pl.trackCount = pl.tracks.length
            changed = true
          }
        } else if (op === 'REMOVE_TRACK') {
          const track = normalizeTrack(d.track || {})
          const pl = playlists.find(p => p.id === playlistId)
          if (pl && track.id) {
            pl.tracks = pl.tracks.filter(t => t.id !== track.id)
            pl.trackCount = pl.tracks.length
            changed = true
          }
        } else if (op === 'DELETE') {
          playlists = playlists.filter(p => p.id !== playlistId)
          changed = true
        }
      } else if (action === 'RECORD_PLAY') {
        const track = normalizeTrack(d.track || d)
        if (track.id) {
          history = history.filter(t => t.id !== track.id)
          history.unshift(track)
          if (history.length > 50) history = history.slice(0, 50)
          changed = true
        }
      }
    }

    if (changed) {
      localStorage.setItem(this.KEY_FAVORITES, JSON.stringify(favs))
      localStorage.setItem(this.KEY_PLAYLISTS, JSON.stringify(playlists))
      localStorage.setItem(this.KEY_HISTORY, JSON.stringify(history))
      this.notify()
    }
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
    const cleanId = normalizeTrack({ id: trackId }).id
    const list = this.getDownloads()
    return list.some(t => t.id === cleanId || t.id === trackId)
  }

  static recordDownload(track: Track) {
    const cleanTrack = normalizeTrack(track)
    const list = this.getDownloads()
    if (!list.some(t => t.id === cleanTrack.id)) {
      list.unshift(cleanTrack)
      localStorage.setItem(this.KEY_DOWNLOADS, JSON.stringify(list))
      this.notify()
    }
  }

  static removeDownload(trackId: string) {
    const cleanId = normalizeTrack({ id: trackId }).id
    const list = this.getDownloads().filter(t => t.id !== cleanId && t.id !== trackId)
    localStorage.setItem(this.KEY_DOWNLOADS, JSON.stringify(list))
    this.notify()
  }
}
