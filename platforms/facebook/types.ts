// Facebook Platform specific types

export interface FacebookAccount {
  id: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  pageId?: string
  pageName?: string
  pages: FacebookPage[]
}

export interface FacebookPage {
  id: string
  name: string
  accessToken: string
  followers: number
  avatar?: string
}

export interface FacebookPost {
  id: string
  pageId: string
  message: string
  link?: string
  picture?: string
  createdTime: string
  permalink?: string
  engagementData?: {
    shares: number
    likes: number
    comments: number
  }
}

export interface FacebookContent {
  message: string
  link?: string
  picture?: string
  type: 'status' | 'photo' | 'link'
  published?: boolean
}

export interface FacebookAuthResponse {
  access_token: string
  token_type: 'bearer'
  expires_in?: number
  userId?: string
}

export interface FacebookError {
  error: {
    message: string
    type: string
    code: number
  }
}
