import { RomajiHelper } from './RomajiHelper'

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

  /**
   * Mengambil offset sync lirik per trackId dari localStorage
   */
  static getOffset(trackId: string): number {
    try {
      const val = localStorage.getItem(`puki_lyric_offset_${trackId}`)
      return val ? parseFloat(val) || 0 : 0
    } catch {
      return 0
    }
  }

  /**
   * Menyimpan offset sync lirik per trackId ke localStorage
   */
  static setOffset(trackId: string, offset: number) {
    try {
      if (Math.abs(offset) < 0.05) {
        localStorage.removeItem(`puki_lyric_offset_${trackId}`)
      } else {
        localStorage.setItem(`puki_lyric_offset_${trackId}`, offset.toFixed(1))
      }
    } catch {}
  }

  /**
   * Sanitasi judul lagu agresif 1:1 identik dengan Android LyricsService.kt & iOS
   */
  static cleanTitle(title: string): string {
    return title
      .replace(/\b(official|music|video|audio|remastered|remaster|hd|4k|hq|visualizer|lyric video|lyrics|explicit|clean|original soundtrack|ost)\b/gi, '')
      .replace(/\s*-\s*(from|live|acoustic|instrumental|theme).*/gi, '')
      .replace(/\(.*?\)/gi, '')
      .replace(/\[.*?\]/gi, '')
      .replace(/ft\..*/gi, '')
      .replace(/feat\..*/gi, '')
      .trim()
      .replace(/\s+/g, ' ')
  }

  /**
   * Sanitasi nama artis agresif 1:1 identik dengan Android LyricsService.kt & iOS
   */
  static cleanArtist(artist: string): string {
    return artist
      .replace(/\b(official|youtube|channel|music|video|vevo|records|entertainment)\b/gi, '')
      .replace(/ - Topic/gi, '')
      .replace(/VEVO/gi, '')
      .trim()
      .replace(/\s+/g, ' ')
  }

  static parseLRC(lrc: string): LyricLine[] {
    const lines = lrc.split('\n')
    const result: LyricLine[] = []
    const timeRegex = /\[(\d{2}):(\d{2}(?:\.\d+)?)\]/

    for (const rawLine of lines) {
      const match = rawLine.match(timeRegex)
      if (match) {
        const min = parseInt(match[1], 10)
        const secDouble = parseFloat(match[2]) || 0
        const time = min * 60 + secDouble
        const text = rawLine.replace(timeRegex, '').trim()
        if (text) {
          result.push({ time, text })
        }
      }
    }

    return result.sort((a, b) => a.time - b.time)
  }

  static clearCache(trackId?: string) {
    if (trackId) {
      this.cache.delete(trackId)
    } else {
      this.cache.clear()
    }
  }

  /**
   * Standard multi-tier lyrics fetching matching Android & iOS
   */
  static async fetchLyrics(
    trackId: string,
    trackTitle: string,
    artistName: string,
    durationSecs?: number,
    forceRefresh: boolean = false
  ): Promise<LyricsResult | null> {
    if (!forceRefresh && this.cache.has(trackId)) {
      return this.cache.get(trackId) || null
    }

    const cleanTitle = this.cleanTitle(trackTitle)
    const cleanArtist = this.cleanArtist(artistName)
    const userAgent = 'PukiMusic/1.0 (https://github.com/nukeop/nuclear)'

    try {
      // 1. Direct GET query
      if (cleanTitle && cleanArtist) {
        const directUrl = new URL('https://lrclib.net/api/get')
        directUrl.searchParams.set('track_name', cleanTitle)
        directUrl.searchParams.set('artist_name', cleanArtist)
        if (durationSecs && durationSecs > 0) {
          directUrl.searchParams.set('duration', Math.round(durationSecs).toString())
        }

        const res = await fetch(directUrl.toString(), {
          headers: { 'User-Agent': userAgent }
        })

        if (res.ok) {
          const data = await res.json()
          if (data?.syncedLyrics) {
            const parsed = {
              synced: true,
              lines: this.parseLRC(data.syncedLyrics),
              raw: data.syncedLyrics
            }
            this.cache.set(trackId, parsed)
            return parsed
          }
          if (data?.plainLyrics) {
            const lines = data.plainLyrics
              .split('\n')
              .filter((l: string) => l.trim().length > 0)
              .map((text: string, idx: number) => ({ time: idx * 4, text }))
            const parsed = { synced: false, lines, raw: data.plainLyrics }
            this.cache.set(trackId, parsed)
            return parsed
          }
        }
      }

      // 2. Multi-tier search queries (Clean -> Title-only -> Raw -> Romaji)
      const searchQueries: string[] = []
      if (cleanArtist && cleanTitle) searchQueries.push(`${cleanArtist} ${cleanTitle}`)
      if (cleanTitle) searchQueries.push(cleanTitle)
      if (artistName && trackTitle) searchQueries.push(`${artistName} ${trackTitle}`)
      if (trackTitle) searchQueries.push(trackTitle)

      // CJK Romaji query support
      if (RomajiHelper.containsCJK(cleanTitle)) {
        const romajiTitle = RomajiHelper.toRomaji(cleanTitle)
        if (romajiTitle && romajiTitle !== cleanTitle) {
          if (cleanArtist) searchQueries.push(`${cleanArtist} ${romajiTitle}`)
          searchQueries.push(romajiTitle)
        }
      }

      const distinctQueries = Array.from(new Set(searchQueries.filter(q => q && q.trim().length > 0)))

      for (const q of distinctQueries) {
        const searchUrl = new URL('https://lrclib.net/api/search')
        searchUrl.searchParams.set('q', q)

        const sRes = await fetch(searchUrl.toString(), {
          headers: { 'User-Agent': userAgent }
        })

        if (!sRes.ok) continue
        const list = await sRes.json()
        if (!Array.isArray(list) || list.length === 0) continue

        // Candidate scoring matching Android & iOS tolerance
        let bestCandidate: any = null
        let bestCandidateHasSync = false

        for (const item of list) {
          const itemDur = typeof item.duration === 'number' ? item.duration : 0
          const hasSync = !!item.syncedLyrics && item.syncedLyrics.trim().length > 0
          const hasPlain = !!item.plainLyrics && item.plainLyrics.trim().length > 0
          if (!hasSync && !hasPlain) continue

          const diff = (durationSecs && durationSecs > 0 && itemDur > 0)
            ? Math.abs(itemDur - durationSecs)
            : 0

          // Strict tolerance <= 5s if track duration is known
          if (durationSecs && durationSecs > 0 && itemDur > 0 && diff > 5.0) {
            continue
          }

          if (!bestCandidate) {
            bestCandidate = item
            bestCandidateHasSync = hasSync
          } else if (!bestCandidateHasSync && hasSync) {
            bestCandidate = item
            bestCandidateHasSync = true
          }
        }

        if (bestCandidate) {
          if (bestCandidate.syncedLyrics) {
            const parsed = {
              synced: true,
              lines: this.parseLRC(bestCandidate.syncedLyrics),
              raw: bestCandidate.syncedLyrics
            }
            this.cache.set(trackId, parsed)
            return parsed
          }
          if (bestCandidate.plainLyrics) {
            const lines = bestCandidate.plainLyrics
              .split('\n')
              .filter((l: string) => l.trim().length > 0)
              .map((text: string, idx: number) => ({ time: idx * 4, text }))
            const parsed = { synced: false, lines, raw: bestCandidate.plainLyrics }
            this.cache.set(trackId, parsed)
            return parsed
          }
        }
      }

      this.cache.set(trackId, null)
      return null
    } catch (err) {
      console.error('fetchLyrics error:', err)
      this.cache.set(trackId, null)
      return null
    }
  }
}
