'use client';

import { useEffect } from 'react';

const RECOVERY_KEY = 'socialflow_client_recovery_once_v1';

function isRecoverableClientLoadError(value: unknown): boolean {
  const text = String(value || '').toLowerCase();
  if (!text) return false;
  return (
    text.includes('chunkloaderror') ||
    text.includes('loading chunk') ||
    text.includes('failed to fetch dynamically imported module') ||
    text.includes('failed to load resource')
  );
}

export function ClientRecovery() {
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
      if (isRecoverableClientLoadError(event.message) || isRecoverableClientLoadError(event.error)) {
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
