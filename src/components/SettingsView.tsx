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
  Link2,
  ChevronDown,
  ChevronUp
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
  updaterProgress?: { percent: number; bytesPerSecond: number; transferred: number; total: number } | null
  isUpdateDownloaded?: boolean
  onRestartAndInstall?: () => void
  cacheClearSuccess: boolean
  onUpdateSettings: (settings: Partial<SyncSettings>) => void
  onManualSync: () => void
  onForceResetSync?: () => void
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
  updaterProgress,
  isUpdateDownloaded,
  onRestartAndInstall,
  cacheClearSuccess,
  onUpdateSettings,
  onManualSync,
  onForceResetSync,
  onClearCache,
  onCheckUpdate
}) => {
  const [pairingInput, setPairingInput] = useState('')
  const [showQrModal, setShowQrModal] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [copiedLink, setCopiedLink] = useState(false)
  const [expandedChangelogVersion, setExpandedChangelogVersion] = useState<string | null>(null)

  const toggleChangelog = (ver: string) => {
    setExpandedChangelogVersion(prev => prev === ver ? null : ver)
  }
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
                title="Tarik delta sinkronisasi terbaru"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sinkronkan</span>
              </button>

              {onForceResetSync && (
                <button
                  onClick={onForceResetSync}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 text-xs font-medium text-zinc-400 transition"
                  title="Reset cache dan susun ulang urutan favorit dari awal relay"
                >
                  <span>Re-Sync Bersih</span>
                </button>
              )}
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
            <h3 className="text-sm font-bold text-zinc-100">Pembaruan Aplikasi (In-App Silent Updater)</h3>
            <p className="text-xs text-zinc-400">Unduh & pasang otomatis di background langsung dari GitHub Releases.</p>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">
                Versi Terpasang: <strong className="text-white">v{appVersion}</strong>
              </p>
              {updateMessage && <p className="text-xs text-orange-400 font-medium mt-1">{updateMessage}</p>}
            </div>

            <div className="flex items-center space-x-2">
              {isUpdateDownloaded ? (
                <button
                  onClick={onRestartAndInstall}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition shadow-lg shadow-emerald-600/30 animate-pulse"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Pasang & Mulai Ulang</span>
                </button>
              ) : (
                <button
                  onClick={onCheckUpdate}
                  disabled={isCheckingUpdate || !!updaterProgress}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-medium flex items-center space-x-1.5 transition shadow-lg shadow-orange-600/30"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`} />
                  <span>{isCheckingUpdate ? 'Memeriksa...' : 'Periksa Pembaruan'}</span>
                </button>
              )}

              {latestRelease && (
                <a
                  href={latestRelease.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs transition"
                  title="Unduh Manual Installer Resmi"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>

          {/* Progress Bar Background Download */}
          {updaterProgress && (
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-orange-400 font-medium flex items-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengunduh installer di latar belakang...</span>
                </span>
                <span className="font-mono text-zinc-300 font-bold">{updaterProgress.percent}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-300 rounded-full"
                  style={{ width: `${updaterProgress.percent}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500">
                <span>{(updaterProgress.transferred / (1024 * 1024)).toFixed(1)} MB / {(updaterProgress.total / (1024 * 1024)).toFixed(1)} MB</span>
                <span>{(updaterProgress.bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Changelog Versi (Dropdown Collapsible Parity) */}
      <section className="p-5 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
        <div className="flex items-center space-x-2.5">
          <FileText className="w-5 h-5 text-orange-500" />
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Catatan Rilis (Changelog)</h3>
            <p className="text-xs text-zinc-400">Klik versi untuk melihat detail pembaruan.</p>
          </div>
        </div>

        <div className="space-y-2 text-xs">
          {/* v1.0.9 */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden transition">
            <button
              onClick={() => toggleChangelog('v1.0.9')}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition"
            >
              <div className="flex items-center space-x-2.5">
                <span className="font-bold text-sm text-orange-400">v1.0.9</span>
                <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-mono">
                  Terbaru
                </span>
                <span className="text-zinc-500 text-[11px] hidden sm:inline">• Antarmuka Ringkas Dropdown & Single Setup Artifact</span>
              </div>
              {expandedChangelogVersion === 'v1.0.9' ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </button>
            {expandedChangelogVersion === 'v1.0.9' && (
              <div className="p-3.5 pt-0 border-t border-white/5 mt-1 text-zinc-300">
                <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
                  <li><strong>Dropdown Collapsible Changelog:</strong> Seluruh riwayat catatan rilis kini tampil dalam akordeon rapi yang terlipat default agar menu Pengaturan tidak memanjang.</li>
                  <li><strong>Single Clean Installer:</strong> Eliminasi file ganda pada GitHub Releases dengan standardisasi nama artefak resmi <code>Puki-Music-Setup-[version].exe</code>.</li>
                </ul>
              </div>
            )}
          </div>

          {/* v1.0.8 */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden transition">
            <button
              onClick={() => toggleChangelog('v1.0.8')}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition"
            >
              <div className="flex items-center space-x-2.5">
                <span className="font-bold text-sm text-zinc-200">v1.0.8</span>
                <span className="text-zinc-500 text-[11px] hidden sm:inline">• Kalibrasi Lirik, Quick Play & Album Playlists</span>
              </div>
              {expandedChangelogVersion === 'v1.0.8' ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </button>
            {expandedChangelogVersion === 'v1.0.8' && (
              <div className="p-3.5 pt-0 border-t border-white/5 mt-1 text-zinc-300">
                <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
                  <li><strong>Kalibrasi Lirik Presisi:</strong> Stepper offset lirik melayang ([-0.5s ... +0.5s]) yang dapat dibuka/tutup dengan penyimpanan otomatis per lagu.</li>
                  <li><strong>Putar Cepat Album:</strong> Tombol Play instan pada cover album di hasil pencarian untuk langsung mendengarkan album tanpa harus membuka detail.</li>
                  <li><strong>Simpan Album ke Playlist:</strong> Kemampuan menyimpan seluruh trek album menjadi playlist pribadi dengan sinkronisasi E2EE otomatis.</li>
                  <li><strong>Perapihan Antarmuka & Bahasa:</strong> Desain kartu beranda yang lebih ramah pengguna, visual tombol aksi yang proporsional, dan penghapusan istilah teknis robotik.</li>
                </ul>
              </div>
            )}
          </div>

          {/* v1.0.7 */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden transition">
            <button
              onClick={() => toggleChangelog('v1.0.7')}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition"
            >
              <div className="flex items-center space-x-2.5">
                <span className="font-bold text-sm text-zinc-200">v1.0.7</span>
                <span className="text-zinc-500 text-[11px] hidden sm:inline">• Durasi Presisi & Romaji CJK</span>
              </div>
              {expandedChangelogVersion === 'v1.0.7' ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </button>
            {expandedChangelogVersion === 'v1.0.7' && (
              <div className="p-3.5 pt-0 border-t border-white/5 mt-1 text-zinc-400">
                <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
                  <li><strong>Durasi Presisi:</strong> Normalisasi parser durasi titik (misal 3.55) & titik dua InnerTube YouTube Music Indonesia.</li>
                  <li><strong>Fix Artis Album:</strong> Mengambil nama artis asli dari strapline album, menghilangkan teks 'Artis Resmi'.</li>
                  <li><strong>Navigasi Artis Interaktif:</strong> Klik nama musisi di list lagu mana saja untuk membuka diskografi album.</li>
                  <li><strong>Multi-Tier Lyrics & Romaji CJK:</strong> Mesin lirik LRCLIB 1:1 mobile dengan tombol alih aksara Romaji (Kanji/Kana, Hangul, Pinyin) dan tombol refresh lirik.</li>
                  <li><strong>Pembersihan Initial Query:</strong> Menghapus query search default 'Last Child' saat aplikasi pertama kali dibuka.</li>
                </ul>
              </div>
            )}
          </div>

          {/* v1.0.6 */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden transition">
            <button
              onClick={() => toggleChangelog('v1.0.6')}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition"
            >
              <div className="flex items-center space-x-2.5">
                <span className="font-bold text-sm text-zinc-300">v1.0.6</span>
                <span className="text-zinc-500 text-[11px] hidden sm:inline">• Re-Sync Bersih & Liked Parity</span>
              </div>
              {expandedChangelogVersion === 'v1.0.6' ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </button>
            {expandedChangelogVersion === 'v1.0.6' && (
              <div className="p-3.5 pt-0 border-t border-white/5 mt-1 text-zinc-400">
                <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
                  <li><strong>Deterministic Favorite Parity:</strong> Sorting deterministik <code>likedAt DESC</code> 1:1 identik dengan Android dan iOS.</li>
                  <li><strong>Re-Sync Bersih Engine:</strong> Tombol Re-Sync Bersih di Pengaturan yang membangun ulang seluruh data riwayat favorit dari awal relay tanpa meninggalkan cache urutan lama.</li>
                </ul>
              </div>
            )}
          </div>

          {/* v1.0.5 */}
          <div className="rounded-2xl border border-white/5 bg-white/[0.01] overflow-hidden transition">
            <button
              onClick={() => toggleChangelog('v1.0.5')}
              className="w-full p-3.5 flex items-center justify-between text-left hover:bg-white/[0.03] transition"
            >
              <div className="flex items-center space-x-2.5">
                <span className="font-bold text-sm text-zinc-400">v1.0.5</span>
                <span className="text-zinc-500 text-[11px] hidden sm:inline">• Direct InnerTube & Discography Sheet</span>
              </div>
              {expandedChangelogVersion === 'v1.0.5' ? (
                <ChevronUp className="w-4 h-4 text-zinc-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-500" />
              )}
            </button>
            {expandedChangelogVersion === 'v1.0.5' && (
              <div className="p-3.5 pt-0 border-t border-white/5 mt-1 text-zinc-400">
                <ul className="list-disc list-inside space-y-1.5 leading-relaxed">
                  <li><strong>Resilient Direct InnerTube Stream Resolver:</strong> Direct audio m4a (itag 140) via InnerTube <code>ANDROID_VR</code> 1:1 mobile dengan auto-match katalog Deezer/non-YT.</li>
                  <li><strong>Artist Discography Modal Sheet:</strong> Akses diskografi lengkap penyanyi (Album Studio dan Lagu Populer) langsung dari PlayerBar dan NowPlaying.</li>
                  <li><strong>Silent Background Auto-Updater:</strong> Pembaruan otomatis via <code>electron-updater</code> lengkap dengan progress bar.</li>
                </ul>
              </div>
            )}
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
