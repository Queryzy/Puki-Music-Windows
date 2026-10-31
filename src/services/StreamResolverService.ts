import { YouTubeMusicService } from './YouTubeMusicService'

export class StreamResolverService {
  private static cache = new Map<string, { url: string; timestamp: number }>()

  /**
   * Resolve Direct Fast Stream Audio URL
   * Mendukung ID YouTube standar dan ID OmniSource Deezer (`dz_...`)
   */
  static async resolveStreamUrl(
    trackId: string,
    title?: string,
    artist?: string,
    targetDuration?: number
  ): Promise<string | null> {
    let effectiveVideoId = trackId

    // 1. OmniSource Deezer Resolver (dz_...)
    if (trackId.startsWith('dz_')) {
      const deezerKey = `puki_dz_yt_${trackId}`
      const cachedYtId = localStorage.getItem(deezerKey)

      if (cachedYtId) {
        effectiveVideoId = cachedYtId
      } else if (title && artist) {
        try {
          const queries = [
            `${artist} - ${title} Topic`,
            `${artist} ${title} Official Audio`,
            `${artist} ${title}`
          ]

          let bestMatchId: string | null = null
          let bestDiff = 999999

          for (const q of queries) {
            const results = await YouTubeMusicService.searchTracks(q)
            if (results && results.length > 0) {
              for (const item of results) {
                if (targetDuration && targetDuration > 0) {
                  const diff = Math.abs(item.durationSeconds - targetDuration)
                  if (diff < bestDiff && diff <= 10) {
                    bestDiff = diff
                    bestMatchId = item.id
                    if (diff <= 3) break
                  }
                } else {
                  bestMatchId = item.id
                  break
                }
              }
            }
            if (bestMatchId && bestDiff <= 3) break
          }

          if (bestMatchId) {
            effectiveVideoId = bestMatchId
            localStorage.setItem(deezerKey, bestMatchId)
          } else {
            console.warn(`Tidak ditemukan padanan YouTube untuk lagu Deezer: ${artist} - ${title}`)
          }
        } catch (e) {
          console.warn('Gagal mencocokkan Deezer track ke YouTube:', e)
        }
      }
    }

    const cached = this.cache.get(effectiveVideoId)
    if (cached && Date.now() - cached.timestamp < 3 * 3600 * 1000) {
      return cached.url
    }

    // 2. Coba multi-instance API public Piped
    const instances = [
      'https://pipedapi.kavin.rocks',
      'https://api.piped.privacydev.net',
      'https://piped-api.lunar.icu',
      'https://api-piped.mha.fi'
    ]

    for (const inst of instances) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 4000)

        const res = await fetch(`${inst}/streams/${effectiveVideoId}`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (!res.ok) continue
        const data = await res.json()
        const audioStreams = data.audioStreams || []
        if (audioStreams.length > 0) {
          const best = audioStreams.find((s: any) => s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('audio/webm')) || audioStreams[0]
          if (best?.url) {
            this.cache.set(effectiveVideoId, { url: best.url, timestamp: Date.now() })
            return best.url
          }
        }
      } catch {
        // Fallback ke instance berikutnya
      }
    }

    // 3. Fallback YouTube InnerTube Mobile Client Direct
    try {
      const payload = {
        context: {
          client: {
            clientName: 'ANDROID',
            clientVersion: '21.03.36',
            androidSdkVersion: 34,
            hl: 'en',
            gl: 'US'
          }
        },
        videoId: effectiveVideoId,
        contentCheckOk: true,
        racyCheckOk: true
      }

      const res = await fetch('https://www.youtube.com/youtubei/v1/player', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify(payload)
      })

      if (res.ok) {
        const data = await res.json()
        const formats = [
          ...(data?.streamingData?.formats || []),
          ...(data?.streamingData?.adaptiveFormats || [])
        ]

        const direct = formats.find((f: any) => f.url && (f.itag === 140 || f.itag === 18 || f.itag === 251))
        if (direct?.url) {
          this.cache.set(effectiveVideoId, { url: direct.url, timestamp: Date.now() })
          return direct.url
        }
      }
    } catch {
      // Ignore
    }

    return null
  }
}
