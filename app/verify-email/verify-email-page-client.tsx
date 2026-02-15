'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function normalizeCode(value: string): string {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 6);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type VerifyEmailPageClientProps = {
  token?: string;
  queryEmail?: string;
  queryCode?: string;
};

export default function VerifyEmailPageClient({ token, queryEmail, queryCode }: VerifyEmailPageClientProps) {
  const normalizedToken = String(token || '').trim();
  const normalizedQueryEmail = String(queryEmail || '').trim().toLowerCase();
  const normalizedQueryCode = normalizeCode(queryCode || '');
  const [email, setEmail] = useState(normalizedQueryEmail);
  const [code, setCode] = useState(normalizedQueryCode);
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>(
    normalizedToken ? 'loading' : 'idle'
  );
  const [message, setMessage] = useState(
    normalizedToken ? 'Verifying your email...' : 'Enter your email and 6-digit verification code.'
  );
  const [autoCodeAttempted, setAutoCodeAttempted] = useState(false);

  const submitVerification = async (payload: Record<string, string>) => {
    setState('loading');
    setMessage('Verifying your email...');
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data?.error || 'Verification failed.');
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function verifyByToken() {
      if (!normalizedToken) return;
      try {
        await submitVerification({ token: normalizedToken });
        if (!cancelled) {
          setState('success');
          setMessage('Your email has been verified successfully.');
        }
      } catch (error) {
        if (!cancelled) {
          setState('error');
          setMessage(error instanceof Error ? error.message : 'Verification failed.');
        }
      }
    }
    void verifyByToken();
    return () => {
      cancelled = true;
    };
  }, [normalizedToken]);

  useEffect(() => {
    let cancelled = false;
    async function verifyByCodeFromQuery() {
      if (normalizedToken || autoCodeAttempted) return;
      if (!normalizedQueryEmail || normalizedQueryCode.length !== 6) return;
      setAutoCodeAttempted(true);
      try {
        await submitVerification({ email: normalizedQueryEmail, code: normalizedQueryCode });
        if (!cancelled) {
          setState('success');
          setMessage('Your email has been verified successfully.');
        }
      } catch (error) {
        if (!cancelled) {
          setState('error');
          setMessage(error instanceof Error ? error.message : 'Verification failed.');
        }
      }
    }
    void verifyByCodeFromQuery();
    return () => {
      cancelled = true;
    };
  }, [autoCodeAttempted, normalizedQueryCode, normalizedQueryEmail, normalizedToken]);

  const onSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = normalizeCode(code);
    if (!isValidEmail(normalizedEmail)) {
      setState('error');
      setMessage('Enter a valid email address.');
      return;
    }
    if (normalizedCode.length !== 6) {
      setState('error');
      setMessage('Enter the 6-digit verification code.');
      return;
    }

    try {
      await submitVerification({ email: normalizedEmail, code: normalizedCode });
      setState('success');
      setMessage('Your email has been verified successfully.');
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : 'Verification failed.');
    }
  };

  return (
    <AuthShell title="Email Verification" description="Confirm your account with the verification code.">
      <div className="space-y-5">
        <p className="text-sm text-foreground" aria-live="polite">
          {message}
        </p>

        {state === 'success' ? (
          <Link href="/login?verified=1" className="block">
            <Button className="w-full">Go to Sign In</Button>
          </Link>
        ) : (
          <form onSubmit={onSubmitCode} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="verify-email-address">Email</Label>
              <Input
                id="verify-email-address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={state === 'loading'}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="verify-email-code">Verification Code</Label>
              <Input
                id="verify-email-code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(normalizeCode(e.target.value))}
                placeholder="123456"
                maxLength={6}
                disabled={state === 'loading'}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={state === 'loading'}>
              {state === 'loading' ? 'Verifying...' : 'Verify Email'}
            </Button>
          </form>
        )}
      </div>
    </AuthShell>
  );
}
