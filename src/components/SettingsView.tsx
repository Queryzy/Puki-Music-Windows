import React, { useState, useEffect } from 'react'
import {
  ShieldCheck,
  HardDrive,
  Sparkles,
  RefreshCw,
  ExternalLink,
  QrCode,
  Copy,
  Check,
  FileText,
  Link2
} from 'lucide-react'
import QRCode from 'qrcode'
import { SyncSettings } from '../services/LocalMusicStore'
import { SyncStatus } from '../services/SyncManagerService'

interface SettingsViewProps {
  syncSettings: SyncSettings
  syncStatus: SyncStatus
  appVersion: string
  latestRelease: { tag: string; downloadUrl: string } | null
  isCheckingUpdate: boolean
  updateMessage: string | null
  cacheClearSuccess: boolean
  onUpdateSettings: (settings: Partial<SyncSettings>) => void
  onManualSync: () => void
  onClearCache: () => void
  onCheckUpdate: () => void
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  syncSettings,
  syncStatus,
  appVersion,
  latestRelease,
  isCheckingUpdate,
  updateMessage,
  cacheClearSuccess,
  onUpdateSettings,
  onManualSync,
  onClearCache,
  onCheckUpdate
}) => {
  const [pairingInput, setPairingInput] = useState('')
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [uriParseError, setUriParseError] = useState<string | null>(null)

  // Bangun URI Pairing puki://sync
  const pairingUri = `puki://sync?url=${encodeURIComponent(syncSettings.relayUrl)}&relay=${encodeURIComponent(
    syncSettings.relayUrl
  )}&vault=${syncSettings.vaultId}&key=${syncSettings.syncSecret}`

  useEffect(() => {
    if (showQrModal && syncSettings.relayUrl && syncSettings.vaultId && syncSettings.syncSecret) {
      QRCode.toDataURL(pairingUri, { width: 280, margin: 2, color: { dark: '#000000', light: '#ffffff' } })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error('QR Generate Error:', err))
    }
  }, [showQrModal, pairingUri, syncSettings])

  const handleApplyUri = () => {
    setUriParseError(null)
    const raw = pairingInput.trim()
    if (!raw) return

    try {
      // Normalisasi scheme puki://sync ke https:// dummy URL agar standard URL parser bisa memecah searchParams
      const normalized = raw.replace(/^puki:\/\/sync\??/i, 'https://sync.puki/?')
      const parsed = new URL(normalized)
      const url = parsed.searchParams.get('url') || parsed.searchParams.get('relay') || ''
      const vault = parsed.searchParams.get('vault') || ''
      const key = parsed.searchParams.get('key') || ''

      if (!url || !vault || !key) {
        setUriParseError('Format URI tidak lengkap. Diperlukan parameter url/relay, vault, dan key.')
        return
      }

      onUpdateSettings({
        isEnabled: true,
        relayUrl: url,
        vaultId: vault,
        syncSecret: key
      })
      setPairingInput('')
      setTimeout(() => onManualSync(), 200)
    } catch {
      setUriParseError('Gagal mengurai URI pairing. Pastikan link diawali puki://sync?...')
    }
  }

  const handleCopyPairingUri = () => {
    navigator.clipboard.writeText(pairingUri)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  return (
    <div className="max-w-3xl space-y-6 select-none">
      {/* Zero-Knowledge E2EE Sync Relay */}
      <section className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-orange-500" />
            <div>
              <h3 className="text-sm font-bold text-zinc-100">Zero-Knowledge E2EE Sync Relay</h3>
              <p className="text-xs text-zinc-400">
                Sinkronisasi dua arah aman (AES-256-GCM + HMAC-SHA256) persis dengan Android & iOS.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={syncSettings.isEnabled}
            onChange={(e) => onUpdateSettings({ isEnabled: e.target.checked })}
            className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
          />
        </div>

        {/* Quick Pairing Input */}
        <div className="p-3.5 rounded-2xl bg-orange-600/[0.07] border border-orange-500/20 space-y-2">
          <label className="text-xs font-semibold text-orange-400 flex items-center space-x-1.5">
            <Link2 className="w-3.5 h-3.5" />
            <span>Terapkan URI Pairing dari HP (Android / iOS)</span>
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              value={pairingInput}
              onChange={(e) => setPairingInput(e.target.value)}
              placeholder="puki://sync?url=https://...&vault=...&key=..."
              className="flex-1 bg-[#14141c] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono"
            />
            <button
              onClick={handleApplyUri}
              className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium transition shadow-md shadow-orange-600/20"
            >
              Terapkan
            </button>
          </div>
          {uriParseError && <p className="text-[11px] text-rose-400">{uriParseError}</p>}
        </div>

        {/* Manual Config Fields */}
        <div className="space-y-3 pt-1">
          <div>
            <label className="text-xs text-zinc-400 font-medium block mb-1">Puki Sync Relay URL</label>
            <input
              type="text"
              value={syncSettings.relayUrl}
              onChange={(e) => onUpdateSettings({ relayUrl: e.target.value })}
              placeholder="https://sync.example.com"
              className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1">Vault ID</label>
              <input
                type="text"
                value={syncSettings.vaultId}
                onChange={(e) => onUpdateSettings({ vaultId: e.target.value })}
                placeholder="vlt_..."
                className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-400 font-medium block mb-1">Sync Secret Key (Hex)</label>
              <input
                type="password"
                value={syncSettings.syncSecret}
                onChange={(e) => onUpdateSettings({ syncSecret: e.target.value })}
                placeholder="64-char Hex Secret"
                className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
            <div className="space-y-0.5">
              <span className="text-xs text-zinc-400">
                Status:{' '}
                <strong className="text-white">
                  {syncStatus.state}{' '}
                  {syncStatus.lastSyncTime > 0 ? `(${new Date(syncStatus.lastSyncTime).toLocaleTimeString()})` : ''}
                </strong>
              </span>
              {syncStatus.state === 'SYNCED' && (
                <p className="text-[11px] text-emerald-400 font-medium">
                  ✓ {syncStatus.syncedFavoritesCount ?? 0} Lagu Favorit • {syncStatus.syncedPlaylistsCount ?? 0} Playlist Tersinkron
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyPairingUri}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 transition flex items-center space-x-1.5"
                title="Salin Link URI Pairing"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'URI Disalin!' : 'Salin URI'}</span>
              </button>

              <button
                onClick={() => setShowQrModal(true)}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-medium text-zinc-300 transition flex items-center space-x-1.5"
                title="Tampilkan QR Code untuk di-scan HP"
              >
                <QrCode className="w-3.5 h-3.5 text-orange-400" />
                <span>QR Code Pairing</span>
              </button>

              <button
                onClick={onManualSync}
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs font-medium text-white transition flex items-center space-x-1.5 shadow-md shadow-orange-600/20"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sinkronkan</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Storage & Auto-Downloads */}
      <section className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
        <div className="flex items-center space-x-2.5">
          <HardDrive className="w-5 h-5 text-orange-500" />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Penyimpanan & Unduhan Otomatis</h3>
            <p className="text-xs text-zinc-400">Kelola cache audio offline pada IndexedDB browser/Electron.</p>
          </div>
        </div>

        <div className="space-y-3 pt-2 divide-y divide-white/[0.03]">
          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-xs font-medium text-zinc-200">Auto-Download Lagu Favorit</p>
              <p className="text-[11px] text-zinc-500">Unduh otomatis file audio saat lagu ditandai favorit.</p>
            </div>
            <input
              type="checkbox"
              checked={syncSettings.autoDownloadFavorites}
              onChange={(e) => onUpdateSettings({ autoDownloadFavorites: e.target.checked })}
              className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-xs font-medium text-zinc-200">Auto-Download Playlist</p>
              <p className="text-[11px] text-zinc-500">Unduh otomatis lagu yang dimasukkan ke playlist.</p>
            </div>
            <input
              type="checkbox"
              checked={syncSettings.autoDownloadPlaylists}
              onChange={(e) => onUpdateSettings({ autoDownloadPlaylists: e.target.checked })}
              className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between pt-3">
            <div>
              <p className="text-xs font-medium text-zinc-200">Bersihkan Cache Audio Offline</p>
              <p className="text-[11px] text-zinc-500">Hapus seluruh file audio yang terunduh di disk.</p>
            </div>
            <button
              onClick={onClearCache}
              className="px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-medium transition"
            >
              {cacheClearSuccess ? 'Cache Terhapus!' : 'Hapus Cache'}
            </button>
          </div>
        </div>
      </section>

      {/* In-App Updater */}
      <section className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
        <div className="flex items-center space-x-2.5">
          <Sparkles className="w-5 h-5 text-orange-500" />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Pembaruan Aplikasi (In-App Updater)</h3>
            <p className="text-xs text-zinc-400">Periksa pembaruan rilis langsung dari GitHub repository.</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div>
            <p className="text-xs text-zinc-400">
              Versi Terpasang: <strong className="text-white">v{appVersion}</strong>
            </p>
            {updateMessage && <p className="text-xs text-orange-400 font-medium mt-1">{updateMessage}</p>}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onCheckUpdate}
              disabled={isCheckingUpdate}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-medium flex items-center space-x-1.5 transition shadow-lg shadow-orange-600/30"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
              <span>{isCheckingUpdate ? 'Memeriksa...' : 'Periksa Pembaruan'}</span>
            </button>

            {latestRelease && (
              <a
                href={latestRelease.downloadUrl}
                target="_blank"
                rel="noreferrer"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition"
                title="Unduh Installer Resmi"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Changelog Versi */}
      <section className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
        <div className="flex items-center space-x-2.5">
          <FileText className="w-5 h-5 text-orange-500" />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Catatan Rilis (Changelog)</h3>
            <p className="text-xs text-zinc-400">Riwayat pembaruan dan fitur Puki Music Windows Desktop.</p>
          </div>
        </div>

        <div className="space-y-4 text-xs divide-y divide-white/[0.03]">
          <div className="pt-2 space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-orange-400">v1.0.4</span>
              <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-mono">
                Terbaru
              </span>
            </div>
            <ul className="list-disc list-inside text-zinc-300 space-y-1">
              <li><strong>OmniSource Deezer Resolver:</strong> Mengurai dan memutar katalog Deezer (<code>dz_...</code>) seperti <em>This Side of Paradise - Coyote Theory</em> secara transparan dengan caching lokal.</li>
              <li><strong>Behavioral Home Dashboard:</strong> Beranda dinamis dengan carousel artis favorit (affinity analysis), filter chips (Semua, Mix Pribadi, Favorit), dan rekomendasi pintar 1:1 mobile.</li>
              <li><strong>Playlist Detail & Quick Play:</strong> Modal interaktif daftar putar pribadi, preview cover art, tombol putar cepat, dan mode acak (shuffle).</li>
              <li><strong>Deterministik Timestamp Like:</strong> Pengurutan lagu favorit berdasarkan timestamp event like (<code>likedAt</code>) seragam dan konsisten di seluruh perangkat.</li>
              <li><strong>FIFO Background Download Queue:</strong> Antrean unduhan audio offline cerdas dengan proteksi concurrency, progress listener, dan auto-download favorit & playlist.</li>
            </ul>
          </div>

          <div className="pt-3 space-y-1.5">
            <span className="font-bold text-zinc-400">v1.0.3</span>
            <ul className="list-disc list-inside text-zinc-400 space-y-1">
              <li>Full Relay Pagination Loop: menarik seluruh riwayat sync hingga seq terakhir tanpa terpotong batas limit server.</li>
              <li>Dukungan penuh event <code>TOGGLE_FAVORITE</code>, <code>UPDATE_PLAYLIST</code>, dan <code>RECORD_PLAY</code> 1:1 format Android & iOS.</li>
              <li>Normalisasi YouTube Music Track ID otomatis dan update reaktif real-time pada Koleksi (Lagu Favorit & Playlist).</li>
              <li>Bi-directional Sync Outbox: perubahan lokal di Windows ter-push balik ke relay secara otomatis.</li>
              <li>Indikator status sinkronisasi real-time yang menampilkan jumlah lagu favorit dan playlist tersinkron.</li>
            </ul>
          </div>

          <div className="pt-3 space-y-1.5">
            <span className="font-bold text-zinc-400">v1.0.2</span>
            <ul className="list-disc list-inside text-zinc-400 space-y-1">
              <li>Now Playing View layar penuh model YouTube Music dengan ambient glow.</li>
              <li>Fitur Lirik Lagu sinkron (karaoke auto-scroll & seek klik baris) via LRCLIB.</li>
              <li>Daftar Putar (Antrean) dengan status lagu dan tombol Repeat / Shuffle.</li>
              <li>One-Click Pairing URI (<code>puki://sync?...</code>) & QR Code generator pairing.</li>
              <li>Perbaikan Logo sidebar di Electron dan dynamic slider gradient fill orange.</li>
              <li>Redesign Collapsed Sidebar simetris tanpa teks bocor.</li>
            </ul>
          </div>

          <div className="pt-3 space-y-1.5">
            <span className="font-bold text-zinc-400">v1.0.1</span>
            <ul className="list-disc list-inside text-zinc-400 space-y-1">
              <li>Pemisahan navigasi Beranda, Pencarian, Koleksi & Sync, dan Pengaturan.</li>
              <li>Offline Audio Storage engine via IndexedDB.</li>
              <li>Zero-Knowledge E2EE Relay Sync 1:1 Android & iOS.</li>
              <li>Two-Tier YouTube Music parser lagu vs album studio.</li>
            </ul>
          </div>

          <div className="pt-3 space-y-1.5">
            <span className="font-bold text-zinc-500">v1.0.0</span>
            <ul className="list-disc list-inside text-zinc-500 space-y-1">
              <li>Rilis perdana Puki Music Windows Desktop Client via Electron & Vite.</li>
              <li>Playback engine dasar dan streaming YouTube Music.</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Modal QR Code Pairing */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-[#14141c] border border-white/10 rounded-3xl w-full max-w-sm p-6 flex flex-col items-center space-y-4 shadow-2xl text-center">
            <h3 className="text-base font-bold text-white">QR Code E2EE Pairing</h3>
            <p className="text-xs text-zinc-400">
              Buka aplikasi Puki Music di Android atau iPhone, masuk menu <strong>Koleksi / Sync → Scan QR</strong>.
            </p>

            <div className="p-3 bg-white rounded-2xl shadow-lg">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt="Pairing QR Code" className="w-56 h-56 object-contain" />
              ) : (
                <div className="w-56 h-56 flex items-center justify-center text-zinc-500 text-xs">
                  Membuat QR Code...
                </div>
              )}
            </div>

            <div className="w-full flex items-center justify-between pt-2">
              <button
                onClick={handleCopyPairingUri}
                className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs text-white transition flex items-center space-x-1.5"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Tersalin' : 'Salin URI'}</span>
              </button>

              <button
                onClick={() => setShowQrModal(false)}
                className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-xs text-white font-medium transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
