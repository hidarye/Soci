'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Eye, EyeOff, MailCheck } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  agreement?: string;
};

const PASSWORD_RULES = [
  { id: 'length', label: 'At least 8 characters', test: (value: string) => value.length >= 8 },
  { id: 'upper', label: 'At least one uppercase letter', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'At least one lowercase letter', test: (value: string) => /[a-z]/.test(value) },
  { id: 'number', label: 'At least one number', test: (value: string) => /[0-9]/.test(value) },
  { id: 'special', label: 'At least one special character', test: (value: string) => /[^A-Za-z0-9]/.test(value) },
];

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string>('');
  const [conflictEmail, setConflictEmail] = useState<string>('');
  const [successEmail, setSuccessEmail] = useState('');
  const [debugVerificationCode, setDebugVerificationCode] = useState('');
  const [debugVerificationUrl, setDebugVerificationUrl] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [infoMessage, setInfoMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const passwordChecks = useMemo(
    () =>
      PASSWORD_RULES.map((rule) => ({
        ...rule,
        pass: rule.test(password),
      })),
    [password]
  );
  const passwordStrength = passwordChecks.filter((rule) => rule.pass).length;
  const passwordStrengthLabel =
    passwordStrength <= 2
      ? 'Weak'
      : passwordStrength <= 4
        ? 'Medium'
        : 'Strong';

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName) next.name = 'Name is required.';
    else if (trimmedName.length < 2) next.name = 'Name must be at least 2 characters.';
    else if (trimmedName.length > 80) next.name = 'Name must be 80 characters or fewer.';

    if (!normalizedEmail) next.email = 'Email is required.';
    else if (!isValidEmail(normalizedEmail)) next.email = 'Enter a valid email address.';

    if (!password) next.password = 'Password is required.';
    else if (passwordChecks.some((rule) => !rule.pass)) {
      next.password = 'Password does not meet all requirements.';
    }

    if (!confirmPassword) next.confirmPassword = 'Please confirm your password.';
    else if (confirmPassword !== password) next.confirmPassword = 'Passwords do not match.';

    if (!agreeToTerms) {
      next.agreement = 'You must accept the terms to create an account.';
    }

    return next;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setFieldErrors(validationErrors);
    setInfoMessage('');
    setError('');
    setConflictEmail('');
    if (Object.keys(validationErrors).length > 0) return;

    flushSync(() => setLoading(true));

    const normalizedEmail = email.trim().toLowerCase();
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), email: normalizedEmail, password }),
    });
    const data = await res.json();

    setLoading(false);
    if (!res.ok || !data.success) {
      setError(data.error || 'Registration failed. Please try again.');
      if (res.status === 409) {
        setConflictEmail(normalizedEmail);
      }
      return;
    }

    const verificationRequired = data?.verificationRequired !== false;
    if (!verificationRequired) {
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setAgreeToTerms(false);
      setFieldErrors({});
      router.push(`/login?registered=1&email=${encodeURIComponent(normalizedEmail)}`);
      router.refresh();
      return;
    }

    setSuccessEmail(normalizedEmail);
    setDebugVerificationCode(data?.debug?.verificationCode || '');
    setDebugVerificationUrl(data?.debug?.verificationUrl || '');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setAgreeToTerms(false);
    setFieldErrors({});
  };

  const resendVerification = async () => {
    if (!successEmail || isResending) return;
    flushSync(() => setIsResending(true));
    setInfoMessage('');
    setError('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: successEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Unable to resend verification.');
      }
      setInfoMessage(data?.message || 'Verification code resent.');
      if (data?.debug?.verificationCode) {
        setDebugVerificationCode(data.debug.verificationCode);
      }
      if (data?.debug?.verificationUrl) {
        setDebugVerificationUrl(data.debug.verificationUrl);
      }
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Unable to resend verification.');
    } finally {
      setIsResending(false);
    }
  };

  if (successEmail) {
    return (
      <AuthShell
        title="Check Your Email"
        description="Your account has been created. Verify your email to activate secure sign in."
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm">
            <div className="mb-2 inline-flex items-center gap-2 font-semibold text-emerald-700 dark:text-emerald-300">
              <MailCheck size={16} />
              Verification Required
            </div>
            <p className="text-emerald-700/90 dark:text-emerald-200">
              We sent a verification code to <span className="font-semibold">{successEmail}</span>.
            </p>
          </div>

          {infoMessage && (
            <p className="text-sm text-foreground" aria-live="polite">
              {infoMessage}
            </p>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert" aria-live="polite">
              {error}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={resendVerification} disabled={isResending}>
              {isResending ? 'Resending...' : 'Resend Code'}
            </Button>
            <Link href={`/verify-email?email=${encodeURIComponent(successEmail)}`} className="block">
              <Button type="button" className="w-full">
                Enter Verification Code
              </Button>
            </Link>
          </div>

          {(debugVerificationCode || debugVerificationUrl) && (
            <div className="rounded-xl border border-border/70 bg-muted/35 p-3 text-xs text-muted-foreground">
              <p className="mb-2 font-semibold text-foreground">Development verification details:</p>
              {debugVerificationCode ? (
                <p className="mb-2">
                  Code: <span className="font-semibold text-foreground">{debugVerificationCode}</span>
                </p>
              ) : null}
              {debugVerificationUrl ? (
                <a
                  href={debugVerificationUrl}
                  className="break-all text-primary underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  {debugVerificationUrl}
                </a>
              ) : null}
            </div>
          )}
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Create Account"
      description="Start securely with verified email access and strong credential requirements."
      logoSize={100}
      logoShowText={false}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="register-name">Full Name</Label>
          <Input
            id="register-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your full name"
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.name)}
          />
          {fieldErrors.name && <p className="text-xs text-destructive">{fieldErrors.name}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-email">Email</Label>
          <Input
            id="register-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (conflictEmail) setConflictEmail('');
            }}
            placeholder="you@example.com"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
          />
          {fieldErrors.email && <p className="text-xs text-destructive">{fieldErrors.email}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-password">Password</Label>
          <div className="relative">
            <Input
              id="register-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password)}
              className="pr-11"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </Button>
          </div>
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full transition-all ${
                  passwordStrength <= 2
                    ? 'bg-destructive'
                    : passwordStrength <= 4
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                }`}
                style={{ width: `${(passwordStrength / PASSWORD_RULES.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">Password strength: {passwordStrengthLabel}</p>
            <ul className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
              {passwordChecks.map((rule) => (
                <li
                  key={rule.id}
                  className={`inline-flex items-center gap-1.5 ${
                    rule.pass ? 'text-emerald-600 dark:text-emerald-400' : ''
                  }`}
                >
                  {rule.pass ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                  {rule.label}
                </li>
              ))}
            </ul>
          </div>
          {fieldErrors.password && <p className="text-xs text-destructive">{fieldErrors.password}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-confirm-password">Confirm Password</Label>
          <div className="relative">
            <Input
              id="register-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              className="pr-11"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8"
              aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </Button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="text-xs text-destructive">{fieldErrors.confirmPassword}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-start gap-3 rounded-lg border border-border/70 bg-background/45 p-3 text-sm">
            <input
              id="register-agree-terms"
              type="checkbox"
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              aria-invalid={Boolean(fieldErrors.agreement)}
              className="mt-0.5 h-4 w-4 rounded border-input accent-primary"
            />
            <p className="leading-relaxed text-muted-foreground">
              <label htmlFor="register-agree-terms" className="cursor-pointer">
                I agree to the
              </label>{' '}
              <Link href="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
          {fieldErrors.agreement && <p className="text-xs text-destructive">{fieldErrors.agreement}</p>}
        </div>

        <div aria-live="polite" className="min-h-5">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        {conflictEmail ? (
          <div className="rounded-xl border border-border/70 bg-muted/35 p-3 text-sm">
            <p className="mb-3 text-muted-foreground">
              This email is already registered. Try signing in, or reset your password.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Link href={`/login?email=${encodeURIComponent(conflictEmail)}`} className="block">
                <Button type="button" variant="outline" className="w-full">
                  Go to Sign In
                </Button>
              </Link>
              <Link href="/forgot-password" className="block">
                <Button type="button" variant="outline" className="w-full">
                  Forgot password?
                </Button>
              </Link>
            </div>
          </div>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Creating account...' : 'Create Account'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
