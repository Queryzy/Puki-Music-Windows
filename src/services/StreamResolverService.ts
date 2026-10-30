export interface StreamFormat {
  url: string
  itag: number
  mimeType: string
  bitrate: number
  contentLength?: number
}

const STREAM_CLIENTS = [
  {
    clientName: 'ANDROID_TESTSUITE',
    clientVersion: '1.9',
    osName: 'Android',
    osVersion: '12'
  },
  {
    clientName: 'ANDROID_VR',
    clientVersion: '1.60.19',
    osName: 'Android',
    osVersion: '12'
  },
  {
    clientName: 'WEB_REMIX',
    clientVersion: '1.20240401.01.00',
    hl: 'id',
    gl: 'ID'
  }
]

export class StreamResolverService {
  /**
   * Resolve Fast Stream URL (Priority: itag 18 MP4/AAC ~7MB/s, fallback: itag 251 WebM/Opus)
   */
  static async resolveStreamUrl(videoId: string): Promise<string | null> {
    for (const client of STREAM_CLIENTS) {
      try {
        const payload = {
          context: { client },
          videoId,
          contentCheckOk: true,
          racyCheckOk: true
        }

        const res = await fetch('https://music.youtube.com/youtubei/v1/player', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          body: JSON.stringify(payload)
        })

        if (!res.ok) continue
        const data = await res.json()
        const streamingData = data?.streamingData
        if (!streamingData) continue

        const formats: any[] = [
          ...(streamingData.formats || []),
          ...(streamingData.adaptiveFormats || [])
        ]

        // 1. Coba itag 18 (MP4/AAC, unthrottled fast-stream)
        const itag18 = formats.find(f => f.itag === 18 && f.url)
        if (itag18?.url) {
          return itag18.url
        }

        // 2. Coba audio-only formats (itag 140, 251, dll)
        const audioFormat = formats.find(f => (f.itag === 140 || f.itag === 251) && f.url)
        if (audioFormat?.url) {
          return audioFormat.url
        }

        // 3. Ambil format apapun yang memiliki direct audio URL
        const fallback = formats.find(f => f.url && (f.mimeType || '').startsWith('audio/'))
        if (fallback?.url) {
          return fallback.url
        }
      } catch (err) {
        console.warn(`Client ${client.clientName} failed to resolve stream:`, err)
      }
    }

    return null
  }
}
