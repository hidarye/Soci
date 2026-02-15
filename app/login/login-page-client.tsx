'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, MailWarning } from 'lucide-react';
import { AuthShell } from '@/components/auth/auth-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/components/i18n/language-provider';

const REMEMBER_EMAIL_KEY = 'socialflow_auth_remember_email';
const REMEMBER_ENABLED_KEY = 'socialflow_auth_remember_enabled';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type LoginPageClientProps = {
  callbackUrl: string;
  queryEmail?: string;
  verified?: boolean;
  reset?: boolean;
  registered?: boolean;
};

export default function LoginPageClient({
  callbackUrl,
  queryEmail,
  verified,
  reset,
  registered,
}: LoginPageClientProps) {
  const { locale, t } = useLanguage();
  const isArabic = locale === 'ar';
  const normalizedQueryEmail = String(queryEmail || '').trim().toLowerCase();
  const hasQueryEmail = Boolean(normalizedQueryEmail && isValidEmail(normalizedQueryEmail));
  const [email, setEmail] = useState(hasQueryEmail ? normalizedQueryEmail : '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [rememberPrefsReady, setRememberPrefsReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const creditLine = `${t('auth.creditLine', 'Programming & Design: Oday Algholy')} - ${t('auth.rightsReserved', 'All rights reserved')}`;
  const isBusy = loading || redirecting;

  useEffect(() => {
    try {
      const rememberEnabled = window.localStorage.getItem(REMEMBER_ENABLED_KEY) === '1';
      const rememberedEmail = window.localStorage.getItem(REMEMBER_EMAIL_KEY) || '';
      setRememberMe(rememberEnabled);
      // If the user navigated here with a specific email in the URL, prefer that.
      if (!hasQueryEmail && rememberEnabled && rememberedEmail) {
        setEmail(rememberedEmail);
      }
    } finally {
      setRememberPrefsReady(true);
    }
  }, [hasQueryEmail]);

  useEffect(() => {
    const messages: string[] = [];

    if (verified) {
      messages.push(isArabic ? 'تم التحقق من البريد الإلكتروني. يمكنك تسجيل الدخول الآن.' : 'Email verified. You can sign in now.');
    }
    if (reset) {
      messages.push(isArabic ? 'تم تحديث كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.' : 'Password updated. Sign in with your new password.');
    }
    if (registered) {
      messages.push(isArabic ? 'تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.' : 'Account created successfully. You can sign in now.');
    }

    if (messages.length > 0) {
      setInfoMessage(messages[0]);
    }
  }, [isArabic, registered, reset, verified]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBusy) return;
    setError('');
    setInfoMessage('');
    setEmailError('');
    setPasswordError('');
    setNeedsVerification(false);
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setEmailError(isArabic ? 'البريد الإلكتروني مطلوب.' : 'Email is required.');
      return;
    }
    if (!isValidEmail(normalizedEmail)) {
      setEmailError(isArabic ? 'أدخل بريدًا إلكترونيًا صحيحًا.' : 'Enter a valid email address.');
      return;
    }
    if (!password) {
      setPasswordError(isArabic ? 'كلمة المرور مطلوبة.' : 'Password is required.');
      return;
    }

    flushSync(() => setLoading(true));

    let res;
    try {
      res = await signIn('credentials', {
        email: normalizedEmail,
        password,
        redirect: false,
        callbackUrl,
      });
    } catch (signInError) {
      console.error('[auth] signIn failed', signInError);
      setLoading(false);
      setError(
        isArabic
          ? 'تعذر إتمام تسجيل الدخول حالياً. تحقق من الاتصال وحاول مرة أخرى.'
          : 'Unable to sign in right now. Check your connection and try again.'
      );
      return;
    }

    if (res?.error) {
      setLoading(false);
      if (res.error.includes('EMAIL_NOT_VERIFIED')) {
        setNeedsVerification(true);
        setError(isArabic ? 'لم يتم التحقق من بريدك الإلكتروني بعد.' : 'Your email is not verified yet.');
      } else {
        setError(isArabic ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Invalid email or password.');
      }
      return;
    }

    if (rememberMe) {
      window.localStorage.setItem(REMEMBER_ENABLED_KEY, '1');
      window.localStorage.setItem(REMEMBER_EMAIL_KEY, normalizedEmail);
    } else {
      window.localStorage.removeItem(REMEMBER_ENABLED_KEY);
      window.localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
    setLoading(false);
    setRedirecting(true);
    const redirectTarget = (() => {
      const fallback = callbackUrl || '/';
      const candidate = typeof res?.url === 'string' ? res.url : fallback;
      try {
        const parsed = new URL(candidate, window.location.origin);
        if (parsed.origin !== window.location.origin) return fallback;
        return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
      } catch {
        return fallback;
      }
    })();
    window.location.replace(redirectTarget);
  };

  const resendVerification = async () => {
    if (!email.trim() || resendingVerification) return;
    flushSync(() => setResendingVerification(true));
    setError('');
    setInfoMessage('');
    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data?.error || 'Unable to resend verification code.');
      }
      setInfoMessage(
        data?.message || (isArabic ? 'تم إرسال رمز التحقق.' : 'Verification code sent.')
      );
    } catch (resendError) {
      setError(
        resendError instanceof Error
          ? resendError.message
          : isArabic
            ? 'تعذر إعادة إرسال رمز التحقق.'
            : 'Unable to resend verification code.'
      );
    } finally {
      setResendingVerification(false);
    }
  };

  return (
    <AuthShell
      title={isArabic ? 'تسجيل الدخول' : 'Sign In'}
      description={
        isArabic
          ? 'ادخل إلى مساحة العمل الموثقة وتابع الأتمتة الخاصة بك.'
          : 'Access your verified workspace and continue your automation flow.'
      }
      logoSize={100}
      logoShowText={false}
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="login-email">{isArabic ? 'البريد الإلكتروني' : 'Email'}</Label>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
              if (error) setError('');
            }}
            placeholder={isArabic ? 'you@example.com' : 'you@example.com'}
            autoComplete="email"
            aria-invalid={Boolean(emailError)}
            disabled={isBusy}
            required
          />
          {emailError ? <p className="text-xs text-destructive">{emailError}</p> : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="login-password">{isArabic ? 'كلمة المرور' : 'Password'}</Label>
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError('');
                if (error) setError('');
              }}
              onKeyUp={(e) => setCapsLockOn(e.getModifierState('CapsLock'))}
              placeholder={isArabic ? '••••••••' : '••••••••'}
              autoComplete="current-password"
              aria-invalid={Boolean(passwordError)}
              disabled={isBusy}
              required
              className="pr-11"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1 h-8 w-8"
              aria-label={showPassword ? (isArabic ? 'إخفاء كلمة المرور' : 'Hide password') : (isArabic ? 'إظهار كلمة المرور' : 'Show password')}
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={isBusy}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </Button>
          </div>
          {capsLockOn ? (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {isArabic ? 'زر Caps Lock مفعل.' : 'Caps Lock is on.'}
            </p>
          ) : null}
          {passwordError ? <p className="text-xs text-destructive">{passwordError}</p> : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          {rememberPrefsReady ? (
            <label htmlFor="login-remember-me" className="inline-flex cursor-pointer items-center gap-2 text-muted-foreground">
              <input
                id="login-remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-primary"
                disabled={isBusy}
              />
              {isArabic ? 'تذكرني' : 'Remember me'}
            </label>
          ) : (
            <span className="h-5" />
          )}
          <Link href="/forgot-password" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
            {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
          </Link>
        </div>

        <div aria-live="polite" className="space-y-2">
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {infoMessage ? <p className="text-sm text-foreground">{infoMessage}</p> : null}
        </div>

        {needsVerification && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm">
            <p className="mb-2 inline-flex items-center gap-2 font-medium text-amber-700 dark:text-amber-300">
              <MailWarning size={14} />
              {isArabic ? 'التحقق من البريد الإلكتروني مطلوب' : 'Email verification pending'}
            </p>
            <p className="mb-3 text-amber-700/90 dark:text-amber-200">
              {isArabic ? 'تحقق من بريدك الإلكتروني أولاً ثم سجّل الدخول مرة أخرى.' : 'Verify your email first, then sign in again.'}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={resendVerification}
              disabled={resendingVerification}
            >
              {resendingVerification
                ? isArabic
                  ? 'جاري إعادة الإرسال...'
                  : 'Resending...'
                : isArabic
                  ? 'إعادة إرسال رمز التحقق'
                  : 'Resend verification code'}
            </Button>
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isBusy}>
          {redirecting
            ? isArabic
              ? 'جاري التحويل...'
              : 'Redirecting...'
            : loading
            ? isArabic
              ? 'جاري تسجيل الدخول...'
              : 'Signing in...'
            : isArabic
              ? 'تسجيل الدخول'
              : 'Sign In'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          {t('auth.dontHaveAccount', "Don't have an account?")}{' '}
          <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
            {t('auth.createOne', 'Create one')}
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          {isArabic ? 'بتسجيل الدخول فأنت توافق على' : 'By signing in, you agree to our'}{' '}
          <Link href="/terms" className="font-medium text-primary underline-offset-4 hover:underline">
            {isArabic ? 'شروط الخدمة' : 'Terms of Service'}
          </Link>{' '}
          {isArabic ? 'و' : 'and'}{' '}
          <Link href="/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
            {isArabic ? 'سياسة الخصوصية' : 'Privacy Policy'}
          </Link>
          .
        </p>
        <p className="text-center text-[11px] text-muted-foreground/90">{creditLine}</p>
      </form>
    </AuthShell>
  );
}
