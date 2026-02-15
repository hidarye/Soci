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
  Sparkles,
  AlertTriangle,
  BarChart3,
  RotateCcw,
} from 'lucide-react';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useConfirmDialog } from '@/components/common/use-confirm-dialog';
import { PlatformIcon } from '@/components/common/platform-icon';

import type { PlatformAccount, Task } from '@/lib/db';
import type { PlatformId } from '@/lib/platforms/types';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { getCachedQuery, setCachedQuery } from '@/lib/client/query-cache';
import { cn } from '@/lib/utils';

const STATUS_META: Record<Task['status'], { label: string; tone: string }> = {
  active: {
    label: 'Active',
    tone: 'status-pill--success',
  },
  paused: {
    label: 'Paused',
    tone: 'status-pill--neutral',
  },
  completed: {
    label: 'Completed',
    tone: 'status-pill--neutral',
  },
  error: {
    label: 'Error',
    tone: 'status-pill--error',
  },
};

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

function getSuccessRate(executionCount?: number, failureCount?: number): number {
  const total = Math.max(0, Number(executionCount || 0));
  const failed = Math.max(0, Number(failureCount || 0));
  if (total <= 0) return 100;
  const successful = Math.max(0, total - failed);
  return Math.round((successful / total) * 100);
}

function getModeLabel(executionType?: Task['executionType']): string {
  if (executionType === 'scheduled' || executionType === 'recurring') return 'Scheduled';
  return 'Live routing';
}

const PLATFORM_LABELS: Record<PlatformId, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'X',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  telegram: 'Telegram',
  linkedin: 'LinkedIn',
};

function uniquePlatformIdsForTask(task: Task, accountById: Record<string, PlatformAccount>): PlatformId[] {
  const seen = new Set<PlatformId>();
  for (const accountId of [...task.sourceAccounts, ...task.targetAccounts]) {
    const platformId = accountById[accountId]?.platformId as PlatformId | undefined;
    if (platformId) seen.add(platformId);
  }
  return [...seen];
}

function taskHasAuthWarning(task: Task, accountById: Record<string, PlatformAccount>): boolean {
  for (const accountId of [...task.sourceAccounts, ...task.targetAccounts]) {
    const account = accountById[accountId];
    if (account && !account.isActive) return true;
  }
  return false;
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

function normalizeTelegramChatList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item || '').trim()).filter(Boolean))];
  }
  const raw = String(value || '').trim();
  if (!raw) return [];
  if (raw.includes(',') || raw.includes('\n')) {
    return [...new Set(raw.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))];
  }
  return [raw];
}

function normalizeTelegramUsernameToken(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.startsWith('@')) return raw.toLowerCase();
  return `@${raw.toLowerCase()}`;
}

function parseTelegramChatToken(value: string): string {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (/^-?\d+$/.test(raw)) return raw;
  if (raw.startsWith('@')) return raw.toLowerCase();
  const normalized = raw.toLowerCase();
  const withProtocol =
    normalized.startsWith('http://') || normalized.startsWith('https://') ? normalized : `https://${normalized}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.hostname.includes('t.me') || parsed.hostname.includes('telegram.me')) {
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (segments.length === 0) return raw;
      if (segments[0] === 'c' && segments[1] && /^\d+$/.test(segments[1])) {
        return `-100${segments[1]}`;
      }
      if (/^[a-z0-9_]{4,}$/i.test(segments[0])) {
        return normalizeTelegramUsernameToken(segments[0]);
      }
    }
  } catch {
    // ignore parse failures
  }
  return raw;
}

function parseChatCollectionFromCredentials(
  credentials: Record<string, unknown>,
  field: string
): Array<{ id: string; title?: string }> {
  const raw = credentials[field];
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const entry = item as Record<string, unknown>;
      const idCandidate = String(
        entry.chatId ||
          entry.chat_id ||
          entry.id ||
          entry.channelId ||
          entry.channel_id ||
          entry.peerId ||
          ''
      ).trim();
      const usernameCandidate = String(entry.username || '').trim();
      const id = parseTelegramChatToken(idCandidate || usernameCandidate);
      if (!id) return null;
      const title = String(
        entry.title ||
          entry.chatTitle ||
          entry.chat_name ||
          entry.chatName ||
          entry.channelTitle ||
          entry.name ||
          usernameCandidate ||
          ''
      ).trim();
      return { id, title: title || undefined };
    })
    .filter(Boolean) as Array<{ id: string; title?: string }>;
}

function collectTelegramChatTitleMap(accounts: PlatformAccount[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const account of accounts) {
    if (account.platformId !== 'telegram') continue;
    const credentials = ((account.credentials || {}) as Record<string, unknown>) || {};
    const singleIds = normalizeTelegramChatList(credentials.chatId).map(parseTelegramChatToken).filter(Boolean);
    const singleTitle = String(
      credentials.chatTitle ||
        credentials.chat_name ||
        credentials.chatName ||
        credentials.channelTitle ||
        credentials.channel_name ||
        credentials.channelName ||
        ''
    ).trim();
    for (const chatId of singleIds) {
      if (singleTitle && !map.has(chatId)) map.set(chatId, singleTitle);
      if (!map.has(chatId) && account.accountName) map.set(chatId, account.accountName);
    }

    const records = [
      ...parseChatCollectionFromCredentials(credentials, 'availableChats'),
      ...parseChatCollectionFromCredentials(credentials, 'selectedChats'),
      ...parseChatCollectionFromCredentials(credentials, 'chats'),
      ...parseChatCollectionFromCredentials(credentials, 'chatList'),
      ...parseChatCollectionFromCredentials(credentials, 'channels'),
    ];
    for (const record of records) {
      if (!record.title || map.has(record.id)) continue;
      map.set(record.id, record.title);
    }
  }
  return map;
}

function formatTelegramChatLabel(chatId: string, chatTitleMap: Map<string, string>): string {
  const normalized = parseTelegramChatToken(chatId);
  const title = chatTitleMap.get(normalized);
  if (title) return title;
  if (normalized.startsWith('@')) return normalized;
  return normalized;
}

function resolveTelegramChatsForTask(task: Task, accounts: PlatformAccount[], side: 'source' | 'target') {
  const chatTitleMap = collectTelegramChatTitleMap(accounts);
  const values = new Set<string>();

  for (const account of accounts) {
    if (account.platformId !== 'telegram') continue;
    const credentials = (account.credentials || {}) as Record<string, unknown>;
    for (const chatId of normalizeTelegramChatList(credentials.chatId)) {
      const normalized = parseTelegramChatToken(chatId);
      if (normalized) values.add(normalized);
    }
  }

  if (side === 'source') {
    const filters = (task.filters || {}) as Record<string, unknown>;
    for (const chatId of normalizeTelegramChatList((filters as any).telegramChatIds)) {
      const normalized = parseTelegramChatToken(chatId);
      if (normalized) values.add(normalized);
    }
    const single = parseTelegramChatToken(String((filters as any).telegramChatId || ''));
    if (single) values.add(single);
  } else {
    const transformations = (task.transformations || {}) as Record<string, unknown>;
    for (const chatId of normalizeTelegramChatList((transformations as any).telegramTargetChatIds)) {
      const normalized = parseTelegramChatToken(chatId);
      if (normalized) values.add(normalized);
    }
    const single = parseTelegramChatToken(String((transformations as any).telegramTargetChatId || ''));
    if (single) values.add(single);
  }

  return [...values].map((chatId) => ({
    id: chatId,
    label: formatTelegramChatLabel(chatId, chatTitleMap),
  }));
}

function normalizeAccountMap(raw: unknown): Record<string, PlatformAccount> {
  if (!raw || typeof raw !== 'object') return {};
  const entries = Object.entries(raw as Record<string, unknown>);
  const normalized: Record<string, PlatformAccount> = {};
  for (const [accountId, value] of entries) {
    if (!value || typeof value !== 'object') continue;
    normalized[accountId] = value as PlatformAccount;
  }
  return normalized;
}

function TasksPageContent() {
  const router = useRouter();
  const { confirm, ConfirmDialog } = useConfirmDialog();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed' | 'error'>('all');
  const [platformFilter, setPlatformFilter] = useState<'all' | PlatformId>('all');
  const [lastRunFilter, setLastRunFilter] = useState<'all' | '24h' | '7d' | 'never'>('all');
  const [issueFilter, setIssueFilter] = useState<'all' | 'errors' | 'warnings'>('all');
  const [sortBy, setSortBy] = useState<'createdAt' | 'status' | 'name'>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [accountById, setAccountById] = useState<Record<string, PlatformAccount>>({});

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [runningTaskIds, setRunningTaskIds] = useState<Record<string, boolean>>({});
  const [selectedTaskIds, setSelectedTaskIds] = useState<Record<string, boolean>>({});

  const pageSize = 50;
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const cacheKey = `tasks:list:${pageSize}:0:${debouncedSearchTerm}:${statusFilter}:${sortBy}:${sortDir}`;
    const cached = getCachedQuery<{
      tasks: Task[];
      accountsById?: Record<string, PlatformAccount>;
      nextOffset: number;
      hasMore: boolean;
    }>(cacheKey, 20_000);

    if (cached) {
      setTasks(cached.tasks);
      setFilteredTasks(cached.tasks);
      setOffset(cached.nextOffset);
      setHasMore(cached.hasMore);
      if (cached.accountsById) {
        setAccountById(cached.accountsById);
      }
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
        const nextAccountMap = normalizeAccountMap(data.accountsById);
        const nextOffset = data.nextOffset || 0;
        const nextHasMore = Boolean(data.hasMore);

        setTasks(list);
        setFilteredTasks(list);
        if (Object.keys(nextAccountMap).length > 0) {
          setAccountById(nextAccountMap);
        }
        setOffset(nextOffset);
        setHasMore(nextHasMore);
        setCachedQuery(cacheKey, {
          tasks: list,
          accountsById: nextAccountMap,
          nextOffset,
          hasMore: nextHasMore,
        });
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
    const now = Date.now();
    const next = tasks.filter((task) => {
      if (platformFilter !== 'all') {
        const taskPlatforms = uniquePlatformIdsForTask(task, accountById);
        if (!taskPlatforms.includes(platformFilter)) return false;
      }

      if (lastRunFilter === 'never' && task.lastExecuted) return false;
      if (lastRunFilter === '24h') {
        const ts = task.lastExecuted ? new Date(task.lastExecuted).getTime() : 0;
        if (!ts || now - ts > 24 * 60 * 60 * 1000) return false;
      }
      if (lastRunFilter === '7d') {
        const ts = task.lastExecuted ? new Date(task.lastExecuted).getTime() : 0;
        if (!ts || now - ts > 7 * 24 * 60 * 60 * 1000) return false;
      }

      if (issueFilter === 'errors' && task.status !== 'error') return false;
      if (issueFilter === 'warnings' && !taskHasAuthWarning(task, accountById)) return false;
      return true;
    });
    setFilteredTasks(next);
    setSelectedTaskIds((prev) => {
      const nextSelected: Record<string, boolean> = {};
      const visible = new Set(next.map((task) => task.id));
      for (const [taskId, selected] of Object.entries(prev)) {
        if (selected && visible.has(taskId)) nextSelected[taskId] = true;
      }
      return nextSelected;
    });
  }, [tasks, platformFilter, lastRunFilter, issueFilter, accountById]);

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
      const nextAccountMap = normalizeAccountMap(data.accountsById);
      setTasks(next);
      setFilteredTasks(next);
      if (Object.keys(nextAccountMap).length > 0) {
        setAccountById((prev) => ({ ...prev, ...nextAccountMap }));
      }
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

  const handleRetryTask = async (task: Task) => {
    await handleRunNow(task);
  };

  const selectedCount = Object.values(selectedTaskIds).filter(Boolean).length;
  const allVisibleSelected = filteredTasks.length > 0 && filteredTasks.every((task) => selectedTaskIds[task.id]);
  const availablePlatformFilters = [...new Set(tasks.flatMap((task) => uniquePlatformIdsForTask(task, accountById)))]
    .filter(Boolean)
    .sort() as PlatformId[];

  const handleBulkPause = async () => {
    const selected = filteredTasks.filter((task) => selectedTaskIds[task.id]);
    if (selected.length === 0) return;
    try {
      await Promise.all(
        selected.map(async (task) => {
          if (task.status === 'paused') return;
          const res = await fetch(`/api/tasks/${task.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'paused' }),
          });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || `Failed to pause task ${task.name}`);
        })
      );
      setTasks((prev) =>
        prev.map((task) => (selectedTaskIds[task.id] ? { ...task, status: 'paused' as Task['status'] } : task))
      );
      toast.success(`Paused ${selected.length} task(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to pause selected tasks');
    }
  };

  const handleBulkRun = async () => {
    const selected = filteredTasks.filter((task) => selectedTaskIds[task.id]);
    if (selected.length === 0) return;
    try {
      await Promise.all(
        selected.map(async (task) => {
          const res = await fetch(`/api/tasks/${task.id}/run`, { method: 'POST' });
          const data = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error || `Failed to run task ${task.name}`);
        })
      );
      setTasks((prev) =>
        prev.map((task) => (selectedTaskIds[task.id] ? { ...task, lastExecuted: new Date() } : task))
      );
      toast.success(`Ran ${selected.length} task(s)`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to run selected tasks');
    }
  };

  const activeTasksCount = filteredTasks.filter((task) => task.status === 'active').length;
  const pausedTasksCount = filteredTasks.filter((task) => task.status === 'paused').length;
  const erroredTasksCount = filteredTasks.filter((task) => task.status === 'error').length;
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
                  <span className="kpi-pill">Loading failed...</span>
                </>
              ) : (
                <>
                  <span className="kpi-pill">{activeTasksCount} active</span>
                  <span className="kpi-pill">{pausedTasksCount} paused</span>
                  <span className="kpi-pill">{erroredTasksCount} failed</span>
                  <span className="kpi-pill">{filteredTasks.length} tasks</span>
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
            <CardTitle>Task Search & Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
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
              <Select value={platformFilter} onValueChange={(value: any) => setPlatformFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Platform" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All platforms</SelectItem>
                  {availablePlatformFilters.map((platformId) => (
                    <SelectItem key={platformId} value={platformId}>
                      {PLATFORM_LABELS[platformId] || platformId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={lastRunFilter} onValueChange={(value: any) => setLastRunFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Last run" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any run</SelectItem>
                  <SelectItem value="24h">Last 24h</SelectItem>
                  <SelectItem value="7d">Last 7d</SelectItem>
                  <SelectItem value="never">Never ran</SelectItem>
                </SelectContent>
              </Select>
              <Select value={issueFilter} onValueChange={(value: any) => setIssueFilter(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Issues" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tasks</SelectItem>
                  <SelectItem value="errors">Errors only</SelectItem>
                  <SelectItem value="warnings">Auth warnings</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(searchTerm ||
                statusFilter !== 'all' ||
                platformFilter !== 'all' ||
                lastRunFilter !== 'all' ||
                issueFilter !== 'all') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setPlatformFilter('all');
                    setLastRunFilter('all');
                    setIssueFilter('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
              {selectedCount > 0 ? (
                <>
                  <span className="kpi-pill">{selectedCount} selected</span>
                  <Button size="sm" variant="outline" onClick={() => void handleBulkRun()}>
                    <Play size={14} />
                    Run Selected
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void handleBulkPause()}>
                    <Pause size={14} />
                    Pause Selected
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedTaskIds({})}>
                    Clear Selection
                  </Button>
                </>
              ) : null}
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
            <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={(event) => {
                  const checked = event.target.checked;
                  setSelectedTaskIds((prev) => {
                    const next = { ...prev };
                    for (const task of filteredTasks) {
                      if (checked) next[task.id] = true;
                      else delete next[task.id];
                    }
                    return next;
                  });
                }}
                aria-label="Select all visible tasks"
                className="h-4 w-4 rounded border-border"
              />
              <span>Select all visible tasks</span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {filteredTasks.map((task) => {
                const statusMeta = STATUS_META[task.status] || STATUS_META.paused;
                const routeCount =
                  Math.max(1, task.sourceAccounts.length) * Math.max(1, task.targetAccounts.length);
                const sourcePlatformIds = [
                  ...new Set(
                    task.sourceAccounts.map((id) => accountById[id]?.platformId as PlatformId | undefined).filter(Boolean)
                  ),
                ] as PlatformId[];
                const targetPlatformIds = [
                  ...new Set(
                    task.targetAccounts.map((id) => accountById[id]?.platformId as PlatformId | undefined).filter(Boolean)
                  ),
                ] as PlatformId[];
                const sourceVisiblePlatforms = sourcePlatformIds.slice(0, 3);
                const targetVisiblePlatforms = targetPlatformIds.slice(0, 3);
                const sourceOverflow = Math.max(0, sourcePlatformIds.length - sourceVisiblePlatforms.length);
                const targetOverflow = Math.max(0, targetPlatformIds.length - targetVisiblePlatforms.length);
                const successRate = getSuccessRate(task.executionCount, task.failureCount);
                const lastRunLabel = getRelativeLastRun(task.lastExecuted);
                const modeLabel = getModeLabel(task.executionType);
                const hasAuthWarning = taskHasAuthWarning(task, accountById);
                const runtimeState = runningTaskIds[task.id] ? 'Running' : task.status === 'error' ? 'Error' : 'Idle';
                const descriptionText =
                  task.status === 'error'
                    ? `Error: ${String(task.lastError || '').trim() || 'Failed to fetch data'}`
                    : String(task.description || '').trim() || 'No description provided.';
                const toneBorderClass =
                  task.status === 'active'
                    ? 'border-l-emerald-500'
                    : task.status === 'error'
                      ? 'border-l-red-500'
                      : task.status === 'completed'
                        ? 'border-l-sky-500'
                        : 'border-l-amber-500';

                return (
                  <Card
                    key={task.id}
                    className={cn(
                      'animate-fade-up border-l-4 border-border/70 bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
                      toneBorderClass
                    )}
                  >
                    <CardContent className="p-6">
                      <div className="space-y-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <input
                              type="checkbox"
                              checked={Boolean(selectedTaskIds[task.id])}
                              onChange={(event) =>
                                setSelectedTaskIds((prev) => ({ ...prev, [task.id]: event.target.checked }))
                              }
                              aria-label={`Select task ${task.name}`}
                              className="mt-1 h-4 w-4 rounded border-border"
                            />
                            <div className="min-w-0">
                              <h3 className="truncate text-xl font-semibold tracking-tight text-foreground">{task.name}</h3>
                              <p
                                className={cn(
                                  'mt-2 line-clamp-1 text-sm text-muted-foreground',
                                  task.status === 'error' && 'inline-flex items-center gap-1.5 text-destructive'
                                )}
                              >
                                {task.status === 'error' ? <AlertTriangle size={14} /> : null}
                                <span>{descriptionText}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className={cn('status-pill', statusMeta.tone)}>{statusMeta.label.toUpperCase()}</span>
                            <span className="rounded-full border border-border/70 bg-muted/40 px-2.5 py-1 text-[11px] text-muted-foreground">
                              {modeLabel}
                            </span>
                            {hasAuthWarning ? (
                              <span className="rounded-full border border-amber-300/60 bg-amber-100/70 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                                OAuth Warning
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/65 bg-background/60 p-3">
                          {sourceVisiblePlatforms.length > 0 ? (
                            sourceVisiblePlatforms.map((platformId, index) => (
                              <span key={`source-platform-${task.id}-${platformId}`} className="inline-flex items-center gap-2">
                                {index > 0 ? <span className="text-xs text-muted-foreground">+</span> : null}
                                <span
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card"
                                  title={PLATFORM_LABELS[platformId] || platformId}
                                >
                                  <PlatformIcon platformId={platformId} size={17} />
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No source</span>
                          )}
                          {sourceOverflow > 0 ? (
                            <span className="rounded-full border border-border/70 px-2 py-0.5 text-xs text-muted-foreground">
                              +{sourceOverflow}
                            </span>
                          ) : null}
                          <span className="mx-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted/45 text-muted-foreground">
                            <ArrowRight size={16} />
                          </span>
                          {targetVisiblePlatforms.length > 0 ? (
                            targetVisiblePlatforms.map((platformId, index) => (
                              <span key={`target-platform-${task.id}-${platformId}`} className="inline-flex items-center gap-2">
                                {index > 0 ? <span className="text-xs text-muted-foreground">+</span> : null}
                                <span
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border/70 bg-card"
                                  title={PLATFORM_LABELS[platformId] || platformId}
                                >
                                  <PlatformIcon platformId={platformId} size={17} />
                                </span>
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No target</span>
                          )}
                          {targetOverflow > 0 ? (
                            <span className="rounded-full border border-border/70 px-2 py-0.5 text-xs text-muted-foreground">
                              +{targetOverflow}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-3">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full border border-border/70 px-2.5 py-1">
                              Sources: {task.sourceAccounts.length}
                            </span>
                            <span className="rounded-full border border-border/70 px-2.5 py-1">
                              Targets: {task.targetAccounts.length}
                            </span>
                            <span className="rounded-full border border-border/70 px-2.5 py-1">Routes: {routeCount}</span>
                            <span className="rounded-full border border-border/70 px-2.5 py-1">Last run: {lastRunLabel}</span>
                            <span className="rounded-full border border-border/70 px-2.5 py-1">
                              Transferred: {task.executionCount || 0}
                            </span>
                            <span className="rounded-full border border-border/70 px-2.5 py-1">Success: {successRate}%</span>
                            <span
                              className={cn(
                                'rounded-full border px-2.5 py-1',
                                runtimeState === 'Running'
                                  ? 'border-blue-300/70 bg-blue-100/70 text-blue-700'
                                  : runtimeState === 'Error'
                                    ? 'border-red-300/70 bg-red-100/70 text-red-700'
                                    : 'border-border/70'
                              )}
                            >
                              {runtimeState}
                            </span>
                          </div>
                          <Switch
                            checked={task.status === 'active'}
                            onCheckedChange={() => handleToggleStatus(task)}
                            aria-label={task.status === 'active' ? 'Pause task' : 'Activate task'}
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {task.status === 'error' ? (
                            <Button variant="outline" size="sm" onClick={() => void handleRetryTask(task)}>
                              <RotateCcw size={14} />
                              Retry
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant={task.status === 'active' ? 'secondary' : 'default'}
                            onClick={() => handleToggleStatus(task)}
                          >
                            {task.status === 'active' ? <Pause size={14} /> : <Play size={14} />}
                            {task.status === 'active' ? 'Pause' : 'Run'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => router.push(`/tasks/${task.id}/edit`)}>
                            <Edit2 size={14} />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => void handleDelete(task.id)}
                          >
                            <Trash2 size={14} />
                            Delete
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/executions?search=${encodeURIComponent(task.name)}`)}
                          >
                            <BarChart3 size={14} />
                            Logs
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/tasks/${task.id}/edit?section=advanced`)}
                          >
                            Advanced
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
