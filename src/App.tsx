import React, { useState, useEffect } from 'react'
import { Search, Home, Library, Settings, Play, Pause, SkipBack, SkipForward, Volume2, Disc, Music } from 'lucide-react'
import { YouTubeMusicService, Track, Album } from './services/YouTubeMusicService'
import { AudioPlayerService } from './services/AudioPlayerService'

export default function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'library' | 'settings'>('search')
  const [searchQuery, setSearchQuery] = useState('Last Child')
  const [tracks, setTracks] = useState<Track[]>([])
  const [albums, setAlbums] = useState<Album[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null)
  const [albumTracks, setAlbumTracks] = useState<Track[]>([])
  const [isLoadingAlbum, setIsLoadingAlbum] = useState(false)

  // Player state
  const [playerState, setPlayerState] = useState(AudioPlayerService.getState())

  useEffect(() => {
    const unsub = AudioPlayerService.subscribe(() => {
      setPlayerState(AudioPlayerService.getState())
    })
    // Auto-search default query
    handleSearch('Last Child')
    return unsub
  }, [])

  const handleSearch = async (query: string) => {
    if (!query.trim()) return
    setIsLoading(true)
    try {
      const [fetchedTracks, fetchedAlbums] = await Promise.all([
        YouTubeMusicService.searchTracks(query),
        YouTubeMusicService.searchAlbums(query)
      ])
      setTracks(fetchedTracks)
      setAlbums(fetchedAlbums)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenAlbum = async (album: Album) => {
    setSelectedAlbum(album)
    setIsLoadingAlbum(true)
    try {
      const tracks = await YouTubeMusicService.getAlbumTracks(album.id)
      setAlbumTracks(tracks)
    } finally {
      setIsLoadingAlbum(false)
    }
  }

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="flex h-screen w-screen bg-[#0a0a0c] text-white">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-[#121216] flex flex-col border-r border-white/5 select-none">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-orange-600 flex items-center justify-center font-bold text-lg shadow-lg shadow-orange-600/30">
            P
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide">Puki Music</h1>
            <p className="text-[10px] text-zinc-400 font-mono tracking-wider">WINDOWS DESKTOP</p>
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          <button
            onClick={() => setActiveTab('search')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'search' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Pencarian</span>
          </button>

          <button
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'home' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>Beranda</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'library' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Library className="w-4 h-4" />
            <span>Koleksi & Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
              activeTab === 'settings' ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Pengaturan</span>
          </button>
        </nav>

        {/* Sync Status Badge */}
        <div className="p-4 m-3 rounded-2xl bg-white/[0.03] border border-white/5">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-medium text-zinc-300">Sync Relay Terhubung</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">E2EE Zero-Knowledge Sync</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-[#141418] to-[#0a0a0c]">
        {/* Search Header Bar */}
        <header className="h-16 px-8 flex items-center justify-between border-b border-white/5">
          <div className="relative w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
              placeholder="Cari lagu, artis, atau album resmi..."
              className="w-full bg-[#1c1c22] border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 transition"
            />
          </div>

          <div className="flex items-center space-x-3 text-xs text-zinc-400 font-medium">
            <span>Versi 1.0.0 (Windows x64)</span>
          </div>
        </header>

        {/* Scrollable View Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-zinc-500 space-x-2">
              <span className="animate-spin inline-block w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full"></span>
              <span>Memuat diskografi YouTube Music...</span>
            </div>
          ) : (
            <>
              {/* ALBUM SECTION (Two-Tier Artist Discography First) */}
              {albums.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold flex items-center space-x-2 text-zinc-100">
                      <Disc className="w-5 h-5 text-orange-500" />
                      <span>ALBUM RESMI TERKAIT ({albums.length})</span>
                    </h2>
                    <span className="text-xs text-zinc-400">Strict Studio Albums</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {albums.map((album) => (
                      <div
                        key={album.id}
                        onClick={() => handleOpenAlbum(album)}
                        className="group bg-white/[0.02] hover:bg-white/[0.06] p-3 rounded-2xl border border-white/5 cursor-pointer transition flex flex-col space-y-2.5"
                      >
                        <div className="aspect-square w-full rounded-xl overflow-hidden bg-zinc-800 relative">
                          <img
                            src={album.thumbnailUrl}
                            alt={album.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-xs text-zinc-100 truncate group-hover:text-orange-400 transition">
                            {album.title}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{album.artist || 'Artis Resmi'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* TRACKS LIST SECTION */}
              <section>
                <h2 className="text-lg font-bold flex items-center space-x-2 mb-4 text-zinc-100">
                  <Music className="w-5 h-5 text-orange-500" />
                  <span>LAGU & TRACKLIST</span>
                </h2>

                <div className="bg-white/[0.02] rounded-2xl border border-white/5 divide-y divide-white/[0.03]">
                  {tracks.map((track, idx) => (
                    <div
                      key={track.id}
                      onClick={() => AudioPlayerService.playTrack(track, tracks)}
                      className="flex items-center justify-between p-3.5 hover:bg-white/[0.04] cursor-pointer transition group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className="w-6 text-center text-xs font-mono text-zinc-500 group-hover:text-orange-400">
                          {idx + 1}
                        </span>
                        <img
                          src={track.thumbnailUrl}
                          alt={track.title}
                          className="w-10 h-10 rounded-lg object-cover bg-zinc-800"
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-zinc-100 truncate group-hover:text-orange-400 transition">
                            {track.title}
                          </p>
                          <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
                        </div>
                      </div>

                      <div className="text-xs font-mono text-zinc-500">
                        {formatTime(track.durationSeconds)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>

        {/* ALBUM MODAL SHEET */}
        {selectedAlbum && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-[#16161c] border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 flex items-start space-x-5 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
                <img
                  src={selectedAlbum.thumbnailUrl}
                  alt={selectedAlbum.title}
                  className="w-28 h-28 rounded-2xl object-cover shadow-xl"
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-orange-400 font-semibold">Album Studio Resmi</span>
                  <h3 className="text-xl font-bold text-white truncate mt-1">{selectedAlbum.title}</h3>
                  <p className="text-sm text-zinc-400 mt-0.5">{selectedAlbum.artist}</p>
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
                  <div className="p-8 text-center text-zinc-500 text-sm">Mengurai lagu album...</div>
                ) : (
                  albumTracks.map((t, i) => (
                    <div
                      key={t.id}
                      onClick={() => AudioPlayerService.playTrack(t, albumTracks)}
                      className="flex items-center justify-between p-3 hover:bg-white/[0.04] rounded-xl cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className="w-5 text-center text-xs font-mono text-zinc-500 group-hover:text-orange-400">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-100 truncate group-hover:text-orange-400">{t.title}</p>
                          <p className="text-xs text-zinc-400 truncate">{t.artist}</p>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-zinc-500">{formatTime(t.durationSeconds)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM FIXED PLAYER BAR */}
        <footer className="h-20 bg-[#101014] border-t border-white/5 px-6 flex items-center justify-between select-none">
          {/* Currently playing song */}
          <div className="flex items-center space-x-3 w-72 min-w-0">
            {playerState.currentTrack ? (
              <>
                <img
                  src={playerState.currentTrack.thumbnailUrl}
                  alt={playerState.currentTrack.title}
                  className="w-12 h-12 rounded-xl object-cover bg-zinc-800"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{playerState.currentTrack.title}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{playerState.currentTrack.artist}</p>
                </div>
              </>
            ) : (
              <div className="text-xs text-zinc-500">Pilih lagu untuk memutar</div>
            )}
          </div>

          {/* Central Playback Controls */}
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

            {/* Seek Bar */}
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
          </div>

          {/* Volume Control */}
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
      </main>
    </div>
  )
}
