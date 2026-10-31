import React, { useState, useEffect, useRef } from 'react'
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Heart,
  Volume2,
  Music2,
  ListMusic
} from 'lucide-react'
import { Track } from '../services/YouTubeMusicService'
import { AudioPlayerService } from '../services/AudioPlayerService'
import { LyricsService, LyricsResult } from '../services/LyricsService'

interface NowPlayingModalProps {
  isOpen: boolean
  onClose: () => void
  playerState: ReturnType<typeof AudioPlayerService.getState>
  isFavorite: boolean
  onToggleFavorite: (track: Track) => void
  formatTime: (secs: number) => string
  onOpenArtistModal?: (artistName: string) => void
}

export const NowPlayingModal: React.FC<NowPlayingModalProps> = ({
  isOpen,
  onClose,
  playerState,
  isFavorite,
  onToggleFavorite,
  formatTime,
  onOpenArtistModal
}) => {
  const [activeTab, setActiveTab] = useState<'lyrics' | 'queue'>('lyrics')
  const [lyrics, setLyrics] = useState<LyricsResult | null>(null)
  const [isLoadingLyrics, setIsLoadingLyrics] = useState(false)
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const activeLineRef = useRef<HTMLDivElement>(null)

  const track = playerState.currentTrack
  const currentDuration = playerState.duration || 100
  const progressPercent = Math.min(100, Math.max(0, (playerState.currentTime / currentDuration) * 100))
  const volumePercent = Math.min(100, Math.max(0, playerState.volume * 100))

  useEffect(() => {
    if (!track) {
      setLyrics(null)
      return
    }

    let isMounted = true
    setIsLoadingLyrics(true)
    LyricsService.fetchLyrics(track.id, track.title, track.artist, track.durationSeconds).then((res) => {
      if (isMounted) {
        setLyrics(res)
        setIsLoadingLyrics(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [track?.id])

  // Auto-scroll active lyric line
  useEffect(() => {
    if (activeTab === 'lyrics' && activeLineRef.current && lyricsContainerRef.current) {
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [playerState.currentTime, activeTab])

  if (!isOpen || !track) return null

  // Cari baris lirik aktif berdasarkan currentTime
  let activeIndex = -1
  if (lyrics?.synced && lyrics.lines.length > 0) {
    for (let i = 0; i < lyrics.lines.length; i++) {
      if (playerState.currentTime >= lyrics.lines[i].time) {
        activeIndex = i
      } else {
        break
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#08080c]/95 backdrop-blur-2xl flex flex-col select-none overflow-hidden animate-in fade-in duration-200">
      {/* Top Header */}
      <header className="h-16 px-8 flex items-center justify-between border-b border-white/5 flex-shrink-0">
        <button
          onClick={onClose}
          title="Tutup Layar Penuh"
          className="flex items-center space-x-2 text-zinc-400 hover:text-white transition p-2 rounded-xl hover:bg-white/5"
        >
          <ChevronDown className="w-5 h-5" />
          <span className="text-xs font-medium">Kecilkan</span>
        </button>

        <div className="flex items-center space-x-2 bg-white/5 p-1 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('lyrics')}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTab === 'lyrics' ? 'bg-orange-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Lirik Lagu
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-4 py-1.5 rounded-xl text-xs font-medium transition ${
              activeTab === 'queue' ? 'bg-orange-600 text-white shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Antrean ({playerState.queue.length})
          </button>
        </div>

        <div className="w-20" />
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden p-8 gap-12 max-w-7xl mx-auto w-full">
        {/* Kiri: Big Cover & Controls */}
        <div className="w-1/2 flex flex-col items-center justify-center space-y-6">
          <div className="relative group">
            <img
              src={track.thumbnailUrl}
              alt={track.title}
              className="w-80 h-80 rounded-3xl object-cover shadow-2xl shadow-orange-600/10 border border-white/10"
            />
          </div>

          <div className="w-80 flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-4">
              <h2 className="text-xl font-bold text-white truncate">{track.title}</h2>
              <button
                onClick={() => onOpenArtistModal && onOpenArtistModal(track.artist)}
                title="Lihat Album & Lagu Artis"
                className="text-sm text-zinc-400 hover:text-orange-400 hover:underline truncate mt-0.5 text-left transition"
              >
                {track.artist}
              </button>
            </div>
            <button
              onClick={() => onToggleFavorite(track)}
              className={`p-2.5 rounded-2xl border border-white/10 transition ${
                isFavorite ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500' : ''}`} />
            </button>
          </div>

          {/* Progress Slider */}
          <div className="w-80 space-y-2">
            <input
              type="range"
              min="0"
              max={playerState.duration || 100}
              value={playerState.currentTime}
              onChange={(e) => AudioPlayerService.seek(parseFloat(e.target.value))}
              style={{
                background: `linear-gradient(to right, #ea580c ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%)`
              }}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-xs font-mono text-zinc-400">
              <span>{formatTime(playerState.currentTime)}</span>
              <span>{formatTime(playerState.duration)}</span>
            </div>
          </div>

          {/* Playback Controls */}
          <div className="w-80 flex items-center justify-between pt-2">
            <button
              onClick={() => AudioPlayerService.toggleShuffle()}
              className={`p-2 rounded-xl transition ${playerState.isShuffle ? 'text-orange-500' : 'text-zinc-400 hover:text-white'}`}
            >
              <Shuffle className="w-5 h-5" />
            </button>
            <button
              onClick={() => AudioPlayerService.prev()}
              className="p-2 text-zinc-400 hover:text-white transition"
            >
              <SkipBack className="w-6 h-6" />
            </button>
            <button
              onClick={() => AudioPlayerService.togglePlay()}
              className="w-14 h-14 rounded-full bg-orange-600 hover:bg-orange-500 flex items-center justify-center text-white shadow-xl shadow-orange-600/30 transition transform active:scale-95"
            >
              {playerState.isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
            <button
              onClick={() => AudioPlayerService.next()}
              className="p-2 text-zinc-400 hover:text-white transition"
            >
              <SkipForward className="w-6 h-6" />
            </button>
            <button
              onClick={() => AudioPlayerService.toggleRepeat()}
              className={`p-2 rounded-xl transition ${playerState.repeatMode !== 'off' ? 'text-orange-500' : 'text-zinc-400 hover:text-white'}`}
            >
              {playerState.repeatMode === 'one' ? <Repeat1 className="w-5 h-5" /> : <Repeat className="w-5 h-5" />}
            </button>
          </div>

          {/* Volume */}
          <div className="w-80 flex items-center space-x-3 pt-2">
            <Volume2 className="w-4 h-4 text-zinc-400" />
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={playerState.volume}
              onChange={(e) => AudioPlayerService.setVolume(parseFloat(e.target.value))}
              style={{
                background: `linear-gradient(to right, #ea580c ${volumePercent}%, rgba(255,255,255,0.1) ${volumePercent}%)`
              }}
              className="flex-1 h-1.5 rounded-lg appearance-none cursor-pointer accent-orange-500"
            />
          </div>
        </div>

        {/* Kanan: Lyrics / Queue View */}
        <div className="w-1/2 flex flex-col bg-white/[0.02] border border-white/5 rounded-3xl p-6 overflow-hidden">
          {activeTab === 'lyrics' ? (
            <div ref={lyricsContainerRef} className="flex-1 overflow-y-auto space-y-5 pr-2">
              {isLoadingLyrics ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm space-y-2">
                  <Music2 className="w-8 h-8 animate-pulse text-orange-500" />
                  <span>Mencari lirik lagu sinkron di LRCLIB...</span>
                </div>
              ) : lyrics && lyrics.lines.length > 0 ? (
                lyrics.lines.map((line, idx) => {
                  const isActive = idx === activeIndex
                  return (
                    <p
                      key={idx}
                      ref={isActive ? activeLineRef : null}
                      onClick={() => line.time && AudioPlayerService.seek(line.time)}
                      className={`text-lg font-bold transition-all duration-200 cursor-pointer ${
                        isActive
                          ? 'text-orange-400 scale-105 origin-left'
                          : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {line.text}
                    </p>
                  )
                })
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm space-y-2">
                  <Music2 className="w-8 h-8 text-zinc-600" />
                  <span>Lirik tidak tersedia untuk lagu ini</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03] pr-2">
              {playerState.queue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 text-sm">
                  <span>Antrean kosong</span>
                </div>
              ) : (
                playerState.queue.map((t, idx) => {
                  const isCurrent = t.id === track.id
                  return (
                    <div
                      key={`${t.id}-${idx}`}
                      onClick={() => AudioPlayerService.playTrack(t)}
                      className={`flex items-center space-x-3 p-3 rounded-2xl cursor-pointer transition ${
                        isCurrent ? 'bg-orange-600/15 text-orange-400' : 'hover:bg-white/[0.03] text-zinc-300'
                      }`}
                    >
                      <img src={t.thumbnailUrl} alt={t.title} className="w-10 h-10 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate">{t.title}</p>
                        <p className="text-[10px] text-zinc-400 truncate">{t.artist}</p>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-500">{formatTime(t.durationSeconds)}</span>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
