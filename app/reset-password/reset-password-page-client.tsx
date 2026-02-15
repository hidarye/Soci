'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { Eye, EyeOff } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { id: 'upper', label: 'One uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'One lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { id: 'number', label: 'One number', test: (value: string) => /[0-9]/.test(value) },
  { id: 'special', label: 'One special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

function normalizeCode(value: string): string {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 6);
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type ResetPasswordPageClientProps = {
  token?: string;
  queryEmail?: string;
  queryCode?: string;
};

export default function ResetPasswordPageClient({ token, queryEmail, queryCode }: ResetPasswordPageClientProps) {
  const normalizedToken = String(token || '').trim();
  const [email, setEmail] = useState(() => String(queryEmail || '').trim().toLowerCase());
  const [code, setCode] = useState(() => normalizeCode(queryCode || ''));
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [succeeded, setSucceeded] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const passwordChecks = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        pass: rule.test(password),
      })),
    [password]
  );
  const meetsPolicy = passwordChecks.every((rule) => rule.pass);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedCode = normalizeCode(code);
    if (!normalizedToken) {
      if (!isValidEmail(normalizedEmail)) {
        setError('Enter a valid email address.');
        return;
      }
      if (normalizedCode.length !== 6) {
        setError('Enter the 6-digit reset code.');
        return;
      }
    }
    if (!meetsPolicy) {
      setError('Password does not meet all requirements.');
      return;
    }
    if (confirmPassword !== password) {
      setError('Passwords do not match.');
      return;
    }

    flushSync(() => setSubmitting(true));
    try {
      const payload = normalizedToken
        ? { token: normalizedToken, password }
        : { email: normalizedEmail, code: normalizedCode, password };

      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Unable to reset password.');
      }
      setSucceeded(true);
      setMessage('Password updated successfully. You can sign in now.');
      setPassword('');
      setConfirmPassword('');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell title="Reset Password" description="Set a new password using your email reset code.">
      <form onSubmit={onSubmit} className="space-y-5">
        {!normalizedToken ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={succeeded}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reset-code">Reset Code</Label>
              <Input
                id="reset-code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(normalizeCode(e.target.value))}
                placeholder="123456"
                maxLength={6}
                disabled={succeeded}
                required
              />
            </div>
          </>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="reset-password">New Password</Label>
          <div className="relative">
            <Input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter a strong password"
              autoComplete="new-password"
              className="pr-11"
              disabled={succeeded}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={succeeded}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </Button>
          </div>
          <ul className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            {passwordChecks.map((rule) => (
              <li key={rule.id} className={rule.pass ? 'text-emerald-600 dark:text-emerald-400' : ''}>
                {rule.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reset-confirm-password">Confirm Password</Label>
          <div className="relative">
            <Input
              id="reset-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              className="pr-11"
              disabled={succeeded}
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8"
              aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              disabled={succeeded}
            >
              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </Button>
          </div>
        </div>

        <div aria-live="polite" className="space-y-2">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {message ? <p className="text-sm text-foreground">{message}</p> : null}
        </div>

        {succeeded ? (
          <Link href="/login?reset=1" className="block">
            <Button type="button" className="w-full">
              Go to Sign In
            </Button>
          </Link>
        ) : (
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Updating...' : 'Update Password'}
          </Button>
        )}

        {!normalizedToken ? (
          <p className="text-center text-xs text-muted-foreground">
            Need a new code?{' '}
            <Link href="/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
              Request reset code
            </Link>
          </p>
        ) : null}
      </form>
    </AuthShell>
  );
}
