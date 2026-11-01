import React, { useState, useEffect } from 'react'
import { Disc, Music, Play, Heart, X, RefreshCw, ListPlus } from 'lucide-react'
import { Track, Album, YouTubeMusicService } from '../services/YouTubeMusicService'
import { AudioPlayerService } from '../services/AudioPlayerService'
import { LocalMusicStore } from '../services/LocalMusicStore'

interface ArtistDiscographyModalProps {
  artistName: string
  isOpen: boolean
  onClose: () => void
  onToggleFavorite: (track: Track, e?: React.MouseEvent) => void
  isFavorite: (trackId: string) => boolean
  formatTime: (secs: number) => string
}

export const ArtistDiscographyModal: React.FC<ArtistDiscographyModalProps> = ({
  artistName,
  isOpen,
  onClose,
  onToggleFavorite,
  isFavorite,
  formatTime
}) => {
  const [activeTab, setActiveTab] = useState<'albums' | 'topTracks'>('albums')
  const [albums, setAlbums] = useState<Album[]>([])
  const [topTracks, setTopTracks] = useState<Track[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Sub-modal jika user klik album di dalam modal artis
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [albumTracks, setAlbumTracks] = useState<Track[]>([])
  const [isLoadingAlbumTracks, setIsLoadingAlbumTracks] = useState(false)

  useEffect(() => {
    if (!isOpen || !artistName) return

    let isMounted = true
    setIsLoading(true)
    setSelectedAlbum(null)

    Promise.all([
      YouTubeMusicService.searchAlbums(artistName),
      YouTubeMusicService.searchTracks(artistName)
    ])
      .then(([albumsRes, tracksRes]) => {
        if (isMounted) {
          setAlbums(albumsRes)
          setTopTracks(tracksRes)
          setIsLoading(false)
        }
      })
      .catch((err) => {
        console.error('Gagal memuat diskografi artis:', err)
        if (isMounted) setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [isOpen, artistName])

  const handleOpenAlbum = async (album: Album) => {
    setSelectedAlbum(album)
    setIsLoadingAlbumTracks(true)
    try {
      const tracks = await YouTubeMusicService.getAlbumTracks(album.id)
      setAlbumTracks(tracks)
    } catch (e) {
      console.error('Gagal memuat tracks album:', e)
    } finally {
      setIsLoadingAlbumTracks(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="bg-[#12121a] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header Artis */}
        <div className="p-6 border-b border-white/5 bg-gradient-to-r from-orange-600/15 via-white/[0.02] to-transparent flex items-center justify-between">
          <div className="flex items-center space-x-4 min-w-0 flex-1 pr-4">
            <div className="w-14 h-14 rounded-2xl bg-orange-600/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0 text-orange-400">
              <Disc className="w-7 h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-semibold">
                Katalog Diskografi Artis
              </span>
              <h3 className="text-xl font-bold text-white truncate mt-0.5">{artistName}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                {albums.length} Album Studio &bull; {topTracks.length} Lagu Populer
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigator */}
        <div className="flex items-center px-6 pt-3 border-b border-white/5 space-x-4">
          <button
            onClick={() => {
              setActiveTab('albums')
              setSelectedAlbum(null)
            }}
            className={`pb-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'albums'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Disc className="w-4 h-4" />
            <span>Album Studio ({albums.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('topTracks')
              setSelectedAlbum(null)
            }}
            className={`pb-3 text-xs font-semibold flex items-center space-x-2 border-b-2 transition ${
              activeTab === 'topTracks'
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Music className="w-4 h-4" />
            <span>Lagu Populer ({topTracks.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="py-16 text-center flex flex-col items-center justify-center text-zinc-500 text-xs space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
              <span>Memuat diskografi {artistName}...</span>
            </div>
          ) : selectedAlbum ? (
            /* Tampilan Detail Album yang Diklik */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <button
                  onClick={() => setSelectedAlbum(null)}
                  className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center space-x-1"
                >
                  <span>&larr; Kembali ke Daftar Album</span>
                </button>
                <span className="text-xs text-zinc-400">{albumTracks.length} Lagu</span>
              </div>

              <div className="flex items-center space-x-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <img
                  src={selectedAlbum.thumbnailUrl}
                  alt={selectedAlbum.title}
                  className="w-16 h-16 rounded-xl object-cover bg-zinc-800"
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-bold text-white truncate">{selectedAlbum.title}</h4>
                  <p className="text-xs text-zinc-400">{selectedAlbum.artist}</p>
                </div>
                {albumTracks.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => AudioPlayerService.playTrack(albumTracks[0], albumTracks)}
                      className="px-3.5 py-1.5 rounded-full bg-orange-500 hover:bg-orange-400 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-md shadow-orange-500/25 transition active:scale-95"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>Putar</span>
                    </button>
                    <button
                      onClick={() => {
                        LocalMusicStore.saveAlbumAsPlaylist(selectedAlbum.title, albumTracks)
                      }}
                      className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/10 text-xs font-medium flex items-center space-x-1.5 transition active:scale-95"
                      title="Simpan Album ke Playlist"
                    >
                      <ListPlus className="w-3.5 h-3.5 text-orange-400" />
                      <span>Playlist</span>
                    </button>
                  </div>
                )}
              </div>

              {isLoadingAlbumTracks ? (
                <div className="py-12 text-center text-xs text-zinc-500">Mengurai tracklist album...</div>
              ) : (
                <div className="divide-y divide-white/[0.03]">
                  {albumTracks.map((t, idx) => (
                    <div
                      key={t.id + idx}
                      onClick={() => AudioPlayerService.playTrack(t, albumTracks)}
                      className="flex items-center justify-between p-3 hover:bg-white/[0.04] rounded-xl cursor-pointer group transition"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1 pr-4">
                        <span className="w-5 text-center text-xs font-mono text-zinc-500 group-hover:text-orange-400">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-100 truncate group-hover:text-orange-400">
                            {t.title}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">{t.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={(e) => onToggleFavorite(t, e)}
                          className={`p-1.5 rounded-lg hover:bg-white/10 transition ${
                            isFavorite(t.id) ? 'text-rose-500' : 'text-zinc-500 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${isFavorite(t.id) ? 'fill-rose-500' : ''}`} />
                        </button>
                        <span className="text-xs font-mono text-zinc-500">{formatTime(t.durationSeconds)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'albums' ? (
            /* Grid Album Studio */
            albums.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">
                Tidak ada album studio resmi ditemukan untuk {artistName}.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                {albums.map((al) => (
                  <div
                    key={al.id}
                    onClick={() => handleOpenAlbum(al)}
                    className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 cursor-pointer transition group"
                  >
                    <img
                      src={al.thumbnailUrl}
                      alt={al.title}
                      className="w-full aspect-square rounded-xl object-cover bg-zinc-800 shadow-md group-hover:scale-[1.02] transition duration-200"
                    />
                    <h5 className="text-xs font-semibold text-zinc-200 truncate mt-2 group-hover:text-orange-400 transition">
                      {al.title}
                    </h5>
                    <p className="text-[11px] text-zinc-500 truncate mt-0.5">
                      {al.trackCount > 0 ? `${al.trackCount} Lagu` : 'Album'}
                    </p>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* List Lagu Populer */
            topTracks.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-xs">
                Tidak ada lagu populer ditemukan untuk {artistName}.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.03]">
                {topTracks.map((t, idx) => (
                  <div
                    key={t.id + idx}
                    onClick={() => AudioPlayerService.playTrack(t, topTracks)}
                    className="flex items-center justify-between p-3 hover:bg-white/[0.04] rounded-xl cursor-pointer group transition"
                  >
                    <div className="flex items-center space-x-3 min-w-0 flex-1 pr-4">
                      <span className="w-5 text-center text-xs font-mono text-zinc-500 group-hover:text-orange-400">
                        {idx + 1}
                      </span>
                      <img
                        src={t.thumbnailUrl}
                        alt={t.title}
                        className="w-10 h-10 rounded-lg object-cover bg-zinc-800 flex-shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-zinc-100 truncate group-hover:text-orange-400">
                          {t.title}
                        </p>
                        <p className="text-xs text-zinc-400 truncate">{t.artist}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={(e) => onToggleFavorite(t, e)}
                        className={`p-1.5 rounded-lg hover:bg-white/10 transition ${
                          isFavorite(t.id) ? 'text-rose-500' : 'text-zinc-500 hover:text-white'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${isFavorite(t.id) ? 'fill-rose-500' : ''}`} />
                      </button>
                      <span className="text-xs font-mono text-zinc-500">{formatTime(t.durationSeconds)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
