import { SyncCrypto } from './SyncCrypto'
import { LocalMusicStore } from './LocalMusicStore'

export interface SyncStatus {
  state: 'DISCONNECTED' | 'CONNECTING' | 'SYNCED' | 'ERROR'
  lastSyncTime: number
  errorMessage?: string
}

export class SyncManagerService {
  private static status: SyncStatus = {
    state: 'DISCONNECTED',
    lastSyncTime: 0
  }
  private static listeners: Set<(s: SyncStatus) => void> = new Set()
  private static pollingInterval: any = null
  private static isSyncing = false

  static getStatus(): SyncStatus {
    return this.status
  }

  static subscribe(fn: (s: SyncStatus) => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private static notify() {
    this.listeners.forEach(fn => fn({ ...this.status }))
  }

  static start() {
    const settings = LocalMusicStore.getSettings()
    if (!settings.isEnabled || !settings.relayUrl || !settings.vaultId || !settings.syncSecret) {
      this.status = { state: 'DISCONNECTED', lastSyncTime: 0 }
      this.notify()
      return
    }

    if (this.pollingInterval) clearInterval(this.pollingInterval)
    this.syncCycle()
    this.pollingInterval = setInterval(() => this.syncCycle(), 30000)
  }

  static stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    this.status = { state: 'DISCONNECTED', lastSyncTime: 0 }
    this.notify()
  }

  static async syncCycle() {
    if (this.isSyncing) return
    const settings = LocalMusicStore.getSettings()
    if (!settings.isEnabled || !settings.relayUrl || !settings.vaultId || !settings.syncSecret) {
      return
    }

    this.isSyncing = true
    this.status.state = 'CONNECTING'
    this.notify()

    try {
      const { kEnc, kAuth, authVerifier } = await SyncCrypto.deriveKeys(settings.syncSecret)

      // 1. Init Vault (TOFU pattern)
      const initUrl = `${settings.relayUrl.replace(/\/$/, '')}/api/v1/vault/init`
      await fetch(initUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vault_id: settings.vaultId,
          auth_verifier: authVerifier,
          created_at: Date.now()
        })
      }).catch(() => {})

      // 2. Pull Events
      const pullUrl = `${settings.relayUrl.replace(/\/$/, '')}/api/v1/sync/pull?since_seq=0`
      const timestamp = Date.now().toString()
      const signature = await SyncCrypto.computeSignature(`${settings.vaultId}:${timestamp}:`, kAuth)

      const pullRes = await fetch(pullUrl, {
        headers: {
          'X-Vault-ID': settings.vaultId,
          'X-Timestamp': timestamp,
          'X-Signature': signature
        }
      })

      if (pullRes.ok) {
        const pullData = await pullRes.json()
        const events = pullData.events || []
        for (const ev of events) {
          try {
            const decryptedJson = await SyncCrypto.decryptPayload(ev.payload_encrypted, kEnc)
            const eventObj = JSON.parse(decryptedJson)
            this.applyRemoteEvent(eventObj)
          } catch (e) {
            console.warn('Gagal dekripsi event remote:', e)
          }
        }
      }

      this.status = {
        state: 'SYNCED',
        lastSyncTime: Date.now()
      }
    } catch (err: any) {
      this.status = {
        state: 'ERROR',
        lastSyncTime: this.status.lastSyncTime,
        errorMessage: err.message || 'Gagal sinkronisasi'
      }
    } finally {
      this.isSyncing = false
      this.notify()
    }
  }

  private static applyRemoteEvent(ev: any) {
    if (!ev || !ev.action) return
    if (ev.action === 'FAVORITE_ADD' && ev.data) {
      const favs = LocalMusicStore.getFavorites()
      if (!favs.some(t => t.id === ev.data.id)) {
        favs.unshift(ev.data)
        localStorage.setItem('puki_favorites_v1', JSON.stringify(favs))
      }
    } else if (ev.action === 'FAVORITE_REMOVE' && ev.data) {
      const favs = LocalMusicStore.getFavorites().filter(t => t.id !== ev.data.id)
      localStorage.setItem('puki_favorites_v1', JSON.stringify(favs))
    }
  }
}
