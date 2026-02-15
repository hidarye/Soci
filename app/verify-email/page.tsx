import VerifyEmailPageClient from './verify-email-page-client';

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

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const token = readParam(resolvedSearchParams, 'token');
  const email = readParam(resolvedSearchParams, 'email');
  const code = readParam(resolvedSearchParams, 'code');
  return <VerifyEmailPageClient token={token} queryEmail={email} queryCode={code} />;
}
