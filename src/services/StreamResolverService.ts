export class StreamResolverService {
  private static cache = new Map<string, { url: string; timestamp: number }>()

  /**
   * Resolve Direct Fast Stream Audio URL
   * Prioritas:
   * 1. Direct Web-Embed Audio / Video (itag 18 / 140 / 251)
   * 2. Piped / Invidious Multi-Instance Fallback (No-Cipher direct audio)
   */
  static async resolveStreamUrl(videoId: string): Promise<string | null> {
    const cached = this.cache.get(videoId)
    if (cached && Date.now() - cached.timestamp < 3 * 3600 * 1000) {
      return cached.url
    }

    // 1. Coba multi-instance API public
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

        const res = await fetch(`${inst}/streams/${videoId}`, {
          signal: controller.signal
        })
        clearTimeout(timeoutId)

        if (!res.ok) continue
        const data = await res.json()
        const audioStreams = data.audioStreams || []
        if (audioStreams.length > 0) {
          // Cari format opus/m4a kualitas terbaik
          const best = audioStreams.find((s: any) => s.mimeType?.includes('audio/mp4') || s.mimeType?.includes('audio/webm')) || audioStreams[0]
          if (best?.url) {
            this.cache.set(videoId, { url: best.url, timestamp: Date.now() })
            return best.url
          }
        }
      } catch {
        // Fallback ke instance berikutnya
      }
    }

    // 2. Fallback YouTube InnerTube Mobile Client Direct
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
        videoId,
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
          this.cache.set(videoId, { url: direct.url, timestamp: Date.now() })
          return direct.url
        }
      }
    } catch {
      // Ignore
    }

    return null
  }
}
