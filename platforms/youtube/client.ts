// YouTube Platform client

const YOUTUBE_API = 'https://www.googleapis.com/youtube/v3'

export class YouTubeClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * Upload a video
   */
  async uploadVideo(
    videoData: Buffer,
    title: string,
    description: string,
    tags?: string[],
    privacy?: 'public' | 'unlisted' | 'private'
  ): Promise<{ videoId: string; url: string }> {
    try {
      const metadata = {
        snippet: {
          title,
          description,
          tags: tags || [],
          categoryId: '22', // default to People & Blogs
        },
        status: {
          privacyStatus: privacy || 'public',
          selfDeclaredMadeForKids: false,
        },
      }

      const formData = new FormData()
      formData.append('metadata', JSON.stringify(metadata))
      formData.append('video', new Blob([videoData], { type: 'video/mp4' }))

      const response = await fetch(
        `${YOUTUBE_API}/videos?part=snippet,status&uploadType=multipart&access_token=${this.accessToken}`,
        {
          method: 'POST',
          body: formData,
        }
      )

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.statusText}`)
      }

      const data = (await response.json()) as any
      const videoId = data.id

      return {
        videoId,
        url: `https://youtube.com/watch?v=${videoId}`,
      }
    } catch (error) {
      throw new Error(
        `Failed to upload YouTube video: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get channel videos
   */
  async getVideos(limit = 10): Promise<any[]> {
    try {
      // First get channel ID
      const channelResponse = await fetch(
        `${YOUTUBE_API}/channels?part=contentDetails&mine=true&access_token=${this.accessToken}`
      )

      if (!channelResponse.ok) {
        throw new Error(`YouTube API error: ${channelResponse.statusText}`)
      }

      const channelData = (await channelResponse.json()) as any
      const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads

      if (!uploadsPlaylistId) {
        throw new Error('No uploads playlist found')
      }

      // Get videos from uploads playlist
      const videosResponse = await fetch(
        `${YOUTUBE_API}/playlistItems?part=snippet&playlistId=${uploadsPlaylistId}&maxResults=${limit}&access_token=${this.accessToken}`
      )

      if (!videosResponse.ok) {
        throw new Error(`YouTube API error: ${videosResponse.statusText}`)
      }

      const videosData = (await videosResponse.json()) as any
      return videosData.items || []
    } catch (error) {
      throw new Error(
        `Failed to fetch videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get video statistics
   */
  async getVideoStats(videoId: string): Promise<any> {
    try {
      const response = await fetch(
        `${YOUTUBE_API}/videos?part=statistics,contentDetails&id=${videoId}&access_token=${this.accessToken}`
      )

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.statusText}`)
      }

      const data = (await response.json()) as any
      return data.items?.[0] || null
    } catch (error) {
      throw new Error(
        `Failed to fetch video stats: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Update video details
   */
  async updateVideo(videoId: string, updates: { title?: string; description?: string; tags?: string[] }): Promise<boolean> {
    try {
      const getResponse = await fetch(
        `${YOUTUBE_API}/videos?part=snippet&id=${videoId}&access_token=${this.accessToken}`
      )

      if (!getResponse.ok) {
        throw new Error(`YouTube API error: ${getResponse.statusText}`)
      }

      const videoData = (await getResponse.json()) as any
      const video = videoData.items[0]

      // Update fields
      if (updates.title) video.snippet.title = updates.title
      if (updates.description) video.snippet.description = updates.description
      if (updates.tags) video.snippet.tags = updates.tags

      const updateResponse = await fetch(
        `${YOUTUBE_API}/videos?part=snippet&access_token=${this.accessToken}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(video),
        }
      )

      return updateResponse.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Delete a video
   */
  async deleteVideo(videoId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${YOUTUBE_API}/videos?id=${videoId}&access_token=${this.accessToken}`,
        { method: 'DELETE' }
      )

      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Get channel info
   */
  async getChannelInfo(): Promise<{ channelId: string; title: string; avatar: string; subscriberCount?: string }> {
    try {
      const response = await fetch(
        `${YOUTUBE_API}/channels?part=snippet,statistics&mine=true&access_token=${this.accessToken}`
      )

      if (!response.ok) {
        throw new Error(`YouTube API error: ${response.statusText}`)
      }

      const data = (await response.json()) as any
      const channel = data.items[0]

      return {
        channelId: channel.id,
        title: channel.snippet.title,
        avatar: channel.snippet.thumbnails.high.url,
        subscriberCount: channel.statistics.subscriberCount,
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch channel info: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Verify access token
   */
  async verifyToken(): Promise<boolean> {
    try {
      const response = await fetch(
        `${YOUTUBE_API}/channels?part=snippet&mine=true&access_token=${this.accessToken}`
      )
      return response.ok
    } catch {
      return false
    }
  }
}

/**
 * Generate YouTube OAuth URL
 */
export function generateYouTubeAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
    access_type: 'offline',
    prompt: 'consent',
    state: crypto.randomUUID(),
  })

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}
