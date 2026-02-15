'use client';

import * as React from 'react';

type DensityMode = 'comfortable' | 'compact';

type ShellContextValue = {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (value: boolean) => void;
  toggleSidebarCollapsed: () => void;
  reducedMotion: boolean;
  setReducedMotion: (value: boolean) => void;
  density: DensityMode;
  setDensity: (value: DensityMode) => void;
};

const SHELL_SIDEBAR_KEY = 'socialflow_shell_sidebar_collapsed_v1';
const SHELL_REDUCED_MOTION_KEY = 'socialflow_shell_reduced_motion_v1';
const SHELL_DENSITY_KEY = 'socialflow_shell_density_v1';

const ShellContext = React.createContext<ShellContextValue | null>(null);

type InitialShellState = {
  sidebarCollapsed: boolean;
  reducedMotion: boolean;
  density: DensityMode;
  isCompactViewport: boolean;
};

function readInitialShellState(): InitialShellState {
  if (typeof window === 'undefined') {
    return {
      sidebarCollapsed: false,
      reducedMotion: false,
      density: 'comfortable',
      isCompactViewport: false,
    };
  }

  const root = document.documentElement;
  const isCompactViewport = window.matchMedia('(max-width: 767px)').matches;
  const isTabletViewport = window.matchMedia('(min-width: 768px) and (max-width: 1023px)').matches;

  let sidebarCollapsed = root.dataset.shellSidebarCollapsed === '1';
  let hasStoredSidebarPreference = false;
  try {
    const rawStoredCollapsed = window.localStorage.getItem(SHELL_SIDEBAR_KEY);
    if (rawStoredCollapsed === '1' || rawStoredCollapsed === '0') {
      hasStoredSidebarPreference = true;
      sidebarCollapsed = rawStoredCollapsed === '1';
    }
  } catch {
    // ignore storage failures
  }
  if (!hasStoredSidebarPreference) {
    sidebarCollapsed = isTabletViewport;
  }

  let reducedMotion = root.getAttribute('data-reduced-motion') === 'true';
  let density: DensityMode = root.getAttribute('data-density') === 'compact' ? 'compact' : 'comfortable';
  try {
    if (!reducedMotion) {
      reducedMotion = window.localStorage.getItem(SHELL_REDUCED_MOTION_KEY) === '1';
    }
    const rawDensity = window.localStorage.getItem(SHELL_DENSITY_KEY);
    if (rawDensity === 'comfortable' || rawDensity === 'compact') {
      density = rawDensity;
    }
  } catch {
    // ignore storage failures
  }

  return {
    sidebarCollapsed,
    reducedMotion,
    density,
    isCompactViewport,
  };
}

export function ShellProvider({ children }: { children: React.ReactNode }) {
  const initialStateRef = React.useRef<InitialShellState | null>(null);
  if (initialStateRef.current === null) {
    initialStateRef.current = readInitialShellState();
  }
  const initialState = initialStateRef.current;

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(initialState.sidebarCollapsed);
  const [reducedMotion, setReducedMotion] = React.useState(initialState.reducedMotion);
  const [density, setDensity] = React.useState<DensityMode>(initialState.density);
  const [isCompactViewport, setIsCompactViewport] = React.useState(initialState.isCompactViewport);
  const [viewportReady, setViewportReady] = React.useState(false);

  React.useEffect(() => {
    // Compact behavior is mobile-only. Tablets keep desktop-style spacing.
    const compactQuery = window.matchMedia('(max-width: 767px)');
    const syncCompactViewport = () => {
      setIsCompactViewport(compactQuery.matches);
      setViewportReady(true);
    };
    syncCompactViewport();
    compactQuery.addEventListener('change', syncCompactViewport);
    return () => {
      compactQuery.removeEventListener('change', syncCompactViewport);
    };
  }, []);

  React.useEffect(() => {
    if (!viewportReady) return;
    const root = document.documentElement;
    const compactCollapsed = isCompactViewport && sidebarCollapsed;
    root.style.setProperty('--shell-sidebar-width', compactCollapsed ? '0rem' : sidebarCollapsed ? '5.5rem' : '18rem');
    root.style.setProperty('--shell-content-offset', compactCollapsed ? '0rem' : sidebarCollapsed ? '6.25rem' : '18.75rem');
    root.style.setProperty('--shell-sidebar-border-width', compactCollapsed ? '0px' : '1px');
    root.dataset.shellSidebarCollapsed = sidebarCollapsed ? '1' : '0';
    root.setAttribute('data-shell-ready', '1');
    root.setAttribute('data-density', density);
    root.setAttribute('data-reduced-motion', reducedMotion ? 'true' : 'false');

    try {
      window.localStorage.setItem(SHELL_SIDEBAR_KEY, sidebarCollapsed ? '1' : '0');
      window.localStorage.setItem(SHELL_REDUCED_MOTION_KEY, reducedMotion ? '1' : '0');
      window.localStorage.setItem(SHELL_DENSITY_KEY, density);
    } catch {
      // ignore storage failures
    }
  }, [sidebarCollapsed, reducedMotion, density, isCompactViewport, viewportReady]);

  const value = React.useMemo<ShellContextValue>(
    () => ({
      sidebarCollapsed,
      setSidebarCollapsed,
      toggleSidebarCollapsed: () => setSidebarCollapsed((prev) => !prev),
      reducedMotion,
      setReducedMotion,
      density,
      setDensity,
    }),
    [sidebarCollapsed, reducedMotion, density]
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShellPreferences() {
  const context = React.useContext(ShellContext);
  if (!context) {
    throw new Error('useShellPreferences must be used within ShellProvider');
  }
  return context;
}
