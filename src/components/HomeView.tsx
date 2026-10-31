import React from 'react'
import { Sparkles, RefreshCw, Music, Heart } from 'lucide-react'
import { Track } from '../services/YouTubeMusicService'
import { AudioPlayerService } from '../services/AudioPlayerService'

interface HomeViewProps {
  quickPicks: Track[]
  history: Track[]
  isLoading: boolean
  onReloadPicks: () => void
  onToggleFavorite: (track: Track, e?: React.MouseEvent) => void
  isFavorite: (trackId: string) => boolean
  formatTime: (secs: number) => string
}

export const HomeView: React.FC<HomeViewProps> = ({
  quickPicks,
  history,
  isLoading,
  onReloadPicks,
  onToggleFavorite,
  isFavorite,
  formatTime
}) => {
  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-gradient-to-r from-orange-600/20 via-amber-600/10 to-transparent border border-orange-500/20 flex items-center justify-between">
        <div>
          <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30">
            Puki Music Windows Parity 1:1
          </span>
          <h2 className="text-2xl font-bold text-white mt-2">Selamat Datang Kembali</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Putar musik unthrottled, simpan offline, dan sinkronkan playlist secara real-time via E2EE Relay.
          </p>
        </div>
        <Sparkles className="w-12 h-12 text-orange-500/40 hidden md:block" />
      </div>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>QUICK PICKS & POPULER</span>
          </h3>
          <button
            onClick={onReloadPicks}
            className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Muat Ulang</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {quickPicks.map((track) => (
            <div
              key={track.id}
              onClick={() => AudioPlayerService.playTrack(track, quickPicks)}
              className="flex items-center space-x-3 p-3 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl border border-white/5 cursor-pointer transition group"
            >
              <img
                src={track.thumbnailUrl}
                alt={track.title}
                className="w-12 h-12 rounded-xl object-cover bg-zinc-800 flex-shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-100 truncate group-hover:text-orange-400 transition">
                  {track.title}
                </p>
                <p className="text-xs text-zinc-400 truncate mt-0.5">{track.artist}</p>
              </div>
              <button
                onClick={(e) => onToggleFavorite(track, e)}
                className={`p-1.5 rounded-lg hover:bg-white/10 transition ${
                  isFavorite(track.id) ? 'text-rose-500' : 'text-zinc-500 hover:text-white'
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite(track.id) ? 'fill-rose-500' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      </section>

      {history.length > 0 && (
        <section>
          <h3 className="text-base font-bold text-zinc-100 mb-3 flex items-center space-x-2">
            <Music className="w-4 h-4 text-orange-500" />
            <span>BARU SAJA DIPUTAR</span>
          </h3>
          <div className="bg-white/[0.02] rounded-2xl border border-white/5 divide-y divide-white/[0.03]">
            {history.slice(0, 5).map((track, idx) => (
              <div
                key={track.id + idx}
                onClick={() => AudioPlayerService.playTrack(track, history)}
                className="flex items-center justify-between p-3 hover:bg-white/[0.04] cursor-pointer transition"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <img
                    src={track.thumbnailUrl}
                    alt={track.title}
                    className="w-9 h-9 rounded-lg object-cover bg-zinc-800 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-100 truncate">{track.title}</p>
                    <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
                  </div>
                </div>
                <span className="text-xs font-mono text-zinc-500">{formatTime(track.durationSeconds)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
