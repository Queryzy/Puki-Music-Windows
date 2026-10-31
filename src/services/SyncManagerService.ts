import { SyncCrypto } from './SyncCrypto'
import { LocalMusicStore } from './LocalMusicStore'

export interface SyncStatus {
  state: 'DISCONNECTED' | 'CONNECTING' | 'SYNCED' | 'ERROR'
  lastSyncTime: number
  errorMessage?: string
  syncedFavoritesCount?: number
  syncedPlaylistsCount?: number
}

export class SyncManagerService {
  private static KEY_LAST_SEQ = 'puki_last_sync_seq_v1'

  private static status: SyncStatus = {
    state: 'DISCONNECTED',
    lastSyncTime: 0
  }
  private static listeners: Set<(s: SyncStatus) => void> = new Set()
  private static pollingInterval: any = null
  private static isSyncing = false

  static getStatus(): SyncStatus {
    const favs = LocalMusicStore.getFavorites()
    const pls = LocalMusicStore.getPlaylists()
    return {
      ...this.status,
      syncedFavoritesCount: favs.length,
      syncedPlaylistsCount: pls.length
    }
  }

  static subscribe(fn: (s: SyncStatus) => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }

  private static notify() {
    const current = this.getStatus()
    this.listeners.forEach(fn => fn(current))
  }

  static start() {
    const settings = LocalMusicStore.getSettings()
    if (!settings.isEnabled || !settings.relayUrl || !settings.vaultId || !settings.syncSecret) {
      this.status = { state: 'DISCONNECTED', lastSyncTime: 0 }
      this.notify()
      return
    }

    if (this.pollingInterval) clearInterval(this.pollingInterval)
    // Jalankan siklus sinkronisasi pertama kali (baca penuh)
    this.syncCycle(false)
    this.pollingInterval = setInterval(() => this.syncCycle(false), 20000)
  }

  static stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
    this.status = { state: 'DISCONNECTED', lastSyncTime: 0 }
    this.notify()
  }

  /**
   * Siklus sinkronisasi:
   * 1. TOFU vault registration
   * 2. Push outbox events (bi-directional sync)
   * 3. Pull incremental / full delta loop sampai latest_seq
   * 4. Apply batch & trigger re-render
   */
  static async syncCycle(forceFullPull: boolean = false) {
    if (this.isSyncing) return
    const settings = LocalMusicStore.getSettings()
    if (!settings.isEnabled || !settings.relayUrl || !settings.vaultId || !settings.syncSecret) {
      return
    }

    this.isSyncing = true
    this.status = {
      ...this.status,
      state: 'CONNECTING',
      errorMessage: undefined
    }
    this.notify()

    try {
      const { kEnc, kAuth, authVerifier } = await SyncCrypto.deriveKeys(settings.syncSecret)
      const baseUrl = settings.relayUrl.replace(/\/$/, '')

      // 1. Init Vault (TOFU pattern)
      const initUrl = `${baseUrl}/api/v1/vault/init`
      await fetch(initUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vault_id: settings.vaultId,
          auth_verifier: authVerifier,
          created_at: Date.now()
        })
      }).catch(() => {})

      // 2. Push Outbox Events (jika ada aksi lokal yang belum ter-push ke relay)
      let outboxLoops = 0
      while (outboxLoops < 5) {
        outboxLoops++
        const pending = LocalMusicStore.getOutbox()
        if (pending.length === 0) break

        const batch = pending.slice(0, 50)
        const eventsPayload: any[] = []
        const sentIds = new Set<string>()

        for (const item of batch) {
          const plain = JSON.stringify(item)
          const cipher = await SyncCrypto.encryptPayload(plain, kEnc)
          eventsPayload.push({
            id: item.id,
            payload_encrypted: cipher
          })
          sentIds.add(item.id)
        }

        const pushBody = JSON.stringify({ events: eventsPayload })
        const timestamp = Date.now().toString()
        const message = `${settings.vaultId}:${timestamp}:${pushBody}`
        const signature = await SyncCrypto.computeSignature(message, kAuth)

        const pushRes = await fetch(`${baseUrl}/api/v1/sync/push`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Vault-ID': settings.vaultId,
            'X-Timestamp': timestamp,
            'X-Signature': signature
          },
          body: pushBody
        })

        if (pushRes.ok) {
          LocalMusicStore.removeOutboxItems(sentIds)
        } else {
          console.warn(`Sync push outbox gagal: HTTP ${pushRes.status}`)
          break
        }
      }

      // 3. Pull Events Pagination Loop
      const localFavs = LocalMusicStore.getFavorites()
      const localPlaylists = LocalMusicStore.getPlaylists()

      // Jika user minta forceFull, atau jika store lokal masih kosong, paksa pull dari seq 0
      let currentSeq = (forceFullPull || (localFavs.length === 0 && localPlaylists.length === 0))
        ? 0
        : parseInt(localStorage.getItem(this.KEY_LAST_SEQ) || '0', 10)

      let hasMore = true
      const incomingEvents: any[] = []
      const deviceId = LocalMusicStore.getDeviceId()

      while (hasMore) {
        const pullUrl = `${baseUrl}/api/v1/sync/pull?since_seq=${currentSeq}&limit=200`
        const pullTimestamp = Date.now().toString()
        const pullMsg = `${settings.vaultId}:${pullTimestamp}:`
        const pullSig = await SyncCrypto.computeSignature(pullMsg, kAuth)

        const pullRes = await fetch(pullUrl, {
          method: 'GET',
          headers: {
            'X-Vault-ID': settings.vaultId,
            'X-Timestamp': pullTimestamp,
            'X-Signature': pullSig
          }
        })

        if (!pullRes.ok) {
          throw new Error(`Pull relay gagal: HTTP ${pullRes.status}`)
        }

        const pullData = await pullRes.json()
        const events: any[] = pullData.events || []
        const latestSeq = typeof pullData.latest_seq === 'number' ? pullData.latest_seq : currentSeq

        if (events.length === 0) {
          hasMore = false
          break
        }

        for (const ev of events) {
          if (typeof ev.seq === 'number') {
            currentSeq = Math.max(currentSeq, ev.seq)
          }

          try {
            const decryptedJson = await SyncCrypto.decryptPayload(ev.payload_encrypted, kEnc)
            const eventObj = JSON.parse(decryptedJson)

            // Inject timestamp dari event relay jika ada
            if (ev.created_at && !eventObj.timestamp) {
              eventObj.timestamp = typeof ev.created_at === 'number' ? ev.created_at : new Date(ev.created_at).getTime()
            }

            // Abaikan echo balik event milik perangkat Windows ini sendiri
            if (eventObj.device_id !== deviceId) {
              incomingEvents.push(eventObj)
            }
          } catch (e) {
            console.warn(`Gagal dekripsi payload event seq ${ev.seq}:`, e)
          }
        }

        if (currentSeq >= latestSeq) {
          hasMore = false
        }
      }

      // 4. Terapkan batch event ke store lokal
      if (incomingEvents.length > 0) {
        LocalMusicStore.applySyncBatch(incomingEvents)
      }

      // Simpan cursor seq terakhir yang berhasil ditarik
      localStorage.setItem(this.KEY_LAST_SEQ, currentSeq.toString())

      const updatedFavs = LocalMusicStore.getFavorites()
      const updatedPls = LocalMusicStore.getPlaylists()

      this.status = {
        state: 'SYNCED',
        lastSyncTime: Date.now(),
        syncedFavoritesCount: updatedFavs.length,
        syncedPlaylistsCount: updatedPls.length,
        errorMessage: undefined
      }
    } catch (err: any) {
      console.error('Kesalahan siklus sinkronisasi relay:', err)
      this.status = {
        state: 'ERROR',
        lastSyncTime: this.status.lastSyncTime,
        errorMessage: err.message || 'Koneksi relay gagal'
      }
    } finally {
      this.isSyncing = false
      this.notify()
    }
  }
}
