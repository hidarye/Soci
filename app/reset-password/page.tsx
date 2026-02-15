import ResetPasswordPageClient from './reset-password-page-client';

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

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const token = readParam(resolvedSearchParams, 'token');
  const email = readParam(resolvedSearchParams, 'email');
  const code = readParam(resolvedSearchParams, 'code');
  return <ResetPasswordPageClient token={token} queryEmail={email} queryCode={code} />;
}
