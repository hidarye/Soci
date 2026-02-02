// TikTok Platform client

const TIKTOK_API = 'https://open.tiktokapis.com/v1'

export class TikTokClient {
  private accessToken: string
  private clientKey: string

  constructor(accessToken: string, clientKey: string) {
    this.accessToken = accessToken
    this.clientKey = clientKey
  }

  /**
   * Create a video post (upload)
   */
  async uploadVideo(
    videoData: Buffer,
    caption: string,
    privacy?: 'PUBLIC_TO_EVERYONE' | 'SELF_ONLY' | 'FRIEND_ONLY'
  ): Promise<{ videoId: string; status: string }> {
    try {
      // Initialize upload
      const initResponse = await fetch(`${TIKTOK_API}/video/upload/init/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_key: this.clientKey,
          upload_type: 'UPLOAD_BY_FILE',
          video: {
            caption,
            privacy_level: privacy || 'PUBLIC_TO_EVERYONE',
            video_format: 'mp4',
          },
        }),
      })

      if (!initResponse.ok) {
        throw new Error(`TikTok API error: ${initResponse.statusText}`)
      }

      const initData = (await initResponse.json()) as any
      const uploadToken = initData.data.upload_token
      const uploadUrl = initData.data.upload_url

      // Upload the video file
      const uploadFormData = new FormData()
      const videoBlob = new Blob([videoData], { type: 'video/mp4' })
      uploadFormData.append('file', videoBlob)

      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        throw new Error(`TikTok upload error: ${uploadResponse.statusText}`)
      }

      // Complete upload
      const completeResponse = await fetch(`${TIKTOK_API}/video/upload/complete/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_key: this.clientKey,
          upload_token: uploadToken,
        }),
      })

      if (!completeResponse.ok) {
        throw new Error(`TikTok API error: ${completeResponse.statusText}`)
      }

      const completeData = (await completeResponse.json()) as any
      return {
        videoId: completeData.data.video_id,
        status: completeData.data.status,
      }
    } catch (error) {
      throw new Error(
        `Failed to upload TikTok video: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get user videos
   */
  async getUserVideos(limit = 10): Promise<any[]> {
    try {
      const response = await fetch(
        `${TIKTOK_API}/user/info/videos?max_count=${limit}&fields=id,create_time,text,like_count,comment_count,share_count,view_count`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`TikTok API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { data: { videos: any[] } }
      return data.data.videos || []
    } catch (error) {
      throw new Error(
        `Failed to fetch TikTok videos: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(): Promise<{ id: string; username: string; avatar: string }> {
    try {
      const response = await fetch(`${TIKTOK_API}/user/info/?fields=open_id,union_id,avatar,username`, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`TikTok API error: ${response.statusText}`)
      }

      const data = (await response.json()) as any
      return {
        id: data.data.open_id,
        username: data.data.username,
        avatar: data.data.avatar,
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch user info: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Delete a video
   */
  async deleteVideo(videoId: string): Promise<boolean> {
    try {
      const response = await fetch(`${TIKTOK_API}/video/delete/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: videoId,
        }),
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Verify access token
   */
  async verifyToken(): Promise<boolean> {
    try {
      const response = await fetch(`${TIKTOK_API}/oauth/token/inspect/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
      })

      return response.ok
    } catch {
      return false
    }
  }
}

/**
 * Generate TikTok OAuth URL
 */
export function generateTikTokAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_key: clientId,
    response_type: 'code',
    scope: 'user.info.basic,video.publish',
    redirect_uri: redirectUri,
    state: crypto.randomUUID(),
  })

  return `https://www.tiktok.com/v1/oauth/authorize?${params.toString()}`
}
