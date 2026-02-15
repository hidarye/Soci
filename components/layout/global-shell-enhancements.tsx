'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  BookOpenText,
  Command,
  History,
  Keyboard,
  Megaphone,
  Plus,
  Sparkles,
  WandSparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NAV_ITEMS } from '@/components/layout/nav-items';
import { cn } from '@/lib/utils';

type CommandAction = {
  id: string;
  title: string;
  description: string;
  href: string;
  keywords: string[];
};

const RECENT_PATHS_KEY = 'socialflow_recent_paths_v1';
const MAX_RECENT_PATHS = 6;
const AUTH_ROUTES = ['/login', '/register', '/verify-email', '/forgot-password', '/reset-password'];

const QUICK_ACTIONS: CommandAction[] = [
  {
    id: 'create-task',
    title: 'Create Task',
    description: 'Launch automation task wizard',
    href: '/tasks/new',
    keywords: ['new', 'automation', 'task'],
  },
  {
    id: 'accounts',
    title: 'Connect Account',
    description: 'Add a social platform account',
    href: '/accounts',
    keywords: ['account', 'connect', 'oauth'],
  },
  {
    id: 'analytics',
    title: 'Open Analytics',
    description: 'Review performance insights',
    href: '/analytics',
    keywords: ['chart', 'performance', 'stats'],
  },
  {
    id: 'settings',
    title: 'Workspace Settings',
    description: 'Customize themes and credentials',
    href: '/settings',
    keywords: ['theme', 'credentials', 'preferences'],
  },
];

function buildNavActions(): CommandAction[] {
  return NAV_ITEMS.map((item) => ({
    id: `nav:${item.href}`,
    title: item.label,
    description: item.caption,
    href: item.href,
    keywords: [item.label.toLowerCase(), item.caption.toLowerCase()],
  }));
}

function displayPathLabel(path: string) {
  const nav = NAV_ITEMS.find((item) => item.href.split('?')[0] === path.split('?')[0]);
  if (nav) return nav.label;
  if (path === '/') return 'Dashboard';
  return path.replace(/\//g, ' / ').trim();
}

export function GlobalShellEnhancements() {
  const router = useRouter();
  const pathname = usePathname();
  const hasMountedPathRef = useRef(false);
  const [isOnline, setIsOnline] = useState(true);
  const [routeChanging, setRouteChanging] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentPaths, setRecentPaths] = useState<string[]>([]);

  const navActions = useMemo(buildNavActions, []);

  useEffect(() => {
    let cancelled = false;
    let probeInFlight = false;

    const probeConnectivity = async () => {
      if (probeInFlight || cancelled) return;
      probeInFlight = true;
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
          credentials: 'same-origin',
        });
        if (!cancelled) {
          setIsOnline(response.ok || response.status === 401 || response.status === 403);
        }
      } catch {
        if (!cancelled) {
          setIsOnline(false);
        }
      } finally {
        probeInFlight = false;
      }
    };

    const syncOnlineState = () => {
      if (navigator.onLine) {
        setIsOnline(true);
        return;
      }
      void probeConnectivity();
    };

    syncOnlineState();

    const onOnline = () => setIsOnline(true);
    const onOffline = () => {
      setIsOnline(false);
      void probeConnectivity();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    const interval = window.setInterval(() => {
      syncOnlineState();
    }, 15000);

    return () => {
      cancelled = true;
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!hasMountedPathRef.current) {
      hasMountedPathRef.current = true;
      return;
    }
    setRouteChanging(true);
    const timer = window.setTimeout(() => setRouteChanging(false), 360);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const basePath = pathname || '/';
    setRecentPaths((prev) => {
      const next = [basePath, ...prev.filter((item) => item !== basePath)].slice(0, MAX_RECENT_PATHS);
      try {
        window.localStorage.setItem(RECENT_PATHS_KEY, JSON.stringify(next));
      } catch {
        // ignore storage failures
      }
      return next;
    });
  }, [pathname]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(RECENT_PATHS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecentPaths(parsed.filter((item): item is string => typeof item === 'string').slice(0, MAX_RECENT_PATHS));
      }
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
      if (event.shiftKey && event.key === '?') {
        event.preventDefault();
        setShortcutsOpen(true);
      }
      if (event.key === 'Escape') {
        setFabOpen(false);
      }
    };
    const onOpenPalette = () => setCommandOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('open-global-command-palette', onOpenPalette as EventListener);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('open-global-command-palette', onOpenPalette as EventListener);
    };
  }, []);

  const normalized = query.trim().toLowerCase();
  const filteredQuickActions = QUICK_ACTIONS.filter((item) => {
    if (!normalized) return true;
    return (
      item.title.toLowerCase().includes(normalized) ||
      item.description.toLowerCase().includes(normalized) ||
      item.keywords.some((keyword) => keyword.includes(normalized))
    );
  });

  const filteredNav = navActions.filter((item) => {
    if (!normalized) return true;
    return (
      item.title.toLowerCase().includes(normalized) ||
      item.description.toLowerCase().includes(normalized) ||
      item.keywords.some((keyword) => keyword.includes(normalized))
    );
  });

  const openHref = (href: string) => {
    setCommandOpen(false);
    setFabOpen(false);
    router.push(href);
  };

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isAuthRoute) {
    return null;
  }

  return (
    <>
      {routeChanging && <div className="route-progress animate-pulse-glow" />}
      {!isOnline && (
        <div className="offline-banner">
          <div className="flex items-center gap-2">
            <Activity size={15} />
            Connection lost. You are offline. Changes may be delayed until network is restored.
          </div>
        </div>
      )}

      <div className="fixed z-40 flex flex-col items-end gap-2 bottom-[max(0.75rem,env(safe-area-inset-bottom))] [inset-inline-end:max(0.75rem,env(safe-area-inset-right))] sm:bottom-5 sm:[inset-inline-end:1.25rem]">
        {fabOpen && (
          <div className="animate-fade-up space-y-2 rounded-2xl border border-border/70 bg-card/92 p-2 shadow-2xl backdrop-blur-xl">
            <Button variant="ghost" className="w-full justify-start" onClick={() => setCommandOpen(true)}>
              <Command size={15} />
              Command Palette
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => openHref('/tasks/new')}>
              <Plus size={15} />
              New Task
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => setShortcutsOpen(true)}>
              <Keyboard size={15} />
              Keyboard Shortcuts
            </Button>
            <Button variant="ghost" className="w-full justify-start" onClick={() => setUpdatesOpen(true)}>
              <Megaphone size={15} />
              What's New
            </Button>
          </div>
        )}

        <Button
          size="icon"
          className={cn(
            'h-10 w-10 rounded-2xl shadow-xl sm:h-12 sm:w-12',
            fabOpen ? 'bg-foreground text-background' : 'bg-primary text-primary-foreground'
          )}
          onClick={() => setFabOpen((prev) => !prev)}
          aria-label="Open quick actions"
        >
          <WandSparkles size={18} />
        </Button>
      </div>

      <Dialog open={commandOpen} onOpenChange={setCommandOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Command size={16} />
              Command Palette
            </DialogTitle>
            <DialogDescription>
              Use `Ctrl/Cmd + K` to jump anywhere quickly.
            </DialogDescription>
          </DialogHeader>

          <Input
            autoFocus
            placeholder="Search actions, pages, workflows..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="max-h-[52vh] space-y-4 overflow-y-auto pr-1">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Quick Actions
              </p>
              <div className="space-y-1.5">
                {filteredQuickActions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full rounded-xl border border-border/70 bg-card/55 px-3 py-2 text-left transition-colors hover:bg-card"
                    onClick={() => openHref(item.href)}
                  >
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Navigation
              </p>
              <div className="space-y-1.5">
                {filteredNav.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full rounded-xl border border-border/70 bg-card/55 px-3 py-2 text-left transition-colors hover:bg-card"
                    onClick={() => openHref(item.href)}
                  >
                    <p className="text-sm font-semibold text-foreground">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {recentPaths.length > 0 && !normalized && (
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <History size={13} />
                  Recently Viewed
                </p>
                <div className="space-y-1.5">
                  {recentPaths.map((path) => (
                    <button
                      key={path}
                      type="button"
                      className="w-full rounded-xl border border-border/70 bg-card/55 px-3 py-2 text-left transition-colors hover:bg-card"
                      onClick={() => openHref(path)}
                    >
                      <p className="text-sm font-semibold text-foreground">{displayPathLabel(path)}</p>
                      <p className="text-xs text-muted-foreground">{path}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard size={16} />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>Speed up navigation and operations.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
              <span>Open Command Palette</span>
              <code className="text-xs">Ctrl/Cmd + K</code>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
              <span>Open Shortcuts</span>
              <code className="text-xs">Shift + ?</code>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2">
              <span>Create New Task</span>
              <code className="text-xs">via palette</code>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={updatesOpen} onOpenChange={setUpdatesOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles size={16} />
              What's New
            </DialogTitle>
            <DialogDescription>Latest UI and productivity upgrades.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="rounded-lg border border-border/70 p-3">
              <p className="mb-1 flex items-center gap-2 font-semibold">
                <BookOpenText size={14} />
                Smart Navigation Layer
              </p>
              <p className="text-muted-foreground">Command palette, quick actions, and recent page history are now available globally.</p>
            </div>
            <div className="rounded-lg border border-border/70 p-3">
              <p className="mb-1 flex items-center gap-2 font-semibold">
                <Keyboard size={14} />
                Faster Operator Workflow
              </p>
              <p className="text-muted-foreground">New keyboard shortcuts and performance-focused shell polish.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
