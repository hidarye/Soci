'use client';

import Link from 'next/link';
import { useState } from 'react';
import { flushSync } from 'react-dom';
import { AuthShell } from '@/components/auth/auth-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [debugResetCode, setDebugResetCode] = useState('');
  const [debugResetUrl, setDebugResetUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setDebugResetCode('');
    setDebugResetUrl('');

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError('Email is required.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.');
      return;
    }

    flushSync(() => setSubmitting(true));
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Unable to process request.');
      }
      setMessage(data?.message || 'If the account exists, a reset code has been sent.');
      if (data?.debug?.resetCode) {
        setDebugResetCode(String(data.debug.resetCode));
      }
      if (data?.debug?.resetUrl) {
        setDebugResetUrl(data.debug.resetUrl);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to process request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Forgot Password" description="Request a secure password reset code for your account.">
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="forgot-password-email">Email</Label>
          <Input
            id="forgot-password-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={Boolean(error)}
            required
          />
        </div>

        <div aria-live="polite" className="space-y-2">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {message ? <p className="text-sm text-foreground">{message}</p> : null}
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send Reset Code'}
        </Button>

        {(debugResetCode || debugResetUrl) && (
          <div className="rounded-xl border border-border/70 bg-muted/35 p-3 text-xs text-muted-foreground">
            <p className="mb-2 font-semibold text-foreground">Development reset details:</p>
            {debugResetCode ? (
              <p className="mb-2">
                Code: <span className="font-semibold text-foreground">{debugResetCode}</span>
              </p>
            ) : null}
            {debugResetUrl ? (
              <a
                href={debugResetUrl}
                className="break-all text-primary underline"
                target="_blank"
                rel="noreferrer"
              >
                {debugResetUrl}
              </a>
            ) : null}
          </div>
        )}

        <p className="text-center text-sm text-muted-foreground">
          Remembered your password?{' '}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Back to Sign In
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
