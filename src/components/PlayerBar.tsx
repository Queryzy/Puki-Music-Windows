import React from 'react'
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Heart,
  RefreshCw,
  AlertCircle,
  Repeat,
  Repeat1,
  Shuffle,
  ListMusic,
  Maximize2
} from 'lucide-react'
import { Track } from '../services/YouTubeMusicService'
import { AudioPlayerService } from '../services/AudioPlayerService'

interface PlayerBarProps {
  playerState: ReturnType<typeof AudioPlayerService.getState>
  isFavorite: boolean
  onToggleFavorite: (track: Track) => void
  formatTime: (secs: number) => string
  onToggleExpandNowPlaying?: () => void
  onToggleQueue?: () => void
  isQueueOpen?: boolean
  onOpenArtistModal?: (artistName: string) => void
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  playerState,
  isFavorite,
  onToggleFavorite,
  formatTime,
  onToggleExpandNowPlaying,
  onToggleQueue,
  isQueueOpen,
  onOpenArtistModal
}) => {
  const currentDuration = playerState.duration || 100
  const progressPercent = Math.min(100, Math.max(0, (playerState.currentTime / currentDuration) * 100))
  const volumePercent = Math.min(100, Math.max(0, playerState.volume * 100))

  return (
    <footer className="h-20 bg-[#0e0e14] border-t border-white/5 px-6 flex items-center justify-between select-none relative z-30">
      {/* Kiri: Track Info & Expand Trigger */}
      <div className="flex items-center space-x-3 w-72 min-w-0">
        {playerState.currentTrack ? (
          <>
            <div
              onClick={onToggleExpandNowPlaying}
              title="Perbesar Layar Pemutar (Now Playing)"
              className="relative group cursor-pointer flex-shrink-0"
            >
              <img
                src={playerState.currentTrack.thumbnailUrl}
                alt={playerState.currentTrack.title}
                className="w-12 h-12 rounded-xl object-cover bg-zinc-800 transition group-hover:opacity-75 shadow-md shadow-black/50"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-black/40 rounded-xl">
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p
                onClick={onToggleExpandNowPlaying}
                className="text-xs font-semibold text-white truncate hover:underline cursor-pointer"
              >
                {playerState.currentTrack.title}
              </p>
              <div className="flex items-center space-x-1 mt-0.5">
                <button
                  onClick={() =>
                    playerState.currentTrack?.artist &&
                    onOpenArtistModal &&
                    onOpenArtistModal(playerState.currentTrack.artist)
                  }
                  title="Lihat Album & Lagu Artis"
                  className="text-[11px] text-zinc-400 hover:text-orange-400 hover:underline truncate transition text-left"
                >
                  {playerState.currentTrack.artist}
                </button>
              </div>
            </div>

            <button
              onClick={() => playerState.currentTrack && onToggleFavorite(playerState.currentTrack)}
              title={isFavorite ? 'Hapus dari Disukai' : 'Suka Lagu'}
              className={`p-1.5 rounded-lg hover:bg-white/10 transition ${
                isFavorite ? 'text-rose-500' : 'text-zinc-500 hover:text-white'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-500' : ''}`} />
            </button>
          </>
        ) : (
          <div className="text-xs text-zinc-500">Pilih lagu untuk memutar</div>
        )}
      </div>

      {/* Tengah: Playback Controls & Progress Slider with Dynamic Fill */}
      <div className="flex flex-col items-center space-y-1.5 flex-1 max-w-lg">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => AudioPlayerService.toggleShuffle()}
            title={playerState.isShuffle ? 'Acak: Aktif' : 'Acak: Nonaktif'}
            className={`p-1 rounded-lg transition ${
              playerState.isShuffle ? 'text-orange-500' : 'text-zinc-500 hover:text-white'
            }`}
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={() => AudioPlayerService.prev()}
            title="Lagu Sebelumnya"
            className="text-zinc-400 hover:text-white transition"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => AudioPlayerService.togglePlay()}
            title={playerState.isPlaying ? 'Jeda' : 'Putar'}
            className="w-9 h-9 rounded-full bg-orange-600 hover:bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-600/30 transition transform active:scale-95"
          >
            {playerState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={() => AudioPlayerService.next()}
            title="Lagu Selanjutnya"
            className="text-zinc-400 hover:text-white transition"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <button
            onClick={() => AudioPlayerService.toggleRepeat()}
            title={
              playerState.repeatMode === 'one'
                ? 'Ulang: Satu Lagu'
                : playerState.repeatMode === 'all'
                ? 'Ulang: Semua Lagu'
                : 'Ulang: Nonaktif'
            }
            className={`p-1 rounded-lg transition ${
              playerState.repeatMode !== 'off' ? 'text-orange-500' : 'text-zinc-500 hover:text-white'
            }`}
          >
            {playerState.repeatMode === 'one' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
          </button>
        </div>

        <div className="w-full flex items-center space-x-2 text-[11px] font-mono text-zinc-500">
          <span className="w-10 text-right">{formatTime(playerState.currentTime)}</span>
          <input
            type="range"
            min="0"
            max={playerState.duration || 100}
            value={playerState.currentTime}
            onChange={(e) => AudioPlayerService.seek(parseFloat(e.target.value))}
            style={{
              background: `linear-gradient(to right, #ea580c ${progressPercent}%, rgba(255,255,255,0.1) ${progressPercent}%)`
            }}
            className="flex-1 h-1 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <span className="w-10 text-left">{formatTime(playerState.duration)}</span>
        </div>

        {playerState.isLoading && (
          <span className="text-[10px] text-amber-400 flex items-center space-x-1">
            <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            <span>Memuat direct audio stream...</span>
          </span>
        )}
        {playerState.error && (
          <span className="text-[10px] text-rose-400 flex items-center space-x-1">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>{playerState.error}</span>
          </span>
        )}
      </div>

      {/* Kanan: Volume Slider & Queue Toggle */}
      <div className="w-72 flex items-center justify-end space-x-3">
        <button
          onClick={onToggleQueue}
          title="Daftar Putar (Antrean)"
          className={`p-1.5 rounded-lg transition ${
            isQueueOpen ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ListMusic className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-2">
          <Volume2 className="w-4 h-4 text-zinc-400 flex-shrink-0" />
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
            className="w-24 h-1 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>
      </div>
    </footer>
  )
}
