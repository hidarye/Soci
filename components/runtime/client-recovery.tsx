'use client';

import { useEffect } from 'react';

const RECOVERY_KEY = 'socialflow_client_recovery_once_v1';

function isRecoverableClientLoadError(value: unknown): boolean {
  const text = String(value || '').toLowerCase();
  if (!text) return false;
  return (
    text.includes('chunkloaderror') ||
    text.includes('loading chunk') ||
    text.includes('failed to fetch dynamically imported module')
  );
}

function isChunkAssetUrl(url: string): boolean {
  const normalized = String(url || '').toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes('/_next/') &&
    (normalized.includes('/chunks/') || normalized.includes('/app/')) &&
    (normalized.endsWith('.js') || normalized.endsWith('.mjs') || normalized.endsWith('.css'))
  );
}

export function ClientRecovery() {
  // Dev mode can trigger many non-fatal transient resource events (HMR, blocked assets, etc.).
  // Recovery reloads are only useful in production for broken chunk/module states.
  if (process.env.NODE_ENV !== 'production') {
    return null;
  }

  useEffect(() => {
    const recover = () => {
      try {
        const alreadyRecovered = window.sessionStorage.getItem(RECOVERY_KEY) === '1';
        if (alreadyRecovered) return;
        window.sessionStorage.setItem(RECOVERY_KEY, '1');
      } catch {
        // ignore storage failures
      }

      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      const target = event.target as (EventTarget & { src?: string; href?: string; tagName?: string }) | null;
      const resourceUrl = target?.src || target?.href || '';
      const resourceTag = String(target?.tagName || '').toUpperCase();
      const chunkResourceFailure =
        (resourceTag === 'SCRIPT' || resourceTag === 'LINK') && isChunkAssetUrl(resourceUrl);

      if (
        chunkResourceFailure ||
        isRecoverableClientLoadError(event.message) ||
        isRecoverableClientLoadError(event.error)
      ) {
        recover();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isRecoverableClientLoadError(event.reason)) {
        recover();
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onUnhandledRejection);

    // Once the session remains stable for a short period, re-enable future one-time recovery.
    const clearKeyTimer = window.setTimeout(() => {
      try {
        window.sessionStorage.removeItem(RECOVERY_KEY);
      } catch {
        // ignore storage failures
      }
    }, 15000);

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onUnhandledRejection);
      window.clearTimeout(clearKeyTimer);
    };
  }, []);

  return null;
}
