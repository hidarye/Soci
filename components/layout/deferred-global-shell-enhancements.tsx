'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const DeferredEnhancements = dynamic(
  () => import('@/components/layout/global-shell-enhancements').then((mod) => mod.GlobalShellEnhancements),
  { ssr: false }
);

const FALLBACK_DELAY_MS = 360;
const IDLE_TIMEOUT_MS = 1200;
const BOOT_SPLASH_WAIT_MS = 2200;

type IdleCallbackHandle = number;
type IdleCallback = (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void;

type IdleWindow = Window & {
  requestIdleCallback?: (cb: IdleCallback, options?: { timeout: number }) => IdleCallbackHandle;
  cancelIdleCallback?: (id: IdleCallbackHandle) => void;
};

export function DeferredGlobalShellEnhancements() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const idleWindow = window as IdleWindow;
    let fallbackTimer: number | null = null;
    let bootWaitTimer: number | null = null;
    let idleHandle: IdleCallbackHandle | null = null;
    let observer: MutationObserver | null = null;

    const scheduleLoad = () => {
      if (idleWindow.requestIdleCallback) {
        idleHandle = idleWindow.requestIdleCallback(
          () => {
            setReady(true);
          },
          { timeout: IDLE_TIMEOUT_MS }
        );
        return;
      }
      fallbackTimer = window.setTimeout(() => {
        setReady(true);
      }, FALLBACK_DELAY_MS);
    };

    if (root.dataset.bootSplash !== '1') {
      scheduleLoad();
    } else {
      observer = new MutationObserver(() => {
        if (root.dataset.bootSplash === '1') return;
        observer?.disconnect();
        observer = null;
        scheduleLoad();
      });
      observer.observe(root, { attributes: true, attributeFilter: ['data-boot-splash'] });
      bootWaitTimer = window.setTimeout(() => {
        scheduleLoad();
      }, BOOT_SPLASH_WAIT_MS);
    }

    return () => {
      if (fallbackTimer) window.clearTimeout(fallbackTimer);
      if (bootWaitTimer) window.clearTimeout(bootWaitTimer);
      if (idleHandle !== null && idleWindow.cancelIdleCallback) {
        idleWindow.cancelIdleCallback(idleHandle);
      }
      observer?.disconnect();
    };
  }, []);

  return ready ? <DeferredEnhancements /> : null;
}
