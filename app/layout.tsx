import React from "react"
import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import Providers from './providers'
import { Toaster } from 'sonner'
import { DeferredGlobalShellEnhancements } from '@/components/layout/deferred-global-shell-enhancements'
import { PwaRegistration } from '@/components/pwa/pwa-registration'
import { InstallAppPrompt } from '@/components/pwa/install-app-prompt'
import { ClientRecovery } from '@/components/runtime/client-recovery'
import './globals.css'

export const metadata: Metadata = {
  title: 'SocialFlow - Social Media Automation Platform',
  description: 'Professional social media automation, scheduling, and analytics platform. Connect multiple accounts across Facebook, Instagram, Twitter, TikTok, YouTube, Telegram, and LinkedIn.',
  generator: 'v0.app',
  applicationName: 'SocialFlow',
  keywords: 'social media, automation, scheduling, buffer, zapier, ifttt, facebook, instagram, twitter, tiktok, youtube',
  authors: [{ name: 'SocialFlow' }],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'SocialFlow',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef3ff' },
    { media: '(prefers-color-scheme: dark)', color: '#0d1422' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // Runs before the main UI is parsed:
          // - Applies a theme class early to avoid FOUC (we use `.dark` CSS variables).
          // - Seeds shell layout/theme attributes before hydration.
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    var root = document.documentElement;
    // Theme init (compatible with next-themes defaults)
    var storedTheme = localStorage.getItem('theme');
    var preferredDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    var resolvedTheme = storedTheme === 'dark' || storedTheme === 'light'
      ? storedTheme
      : (preferredDark ? 'dark' : 'light');
    if (resolvedTheme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');

    var shellSidebarKey = 'socialflow_shell_sidebar_collapsed_v1';
    var shellReducedMotionKey = 'socialflow_shell_reduced_motion_v1';
    var shellDensityKey = 'socialflow_shell_density_v1';
    root.setAttribute('data-shell-ready', '0');
    // Route loading UI is handled by app/loading.tsx only when Next.js has real pending work.
    root.dataset.bootSplash = '0';

    // Shell init: apply sidebar/density/reduced-motion before first paint to avoid layout flash.
    var isCompactViewport = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
    var isTabletViewport = window.matchMedia && window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches;
    var rawCollapsed = localStorage.getItem(shellSidebarKey);
    var sidebarCollapsed = rawCollapsed === '1';
    if (isTabletViewport) sidebarCollapsed = true;
    var shellSidebarWidth = isCompactViewport ? '0rem' : (sidebarCollapsed ? '5.5rem' : '18rem');
    var shellContentOffset = isCompactViewport ? '0rem' : (sidebarCollapsed ? '6.25rem' : '18.75rem');
    var shellBorderWidth = isCompactViewport ? '0px' : '1px';
    root.style.setProperty('--shell-sidebar-width', shellSidebarWidth);
    root.style.setProperty('--shell-content-offset', shellContentOffset);
    root.style.setProperty('--shell-sidebar-border-width', shellBorderWidth);
    root.dataset.shellSidebarCollapsed = sidebarCollapsed ? '1' : '0';

    var rawReducedMotion = localStorage.getItem(shellReducedMotionKey);
    if (rawReducedMotion === '1' || rawReducedMotion === '0') {
      root.setAttribute('data-reduced-motion', rawReducedMotion === '1' ? 'true' : 'false');
    }
    var rawDensity = localStorage.getItem(shellDensityKey);
    if (rawDensity === 'comfortable' || rawDensity === 'compact') {
      root.setAttribute('data-density', rawDensity);
    }
  } catch {}
})();`,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <Providers>
          <ClientRecovery />
          <PwaRegistration />
          <DeferredGlobalShellEnhancements />
          <InstallAppPrompt />
          {children}
        </Providers>
        <Toaster richColors />
        <Analytics />
      </body>
    </html>
  )
}
