// Twitter/X Platform specific types

export interface TwitterAccount {
  id: string
  bearerToken: string
  apiKey: string
  apiSecret: string
  accessToken: string
  accessTokenSecret: string
  username: string
  userId: string
}

export interface TwitterTweet {
  id: string
  text: string
  createdAt: string
  publicMetrics?: {
    retweetCount: number
    replyCount: number
    likeCount: number
    quoteCount: number
  }
  authorId?: string
  conversationId?: string
}

export interface TwitterContent {
  text: string
  media?: TwitterMedia[]
  replySettings?: 'everyone' | 'following' | 'mentioned_users'
}

export interface TwitterMedia {
  type: 'photo' | 'video' | 'gif'
  mediaKey: string
  url?: string
}

export interface TwitterAuthResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
  scope: string
}
