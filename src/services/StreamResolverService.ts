import { YouTubeMusicService } from './YouTubeMusicService'

export class StreamResolverService {
  private static cache = new Map<string, { url: string; timestamp: number }>()

  private static cleanQuery(str: string): string {
    return str
      .replace(/\(.*?\)/g, '')
      .replace(/\[.*?\]/g, '')
      .replace(/ft\..*/gi, '')
      .replace(/feat\..*/gi, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Cek apakah sebuah ID adalah format valid YouTube Video ID (11 karakter alphanumeric, '-' atau '_')
   */
  private static isYouTubeVideoId(id: string): boolean {
    return /^[a-zA-Z0-9_-]{11}$/.test(id)
  }

  /**
   * Tembak langsung direct stream via ANDROID_VR (pure audio itag 140 m4a) & ANDROID (itag 18)
   * 1:1 implementasi iOS YouTubeStreamResolver & Android NewPipe
   */
  private static async fetchInnerTubeDirect(videoId: string): Promise<string | null> {
    const clients = [
      {
        name: 'ANDROID_VR',
        version: '1.60.19',
        itags: [140, 251, 139] // Prioritas pure audio m4a 128kbps & webm
      },
      {
        name: 'ANDROID',
        version: '21.03.36',
        itags: [140, 18, 251]
      }
    ]

    for (const client of clients) {
      try {
        const payload = {
          context: {
            client: {
              clientName: client.name,
              clientVersion: client.version,
              hl: 'en',
              gl: 'US'
            }
          },
          videoId,
          contentCheckOk: true,
          racyCheckOk: true
        }

        const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: JSON.stringify(payload)
        })

        if (!res.ok) continue
        const data = await res.json()
        const formats = [
          ...(data?.streamingData?.adaptiveFormats || []),
          ...(data?.streamingData?.formats || [])
        ]

        for (const itag of client.itags) {
          const match = formats.find((f: any) => f.itag === itag && f.url)
          if (match?.url) {
            return match.url
          }
        }

        // Jika itag spesifik tidak ketemu, ambil URL format apa pun yang tersedia
        const anyUrl = formats.find((f: any) => f.url && (f.mimeType?.includes('audio') || f.mimeType?.includes('video/mp4')))
        if (anyUrl?.url) {
          return anyUrl.url
        }
      } catch {
        // Coba client berikutnya
      }
    }

    return null
  }

  /**
   * Cocokkan lagu katalog non-YouTube / Deezer ke YouTube Video ID yang tepat
   */
  private static async matchTrackToYouTubeVideoId(
    title: string,
    artist: string,
    targetDuration?: number
  ): Promise<string | null> {
    const cleanTitle = this.cleanQuery(title)
    const cleanArtist = this.cleanQuery(artist)

    const queries = [
      `${cleanArtist} - ${cleanTitle} Topic`,
      `${cleanArtist} ${cleanTitle} Official Audio`,
      `${cleanArtist} ${cleanTitle} Audio`,
      `${cleanArtist} ${cleanTitle}`
    ]

    let bestMatchId: string | null = null
    let bestDiff = 999999

    for (const q of queries) {
      try {
        const results = await YouTubeMusicService.searchTracks(q)
        if (results && results.length > 0) {
          for (const item of results) {
            if (targetDuration && targetDuration > 0 && item.durationSeconds > 0) {
              const diff = Math.abs(item.durationSeconds - targetDuration)
              if (diff < bestDiff && diff <= 15) {
                bestDiff = diff
                bestMatchId = item.id
                if (diff <= 3) return bestMatchId
              }
            } else {
              return item.id
            }
          }
        }
        if (bestMatchId && bestDiff <= 3) return bestMatchId
      } catch {
        // Lanjut ke variasi query berikutnya
      }
    }

    return bestMatchId
  }

  /**
   * Resolve Direct Fast Stream Audio URL
   * Tangguh menangani ID YouTube 11 chars, ID Deezer (dz_...), maupun katalog non-YT
   */
  static async resolveStreamUrl(
    trackId: string,
    title?: string,
    artist?: string,
    targetDuration?: number
  ): Promise<string | null> {
    const cacheKey = `puki_stream_${trackId}`
    const cached = this.cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < 3 * 3600 * 1000) {
      return cached.url
    }

    let effectiveVideoId = trackId
    const isDirectYt = this.isYouTubeVideoId(trackId)

    // 1. Jika ID bukan format YouTube Video ID (misal dz_..., numerik, atau custom sync ID)
    if (!isDirectYt) {
      const mappingKey = `puki_map_yt_${trackId}`
      const cachedYtId = localStorage.getItem(mappingKey)

      if (cachedYtId && this.isYouTubeVideoId(cachedYtId)) {
        effectiveVideoId = cachedYtId
      } else if (title && artist) {
        const matched = await this.matchTrackToYouTubeVideoId(title, artist, targetDuration)
        if (matched) {
          effectiveVideoId = matched
          localStorage.setItem(mappingKey, matched)
        }
      }
    }

    // 2. Tembak stream direct via InnerTube ANDROID_VR & ANDROID
    let streamUrl: string | null = null
    if (this.isYouTubeVideoId(effectiveVideoId)) {
      streamUrl = await this.fetchInnerTubeDirect(effectiveVideoId)
    }

    // 3. Jika stream gagal dan kita punya title + artist, coba pencarian alternatif (auto-recovery)
    if (!streamUrl && title && artist && isDirectYt) {
      const fallbackYtId = await this.matchTrackToYouTubeVideoId(title, artist, targetDuration)
      if (fallbackYtId && fallbackYtId !== effectiveVideoId) {
        streamUrl = await this.fetchInnerTubeDirect(fallbackYtId)
      }
    }

    if (streamUrl) {
      this.cache.set(cacheKey, { url: streamUrl, timestamp: Date.now() })
      return streamUrl
    }

    return null
  }
}
