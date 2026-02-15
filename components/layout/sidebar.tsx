'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  Activity,
  LogOut,
  Menu,
  PanelLeftClose,
  Sparkles,
  UserCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getNavItemContent, NAV_ITEMS } from '@/components/layout/nav-items';
import { useShellPreferences } from '@/components/layout/shell-provider';
import { Button } from '@/components/ui/button';
import { AppLogo } from '@/components/common/app-logo';
import { useLanguage } from '@/components/i18n/language-provider';
import { useSession } from 'next-auth/react';

function SidebarContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { sidebarCollapsed, toggleSidebarCollapsed } = useShellPreferences();
  const { locale, t } = useLanguage();
  const { data: session } = useSession();
  const profileName = String(session?.user?.name || '').trim();
  const firstName = profileName ? profileName.split(/\s+/)[0] : '';

  const isActiveItem = (href: string) => {
    const [baseHref, query] = href.split('?');
    const pathMatch =
      baseHref === '/'
        ? pathname === baseHref
        : pathname === baseHref || pathname.startsWith(`${baseHref}/`);
    if (!pathMatch) return false;

    if (!query) {
      if (baseHref === '/tasks' && searchParams.get('create') === '1') return false;
      return true;
    }

    const expected = new URLSearchParams(query);
    for (const [key, value] of expected.entries()) {
      if (searchParams.get(key) !== value) return false;
    }
    return true;
  };

  return (
    <aside
      className="shell-sidebar surface-card relative hidden h-screen w-[var(--shell-sidebar-width)] flex-col overflow-hidden border-r border-sidebar-border/80 md:fixed md:top-0 md:z-30 md:[inset-inline-start:0] md:flex"
      style={{ borderInlineEndWidth: 'var(--shell-sidebar-border-width)' }}
    >
      <div className="border-b border-sidebar-border/80 px-6 py-6">
        <div className="mb-4 flex items-center justify-between">
          {sidebarCollapsed && (
            <AppLogo size={32} showText={false} />
          )}
          {!sidebarCollapsed && (
            <div className="kpi-pill w-fit gap-2">
              <Sparkles size={14} />
              {t('sidebar.controlCenter', 'Control Center')}
            </div>
          )}
        </div>
        {!sidebarCollapsed && (
          <>
            <AppLogo
              size={34}
              text={t('sidebar.orbitTitle', 'SocialFlow Orbit')}
              textClassName="text-2xl font-semibold tracking-tight text-sidebar-foreground"
              className="mb-1"
            />
            <p className="mt-1 text-sm text-sidebar-foreground/70">
              {t('sidebar.orbitSubtitle', 'Next-gen multi-platform automation cockpit')}
            </p>
          </>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-5">
        <div className="space-y-2">
          <button
            type="button"
            onClick={toggleSidebarCollapsed}
            className={cn(
              'group relative flex w-full items-start gap-3 rounded-2xl border px-4 py-3 transition-all duration-300',
              sidebarCollapsed && 'justify-center px-2',
              'border-sidebar-border/70 bg-sidebar-accent/45 text-sidebar-foreground hover:border-sidebar-border hover:bg-sidebar-accent/75'
            )}
            title={
              sidebarCollapsed
                ? t('sidebar.expandSidebar', 'Expand sidebar')
                : t('sidebar.collapseSidebar', 'Collapse sidebar')
            }
            aria-label={
              sidebarCollapsed
                ? t('sidebar.expandSidebar', 'Expand sidebar')
                : t('sidebar.collapseSidebar', 'Collapse sidebar')
            }
          >
            <div
              className={cn(
                'mt-0.5 rounded-lg bg-sidebar-accent/30 p-2 transition-colors group-hover:bg-sidebar-accent',
                sidebarCollapsed && 'mt-0'
              )}
            >
              {sidebarCollapsed ? <Menu size={16} /> : <PanelLeftClose size={16} />}
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {t('sidebar.toggleSidebar', 'Toggle Sidebar')}
                </p>
                <p className="truncate text-xs text-sidebar-foreground/65">
                  {t('sidebar.toggleSidebarCaption', 'Collapse or expand navigation')}
                </p>
              </div>
            )}
          </button>

          {NAV_ITEMS.map((item, index) => {
            const Icon = item.icon;
            const isActive = isActiveItem(item.href);
            const itemContent = getNavItemContent(item, locale);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group relative flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all duration-300 animate-fade-up',
                  sidebarCollapsed && 'justify-center px-2',
                  isActive
                    ? 'border-sidebar-primary/38 bg-sidebar-primary/92 text-sidebar-primary-foreground shadow-lg shadow-primary/22'
                    : 'border-transparent text-sidebar-foreground hover:border-sidebar-border hover:bg-sidebar-accent/75'
                )}
                style={{ animationDelay: `${index * 45}ms` }}
                title={sidebarCollapsed ? itemContent.label : undefined}
              >
                <div
                  className={cn(
                    'mt-0.5 rounded-lg p-2 transition-colors',
                    sidebarCollapsed && 'mt-0',
                    isActive
                      ? 'bg-sidebar-primary-foreground/12'
                      : 'bg-sidebar-accent/30 group-hover:bg-sidebar-accent'
                  )}
                >
                  <Icon size={16} />
                </div>
                {!sidebarCollapsed && (
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{itemContent.label}</p>
                    <p
                      className={cn(
                        'truncate text-xs',
                        isActive
                          ? 'text-sidebar-primary-foreground/85'
                          : 'text-sidebar-foreground/65'
                      )}
                    >
                      {itemContent.caption}
                    </p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {!sidebarCollapsed && (
        <div className="border-t border-sidebar-border/80 p-4">
          <div className="rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/45 p-4">
            <div className="mb-2 flex items-center gap-2 text-sidebar-foreground">
              <Activity size={14} className="text-accent animate-pulse-glow rounded-full" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {t('sidebar.liveStatus', 'Live Status')}
              </span>
            </div>
            <p className="text-xs leading-relaxed text-sidebar-foreground/70">
              {t(
                'sidebar.liveStatusDescription',
                'Runtime healthy. Last sync cycle completed and all services online.'
              )}
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-sidebar-border/80 p-4">
        <div className={cn('flex items-center gap-2', sidebarCollapsed ? 'justify-center' : 'justify-start')}>
          <Button
            type="button"
            variant="outline"
            size={sidebarCollapsed ? 'icon' : 'default'}
            className={cn(
              'rounded-xl border-sidebar-border/70 bg-sidebar-accent/45',
              sidebarCollapsed ? 'h-9 w-9' : 'h-9 px-3'
            )}
            onClick={() => {
              window.dispatchEvent(new CustomEvent('open-profile-settings'));
            }}
            aria-label={t('header.profile', 'Profile')}
            title={t('header.profile', 'Profile')}
          >
            <UserCircle2 size={16} />
            {!sidebarCollapsed ? <span className="max-w-[8rem] truncate">{firstName || 'Profile'}</span> : null}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-xl border-sidebar-border/70 bg-sidebar-accent/45 text-destructive hover:text-destructive"
            onClick={() => {
              window.dispatchEvent(new CustomEvent('request-logout'));
            }}
            aria-label={t('header.logout', 'Logout')}
            title={t('header.logout', 'Logout')}
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </aside>
  );
}

export function Sidebar() {
  return (
    <Suspense fallback={<aside className="shell-sidebar surface-card hidden h-screen w-[var(--shell-sidebar-width)] overflow-hidden border-r border-sidebar-border/80 md:fixed md:top-0 md:z-30 md:[inset-inline-start:0] md:block" style={{ borderInlineEndWidth: 'var(--shell-sidebar-border-width)' }} />}>
      <SidebarContent />
    </Suspense>
  );
}
