import { FacebookContent, FacebookPost, FacebookPage, FacebookAuthResponse } from './types'

const FACEBOOK_API_VERSION = 'v19.0'
const FACEBOOK_GRAPH_API = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`

export class FacebookClient {
  private accessToken: string

  constructor(accessToken: string) {
    this.accessToken = accessToken
  }

  /**
   * Publish content to Facebook
   */
  async publishPost(pageId: string, content: FacebookContent): Promise<{ id: string; url: string }> {
    try {
      const response = await fetch(
        `${FACEBOOK_GRAPH_API}/${pageId}/feed?access_token=${this.accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content.message,
            link: content.link,
            picture: content.picture,
            published: content.published !== false,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { id: string }
      
      return {
        id: data.id,
        url: `https://facebook.com/${pageId}/posts/${data.id}`,
      }
    } catch (error) {
      throw new Error(
        `Failed to publish to Facebook: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get all pages for authenticated user
   */
  async getPages(): Promise<FacebookPage[]> {
    try {
      const response = await fetch(
        `${FACEBOOK_GRAPH_API}/me/accounts?fields=id,name,access_token,fan_count,picture&access_token=${this.accessToken}`
      )

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { data: any[] }
      
      return data.data.map(page => ({
        id: page.id,
        name: page.name,
        accessToken: page.access_token,
        followers: page.fan_count || 0,
        avatar: page.picture?.data?.url,
      }))
    } catch (error) {
      throw new Error(
        `Failed to fetch Facebook pages: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get page insights (analytics)
   */
  async getPageInsights(pageId: string, metric: string): Promise<any> {
    try {
      const response = await fetch(
        `${FACEBOOK_GRAPH_API}/${pageId}/insights?metric=${metric}&access_token=${this.accessToken}`
      )

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      throw new Error(
        `Failed to fetch insights: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get page posts
   */
  async getPosts(pageId: string, limit = 10): Promise<FacebookPost[]> {
    try {
      const response = await fetch(
        `${FACEBOOK_GRAPH_API}/${pageId}/posts?fields=id,message,link,picture,created_time,permalink,shares,likes.limit(1).summary(true),comments.limit(1).summary(true)&limit=${limit}&access_token=${this.accessToken}`
      )

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { data: any[] }
      
      return data.data.map(post => ({
        id: post.id,
        pageId,
        message: post.message || '',
        link: post.link,
        picture: post.picture,
        createdTime: post.created_time,
        permalink: post.permalink,
        engagementData: {
          shares: post.shares?.count || 0,
          likes: post.likes?.summary?.total_count || 0,
          comments: post.comments?.summary?.total_count || 0,
        },
      }))
    } catch (error) {
      throw new Error(
        `Failed to fetch posts: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${FACEBOOK_GRAPH_API}/${postId}?access_token=${this.accessToken}`,
        { method: 'DELETE' }
      )

      return response.ok
    } catch (error) {
      throw new Error(
        `Failed to delete post: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Schedule a post
   */
  async schedulePost(
    pageId: string,
    content: FacebookContent,
    scheduledTime: Date
  ): Promise<{ id: string }> {
    try {
      const response = await fetch(
        `${FACEBOOK_GRAPH_API}/${pageId}/feed?access_token=${this.accessToken}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content.message,
            link: content.link,
            picture: content.picture,
            published: false,
            scheduled_publish_time: Math.floor(scheduledTime.getTime() / 1000),
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Facebook API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { id: string }
      return { id: data.id }
    } catch (error) {
      throw new Error(
        `Failed to schedule post: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Verify access token validity
   */
  async verifyToken(): Promise<{ isValid: boolean; expiresAt?: Date }> {
    try {
      const response = await fetch(
        `${FACEBOOK_GRAPH_API}/debug_token?input_token=${this.accessToken}&access_token=${this.accessToken}`
      )

      const data = (await response.json()) as any
      
      if (!data.data?.is_valid) {
        return { isValid: false }
      }

      const expiresIn = data.data.expires_at
      return {
        isValid: true,
        expiresAt: expiresIn ? new Date(expiresIn * 1000) : undefined,
      }
    } catch (error) {
      return { isValid: false }
    }
  }
}

/**
 * Generate Facebook OAuth authorization URL
 */
export function generateFacebookAuthUrl(clientId: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'pages_manage_posts,pages_read_engagement,pages_manage_metadata',
    response_type: 'code',
    state: crypto.randomUUID(),
  })

  return `https://www.facebook.com/v${FACEBOOK_API_VERSION.split('.')[0]}.0/dialog/oauth?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeFacebookAuthCode(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<FacebookAuthResponse> {
  const response = await fetch(`${FACEBOOK_GRAPH_API}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    }).toString(),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange authorization code')
  }

  return (await response.json()) as FacebookAuthResponse
}
