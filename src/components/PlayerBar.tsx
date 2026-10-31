import React from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart, RefreshCw, AlertCircle } from 'lucide-react'
import { Track } from '../services/YouTubeMusicService'
import { AudioPlayerService } from '../services/AudioPlayerService'

interface PlayerBarProps {
  playerState: ReturnType<typeof AudioPlayerService.getState>
  isFavorite: boolean
  onToggleFavorite: (track: Track) => void
  formatTime: (secs: number) => string
}

export const PlayerBar: React.FC<PlayerBarProps> = ({
  playerState,
  isFavorite,
  onToggleFavorite,
  formatTime
}) => {
  return (
    <footer className="h-20 bg-[#0e0e14] border-t border-white/5 px-6 flex items-center justify-between select-none relative z-30">
      <div className="flex items-center space-x-3 w-72 min-w-0">
        {playerState.currentTrack ? (
          <>
            <img
              src={playerState.currentTrack.thumbnailUrl}
              alt={playerState.currentTrack.title}
              className="w-12 h-12 rounded-xl object-cover bg-zinc-800 flex-shrink-0"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white truncate">{playerState.currentTrack.title}</p>
              <p className="text-[11px] text-zinc-400 truncate">{playerState.currentTrack.artist}</p>
            </div>
            <button
              onClick={() => playerState.currentTrack && onToggleFavorite(playerState.currentTrack)}
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

      <div className="flex flex-col items-center space-y-1.5 flex-1 max-w-lg">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => AudioPlayerService.prev()}
            className="text-zinc-400 hover:text-white transition"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={() => AudioPlayerService.togglePlay()}
            className="w-9 h-9 rounded-full bg-orange-600 hover:bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-600/30 transition transform active:scale-95"
          >
            {playerState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={() => AudioPlayerService.next()}
            className="text-zinc-400 hover:text-white transition"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="w-full flex items-center space-x-2 text-[11px] font-mono text-zinc-500">
          <span>{formatTime(playerState.currentTime)}</span>
          <input
            type="range"
            min="0"
            max={playerState.duration || 100}
            value={playerState.currentTime}
            onChange={(e) => AudioPlayerService.seek(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <span>{formatTime(playerState.duration)}</span>
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

      <div className="w-72 flex items-center justify-end space-x-2">
        <Volume2 className="w-4 h-4 text-zinc-400" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={playerState.volume}
          onChange={(e) => AudioPlayerService.setVolume(parseFloat(e.target.value))}
          className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500"
        />
      </div>
    </footer>
  )
}
