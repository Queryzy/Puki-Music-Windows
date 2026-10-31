import React from 'react'
import { ShieldCheck, HardDrive, Sparkles, RefreshCw, ExternalLink } from 'lucide-react'
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
  return (
    <div className="max-w-3xl space-y-6">
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

        <div className="space-y-3 pt-2">
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
                className="w-full bg-[#181822] border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-orange-500"
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

          <div className="pt-2 flex items-center justify-between">
            <span className="text-xs text-zinc-400">
              Status:{' '}
              <strong className="text-white">
                {syncStatus.state} {syncStatus.lastSyncTime > 0 ? `(${new Date(syncStatus.lastSyncTime).toLocaleTimeString()})` : ''}
              </strong>
            </span>
            <button
              onClick={onManualSync}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition flex items-center space-x-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Sinkronkan Sekarang</span>
            </button>
          </div>
        </div>
      </section>

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
            <p className="text-xs text-zinc-400">Versi Terpasang: <strong className="text-white">v{appVersion}</strong></p>
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
    </div>
  )
}
