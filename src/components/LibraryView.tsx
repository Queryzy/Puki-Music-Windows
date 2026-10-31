import React from 'react'
import { Play, Heart, Trash2, Plus } from 'lucide-react'
import { Track, Playlist } from '../services/YouTubeMusicService'
import { AudioPlayerService } from '../services/AudioPlayerService'

interface LibraryViewProps {
  subTab: 'favorites' | 'playlists' | 'downloads'
  setSubTab: (tab: 'favorites' | 'playlists' | 'downloads') => void
  favorites: Track[]
  playlists: Playlist[]
  downloads: Track[]
  onToggleFavorite: (track: Track, e?: React.MouseEvent) => void
  onDeletePlaylist: (id: string) => void
  onRemoveDownload: (id: string) => void
  onOpenCreatePlaylist: () => void
  onSelectPlaylist: (pl: Playlist) => void
  formatTime: (secs: number) => string
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  subTab,
  setSubTab,
  favorites,
  playlists,
  downloads,
  onToggleFavorite,
  onDeletePlaylist,
  onRemoveDownload,
  onOpenCreatePlaylist,
  onSelectPlaylist,
  formatTime
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3 border-b border-white/5 pb-3">
        <button
          onClick={() => setSubTab('favorites')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            subTab === 'favorites'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Lagu Favorit ({favorites.length})
        </button>

        <button
          onClick={() => setSubTab('playlists')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            subTab === 'playlists'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Playlist ({playlists.length})
        </button>

        <button
          onClick={() => setSubTab('downloads')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
            subTab === 'downloads'
              ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
              : 'text-zinc-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Offline Downloads ({downloads.length})
        </button>
      </div>

      {subTab === 'favorites' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">Total {favorites.length} lagu disukai tersimpan lokal</p>
            {favorites.length > 0 && (
              <button
                onClick={() => AudioPlayerService.playTrack(favorites[0], favorites)}
                className="px-4 py-1.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium flex items-center space-x-1.5 shadow-lg shadow-orange-600/30 transition"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Putar Semua Favorit</span>
              </button>
            )}
          </div>

          {favorites.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm bg-white/[0.01] rounded-2xl border border-white/5">
              Belum ada lagu favorit. Tandai ikon hati pada lagu untuk menambahkannya.
            </div>
          ) : (
            <div className="bg-white/[0.02] rounded-2xl border border-white/5 divide-y divide-white/[0.03]">
              {favorites.map((track, idx) => (
                <div
                  key={track.id}
                  onClick={() => AudioPlayerService.playTrack(track, favorites)}
                  className="flex items-center justify-between p-3 hover:bg-white/[0.04] cursor-pointer transition group"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <span className="w-6 text-center text-xs font-mono text-zinc-500">{idx + 1}</span>
                    <img
                      src={track.thumbnailUrl}
                      alt={track.title}
                      className="w-10 h-10 rounded-lg object-cover bg-zinc-800"
                    />
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="font-medium text-sm text-zinc-100 truncate group-hover:text-orange-400 transition">
                        {track.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 text-zinc-400">
                    <button
                      onClick={(e) => onToggleFavorite(track, e)}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-white/10 transition"
                    >
                      <Heart className="w-4 h-4 fill-rose-500" />
                    </button>
                    <span className="text-xs font-mono text-zinc-500">{formatTime(track.durationSeconds)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'playlists' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">{playlists.length} Playlist Pribadi</p>
            <button
              onClick={onOpenCreatePlaylist}
              className="px-3.5 py-1.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium flex items-center space-x-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Buat Playlist</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                onClick={() => onSelectPlaylist(pl)}
                className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 cursor-pointer transition flex items-center justify-between group"
              >
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-orange-400 truncate">
                    {pl.name}
                  </h4>
                  <p className="text-xs text-zinc-400 mt-1">{pl.tracks.length} Lagu</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeletePlaylist(pl.id)
                  }}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === 'downloads' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">{downloads.length} Lagu Tersimpan di Disk Windows</p>
            {downloads.length > 0 && (
              <button
                onClick={() => AudioPlayerService.playTrack(downloads[0], downloads)}
                className="px-4 py-1.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium flex items-center space-x-1.5 transition"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Putar Semua Offline</span>
              </button>
            )}
          </div>

          {downloads.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm bg-white/[0.01] rounded-2xl border border-white/5">
              Belum ada audio offline. Klik tombol download pada lagu untuk menyimpannya ke disk lokal.
            </div>
          ) : (
            <div className="bg-white/[0.02] rounded-2xl border border-white/5 divide-y divide-white/[0.03]">
              {downloads.map((track, idx) => (
                <div
                  key={track.id}
                  onClick={() => AudioPlayerService.playTrack(track, downloads)}
                  className="flex items-center justify-between p-3 hover:bg-white/[0.04] cursor-pointer transition group"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <span className="w-6 text-center text-xs font-mono text-zinc-500">{idx + 1}</span>
                    <img
                      src={track.thumbnailUrl}
                      alt={track.title}
                      className="w-10 h-10 rounded-lg object-cover bg-zinc-800"
                    />
                    <div className="min-w-0 flex-1 pr-4">
                      <p className="font-medium text-sm text-zinc-100 truncate group-hover:text-orange-400 transition">
                        {track.title}
                      </p>
                      <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3 text-zinc-400">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemoveDownload(track.id)
                      }}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-zinc-500">{formatTime(track.durationSeconds)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
