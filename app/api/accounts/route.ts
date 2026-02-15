import { NextRequest, NextResponse } from 'next/server'
import { db, type PlatformAccount } from '@/lib/db'
import { randomUUID } from 'crypto'
import { getAuthUser } from '@/lib/auth'
import { getClientKey, rateLimit } from '@/lib/rate-limit'
import { z } from 'zod'
import { parsePagination, parseSort } from '@/lib/validation'
import { getTelegramUserProfileFromSession } from '@/lib/telegram-user-auth';

export const runtime = 'nodejs';

async function triggerBackgroundRefresh(options?: { force?: boolean }) {
  try {
    const { triggerBackgroundServicesRefresh } = await import('@/lib/services/background-services');
    triggerBackgroundServicesRefresh(options);
  } catch {
    // non-blocking for account CRUD APIs
  }
}


export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const page = parsePagination(request.nextUrl.searchParams)
    if (!page.success) {
      return NextResponse.json({ success: false, error: 'Invalid pagination' }, { status: 400 })
    }
    const sort = parseSort(
      request.nextUrl.searchParams,
      ['createdAt', 'platformId', 'isActive', 'accountName'] as const,
      'createdAt'
    )
    if (!sort.success) {
      return NextResponse.json({ success: false, error: 'Invalid sort' }, { status: 400 })
    }
    const search = page.data.search
    const platformId = request.nextUrl.searchParams.get('platformId') || undefined
    const isActiveParam = request.nextUrl.searchParams.get('isActive')
    const isActive = isActiveParam === null ? undefined : isActiveParam === 'true'
    const presentationOnly = request.nextUrl.searchParams.get('presentation') === '1'

    const result = await db.getUserAccountsPaged({
      userId: user.id,
      limit: page.data.limit,
      offset: page.data.offset,
      search,
      platformId,
      isActive,
      sortBy: sort.data.sortBy,
      sortDir: sort.data.sortDir,
    })
    
    const accounts = presentationOnly
      ? result.accounts.map((account) => {
          const credentials = (account.credentials || {}) as Record<string, any>
          const accountInfo =
            credentials && typeof credentials.accountInfo === 'object'
              ? (credentials.accountInfo as Record<string, any>)
              : {}
          return {
            id: account.id,
            userId: account.userId,
            platformId: account.platformId,
            accountName: account.accountName,
            accountUsername: account.accountUsername,
            accountId: account.accountId,
            isActive: account.isActive,
            createdAt: account.createdAt,
            updatedAt: account.updatedAt,
            credentials: {
              profileImageUrl:
                accountInfo.profileImageUrl ||
                credentials.profileImageUrl ||
                credentials.avatarUrl ||
                credentials.picture ||
                undefined,
            },
          }
        })
      : result.accounts

    return NextResponse.json({
      success: true,
      accounts,
      total: result.total,
      nextOffset: page.data.offset + accounts.length,
      hasMore: page.data.offset + accounts.length < result.total,
    })
  } catch (error) {
    console.error('[API] Error fetching accounts:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch accounts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    void triggerBackgroundRefresh();
    const limiter = rateLimit(`accounts:post:${getClientKey(request)}`, 30, 60_000)
    if (!limiter.ok) {
      return NextResponse.json({ success: false, error: 'Too many requests' }, { status: 429 })
    }
    const body = await request.json() as Partial<PlatformAccount>
    const user = await getAuthUser()
    if (!user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }
    const schema = z.object({
      platformId: z.string().min(1),
      accountName: z.string().min(1).optional(),
      accountUsername: z.string().optional(),
      accountId: z.string().optional(),
      accessToken: z.string().optional(),
      refreshToken: z.string().optional(),
      credentials: z.record(z.any()).optional(),
      isActive: z.boolean().optional(),
    })
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid input' }, { status: 400 })
    }
    const safe = parsed.data

    if (safe.platformId !== 'telegram' && !safe.accountName) {
      return NextResponse.json({ success: false, error: 'Account name is required' }, { status: 400 })
    }

    const incomingTelegramCredentials = ((safe.credentials as Record<string, any>) || {})
    const telegramSessionString =
      safe.platformId === 'telegram'
        ? String(incomingTelegramCredentials.sessionString || safe.accessToken || '').trim()
        : undefined

    if (safe.platformId === 'telegram' && !telegramSessionString) {
      return NextResponse.json({ success: false, error: 'Telegram session is required' }, { status: 400 })
    }

    if (safe.platformId === 'twitter') {
      const token = (safe.accessToken || '').trim()
      if (!token || token === 'manual' || token.startsWith('oauth_')) {
        return NextResponse.json(
          { success: false, error: 'Twitter requires a valid user access token. Connect with OAuth to get media.write scope.' },
          { status: 400 }
        )
      }
    }

    const userAccounts = await db.getUserAccounts(user.id)
    const findExistingAccount = (resolvedAccountId?: string) =>
      userAccounts.find((a) => {
        if (a.platformId !== safe.platformId) return false
        const candidateAccountId = resolvedAccountId || safe.accountId
        return Boolean(candidateAccountId) && a.accountId === candidateAccountId
      })

    const existingNonTelegram = safe.platformId === 'telegram' ? undefined : findExistingAccount()
    if (existingNonTelegram) {
      return NextResponse.json({ success: true, account: existingNonTelegram }, { status: 200 })
    }

    let accountName = safe.accountName ?? '';
    let accountUsername = safe.accountUsername ?? safe.accountName ?? '';
    let accountId = safe.accountId ?? `${safe.platformId}_${Date.now()}`;

    if (safe.platformId === 'telegram' && telegramSessionString) {
      try {
        const telegramUser = await getTelegramUserProfileFromSession(telegramSessionString);
        accountName = telegramUser.accountName || 'Telegram User';
        accountUsername = telegramUser.accountUsername || telegramUser.accountName || 'telegram_user';
        accountId = String(telegramUser.accountId || accountId);
        const existingTelegram = findExistingAccount(accountId)
        const sessionCredentials: Record<string, any> = {
          ...incomingTelegramCredentials,
          authType: 'user_session',
          sessionString: telegramUser.sessionString,
          phoneNumber: telegramUser.phoneNumber,
          isBot: false,
          reauthRequired: false,
          reauthReason: null,
          reauthRequiredAt: null,
          accountInfo: {
            id: telegramUser.accountId,
            username: telegramUser.accountUsername,
            name: telegramUser.accountName,
            isBot: false,
            profileImageUrl: telegramUser.profileImageUrl,
            phoneNumber: telegramUser.phoneNumber,
          },
        };
        if (existingTelegram) {
          const currentCredentials = (existingTelegram.credentials as Record<string, any>) || {}
          const mergedCredentials: Record<string, any> = {
            ...currentCredentials,
            ...sessionCredentials,
          }

          if (typeof incomingTelegramCredentials.chatId !== 'undefined') {
            mergedCredentials.chatId = incomingTelegramCredentials.chatId
          }

          const updated = await db.updateAccount(existingTelegram.id, {
            accountName,
            accountUsername,
            accountId,
            accessToken: telegramUser.sessionString,
            refreshToken: safe.refreshToken ?? existingTelegram.refreshToken,
            credentials: mergedCredentials,
            isActive: safe.isActive ?? true,
          })
          void triggerBackgroundRefresh({ force: true });
          return NextResponse.json({ success: true, account: updated ?? existingTelegram }, { status: 200 })
        }
        safe.credentials = sessionCredentials;
      } catch (error) {
        return NextResponse.json(
          { success: false, error: error instanceof Error ? error.message : 'Failed to verify Telegram session' },
          { status: 400 }
        )
      }
    }

    // Create account
    const account = await db.createAccount({
      id: randomUUID(),
      userId: user.id,
      platformId: safe.platformId,
      accountName,
      accountUsername,
      accountId,
      accessToken: safe.platformId === 'telegram' ? telegramSessionString ?? 'manual' : safe.accessToken ?? 'manual',
      refreshToken: safe.refreshToken,
      credentials: safe.credentials ?? {},
      isActive: safe.isActive ?? true,
    })

    void triggerBackgroundRefresh({ force: true });
    return NextResponse.json({ success: true, account }, { status: 201 })
  } catch (error) {
    console.error('[API] Error creating account:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create account' },
      { status: 500 }
    )
  }
}
