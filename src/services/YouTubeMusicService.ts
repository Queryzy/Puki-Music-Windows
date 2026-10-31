export interface Track {
  id: string
  title: string
  artist: string
  durationSeconds: number
  thumbnailUrl: string
  streamUrl?: string
  likedAt?: number
}

export interface Album {
  id: string
  title: string
  artist: string
  trackCount: number
  thumbnailUrl: string
  url: string
}

export interface Playlist {
  id: string
  name: string
  trackCount: number
  autoDownload: boolean
  createdAt: number
  tracks: Track[]
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`InnerTube request failed: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Search Tracks via InnerTube WEB_REMIX (Strict Song Filter)
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
          if (flexColumns.length === 0) continue

          // Title parsing (field .text.runs[0] or .title.runs[0])
          const col0 = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer
          const col0Runs = col0?.text?.runs || col0?.title?.runs || []
          const title = col0Runs[0]?.text || ''

          // Video ID parsing
          let videoId = renderer.playlistItemData?.videoId || ''
          if (!videoId) {
            const playBtn = renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
            videoId = playBtn?.playNavigationEndpoint?.watchEndpoint?.videoId || ''
          }
          if (!videoId) {
            videoId = col0Runs[0]?.navigationEndpoint?.watchEndpoint?.videoId || ''
          }

          // Artist parsing
          let artist = ''
          let durSec = 0
          if (flexColumns.length > 1) {
            const col1 = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer
            const col1Runs = col1?.text?.runs || col1?.title?.runs || []
            if (col1Runs.length > 0) {
              artist = col1Runs[0]?.text || ''
            }
            for (const r of col1Runs) {
              const txt = (r.text || '').trim()
              if (txt.includes(':')) {
                const parts = txt.split(':')
                if (parts.length === 2) {
                  durSec = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0)
                } else if (parts.length === 3) {
                  durSec = (parseInt(parts[0], 10) || 0) * 3600 + (parseInt(parts[1], 10) || 0) * 60 + (parseInt(parts[2], 10) || 0)
                }
              }
            }
          }

          // Duration fallback
          if (durSec === 0) {
            const fixedCols = renderer.fixedColumns || []
            const durRuns = fixedCols[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs || []
            const durStr = durRuns[0]?.text || ''
            if (durStr.includes(':')) {
              const parts = durStr.split(':')
              if (parts.length === 2) {
                durSec = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0)
              }
            }
          }

          // Thumbnail parsing
          let thumb = ''
          const thumbs = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
          if (thumbs.length > 0) {
            thumb = thumbs[thumbs.length - 1].url || ''
          }
          if (thumb.includes('=w') && thumb.includes('-h')) {
            thumb = thumb.replace(/=w\d+-h\d+.*/, '=w544-h544-l90-rj')
          }

          if (videoId && title) {
            tracks.push({
              id: videoId,
              title,
              artist: artist || 'YouTube Music',
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
          if (browseId && (browseId.startsWith('UC') || browseId.startsWith('FEmusic_library_privately_owned_artist'))) {
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
            if (thumbUrl.includes('=w') && thumbUrl.includes('-h')) {
              thumbUrl = thumbUrl.replace(/=w\d+-h\d+.*/, '=w544-h544-l90-rj')
            }

            if (itemBrowseId.startsWith('MPREb_') && title) {
              albums.push({
                id: itemBrowseId,
                title,
                artist: artistName || 'Artis Resmi',
                trackCount: 0,
                thumbnailUrl: thumbUrl,
                url: itemBrowseId
              })
            }
          }
          break
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
          const col0 = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer
          const col0Runs = col0?.text?.runs || col0?.title?.runs || []
          const title = col0Runs[0]?.text || ''
          const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId || ''

          let artistName = ''
          let isExcluded = false

          if (flexColumns.length > 1) {
            const col1 = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer
            const subtitleRuns = col1?.text?.runs || col1?.title?.runs || []
            for (const r of subtitleRuns) {
              const text = (r.text || '').toLowerCase().trim()
              if (text === 'single' || text === 'singel' || text === 'buku audio' || text === 'audiobook') {
                isExcluded = true
                break
              }
            }
            if (subtitleRuns.length > 2) {
              artistName = subtitleRuns[2]?.text || subtitleRuns[0]?.text || ''
            } else if (subtitleRuns.length > 0) {
              artistName = subtitleRuns[0]?.text || ''
            }
          }

          if (isExcluded) continue

          let thumbUrl = ''
          const thumbs = renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
          if (thumbs.length > 0) {
            thumbUrl = thumbs[thumbs.length - 1].url || ''
          }
          if (thumbUrl.includes('=w') && thumbUrl.includes('-h')) {
            thumbUrl = thumbUrl.replace(/=w\d+-h\d+.*/, '=w544-h544-l90-rj')
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
   * Get Full Album Tracklist from browseId (MPREb_...)
   */
  static async getAlbumTracks(browseId: string): Promise<Track[]> {
    try {
      const data = await this.request('browse', { browseId })
      const tracks: Track[] = []

      let albumCover = ''
      let defaultArtist = ''

      const twoCol = data?.contents?.twoColumnBrowseResultsRenderer
      const headerTabs = twoCol?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || []
      if (headerTabs.length > 0) {
        const header = headerTabs[0]?.musicResponsiveHeaderRenderer
        const headerThumbs = header?.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || []
        if (headerThumbs.length > 0) {
          albumCover = headerThumbs[headerThumbs.length - 1].url || ''
        }
        const subRuns = header?.subtitle?.runs || []
        for (const run of subRuns) {
          const pageType = run?.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType
          if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
            defaultArtist = run.text || ''
            break
          }
        }
      }

      if (albumCover.includes('=w') && albumCover.includes('-h')) {
        albumCover = albumCover.replace(/=w\d+-h\d+.*/, '=w544-h544-l90-rj')
      }

      const secContents = twoCol?.secondaryContents?.sectionListRenderer?.contents || []
      for (const sec of secContents) {
        const shelf = sec?.musicShelfRenderer
        if (!shelf) continue

        const items = shelf.contents || []
        for (const it of items) {
          const renderer = it?.musicResponsiveListItemRenderer
          if (!renderer) continue

          const flexColumns = renderer.flexColumns || []
          const col0 = flexColumns[0]?.musicResponsiveListItemFlexColumnRenderer
          const col0Runs = col0?.text?.runs || col0?.title?.runs || []
          const trackTitle = col0Runs[0]?.text || ''

          const playBtn = renderer.overlay?.musicItemThumbnailOverlayRenderer?.content?.musicPlayButtonRenderer
          const videoId = playBtn?.playNavigationEndpoint?.watchEndpoint?.videoId || renderer.playlistItemData?.videoId || ''

          let trackArtist = defaultArtist
          if (flexColumns.length > 1) {
            const col1 = flexColumns[1]?.musicResponsiveListItemFlexColumnRenderer
            const col1Runs = col1?.text?.runs || col1?.title?.runs || []
            for (const r of col1Runs) {
              const pageType = r?.navigationEndpoint?.browseEndpoint?.browseEndpointContextSupportedConfigs?.browseEndpointContextMusicConfig?.pageType
              if (pageType === 'MUSIC_PAGE_TYPE_ARTIST') {
                trackArtist = r.text || trackArtist
                break
              }
            }
          }

          let durSec = 0
          const fixCols = renderer.fixedColumns || []
          const durRuns = fixCols[0]?.musicResponsiveListItemFixedColumnRenderer?.text?.runs || []
          const durStr = durRuns[0]?.text || ''
          if (durStr.includes(':')) {
            const parts = durStr.split(':')
            if (parts.length === 2) {
              durSec = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0)
            } else if (parts.length === 3) {
              durSec = (parseInt(parts[0], 10) || 0) * 3600 + (parseInt(parts[1], 10) || 0) * 60 + (parseInt(parts[2], 10) || 0)
            }
          }

          if (videoId && trackTitle) {
            tracks.push({
              id: videoId,
              title: trackTitle,
              artist: trackArtist || 'Artis Resmi',
              durationSeconds: durSec,
              thumbnailUrl: albumCover
            })
          }
        }
      }

      return tracks
    } catch (err) {
      console.error('getAlbumTracks failed:', err)
      return []
    }
  }

  /**
   * Get Home Trending Songs (Quick Picks Indonesia)
   */
  static async getHomeTrending(): Promise<Track[]> {
    return this.searchTracks('Lagu Populer Indonesia')
  }
}
