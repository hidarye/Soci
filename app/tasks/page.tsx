'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Play,
  Pause,
  ArrowRight,
  Loader2,
  Clock3,
  Sparkles,
} from 'lucide-react';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfirmDialog } from '@/components/common/use-confirm-dialog';
import { PlatformIcon } from '@/components/common/platform-icon';

import type { PlatformAccount, Task } from '@/lib/db';
import type { PlatformId } from '@/lib/platforms/types';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { getCachedQuery, setCachedQuery } from '@/lib/client/query-cache';
import { cn } from '@/lib/utils';

const STATUS_META: Record<
  Task['status'],
  { label: string; tone: string; buttonLabel: string; runHint: string }
> = {
  active: {
    label: 'Active',
    tone: 'status-pill--success',
    buttonLabel: 'Pause',
    runHint: 'Live routing',
  },
  paused: {
    label: 'Paused',
    tone: 'status-pill--neutral',
    buttonLabel: 'Resume',
    runHint: 'Stopped manually',
  },
  completed: {
    label: 'Completed',
    tone: 'status-pill--neutral',
    buttonLabel: 'Activate',
    runHint: 'Finished schedule',
  },
  error: {
    label: 'Error',
    tone: 'status-pill--error',
    buttonLabel: 'Retry Mode',
    runHint: 'Needs attention',
  },
};

function uniquePlatformIdsForAccounts(
  accountIds: string[],
  accountById: Record<string, PlatformAccount>
): PlatformId[] {
  const seen = new Set<PlatformId>();
  for (const accountId of accountIds) {
    const platformId = accountById[accountId]?.platformId as PlatformId | undefined;
    if (!platformId) continue;
    seen.add(platformId);
  }
  return [...seen];
}

function getRelativeLastRun(value?: Date | string | null): string {
  if (!value) return 'Never';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return 'Never';
  const diffMs = Date.now() - date.getTime();
  if (diffMs < 60_000) return 'Just now';
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function resolveAccountAvatar(account: PlatformAccount): string | null {
  const credentials = (account.credentials || {}) as Record<string, unknown>;
  const accountInfo =
    typeof credentials.accountInfo === 'object' && credentials.accountInfo
      ? (credentials.accountInfo as Record<string, unknown>)
      : null;

  const candidates = [
    credentials.profileImageUrl,
    credentials.avatarUrl,
    credentials.picture,
    accountInfo?.profileImageUrl,
    accountInfo?.avatarUrl,
    accountInfo?.picture,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return null;
}

function accountDisplayName(account: PlatformAccount): string {
  return (
    String(account.accountName || '').trim() ||
    String(account.accountUsername || '').trim() ||
    String(account.accountId || '').trim() ||
    account.id
  );
}

function TasksPageContent() {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed' | 'error'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'status' | 'name'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [accountById, setAccountById] = useState<Record<string, PlatformAccount>>({});

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [runningTaskIds, setRunningTaskIds] = useState<Record<string, boolean>>({});

  const pageSize = 50;
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const cacheKey = `tasks:list:${pageSize}:0:${debouncedSearchTerm}:${statusFilter}:${sortBy}:${sortDir}`;
    const cached = getCachedQuery<{
      tasks: Task[];
      nextOffset: number;
      hasMore: boolean;
    }>(cacheKey, 20_000);

    if (cached) {
      setTasks(cached.tasks);
      setFilteredTasks(cached.tasks);
      setOffset(cached.nextOffset);
      setHasMore(cached.hasMore);
      setIsLoadingTasks(false);
    } else {
      setIsLoadingTasks(true);
    }

    async function load() {
      try {
        const statusParam = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
        const res = await fetch(
          `/api/tasks?limit=${pageSize}&offset=0&search=${encodeURIComponent(debouncedSearchTerm)}${statusParam}&sortBy=${sortBy}&sortDir=${sortDir}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load tasks');
        if (cancelled) return;

        const list = data.tasks || [];
        const nextOffset = data.nextOffset || 0;
        const nextHasMore = Boolean(data.hasMore);

        setTasks(list);
        setFilteredTasks(list);
        setOffset(nextOffset);
        setHasMore(nextHasMore);
        setCachedQuery(cacheKey, { tasks: list, nextOffset, hasMore: nextHasMore });
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        console.error('[TasksPage] Error loading tasks:', error);
      } finally {
        if (!cancelled) setIsLoadingTasks(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pageSize, debouncedSearchTerm, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    let cancelled = false;
    async function loadAccounts() {
      try {
        const res = await fetch('/api/accounts?limit=300&offset=0&presentation=1');
        const data = await res.json();
        if (!res.ok || !data.success) return;
        if (cancelled) return;
        const map: Record<string, PlatformAccount> = {};
        for (const account of (data.accounts || []) as PlatformAccount[]) {
          map[account.id] = account;
        }
        setAccountById(map);
      } catch {
        // non-blocking
      }
    }
    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setFilteredTasks(tasks);
  }, [tasks]);

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    try {
      setIsLoadingMore(true);
      const statusParam = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
      const res = await fetch(
        `/api/tasks?limit=${pageSize}&offset=${offset}&search=${encodeURIComponent(debouncedSearchTerm)}${statusParam}&sortBy=${sortBy}&sortDir=${sortDir}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load tasks');
      const next = [...tasks, ...(data.tasks || [])];
      setTasks(next);
      setFilteredTasks(next);
      setOffset(data.nextOffset || offset);
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      console.error('[TasksPage] Error loading more tasks:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleDelete = async (taskId: string) => {
    const accepted = await confirm({
      title: 'Delete Task?',
      description: 'This action is permanent and cannot be undone.',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!accepted) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to delete task');
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      toast.success('Task deleted successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete task');
    }
  };

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === 'active' ? 'paused' : 'active';
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to update task');
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: newStatus as any } : t)));
      toast.success(newStatus === 'active' ? 'Task resumed' : 'Task paused');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update task');
    }
  };

  const handleRunNow = async (task: Task) => {
    if (runningTaskIds[task.id]) return;
    setRunningTaskIds((prev) => ({ ...prev, [task.id]: true }));
    try {
      const res = await fetch(`/api/tasks/${task.id}/run`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to run task');
      const executionCount = Array.isArray(data.executions) ? data.executions.length : 0;
      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id
            ? {
                ...item,
                lastExecuted: new Date(),
              }
            : item
        )
      );
      toast.success(executionCount > 0 ? `Task executed (${executionCount} transfer(s))` : 'Task run started');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to run task');
    } finally {
      setRunningTaskIds((prev) => ({ ...prev, [task.id]: false }));
    }
  };

  const activeTasksCount = filteredTasks.filter((task) => task.status === 'active').length;
  const pausedTasksCount = filteredTasks.filter((task) => task.status === 'paused').length;
  const completedTasksCount = filteredTasks.filter((task) => task.status === 'completed').length;
  const erroredTasksCount = filteredTasks.filter((task) => task.status === 'error').length;
  const totalRoutes = filteredTasks.reduce(
    (sum, task) => sum + Math.max(1, task.sourceAccounts.length) * Math.max(1, task.targetAccounts.length),
    0
  );
  const isInitialLoading = isLoadingTasks && tasks.length === 0;

  return (
    <div className="min-h-screen bg-background control-app">
      <Sidebar />
      <Header />

      <main className="control-main">
        <div className="page-header animate-fade-up">
          <div>
            <p className="kpi-pill mb-3 inline-flex items-center gap-1.5">
              <Sparkles size={12} />
              Automation Pipelines
            </p>
            <h1 className="page-title">My Tasks</h1>
            <p className="page-subtitle">Manage and monitor your automation tasks</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              {isInitialLoading ? (
                <>
                  <span className="kpi-pill">Loading tasks...</span>
                  <span className="kpi-pill">Loading active...</span>
                  <span className="kpi-pill">Loading paused...</span>
                </>
              ) : (
                <>
                  <span className="kpi-pill">{filteredTasks.length} visible</span>
                  <span className="kpi-pill">{activeTasksCount} active</span>
                  <span className="kpi-pill">{pausedTasksCount} paused</span>
                  <span className="kpi-pill">{completedTasksCount} completed</span>
                  <span className="kpi-pill">{erroredTasksCount} error</span>
                  <span className="kpi-pill">{totalRoutes} routes</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => (window.location.href = '/api/tasks/export')}>
              Export CSV
            </Button>
            <Button size="lg" className="animate-float-soft" onClick={() => router.push('/tasks/new')}>
              <Plus size={18} />
              Create New Task
            </Button>
          </div>
        </div>

        <Card className="mb-6 animate-fade-up sticky-toolbar">
          <CardHeader>
            <CardTitle>Search Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={`${sortBy}:${sortDir}`}
                  onValueChange={(value: string) => {
                    const [by, dir] = value.split(':') as any;
                    setSortBy(by);
                    setSortDir(dir);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt:desc">Date (Newest)</SelectItem>
                    <SelectItem value="createdAt:asc">Date (Oldest)</SelectItem>
                    <SelectItem value="status:asc">Status (A→Z)</SelectItem>
                    <SelectItem value="status:desc">Status (Z→A)</SelectItem>
                    <SelectItem value="name:asc">Name (A→Z)</SelectItem>
                    <SelectItem value="name:desc">Name (Z→A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(searchTerm || statusFilter !== 'all') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {isInitialLoading ? (
          <div className="space-y-4 animate-fade-up-delay">
            {[0, 1, 2].map((idx) => (
              <Card key={idx}>
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-5 w-48 rounded bg-muted/60" />
                    <div className="h-4 w-80 rounded bg-muted/50" />
                    <div className="h-4 w-64 rounded bg-muted/40" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <Card className="animate-fade-up-delay">
            <CardContent className="py-12 text-center">
              <p className="mb-4 text-muted-foreground">
                No tasks found. {tasks.length === 0 ? 'Create your first task to get started.' : 'Try a different search.'}
              </p>
              {tasks.length === 0 && (
                <Button onClick={() => router.push('/tasks/new')}>
                  <Plus size={18} className="mr-2" />
                  Create Your First Task
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4">
              {filteredTasks.map((task) => {
                const statusMeta = STATUS_META[task.status] || STATUS_META.paused;
                const sourceAccounts = task.sourceAccounts
                  .map((id) => accountById[id])
                  .filter(Boolean) as PlatformAccount[];
                const targetAccounts = task.targetAccounts
                  .map((id) => accountById[id])
                  .filter(Boolean) as PlatformAccount[];
                const sourcePlatforms = uniquePlatformIdsForAccounts(task.sourceAccounts, accountById);
                const targetPlatforms = uniquePlatformIdsForAccounts(task.targetAccounts, accountById);
                const routeCount =
                  Math.max(1, task.sourceAccounts.length) * Math.max(1, task.targetAccounts.length);

                return (
                  <Card
                    key={task.id}
                    className="animate-fade-up border-border/70 bg-card/70 transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_18px_42px_-30px_color-mix(in_oklch,var(--primary)_65%,transparent)]"
                  >
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-semibold text-foreground">{task.name}</h3>
                            <span className={cn('status-pill', statusMeta.tone)}>{statusMeta.label}</span>
                            <span className="rounded-full border border-border/70 bg-card/65 px-2.5 py-1 text-[11px] text-muted-foreground">
                              {statusMeta.runHint}
                            </span>
                          </div>

                          <p className="mb-4 leading-relaxed text-muted-foreground">
                            {task.description?.trim() || 'No description provided.'}
                          </p>

                          <div className="mb-3 inline-flex items-center gap-2 rounded-xl border border-border/70 bg-card/55 px-3 py-1.5 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              {sourcePlatforms.slice(0, 3).map((platformId) => (
                                <PlatformIcon
                                  key={`flow-src-${task.id}-${platformId}`}
                                  platformId={platformId as PlatformId}
                                  size={13}
                                />
                              ))}
                              {sourcePlatforms.length > 3 ? <span>+{sourcePlatforms.length - 3}</span> : null}
                            </span>
                            <ArrowRight size={12} className="opacity-70" />
                            <span className="inline-flex items-center gap-1">
                              {targetPlatforms.slice(0, 3).map((platformId) => (
                                <PlatformIcon
                                  key={`flow-dst-${task.id}-${platformId}`}
                                  platformId={platformId as PlatformId}
                                  size={13}
                                />
                              ))}
                              {targetPlatforms.length > 3 ? <span>+{targetPlatforms.length - 3}</span> : null}
                            </span>
                            <span className="text-foreground/80">{routeCount} route(s)</span>
                          </div>

                          <div className="grid gap-3 text-sm md:grid-cols-2">
                            <div>
                              <p className="mb-1.5 text-muted-foreground">Source</p>
                              <div className="flex flex-wrap gap-2">
                                {sourceAccounts.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">
                                    {task.sourceAccounts.length > 0
                                      ? 'Loading source account details...'
                                      : 'No source accounts'}
                                  </span>
                                ) : (
                                  sourceAccounts.map((account) => {
                                    const avatar = resolveAccountAvatar(account);
                                    return (
                                      <span
                                        key={`src-account-${task.id}-${account.id}`}
                                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-card/75 px-2 py-1"
                                      >
                                        {avatar ? (
                                          <img
                                            src={avatar}
                                            alt={accountDisplayName(account)}
                                            className="h-5 w-5 rounded-full object-cover"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                                            {accountDisplayName(account).charAt(0).toUpperCase()}
                                          </span>
                                        )}
                                        <span className="truncate text-xs font-medium text-foreground">
                                          {accountDisplayName(account)}
                                        </span>
                                        <PlatformIcon platformId={account.platformId as PlatformId} size={12} />
                                      </span>
                                    );
                                  })
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="mb-1.5 text-muted-foreground">Target</p>
                              <div className="flex flex-wrap gap-2">
                                {targetAccounts.length === 0 ? (
                                  <span className="text-xs text-muted-foreground">
                                    {task.targetAccounts.length > 0
                                      ? 'Loading target account details...'
                                      : 'No target accounts'}
                                  </span>
                                ) : (
                                  targetAccounts.map((account) => {
                                    const avatar = resolveAccountAvatar(account);
                                    return (
                                      <span
                                        key={`target-account-${task.id}-${account.id}`}
                                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-border/70 bg-card/75 px-2 py-1"
                                      >
                                        {avatar ? (
                                          <img
                                            src={avatar}
                                            alt={accountDisplayName(account)}
                                            className="h-5 w-5 rounded-full object-cover"
                                            loading="lazy"
                                          />
                                        ) : (
                                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                                            {accountDisplayName(account).charAt(0).toUpperCase()}
                                          </span>
                                        )}
                                        <span className="truncate text-xs font-medium text-foreground">
                                          {accountDisplayName(account)}
                                        </span>
                                        <PlatformIcon platformId={account.platformId as PlatformId} size={12} />
                                      </span>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground">
                            <Clock3 size={12} />
                            Last run: <span className="text-foreground/85">{getRelativeLastRun(task.lastExecuted)}</span>
                          </div>
                        </div>

                        <div className="ml-0 flex flex-wrap items-center gap-2 sm:ml-4 sm:self-start">
                          <Button variant="outline" size="icon" onClick={() => handleToggleStatus(task)} title={statusMeta.buttonLabel}>
                            {task.status === 'active' ? <Pause size={18} /> : <Play size={18} />}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRunNow(task)}
                            disabled={Boolean(runningTaskIds[task.id])}
                          >
                            {runningTaskIds[task.id] ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
                            Run
                          </Button>

                          <Button variant="outline" size="icon" onClick={() => router.push(`/tasks/${task.id}/edit`)}>
                            <Edit2 size={18} />
                          </Button>

                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDelete(task.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {hasMore && (
              <div className="mt-6 flex justify-center">
                <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
                  {isLoadingMore ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}

        {ConfirmDialog}
      </main>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="splash-overlay" role="status" aria-live="polite" aria-busy="true">
          <div className="splash-overlay__glow" />
          <div className="splash-overlay__panel">
            <div className="splash-overlay__ring" />
            <div className="splash-overlay__logo">
              <Plus size={28} />
            </div>
            <p className="splash-overlay__title">Loading Tasks</p>
            <p className="splash-overlay__subtitle">Preparing task dashboard...</p>
            <div className="splash-overlay__loader" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      }
    >
      <TasksPageContent />
    </Suspense>
  );
}
