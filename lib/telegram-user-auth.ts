import { randomUUID } from 'crypto';
import { TelegramClient } from 'telegram';
import { Api } from 'telegram/tl';
import { StringSession } from 'telegram/sessions';

type ApiCredentials = {
  apiId: number;
  apiHash: string;
};

type PendingAuthState = {
  authId: string;
  userId: string;
  phoneNumber: string;
  phoneCodeHash: string;
  client: TelegramClient;
  createdAt: number;
};

export type TelegramUserProfile = {
  accountId: string;
  accountName: string;
  accountUsername: string;
  phoneNumber?: string;
  profileImageUrl?: string;
  sessionString: string;
};

const pendingAuthStates = new Map<string, PendingAuthState>();
const AUTH_TTL_MS = Math.max(60_000, Number(process.env.TELEGRAM_AUTH_TTL_MS || '600000'));

function getApiCredentials(): ApiCredentials {
  const apiIdRaw = String(process.env.API_ID || process.env.TELEGRAM_API_ID || '').trim();
  const apiHash = String(process.env.API_HASH || process.env.TELEGRAM_API_HASH || '').trim();
  const apiId = Number(apiIdRaw);
  if (!Number.isFinite(apiId) || apiId <= 0 || !apiHash) {
    throw new Error('Missing API_ID/API_HASH for Telegram user authentication');
  }
  return { apiId, apiHash };
}

function normalizePhoneNumber(input: string): string {
  const raw = String(input || '').trim().replace(/\s+/g, '');
  if (!raw) throw new Error('Phone number is required');
  if (!raw.startsWith('+')) {
    throw new Error('Phone number must include country code (example: +9677xxxxxxx)');
  }
  return raw;
}

function cleanupExpiredPendingAuthStates() {
  const now = Date.now();
  for (const [authId, state] of pendingAuthStates.entries()) {
    if (now - state.createdAt < AUTH_TTL_MS) continue;
    pendingAuthStates.delete(authId);
    void state.client.disconnect().catch(() => undefined);
  }
}

function isPasswordNeededError(error: unknown): boolean {
  const code = String((error as any)?.errorMessage || '');
  return code === 'SESSION_PASSWORD_NEEDED';
}

function getTelegramErrorMessage(error: unknown): string {
  const anyErr = error as any;
  const rpc = String(anyErr?.errorMessage || '').trim();
  if (rpc) return rpc;
  if (error instanceof Error) return error.message;
  return String(error || 'Unknown Telegram auth error');
}

async function createTelegramClient(sessionString = ''): Promise<TelegramClient> {
  const { apiId, apiHash } = getApiCredentials();
  const client = new TelegramClient(new StringSession(sessionString), apiId, apiHash, {
    connectionRetries: 5,
  });
  await client.connect();
  return client;
}

function profileFromUser(user: Api.TypeUser, sessionString: string): TelegramUserProfile {
  const normalized = user as Api.User;
  const firstName = String(normalized.firstName || '').trim();
  const lastName = String(normalized.lastName || '').trim();
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim() || 'Telegram User';
  const username = String(normalized.username || normalized.phone || normalized.id || 'telegram_user').trim();
  return {
    accountId: String(normalized.id || ''),
    accountName: fullName,
    accountUsername: username,
    phoneNumber: normalized.phone ? `+${normalized.phone}` : undefined,
    sessionString,
  };
}

export async function startTelegramUserAuth(params: {
  userId: string;
  phoneNumber: string;
}): Promise<{ authId: string; isCodeViaApp: boolean; expiresInSeconds: number }> {
  cleanupExpiredPendingAuthStates();
  const phoneNumber = normalizePhoneNumber(params.phoneNumber);
  const creds = getApiCredentials();
  const client = await createTelegramClient();
  try {
    const { phoneCodeHash, isCodeViaApp } = await client.sendCode(creds, phoneNumber);
    const authId = randomUUID();
    pendingAuthStates.set(authId, {
      authId,
      userId: params.userId,
      phoneNumber,
      phoneCodeHash,
      client,
      createdAt: Date.now(),
    });
    return {
      authId,
      isCodeViaApp,
      expiresInSeconds: Math.floor(AUTH_TTL_MS / 1000),
    };
  } catch (error) {
    await client.disconnect().catch(() => undefined);
    throw new Error(`Failed to send Telegram login code: ${getTelegramErrorMessage(error)}`);
  }
}

type VerifyResult =
  | { success: true; profile: TelegramUserProfile }
  | { success: false; requiresPassword: true; hint?: string };

export async function verifyTelegramUserAuth(params: {
  userId: string;
  authId: string;
  phoneCode: string;
  password?: string;
}): Promise<VerifyResult> {
  cleanupExpiredPendingAuthStates();
  const authId = String(params.authId || '').trim();
  const state = pendingAuthStates.get(authId);
  if (!state) {
    throw new Error('Authentication session expired or not found. Start again.');
  }
  if (state.userId !== params.userId) {
    throw new Error('Authentication session does not belong to current user');
  }
  const phoneCode = String(params.phoneCode || '').trim();
  if (!phoneCode) {
    throw new Error('Verification code is required');
  }

  const creds = getApiCredentials();
  try {
    const result = await state.client.invoke(new Api.auth.SignIn({
      phoneNumber: state.phoneNumber,
      phoneCodeHash: state.phoneCodeHash,
      phoneCode,
    }));

    if (result instanceof Api.auth.AuthorizationSignUpRequired) {
      throw new Error('Telegram account sign-up is required first in Telegram app');
    }

    const sessionString = (state.client.session as unknown as StringSession).save();
    const profile = profileFromUser(result.user, sessionString);
    pendingAuthStates.delete(authId);
    await state.client.disconnect().catch(() => undefined);
    return { success: true, profile };
  } catch (error) {
    if (!isPasswordNeededError(error)) {
      throw new Error(`Telegram code verification failed: ${getTelegramErrorMessage(error)}`);
    }

    const password = String(params.password || '');
    if (!password) {
      const pwd = await state.client.invoke(new Api.account.GetPassword()).catch(() => null as any);
      const hint = pwd && typeof pwd === 'object' ? String((pwd as any).hint || '').trim() || undefined : undefined;
      return { success: false, requiresPassword: true, hint };
    }

    let firstPasswordError = '';
    const user = await state.client.signInWithPassword(creds, {
      password: async () => password,
      onError: async (err) => {
        firstPasswordError = getTelegramErrorMessage(err);
        return true;
      },
    }).catch((err) => {
      const msg = firstPasswordError || getTelegramErrorMessage(err);
      throw new Error(msg);
    });

    if (!user) {
      throw new Error(firstPasswordError || 'Telegram 2FA verification failed');
    }

    const sessionString = (state.client.session as unknown as StringSession).save();
    const profile = profileFromUser(user, sessionString);
    pendingAuthStates.delete(authId);
    await state.client.disconnect().catch(() => undefined);
    return { success: true, profile };
  }
}

export async function getTelegramUserProfileFromSession(sessionString: string): Promise<TelegramUserProfile> {
  const normalizedSession = String(sessionString || '').trim();
  if (!normalizedSession) {
    throw new Error('Telegram session is required');
  }
  const client = await createTelegramClient(normalizedSession);
  try {
    const me = await client.getMe();
    if (!me) {
      throw new Error('Telegram session is not authorized');
    }
    const refreshedSession = (client.session as unknown as StringSession).save();
    return profileFromUser(me, refreshedSession);
  } catch (error) {
    throw new Error(`Failed to verify Telegram session: ${getTelegramErrorMessage(error)}`);
  } finally {
    await client.disconnect().catch(() => undefined);
  }
}
