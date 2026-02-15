'use client';

import { useEffect } from 'react';

const SPLASH_SESSION_KEY = 'socialflow_splash_seen_v2';
const SPLASH_MIN_SHOW_MS = 460;
const SPLASH_EXIT_MS = 260;

export function SplashOverlay() {
  useEffect(() => {
    const root = document.documentElement;
    const bootEnabled = root.dataset.bootSplash === '1';
    if (!bootEnabled) return;

    // Mark splash as seen as early as possible to prevent replay on same-tab refreshes.
    try {
      window.sessionStorage.setItem(SPLASH_SESSION_KEY, '1');
    } catch {
      // ignore storage failures
    }

    const bootSplash = document.querySelector<HTMLElement>('.boot-splash');
    if (!bootSplash) {
      delete root.dataset.bootSplash;
      return;
    }

    const startedAt = performance.now();

    const removeSplash = () => {
      delete root.dataset.bootSplash;
      bootSplash.remove();
    };

    const runExit = () => {
      bootSplash.classList.add('splash-overlay--exit');
    };

    const handleAnimationEnd = (event: AnimationEvent) => {
      if (event.target !== bootSplash) return;
      if (event.animationName !== 'splash-fade-out') return;
      removeSplash();
    };

    bootSplash.addEventListener('animationend', handleAnimationEnd);

    const remaining = Math.max(0, SPLASH_MIN_SHOW_MS - (performance.now() - startedAt));
    const exitTimer = window.setTimeout(() => {
      window.requestAnimationFrame(runExit);
    }, remaining);

    // Safety net in case animationend is interrupted by tab changes or reduced-motion settings.
    const hideTimer = window.setTimeout(removeSplash, remaining + SPLASH_EXIT_MS + 200);

    return () => {
      bootSplash.removeEventListener('animationend', handleAnimationEnd);
      window.clearTimeout(exitTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  return null;
}
