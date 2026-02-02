import { TwitterContent, TwitterTweet } from './types'

const TWITTER_API_V2 = 'https://api.twitter.com/2'

export class TwitterClient {
  private bearerToken: string

  constructor(bearerToken: string) {
    this.bearerToken = bearerToken
  }

  /**
   * Tweet (post) to Twitter
   */
  async tweet(content: TwitterContent): Promise<{ id: string; text: string }> {
    try {
      const payload: any = {
        text: content.text,
      }

      if (content.media && content.media.length > 0) {
        payload.media = {
          media_ids: content.media.map(m => m.mediaKey),
        }
      }

      const response = await fetch(`${TWITTER_API_V2}/tweets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { data: { id: string; text: string } }
      return data.data
    } catch (error) {
      throw new Error(
        `Failed to post to Twitter: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get user tweets
   */
  async getTweets(userId: string, limit = 10): Promise<TwitterTweet[]> {
    try {
      const response = await fetch(
        `${TWITTER_API_V2}/users/${userId}/tweets?max_results=${limit}&tweet.fields=public_metrics,created_at,conversation_id`,
        {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { data: any[] }
      
      return data.data?.map(tweet => ({
        id: tweet.id,
        text: tweet.text,
        createdAt: tweet.created_at,
        publicMetrics: tweet.public_metrics,
        conversationId: tweet.conversation_id,
        authorId: userId,
      })) || []
    } catch (error) {
      throw new Error(
        `Failed to fetch tweets: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Delete a tweet
   */
  async deleteTweet(tweetId: string): Promise<boolean> {
    try {
      const response = await fetch(`${TWITTER_API_V2}/tweets/${tweetId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
      })

      return response.ok
    } catch (error) {
      throw new Error(
        `Failed to delete tweet: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Like a tweet
   */
  async likeTweet(userId: string, tweetId: string): Promise<boolean> {
    try {
      const response = await fetch(`${TWITTER_API_V2}/users/${userId}/likes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tweet_id: tweetId }),
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Retweet
   */
  async retweet(userId: string, tweetId: string): Promise<boolean> {
    try {
      const response = await fetch(`${TWITTER_API_V2}/users/${userId}/retweets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tweet_id: tweetId }),
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * Upload media to Twitter
   */
  async uploadMedia(mediaBuffer: Buffer, mediaType: string): Promise<string> {
    try {
      const formData = new FormData()
      const blob = new Blob([mediaBuffer], { type: mediaType })
      formData.append('media_data', blob as any)

      const response = await fetch('https://upload.twitter.com/1.1/media/upload.json', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { media_id_string: string }
      return data.media_id_string
    } catch (error) {
      throw new Error(
        `Failed to upload media: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Get user info
   */
  async getUserInfo(username: string): Promise<{ id: string; name: string; username: string }> {
    try {
      const response = await fetch(
        `${TWITTER_API_V2}/users/by/username/${username}?user.fields=public_metrics`,
        {
          headers: {
            'Authorization': `Bearer ${this.bearerToken}`,
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Twitter API error: ${response.statusText}`)
      }

      const data = (await response.json()) as { data: any }
      return {
        id: data.data.id,
        name: data.data.name,
        username: data.data.username,
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch user info: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Verify API access
   */
  async verifyAccess(): Promise<boolean> {
    try {
      const response = await fetch(`${TWITTER_API_V2}/tweets/search/recent?query=from:twitter&max_results=10`, {
        headers: {
          'Authorization': `Bearer ${this.bearerToken}`,
        },
      })

      return response.ok
    } catch {
      return false
    }
  }
}

/**
 * Generate Twitter OAuth URL
 */
export function generateTwitterAuthUrl(clientId: string, redirectUri: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'tweet.read tweet.write users.read follows.read follows.write',
    state: crypto.randomUUID(),
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  return `https://twitter.com/i/oauth2/authorize?${params.toString()}`
}

/**
 * Generate PKCE code verifier and challenge
 */
export async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
  const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const buffer = new TextEncoder().encode(codeVerifier)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')

  return { codeVerifier, codeChallenge }
}
