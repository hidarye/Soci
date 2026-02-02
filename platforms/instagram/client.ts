// Instagram API client
// Note: Instagram uses the Facebook Graph API under the hood

import { FacebookClient } from '../facebook/client'

const INSTAGRAM_API_VERSION = 'v19.0'
const INSTAGRAM_GRAPH_API = `https://graph.instagram.com/${INSTAGRAM_API_VERSION}`

export class InstagramClient {
  private accessToken: string
  private igUserId: string

  constructor(accessToken: string, igUserId: string) {
    this.accessToken = accessToken
    this.igUserId = igUserId
  }

  /**
   * Publish a carousel post (multiple images/videos)
   */
  async publishCarousel(mediaIds: string[], caption?: string): Promise<{ id: string; url: string }> {
    try {
      const response = await fetch(
        `${INSTAGRAM_GRAPH_API}/${this.igUserId}/media?access_token=${this.accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'CAROUSEL',
            children: mediaIds.map(id => ({ media_id: id })),
            caption,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { id: string }
      
      return {
        id: data.id,
        url: `https://instagram.com/p/${data.id}`,
      }
    } catch (error) {
      throw new Error(
        `Failed to publish carousel: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Publish a single image
   */
  async publishImage(imageUrl: string, caption?: string): Promise<{ id: string }> {
    try {
      const response = await fetch(
        `${INSTAGRAM_GRAPH_API}/${this.igUserId}/media?access_token=${this.accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: imageUrl,
            caption,
            media_type: 'IMAGE',
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { id: string }
      return { id: data.id }
    } catch (error) {
      throw new Error(
        `Failed to publish image: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Publish a video
   */
  async publishVideo(videoUrl: string, thumbnailUrl?: string, caption?: string): Promise<{ id: string }> {
    try {
      const response = await fetch(
        `${INSTAGRAM_GRAPH_API}/${this.igUserId}/media?access_token=${this.accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            video_url: videoUrl,
            thumbnail_url: thumbnailUrl,
            caption,
            media_type: 'VIDEO',
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { id: string }
      return { id: data.id }
    } catch (error) {
      throw new Error(
        `Failed to publish video: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get recent media
   */
  async getMedia(limit = 10): Promise<any[]> {
    try {
      const response = await fetch(
        `${INSTAGRAM_GRAPH_API}/${this.igUserId}/media?fields=id,caption,media_type,timestamp,like_count,comments_count&limit=${limit}&access_token=${this.accessToken}`
      )

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { data: any[] }
      return data.data
    } catch (error) {
      throw new Error(
        `Failed to fetch media: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get insights data
   */
  async getInsights(metric: string): Promise<any> {
    try {
      const response = await fetch(
        `${INSTAGRAM_GRAPH_API}/${this.igUserId}/insights?metric=${metric}&access_token=${this.accessToken}`
      )

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      throw new Error(
        `Failed to fetch insights: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Create a story
   */
  async publishStory(mediaUrl: string, mediaType: 'image' | 'video'): Promise<{ id: string }> {
    try {
      const response = await fetch(
        `${INSTAGRAM_GRAPH_API}/${this.igUserId}/media?access_token=${this.accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: mediaType === 'image' ? mediaUrl : undefined,
            video_url: mediaType === 'video' ? mediaUrl : undefined,
            media_type: mediaType === 'image' ? 'STORIES' : 'STORY',
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Instagram API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { id: string }
      return { id: data.id }
    } catch (error) {
      throw new Error(
        `Failed to publish story: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Publish media (handles container creation and publishing)
   */
  async publishMedia(mediaUrl: string, caption?: string, mediaType: 'IMAGE' | 'VIDEO' = 'IMAGE'): Promise<{ id: string }> {
    try {
      // First create media container
      const containerResponse = await fetch(
        `${INSTAGRAM_GRAPH_API}/${this.igUserId}/media?access_token=${this.accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: mediaType === 'IMAGE' ? mediaUrl : undefined,
            video_url: mediaType === 'VIDEO' ? mediaUrl : undefined,
            caption,
            media_type: mediaType,
          }),
        }
      )

      if (!containerResponse.ok) {
        throw new Error(`Instagram API error: ${containerResponse.statusText}`)
      }

      const container = (await containerResponse.json()) as { id: string }

      // Then publish the media
      const publishResponse = await fetch(
        `${INSTAGRAM_GRAPH_API}/${this.igUserId}/media_publish?access_token=${this.accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: container.id,
          }),
        }
      )

      if (!publishResponse.ok) {
        throw new Error(`Instagram API error: ${publishResponse.statusText}`)
      }

      const published = (await publishResponse.json()) as { id: string }
      return { id: published.id }
    } catch (error) {
      throw new Error(
        `Failed to publish media: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Verify token is valid
   */
  async verifyToken(): Promise<boolean> {
    try {
      const response = await fetch(
        `${INSTAGRAM_GRAPH_API}/${this.igUserId}?fields=id&access_token=${this.accessToken}`
      )
      return response.ok
    } catch {
      return false
    }
  }
}
