export interface Track {
  id: string
  title: string
  artist: string
  durationSeconds: number
  thumbnailUrl: string
  streamUrl?: string
}

export interface Album {
  id: string
  title: string
  artist: string
  trackCount: number
  thumbnailUrl: string
  url: string
}

export interface SearchResult {
  tracks: Track[]
  albums: Album[]
}

const INNERTUBE_CLIENT = {
  clientName: 'WEB_REMIX',
  clientVersion: '1.20240401.01.00',
  hl: 'id',
  gl: 'ID'
}

const BASE_URL = 'https://music.youtube.com/youtubei/v1'

export class YouTubeMusicService {
  private static async request(endpoint: string, body: Record<string, any>): Promise<any> {
    const payload = {
      context: {
        client: INNERTUBE_CLIENT
      },
      ...body
    }

    const response = await fetch(`${BASE_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`InnerTube request failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Search Tracks via InnerTube WEB_REMIX
   */
  static async searchTracks(query: string): Promise<Track[]> {
    try {
      const data = await this.request('search', {
        query,
        params: 'EgWKAQIIAWoMEAMQBBAJEA4QChAF' // Song filter
      })

      const tracks: Track[] = []
      const contents = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []

      for (const section of contents) {
        const items = section?.musicShelfRenderer?.contents || []
        for (const item of items) {
          const renderer = item?.musicResponsiveListItemRenderer
          if (!renderer) continue

          const flexColumns = renderer.flexColumns || []
          const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.title?.runs?.[0]?.text || ''
          const videoId = renderer.playlistItemData?.videoId || ''
          
          let artist = ''
          let durSec = 0
          
          const col1Runs = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.title?.runs || []
          if (col1Runs.length > 0) {
            artist = col1Runs[0]?.text || ''
          }

          for (const r of col1Runs) {
            const txt = (r.text || '').trim()
            if (txt.includes(':')) {
              const parts = txt.split(':')
              if (parts.length === 2) {
                durSec = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0)
              }
            }
          }

          let thumb = ''
          const thumbs = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
          if (thumbs.length > 0) {
            thumb = thumbs[thumbs.length - 1].url || ''
          }

          if (videoId && title) {
            tracks.push({
              id: videoId,
              title,
              artist,
              durationSeconds: durSec,
              thumbnailUrl: thumb
            })
          }
        }
      }

      return tracks
    } catch (err) {
      console.error('searchTracks failed:', err)
      return []
    }
  }

  /**
   * Two-Tier Search Albums:
   * Tier 1: Artist Discography First from official verified channel
   * Tier 2: Global Strict Album Search fallback
   */
  static async searchAlbums(query: string): Promise<Album[]> {
    try {
      // Step 1: Detect Artist Channel
      const generalData = await this.request('search', { query })
      let artistBrowseId = ''

      const generalContents = generalData?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []
      for (const section of generalContents) {
        const shelf = section?.musicCardShelfRenderer
        if (shelf) {
          const nav = shelf.title?.runs?.[0]?.navigationEndpoint
          const browseId = nav?.browseEndpoint?.browseId
          if (browseId && browseId.startsWith('UC')) {
            artistBrowseId = browseId
            break
          }
        }
      }

      // Step 2: Tier 1 - Fetch directly from Artist Channel Discography
      if (artistBrowseId) {
        const channelAlbums = await this.fetchAlbumsFromArtistChannel(artistBrowseId)
        if (channelAlbums.length > 0) {
          return channelAlbums
        }
      }

      // Step 3: Tier 2 - Fallback to Global Strict Album Search
      return await this.searchStrictAlbums(query)
    } catch (err) {
      console.error('searchAlbums failed:', err)
      return []
    }
  }

  private static async fetchAlbumsFromArtistChannel(browseId: string): Promise<Album[]> {
    try {
      const data = await this.request('browse', { browseId })
      const albums: Album[] = []
      const sections = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []

      for (const sec of sections) {
        const carousel = sec?.musicCarouselShelfRenderer
        const headerTitle = carousel?.header?.musicCarouselShelfBasicHeaderRenderer?.title?.runs?.[0]?.text || ''
        
        // Strict filter: Hanya shelf "Album", tolak "Single", "EP", "Singel"
        if (headerTitle.toLowerCase().includes('album') && !headerTitle.toLowerCase().includes('singel')) {
          const contents = carousel.contents || []
          for (const item of contents) {
            const renderer = item?.musicTwoRowItemRenderer
            if (!renderer) continue

            const title = renderer.title?.runs?.[0]?.text || ''
            const nav = renderer.navigationEndpoint?.browseEndpoint
            const itemBrowseId = nav?.browseId || ''
            
            let artistName = ''
            const subtitleRuns = renderer.subtitle?.runs || []
            if (subtitleRuns.length > 0) {
              artistName = subtitleRuns[0]?.text || ''
            }

            let thumbUrl = ''
            const thumbs = renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
            if (thumbs.length > 0) {
              thumbUrl = thumbs[thumbs.length - 1].url || ''
            }

            if (itemBrowseId.startsWith('MPREb_') && title) {
              albums.push({
                id: itemBrowseId,
                title,
                artist: artistName,
                trackCount: 0,
                thumbnailUrl: thumbUrl,
                url: itemBrowseId
              })
            }
          }
        }
      }

      return albums
    } catch {
      return []
    }
  }

  private static async searchStrictAlbums(query: string): Promise<Album[]> {
    try {
      const data = await this.request('search', {
        query,
        params: 'EgWKAQIYAWoMEAMQBBAJEA4QChAF' // Album filter
      })

      const albums: Album[] = []
      const contents = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []

      for (const section of contents) {
        const items = section?.musicShelfRenderer?.contents || []
        for (const item of items) {
          const renderer = item?.musicResponsiveListItemRenderer
          if (!renderer) continue

          const flexColumns = renderer.flexColumns || []
          const title = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.title?.runs?.[0]?.text || ''
          const nav = renderer.navigationEndpoint?.browseEndpoint
          const browseId = nav?.browseId || ''

          let artistName = ''
          let isExcluded = false

          const col1Runs = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.title?.runs || []
          for (const r of col1Runs) {
            const txt = (r.text || '').toLowerCase()
            if (txt.includes('single') || txt.includes('singel') || txt.includes('audiobook') || txt.includes('buku audio')) {
              isExcluded = true
              break
            }
            if (artistName === '' && !txt.includes('•') && !txt.includes('album') && !txt.includes('ep')) {
              artistName = r.text || ''
            }
          }

          if (isExcluded) continue

          let thumbUrl = ''
          const thumbs = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
          if (thumbs.length > 0) {
            thumbUrl = thumbs[thumbs.length - 1].url || ''
          }

          if (browseId.startsWith('MPREb_') && title) {
            albums.push({
              id: browseId,
              title,
              artist: artistName,
              trackCount: 0,
              thumbnailUrl: thumbUrl,
              url: browseId
            })
          }
        }
      }

      return albums
    } catch {
      return []
    }
  }

  /**
   * Get Album Tracklist from MPREb_...
   */
  static async getAlbumTracks(browseId: string): Promise<Track[]> {
    try {
      const data = await this.request('browse', { browseId })
      const tracks: Track[] = []

      let albumCover = ''
      const header = data?.header?.musicDetailHeaderRenderer
      const headerThumbs = header?.thumbnail?.croppedMusicThumbnailRenderer?.thumbnail?.thumbnails || []
      if (headerThumbs.length > 0) {
        albumCover = headerThumbs[headerThumbs.length - 1].url || ''
      }

      const sections = data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []
      for (const sec of sections) {
        const shelf = sec?.musicShelfRenderer
        if (!shelf) continue

        const items = shelf.contents || []
        for (const it of items) {
          const renderer = it?.musicResponsiveListItemRenderer
          if (!renderer) continue

          const flexColumns = renderer.flexColumns || []
          const trackTitle = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer?.title?.runs?.[0]?.text || ''
          const videoId = renderer.playlistItemData?.videoId || ''

          let trackArtist = ''
          let durSec = 0
          const col1Runs = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer?.title?.runs || []
          if (col1Runs.length > 0) {
            trackArtist = col1Runs[0]?.text || ''
          }

          for (const r of col1Runs) {
            const txt = (r.text || '').trim()
            if (txt.includes(':')) {
              const parts = txt.split(':')
              if (parts.length === 2) {
                durSec = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0)
              }
            }
          }

          if (videoId && trackTitle) {
            tracks.push({
              id: videoId,
              title: trackTitle,
              artist: trackArtist,
              durationSeconds: durSec,
              thumbnailUrl: albumCover
            })
          }
        }
      }

      return tracks
    } catch {
      return []
    }
  }
}
