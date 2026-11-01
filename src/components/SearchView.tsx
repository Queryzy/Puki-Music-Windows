import React from 'react'
import { Disc, Music, Heart, Download, Play, Check, RefreshCw } from 'lucide-react'
import { Track, Album } from '../services/YouTubeMusicService'
import { AudioPlayerService } from '../services/AudioPlayerService'

interface SearchViewProps {
  isSearching: boolean
  albums: Album[]
  tracks: Track[]
  downloadingIds: Set<string>
  onOpenAlbum: (album: Album) => void
  onPlayAlbumDirect?: (album: Album) => void
  onToggleFavorite: (track: Track, e?: React.MouseEvent) => void
  onDownloadTrack: (track: Track, e?: React.MouseEvent) => void
  isFavorite: (trackId: string) => boolean
  isDownloaded: (trackId: string) => boolean
  formatTime: (secs: number) => string
  onOpenArtistModal?: (artist: string) => void
}

export const SearchView: React.FC<SearchViewProps> = ({
  isSearching,
  albums,
  tracks,
  downloadingIds,
  onOpenAlbum,
  onPlayAlbumDirect,
  onToggleFavorite,
  onDownloadTrack,
  isFavorite,
  isDownloaded,
  formatTime,
  onOpenArtistModal
}) => {
  if (isSearching) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-zinc-400 space-y-3">
        <span className="animate-spin inline-block w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full"></span>
        <span className="text-sm">Mengambil diskografi YouTube Music resmi...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {albums.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold flex items-center space-x-2 text-zinc-100">
              <Disc className="w-4 h-4 text-orange-500" />
              <span>ALBUM RESMI TERKAIT ({albums.length})</span>
            </h2>
            <span className="text-[11px] text-zinc-400 font-mono">Strict Studio Discography</span>
          </div>

          <div className="flex space-x-3.5 overflow-x-auto pb-2">
            {albums.map((album) => (
              <div
                key={album.id}
                onClick={() => onOpenAlbum(album)}
                className="group flex-shrink-0 w-36 bg-white/[0.02] hover:bg-white/[0.06] p-2.5 rounded-2xl border border-white/5 cursor-pointer transition flex flex-col space-y-2"
              >
                <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-800 relative">
                  <img
                    src={album.thumbnailUrl}
                    alt={album.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  {onPlayAlbumDirect && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onPlayAlbumDirect(album)
                      }}
                      title="Putar Album Sekarang"
                      className="absolute bottom-2 right-2 w-9 h-9 rounded-full bg-orange-500 hover:bg-orange-400 text-white flex items-center justify-center shadow-lg shadow-black/50 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition duration-200 z-10 active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-white ml-0.5" />
                    </button>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-xs text-zinc-100 truncate group-hover:text-orange-400 transition">
                    {album.title}
                  </p>
                  <p
                    onClick={(e) => {
                      if (onOpenArtistModal && album.artist && album.artist !== 'Artis Resmi') {
                        e.stopPropagation()
                        onOpenArtistModal(album.artist)
                      }
                    }}
                    className={`text-[10px] text-zinc-400 truncate mt-0.5 ${
                      onOpenArtistModal && album.artist && album.artist !== 'Artis Resmi' ? 'hover:underline hover:text-orange-400' : ''
                    }`}
                  >
                    {album.artist || 'Artis Resmi'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-base font-bold flex items-center space-x-2 mb-3 text-zinc-100">
          <Music className="w-4 h-4 text-orange-500" />
          <span>LAGU & TRACKLIST HASIL CARI ({tracks.length})</span>
        </h2>

        <div className="bg-white/[0.02] rounded-2xl border border-white/5 divide-y divide-white/[0.03]">
          {tracks.map((track, idx) => {
            const fav = isFavorite(track.id)
            const dl = isDownloaded(track.id)
            const downloading = downloadingIds.has(track.id)

            return (
              <div
                key={track.id}
                onClick={() => AudioPlayerService.playTrack(track, tracks)}
                className="flex items-center justify-between p-3 hover:bg-white/[0.04] cursor-pointer transition group"
              >
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <span className="w-6 text-center text-xs font-mono text-zinc-500 group-hover:text-orange-400">
                    {idx + 1}
                  </span>
                  <img
                    src={track.thumbnailUrl}
                    alt={track.title}
                    className="w-10 h-10 rounded-lg object-cover bg-zinc-800 flex-shrink-0"
                  />
                  <div className="min-w-0 flex-1 pr-4">
                    <p className="font-medium text-sm text-zinc-100 truncate group-hover:text-orange-400 transition">
                      {track.title}
                    </p>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <p
                        onClick={(e) => {
                          if (onOpenArtistModal && track.artist) {
                            e.stopPropagation()
                            onOpenArtistModal(track.artist)
                          }
                        }}
                        className={`text-xs text-zinc-400 truncate ${
                          onOpenArtistModal ? 'hover:underline hover:text-orange-400' : ''
                        }`}
                      >
                        {track.artist}
                      </p>
                      {dl && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          OFFLINE
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-zinc-400">
                  <button
                    onClick={(e) => onToggleFavorite(track, e)}
                    className={`p-1.5 rounded-lg hover:bg-white/10 transition ${
                      fav ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${fav ? 'fill-rose-500' : ''}`} />
                  </button>

                  <button
                    onClick={(e) => onDownloadTrack(track, e)}
                    className={`p-1.5 rounded-lg hover:bg-white/10 transition ${
                      dl ? 'text-emerald-400' : downloading ? 'text-amber-400 animate-spin' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    {dl ? <Check className="w-4 h-4" /> : downloading ? <RefreshCw className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  </button>

                  <span className="text-xs font-mono text-zinc-500 w-12 text-right">
                    {formatTime(track.durationSeconds)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
