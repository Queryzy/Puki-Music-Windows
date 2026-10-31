export interface LyricLine {
  time: number // in seconds
  text: string
}

export interface LyricsResult {
  synced: boolean
  lines: LyricLine[]
  raw: string
}

export class LyricsService {
  private static cache: Map<string, LyricsResult | null> = new Map()

  static cleanArtist(artist: string): string {
    return artist
      .replace(/\b(official|youtube|channel|music|video|vevo|records|entertainment)\b/gi, '')
      .replace(/ - Topic/gi, '')
      .replace(/VEVO/gi, '')
      .trim()
  }

  static cleanTitle(title: string): string {
    return title
      .replace(/(\(|\[).*?(official|video|audio|lyrics|mv|lirik|remix|hd|4k).*?(\)|\])/gi, '')
      .trim()
  }

  static parseLRC(lrc: string): LyricLine[] {
    const lines = lrc.split('\n')
    const result: LyricLine[] = []
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/

    for (const rawLine of lines) {
      const match = rawLine.match(timeRegex)
      if (match) {
        const min = parseInt(match[1], 10)
        const sec = parseInt(match[2], 10)
        const ms = parseInt(match[3].padEnd(3, '0').substring(0, 3), 10)
        const time = min * 60 + sec + ms / 1000
        const text = rawLine.replace(timeRegex, '').trim()
        if (text) {
          result.push({ time, text })
        }
      }
    }

    return result.sort((a, b) => a.time - b.time)
  }

  static async fetchLyrics(trackId: string, trackTitle: string, artistName: string, durationSecs?: number): Promise<LyricsResult | null> {
    if (this.cache.has(trackId)) {
      return this.cache.get(trackId) || null
    }

    const cleanTitle = this.cleanTitle(trackTitle)
    const cleanArtist = this.cleanArtist(artistName)

    try {
      // 1. Direct LRCLIB GET endpoint
      const directUrl = new URL('https://lrclib.net/api/get')
      directUrl.searchParams.set('track_name', cleanTitle)
      directUrl.searchParams.set('artist_name', cleanArtist)
      if (durationSecs && durationSecs > 0) {
        directUrl.searchParams.set('duration', Math.round(durationSecs).toString())
      }

      const res = await fetch(directUrl.toString(), {
        headers: { 'User-Agent': 'PukiMusic-Windows-Client/1.0.2' }
      })

      if (res.ok) {
        const data = await res.json()
        if (data.syncedLyrics) {
          const parsed = {
            synced: true,
            lines: this.parseLRC(data.syncedLyrics),
            raw: data.syncedLyrics
          }
          this.cache.set(trackId, parsed)
          return parsed
        }
        if (data.plainLyrics) {
          const lines = data.plainLyrics.split('\n').filter((l: string) => l.trim().length > 0).map((text: string, idx: number) => ({
            time: idx * 4,
            text
          }))
          const parsed = { synced: false, lines, raw: data.plainLyrics }
          this.cache.set(trackId, parsed)
          return parsed
        }
      }

      // 2. Search fallback
      const searchUrl = new URL('https://lrclib.net/api/search')
      searchUrl.searchParams.set('q', `${cleanTitle} ${cleanArtist}`)
      const sRes = await fetch(searchUrl.toString(), {
        headers: { 'User-Agent': 'PukiMusic-Windows-Client/1.0.2' }
      })

      if (sRes.ok) {
        const list = await sRes.json()
        if (Array.isArray(list) && list.length > 0) {
          const item = list[0]
          if (item.syncedLyrics) {
            const parsed = {
              synced: true,
              lines: this.parseLRC(item.syncedLyrics),
              raw: item.syncedLyrics
            }
            this.cache.set(trackId, parsed)
            return parsed
          }
          if (item.plainLyrics) {
            const lines = item.plainLyrics.split('\n').filter((l: string) => l.trim().length > 0).map((text: string, idx: number) => ({
              time: idx * 4,
              text
            }))
            const parsed = { synced: false, lines, raw: item.plainLyrics }
            this.cache.set(trackId, parsed)
            return parsed
          }
        }
      }
    } catch (e) {
      console.warn('Lyrics fetch failed:', e)
    }

    this.cache.set(trackId, null)
    return null
  }
}
