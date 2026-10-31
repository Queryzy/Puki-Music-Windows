import { Track } from './YouTubeMusicService'
import { StreamResolverService } from './StreamResolverService'
import { DownloadEngineService } from './DownloadEngineService'
import { LocalMusicStore } from './LocalMusicStore'

export class AudioPlayerService {
  private static audio: HTMLAudioElement | null = null
  private static currentTrack: Track | null = null
  private static playlist: Track[] = []
  private static currentIndex: number = -1
  private static isLoadingStream: boolean = false
  private static errorMessage: string | null = null
  private static listeners: Set<() => void> = new Set()

  static init() {
    if (this.audio) return
    this.audio = new Audio()
    
    this.audio.addEventListener('play', () => this.notify())
    this.audio.addEventListener('pause', () => this.notify())
    this.audio.addEventListener('timeupdate', () => this.notify())
    this.audio.addEventListener('ended', () => this.next())
    this.audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e)
      this.errorMessage = 'Gagal memutar audio'
      this.isLoadingStream = false
      this.notify()
    })

    // Windows Media Keys Setup via Preload
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.onMediaCommand((cmd: string) => {
        if (cmd === 'play-pause') this.togglePlay()
        else if (cmd === 'next') this.next()
        else if (cmd === 'prev') this.prev()
        else if (cmd === 'stop') this.stop()
      })
    }

    // Windows SMTC MediaSession API
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.play())
      navigator.mediaSession.setActionHandler('pause', () => this.pause())
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prev())
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next())
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined && this.audio) {
          this.audio.currentTime = details.seekTime
        }
      })
    }
  }

  static async playTrack(track: Track, newPlaylist?: Track[]) {
    this.init()
    if (newPlaylist) {
      this.playlist = newPlaylist
      this.currentIndex = newPlaylist.findIndex(t => t.id === track.id)
    }

    this.currentTrack = track
    this.isLoadingStream = true
    this.errorMessage = null
    this.notify()

    LocalMusicStore.recordPlay(track)

    // Cek apakah ada file offline lokal
    let streamUrl = await DownloadEngineService.getOfflineAudioUrl(track.id)
    if (!streamUrl) {
      streamUrl = await StreamResolverService.resolveStreamUrl(track.id)
    }

    if (!streamUrl || !this.audio) {
      this.isLoadingStream = false
      this.errorMessage = 'Gagal memuat stream audio'
      this.notify()
      return
    }

    this.audio.src = streamUrl
    this.audio.play().then(() => {
      this.isLoadingStream = false
      this.errorMessage = null
      this.notify()
    }).catch((err) => {
      console.error('Play error:', err)
      this.isLoadingStream = false
      this.errorMessage = 'Playback ditolak sistem'
      this.notify()
    })

    // Update Windows SMTC metadata
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: 'Puki Music',
        artwork: [
          { src: track.thumbnailUrl, sizes: '512x512', type: 'image/jpeg' }
        ]
      })
    }

    // Update Windows Taskbar
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.updatePlaybackState({
        isPlaying: true,
        title: track.title,
        artist: track.artist
      })
    }

    this.notify()
  }

  static togglePlay() {
    if (!this.audio) return
    if (this.audio.paused) {
      this.audio.play()
    } else {
      this.audio.pause()
    }
    this.notify()
  }

  static play() {
    this.audio?.play()
    this.notify()
  }

  static pause() {
    this.audio?.pause()
    this.notify()
  }

  static stop() {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
    }
    this.notify()
  }

  static next() {
    if (this.playlist.length === 0) return
    this.currentIndex = (this.currentIndex + 1) % this.playlist.length
    this.playTrack(this.playlist[this.currentIndex])
  }

  static prev() {
    if (this.playlist.length === 0) return
    this.currentIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length
    this.playTrack(this.playlist[this.currentIndex])
  }

  static seek(seconds: number) {
    if (this.audio) {
      this.audio.currentTime = seconds
      this.notify()
    }
  }

  static setVolume(vol: number) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, vol))
      this.notify()
    }
  }

  static getState() {
    return {
      currentTrack: this.currentTrack,
      isPlaying: this.audio ? !this.audio.paused : false,
      currentTime: this.audio ? this.audio.currentTime : 0,
      duration: this.audio && !isNaN(this.audio.duration) ? this.audio.duration : (this.currentTrack?.durationSeconds || 0),
      volume: this.audio ? this.audio.volume : 1,
      isLoading: this.isLoadingStream,
      error: this.errorMessage
    }
  }

  static subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private static notify() {
    this.listeners.forEach(fn => fn())
  }
}
