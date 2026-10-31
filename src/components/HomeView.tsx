import React, { useState } from 'react'
import { Sparkles, RefreshCw, Music, Heart, Play, Users, Disc } from 'lucide-react'
import { Track } from '../services/YouTubeMusicService'
import { AudioPlayerService } from '../services/AudioPlayerService'
import { LocalMusicStore, TopArtist } from '../services/LocalMusicStore'

interface HomeViewProps {
  quickPicks: Track[]
  history: Track[]
  isLoading: boolean
  onReloadPicks: () => void
  onToggleFavorite: (track: Track, e?: React.MouseEvent) => void
  isFavorite: (trackId: string) => boolean
  formatTime: (secs: number) => string
  onSearchArtist?: (artistName: string) => void
}

export const HomeView: React.FC<HomeViewProps> = ({
  quickPicks,
  history,
  isLoading,
  onReloadPicks,
  onToggleFavorite,
  isFavorite,
  formatTime,
  onSearchArtist
}) => {
  const [activeChip, setActiveChip] = useState<'all' | 'mix' | 'favorites'>('all')
  const topArtists: TopArtist[] = LocalMusicStore.getUserTopArtists(6)
  const favorites = LocalMusicStore.getFavorites()

  // Saring feed sesuai chip
  const displayedTracks = React.useMemo(() => {
    if (activeChip === 'favorites') {
      return favorites.slice(0, 12)
    }
    if (activeChip === 'mix') {
      // Gabungkan riwayat & favorit secara selang-seling (Mix Pribadi)
      const combined: Track[] = []
      const maxLen = Math.max(history.length, favorites.length)
      const seen = new Set<string>()

      for (let i = 0; i < maxLen; i++) {
        if (i < favorites.length && !seen.has(favorites[i].id)) {
          seen.add(favorites[i].id)
          combined.push(favorites[i])
        }
        if (i < history.length && !seen.has(history[i].id)) {
          seen.add(history[i].id)
          combined.push(history[i])
        }
      }
      return combined.length > 0 ? combined.slice(0, 12) : quickPicks
    }
    return quickPicks
  }, [activeChip, favorites, history, quickPicks])

  return (
    <div className="space-y-6">
      {/* Banner Rekomendasi Pintar */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-orange-600/25 via-amber-600/15 to-transparent border border-orange-500/20 flex items-center justify-between">
        <div>
          <span className="px-3 py-1 rounded-full text-[10px] font-mono uppercase tracking-wider bg-orange-500/20 text-orange-400 font-semibold border border-orange-500/30">
            Rekomendasi Berbasis Perilaku
          </span>
          <h2 className="text-2xl font-bold text-white mt-2">Selamat Datang Kembali</h2>
          <p className="text-xs text-zinc-400 mt-1">
            Menyesuaikan lagu dan artis favorit Anda secara otomatis di seluruh ekosistem Puki Music.
          </p>
        </div>
        <Sparkles className="w-12 h-12 text-orange-500/40 hidden md:block" />
      </div>

      {/* Behavioral Filter Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveChip('all')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
            activeChip === 'all'
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
              : 'bg-white/5 hover:bg-white/10 text-zinc-300'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setActiveChip('mix')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
            activeChip === 'mix'
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
              : 'bg-white/5 hover:bg-white/10 text-zinc-300'
          }`}
        >
          Mix Pribadi ({history.length + favorites.length})
        </button>
        <button
          onClick={() => setActiveChip('favorites')}
          className={`px-4 py-1.5 rounded-full text-xs font-medium transition ${
            activeChip === 'favorites'
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/20'
              : 'bg-white/5 hover:bg-white/10 text-zinc-300'
          }`}
        >
          Favorit Kamu ({favorites.length})
        </button>
      </div>

      {/* Top Artists Behavioral Carousel */}
      {topArtists.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold font-mono tracking-wider text-zinc-400 flex items-center space-x-2 uppercase">
              <Users className="w-3.5 h-3.5 text-orange-500" />
              <span>Artis yang Sering Kamu Dengar</span>
            </h3>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {topArtists.map((artist) => (
              <div
                key={artist.name}
                onClick={() => onSearchArtist && onSearchArtist(artist.name)}
                className="group flex flex-col items-center p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 cursor-pointer transition text-center"
              >
                <div className="w-16 h-16 rounded-full overflow-hidden mb-2 bg-zinc-800 border-2 border-white/5 group-hover:border-orange-500/50 transition shadow-md flex items-center justify-center">
                  {artist.avatarUrl ? (
                    <img
                      src={artist.avatarUrl}
                      alt={artist.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                    />
                  ) : (
                    <Disc className="w-8 h-8 text-zinc-500" />
                  )}
                </div>
                <p className="text-xs font-semibold text-zinc-200 group-hover:text-orange-400 truncate w-full">
                  {artist.name}
                </p>
                <span className="text-[10px] text-zinc-500 mt-0.5">{artist.count}x diputar</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Track Grid */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-zinc-100 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>
              {activeChip === 'favorites'
                ? 'LAGU FAVORIT'
                : activeChip === 'mix'
                ? 'MIX PRIBADI UNTUKMU'
                : 'QUICK PICKS & POPULER'}
            </span>
          </h3>
          {activeChip === 'all' && (
            <button
              onClick={onReloadPicks}
              className="text-xs text-zinc-400 hover:text-white flex items-center space-x-1"
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {displayedTracks.map((track) => (
            <div
              key={track.id}
              onClick={() => AudioPlayerService.playTrack(track, displayedTracks)}
              className="flex items-center space-x-3 p-3 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl border border-white/5 cursor-pointer transition group"
            >
              <div className="relative flex-shrink-0">
                <img
                  src={track.thumbnailUrl}
                  alt={track.title}
                  className="w-12 h-12 rounded-xl object-cover bg-zinc-800"
                />
                <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  <Play className="w-5 h-5 text-white fill-current" />
                </div>
              </div>
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

      {/* Baru Saja Diputar */}
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
