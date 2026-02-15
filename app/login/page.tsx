import LoginPageClient from './login-page-client';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function readParam(
  searchParams: Record<string, string | string[] | undefined> | undefined,
  key: string
): string {
  const value = searchParams?.[key];
  if (Array.isArray(value)) return value[0] ?? '';
  if (typeof value === 'string') return value;
  return '';
}

function normalizeCallbackPath(raw: string): string {
  const candidate = raw.startsWith('/') ? raw : '/';
  if (candidate === '/dashboard') return '/';
  if (candidate.startsWith('/dashboard/accounts')) return '/accounts';
  if (candidate.startsWith('/dashboard/analytics')) return '/analytics';
  if (candidate.startsWith('/dashboard/create-task') || candidate.startsWith('/dashboard/create-post')) {
    return '/tasks/new';
  }
  return candidate;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const rawCallback = readParam(resolvedSearchParams, 'callbackUrl');
  const callbackUrl = normalizeCallbackPath(rawCallback);
  const email = readParam(resolvedSearchParams, 'email');
  const loggedOut = readParam(resolvedSearchParams, 'loggedOut') === '1';
  const verified = readParam(resolvedSearchParams, 'verified') === '1';
  const reset = readParam(resolvedSearchParams, 'reset') === '1';
  const registered = readParam(resolvedSearchParams, 'registered') === '1';

  return (
    <LoginPageClient
      callbackUrl={callbackUrl || '/'}
      queryEmail={email}
      loggedOut={loggedOut}
      verified={verified}
      reset={reset}
      registered={registered}
    />
  );
}
