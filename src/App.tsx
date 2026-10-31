import React, { useState, useEffect } from 'react'
import { Search, Heart, Play, Shuffle, ListMusic, Trash2 } from 'lucide-react'
import { YouTubeMusicService, Track, Album, Playlist } from './services/YouTubeMusicService'
import { AudioPlayerService } from './services/AudioPlayerService'
import { LocalMusicStore, SyncSettings } from './services/LocalMusicStore'
import { DownloadEngineService } from './services/DownloadEngineService'
import { SyncManagerService, SyncStatus } from './services/SyncManagerService'

import { Sidebar } from './components/Sidebar'
import { PlayerBar } from './components/PlayerBar'
import { SearchView } from './components/SearchView'
import { HomeView } from './components/HomeView'
import { LibraryView } from './components/LibraryView'
import { SettingsView } from './components/SettingsView'
import { NowPlayingModal } from './components/NowPlayingModal'
import { ArtistDiscographyModal } from './components/ArtistDiscographyModal'

export default function App() {
  const [activeTab, setActiveTab] = useState<'search' | 'home' | 'library' | 'settings'>('search')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isNowPlayingExpanded, setIsNowPlayingExpanded] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('Last Child')
  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [albumTracks, setAlbumTracks] = useState<Track[]>([])
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(false)
  const [selectedArtistForModal, setSelectedArtistForModal] = useState<string | null>(null)

  // Home state
  const [homeQuickPicks, setHomeQuickPicks] = useState<Track[]>([])
  const [isHomeLoading, setIsHomeLoading] = useState(false)

  // Library state
  const [librarySubTab, setLibrarySubTab] = useState<'favorites' | 'playlists' | 'downloads'>('favorites')
  const [favorites, setFavorites] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [downloads, setDownloads] = useState<Track[]>([])
  const [history, setHistory] = useState<Track[]>([])
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState('')
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false)

  // Settings state
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(LocalMusicStore.getSettings())
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncManagerService.getStatus())
  const [appVersion] = useState('1.0.5')
  const [latestRelease, setLatestRelease] = useState<{ tag: string; downloadUrl: string } | null>(null)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<string | null>(null)
  const [updaterProgress, setUpdaterProgress] = useState<{
    percent: number
    bytesPerSecond: number
    transferred: number
    total: number
  } | null>(null)
  const [isUpdateDownloaded, setIsUpdateDownloaded] = useState(false)
  const [cacheClearSuccess, setCacheClearSuccess] = useState(false)

  // Player state
  const [playerState, setPlayerState] = useState(AudioPlayerService.getState())
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const unsubPlayer = AudioPlayerService.subscribe(() => {
      setPlayerState(AudioPlayerService.getState())
    })

    const refreshLocalStore = () => {
      setFavorites(LocalMusicStore.getFavorites())
      setPlaylists(LocalMusicStore.getPlaylists())
      setDownloads(LocalMusicStore.getDownloads())
      setHistory(LocalMusicStore.getHistory())
      setSyncSettings(LocalMusicStore.getSettings())
    }

    refreshLocalStore()
    const unsubStore = LocalMusicStore.subscribe(refreshLocalStore)

    const unsubSync = SyncManagerService.subscribe((s) => {
      setSyncStatus(s)
    })

    SyncManagerService.start()
    executeSearch('Last Child')
    loadHomeData()

    // Listen electron auto-updater events
    if (typeof window !== 'undefined' && (window as any).electronAPI?.onUpdateStatus) {
      ;(window as any).electronAPI.onUpdateStatus((data: any) => {
        if (data.status === 'checking') {
          setIsCheckingUpdate(true)
          setUpdateMessage('Memeriksa pembaruan rilis...')
        } else if (data.status === 'available') {
          setIsCheckingUpdate(false)
          setUpdateMessage(`Pembaruan tersedia (${data.info?.version || 'versi terbaru'}). Mengunduh di background...`)
        } else if (data.status === 'not-available') {
          setIsCheckingUpdate(false)
          setUpdateMessage('Puki Music sudah dalam versi terbaru!')
          setUpdaterProgress(null)
        } else if (data.status === 'downloading') {
          setIsCheckingUpdate(false)
          setUpdaterProgress(data.progress)
          setUpdateMessage(`Mengunduh update: ${data.progress?.percent || 0}%`)
        } else if (data.status === 'downloaded') {
          setIsCheckingUpdate(false)
          setUpdaterProgress(null)
          setIsUpdateDownloaded(true)
          setUpdateMessage('Pembaruan selesai diunduh! Klik Pasang & Mulai Ulang.')
        } else if (data.status === 'error') {
          setIsCheckingUpdate(false)
          setUpdaterProgress(null)
          setUpdateMessage(`Gagal update: ${data.error}`)
        }
      })
    }

    return () => {
      unsubPlayer()
      unsubStore()
      unsubSync()
    }
  }, [])

  const loadHomeData = async () => {
    setIsHomeLoading(true)
    try {
      const picks = await YouTubeMusicService.searchTracks('Trending Musik Indonesia 2026')
      setHomeQuickPicks(picks.slice(0, 12))
    } catch {
      // Ignore
    } finally {
      setIsHomeLoading(false)
    }
  }

  const executeSearch = async (query: string) => {
    if (!query.trim()) return
    setIsSearching(true)
    try {
      const [fetchedTracks, fetchedAlbums] = await Promise.all([
        YouTubeMusicService.searchTracks(query),
        YouTubeMusicService.searchAlbums(query)
      ])
      setTracks(fetchedTracks)
      setAlbums(fetchedAlbums)
    } finally {
      setIsSearching(false)
    }
  }

  const handleOpenAlbum = async (album: Album) => {
    setSelectedAlbum(album)
    setIsLoadingAlbum(true)
    try {
      const t = await YouTubeMusicService.getAlbumTracks(album.id)
      setAlbumTracks(t)
    } finally {
      setIsLoadingAlbum(false)
    }
  }

  const handleToggleFavorite = (track: Track, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const isNowFav = LocalMusicStore.toggleFavorite(track)
    if (isNowFav && syncSettings.autoDownloadFavorites) {
      handleDownloadTrack(track)
    }
  }

  const handleDownloadTrack = async (track: Track, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (downloadingIds.has(track.id) || LocalMusicStore.isDownloaded(track.id)) return

    setDownloadingIds(prev => new Set(prev).add(track.id))
    try {
      await DownloadEngineService.downloadTrack(track)
    } finally {
      setDownloadingIds(prev => {
        const next = new Set(prev)
        next.delete(track.id)
        return next
      })
    }
  }

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim()) return
    LocalMusicStore.createPlaylist(newPlaylistName.trim(), syncSettings.autoDownloadPlaylists)
    setNewPlaylistName('')
    setShowCreatePlaylistModal(false)
  }

  const handleCheckUpdate = async () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.checkForUpdates) {
      ;(window as any).electronAPI.checkForUpdates()
      return
    }

    setIsCheckingUpdate(true)
    setUpdateMessage(null)
    try {
      const res = await fetch('https://api.github.com/repos/Queryzy/Puki-Music-Windows/releases/latest')
      if (res.ok) {
        const data = await res.json()
        const latestTag = data.tag_name || ''
        const exeAsset = data.assets?.find((a: any) => a.name?.endsWith('.exe'))
        setLatestRelease({
          tag: latestTag,
          downloadUrl: exeAsset?.browser_download_url || data.html_url
        })
        if (latestTag && latestTag !== `v${appVersion}` && latestTag !== appVersion) {
          setUpdateMessage(`Versi baru tersedia: ${latestTag}`)
        } else {
          setUpdateMessage('Puki Music sudah dalam versi terbaru!')
        }
      } else {
        setUpdateMessage('Gagal menghubungi server GitHub Releases')
      }
    } catch {
      setUpdateMessage('Koneksi internet bermasalah saat cek update')
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  const handleRestartAndInstall = () => {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.restartAndInstall) {
      ;(window as any).electronAPI.restartAndInstall()
    }
  }

  const handleClearCache = async () => {
    await DownloadEngineService.clearAllCache()
    setCacheClearSuccess(true)
    setTimeout(() => setCacheClearSuccess(false), 3000)
  }

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="flex h-screen w-screen bg-[#08080c] text-white select-none overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab)
          setSelectedAlbum(null)
        }}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        syncStatus={syncStatus}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-[#121218] to-[#08080c]">
        <header className="h-16 px-6 flex items-center justify-between border-b border-white/5 bg-[#0e0e14]/50 backdrop-blur-md">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setActiveTab('search')
                  setSelectedAlbum(null)
                  executeSearch(searchQuery)
                }
              }}
              placeholder="Cari lagu, artis, atau album resmi..."
              className="w-full bg-[#181822] border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          <div className="flex items-center space-x-3 text-xs text-zinc-400 font-medium">
            <span className="px-2.5 py-1 rounded-full bg-white/5 border border-white/5">
              Puki Desktop v{appVersion}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'search' && (
            <SearchView
              isSearching={isSearching}
              albums={albums}
              tracks={tracks}
              downloadingIds={downloadingIds}
              onOpenAlbum={handleOpenAlbum}
              onToggleFavorite={handleToggleFavorite}
              onDownloadTrack={handleDownloadTrack}
              isFavorite={(id) => LocalMusicStore.isFavorite(id)}
              isDownloaded={(id) => LocalMusicStore.isDownloaded(id)}
              formatTime={formatTime}
            />
          )}

          {activeTab === 'home' && (
            <HomeView
              quickPicks={homeQuickPicks}
              history={history}
              isLoading={isHomeLoading}
              onReloadPicks={loadHomeData}
              onToggleFavorite={handleToggleFavorite}
              isFavorite={(id) => LocalMusicStore.isFavorite(id)}
              formatTime={formatTime}
              onSearchArtist={(artist) => {
                setSearchQuery(artist)
                setActiveTab('search')
                executeSearch(artist)
              }}
            />
          )}

          {activeTab === 'library' && (
            <LibraryView
              subTab={librarySubTab}
              setSubTab={setLibrarySubTab}
              favorites={favorites}
              playlists={playlists}
              downloads={downloads}
              onToggleFavorite={handleToggleFavorite}
              onDeletePlaylist={(id) => LocalMusicStore.deletePlaylist(id)}
              onRemoveDownload={(id) => LocalMusicStore.removeDownload(id)}
              onOpenCreatePlaylist={() => setShowCreatePlaylistModal(true)}
              onSelectPlaylist={(pl) => setSelectedPlaylist(pl)}
              formatTime={formatTime}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              syncSettings={syncSettings}
              syncStatus={syncStatus}
              appVersion={appVersion}
              latestRelease={latestRelease}
              isCheckingUpdate={isCheckingUpdate}
              updateMessage={updateMessage}
              updaterProgress={updaterProgress}
              isUpdateDownloaded={isUpdateDownloaded}
              onRestartAndInstall={handleRestartAndInstall}
              cacheClearSuccess={cacheClearSuccess}
              onUpdateSettings={(s) => {
                const updated = { ...syncSettings, ...s }
                setSyncSettings(updated)
                LocalMusicStore.saveSettings(updated)
                if (s.isEnabled !== undefined) {
                  if (s.isEnabled) SyncManagerService.start()
                  else SyncManagerService.stop()
                }
              }}
              onManualSync={() => SyncManagerService.syncCycle(true)}
              onForceResetSync={() => SyncManagerService.forceResetSync()}
              onClearCache={handleClearCache}
              onCheckUpdate={handleCheckUpdate}
            />
          )}
        </div>

        {/* Album Modal Sheet */}
        {selectedAlbum && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-40 flex items-center justify-center p-6">
            <div className="bg-[#14141c] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 flex items-start space-x-5 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <img
                  src={selectedAlbum.thumbnailUrl}
                  alt={selectedAlbum.title}
                  className="w-24 h-24 rounded-2xl object-cover shadow-xl flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-semibold">
                    Album Studio Resmi
                  </span>
                  <h3 className="text-lg font-bold text-white truncate mt-1">{selectedAlbum.title}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{selectedAlbum.artist}</p>
                  <p className="text-xs text-zinc-500 mt-2">{albumTracks.length} Lagu Tersedia</p>
                </div>
                <button
                  onClick={() => setSelectedAlbum(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 divide-y divide-white/[0.03]">
                {isLoadingAlbum ? (
                  <div className="p-8 text-center text-zinc-500 text-sm">Mengurai lagu album YouTube Music...</div>
                ) : (
                  albumTracks.map((t, i) => (
                    <div
                      key={t.id}
                      onClick={() => AudioPlayerService.playTrack(t, albumTracks)}
                      className="flex items-center justify-between p-3 hover:bg-white/[0.04] rounded-xl cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <span className="w-5 text-center text-xs font-mono text-zinc-500 group-hover:text-orange-400">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="text-sm font-medium text-zinc-100 truncate group-hover:text-orange-400">{t.title}</p>
                          <p className="text-xs text-zinc-400 truncate">{t.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={(e) => handleToggleFavorite(t, e)}
                          className={`p-1.5 rounded-lg hover:bg-white/10 transition ${
                            LocalMusicStore.isFavorite(t.id) ? 'text-rose-500' : 'text-zinc-500 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${LocalMusicStore.isFavorite(t.id) ? 'fill-rose-500' : ''}`} />
                        </button>
                        <span className="text-xs font-mono text-zinc-500">{formatTime(t.durationSeconds)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Playlist Modal Sheet */}
        {selectedPlaylist && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-40 flex items-center justify-center p-6">
            <div className="bg-[#14141c] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 flex items-start space-x-5 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                {selectedPlaylist.tracks.length > 0 && selectedPlaylist.tracks[0].thumbnailUrl ? (
                  <img
                    src={selectedPlaylist.tracks[0].thumbnailUrl}
                    alt={selectedPlaylist.name}
                    className="w-24 h-24 rounded-2xl object-cover shadow-xl flex-shrink-0 bg-zinc-800"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-500/20 to-orange-700/40 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
                    <ListMusic className="w-10 h-10 text-orange-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-semibold">
                    Daftar Putar Pribadi
                  </span>
                  <h3 className="text-lg font-bold text-white truncate mt-1">{selectedPlaylist.name}</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{selectedPlaylist.tracks.length} Lagu Tersimpan</p>

                  {selectedPlaylist.tracks.length > 0 && (
                    <div className="flex items-center space-x-2 mt-3">
                      <button
                        onClick={() => AudioPlayerService.playTrack(selectedPlaylist.tracks[0], selectedPlaylist.tracks)}
                        className="px-3.5 py-1.5 rounded-full bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium flex items-center space-x-1.5 shadow-md shadow-orange-600/30 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-white" />
                        <span>Putar Semua</span>
                      </button>
                      <button
                        onClick={() => {
                          const shuffled = [...selectedPlaylist.tracks].sort(() => Math.random() - 0.5)
                          AudioPlayerService.playTrack(shuffled[0], shuffled)
                        }}
                        className="px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium flex items-center space-x-1.5 transition"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>Acak</span>
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedPlaylist(null)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 divide-y divide-white/[0.03]">
                {selectedPlaylist.tracks.length === 0 ? (
                  <div className="p-8 text-center text-zinc-500 text-sm">
                    Playlist ini belum memiliki lagu.
                  </div>
                ) : (
                  selectedPlaylist.tracks.map((t, i) => (
                    <div
                      key={`${t.id}-${i}`}
                      onClick={() => AudioPlayerService.playTrack(t, selectedPlaylist.tracks)}
                      className="flex items-center justify-between p-3 hover:bg-white/[0.04] rounded-xl cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <span className="w-5 text-center text-xs font-mono text-zinc-500 group-hover:text-orange-400">
                          {i + 1}
                        </span>
                        {t.thumbnailUrl && (
                          <img
                            src={t.thumbnailUrl}
                            alt={t.title}
                            className="w-9 h-9 rounded-lg object-cover bg-zinc-800 flex-shrink-0"
                          />
                        )}
                        <div className="min-w-0 flex-1 pr-4">
                          <p className="text-sm font-medium text-zinc-100 truncate group-hover:text-orange-400">{t.title}</p>
                          <p className="text-xs text-zinc-400 truncate">{t.artist}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={(e) => handleToggleFavorite(t, e)}
                          className={`p-1.5 rounded-lg hover:bg-white/10 transition ${
                            LocalMusicStore.isFavorite(t.id) ? 'text-rose-500' : 'text-zinc-500 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${LocalMusicStore.isFavorite(t.id) ? 'fill-rose-500' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            LocalMusicStore.removeTrackFromPlaylist(selectedPlaylist.id, t.id)
                            const updated = LocalMusicStore.getPlaylists().find(p => p.id === selectedPlaylist.id)
                            setSelectedPlaylist(updated || null)
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-white/5 transition"
                          title="Hapus dari Playlist"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <span className="text-xs font-mono text-zinc-500">{formatTime(t.durationSeconds)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal Buat Playlist */}
        {showCreatePlaylistModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-40 flex items-center justify-center p-6">
            <div className="bg-[#14141c] border border-white/10 rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
              <h3 className="text-base font-bold text-white">Buat Playlist Baru</h3>
              <input
                type="text"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreatePlaylist()}
                placeholder="Nama playlist..."
                className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
                autoFocus
              />
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  onClick={() => setShowCreatePlaylistModal(false)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:text-white hover:bg-white/5 transition"
                >
                  Batal
                </button>
                <button
                  onClick={handleCreatePlaylist}
                  className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium transition"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}

        <PlayerBar
          playerState={playerState}
          isFavorite={!!playerState.currentTrack && LocalMusicStore.isFavorite(playerState.currentTrack.id)}
          onToggleFavorite={handleToggleFavorite}
          formatTime={formatTime}
          onToggleExpandNowPlaying={() => setIsNowPlayingExpanded(true)}
          onToggleQueue={() => setIsNowPlayingExpanded(true)}
          isQueueOpen={isNowPlayingExpanded}
          onOpenArtistModal={(artist) => setSelectedArtistForModal(artist)}
        />

        <NowPlayingModal
          isOpen={isNowPlayingExpanded}
          onClose={() => setIsNowPlayingExpanded(false)}
          playerState={playerState}
          isFavorite={!!playerState.currentTrack && LocalMusicStore.isFavorite(playerState.currentTrack.id)}
          onToggleFavorite={handleToggleFavorite}
          formatTime={formatTime}
          onOpenArtistModal={(artist) => setSelectedArtistForModal(artist)}
        />

        {selectedArtistForModal && (
          <ArtistDiscographyModal
            artistName={selectedArtistForModal}
            isOpen={!!selectedArtistForModal}
            onClose={() => setSelectedArtistForModal(null)}
            onToggleFavorite={handleToggleFavorite}
            isFavorite={(id) => LocalMusicStore.isFavorite(id)}
            formatTime={formatTime}
          />
        )}
      </main>
    </div>
  )
}
