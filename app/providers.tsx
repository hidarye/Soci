'use client';

import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from '@/components/theme-provider';
import { ShellProvider } from '@/components/layout/shell-provider';
import { LanguageProvider } from '@/components/i18n/language-provider';
import { RuntimeLocalizer } from '@/components/i18n/runtime-localizer';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchOnWindowFocus={false} refetchInterval={0} refetchWhenOffline={false}>
      <LanguageProvider>
        <RuntimeLocalizer />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ShellProvider>{children}</ShellProvider>
        </ThemeProvider>
      </LanguageProvider>
    </SessionProvider>
  );
}
