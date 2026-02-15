'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PlatformAccount, TaskExecution } from '@/lib/db';
import type { PlatformId } from '@/lib/platforms/types';
import { extractExecutionMessageLinks } from '@/lib/execution-links';
import { Search, Download, RefreshCw, ChevronDown, Loader2, ArrowRight } from 'lucide-react';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { getCachedQuery, setCachedQuery } from '@/lib/client/query-cache';
import { toast } from 'sonner';
import { PlatformIcon } from '@/components/common/platform-icon';

interface ExpandedExecution extends TaskExecution {
  taskName?: string;
  sourceAccountName?: string;
  targetAccountName?: string;
}

function toDisplayText(value: string | undefined): string {
  const text = (value || '').trim();
  return text.length > 0 ? text : 'No text content';
}

function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return Math.round(value);
}

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<ExpandedExecution[]>([]);
  const [filteredExecutions, setFilteredExecutions] = useState<ExpandedExecution[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed' | 'pending'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retryingTaskId, setRetryingTaskId] = useState<string | null>(null);
  const [activeTaskProgress, setActiveTaskProgress] = useState<Record<string, number>>({});
  const [sortBy, setSortBy] = useState<'executedAt' | 'status' | 'taskName'>('executedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [accountById, setAccountById] = useState<Record<string, PlatformAccount>>({});
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingExecutions, setIsLoadingExecutions] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageSize = 50;
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const isInitialLoading = isLoadingExecutions && executions.length === 0;
  const activeProcessingCount = Object.keys(activeTaskProgress).length;
  const pendingExecutionCount = executions.filter(e => e.status === 'pending').length;
  const shouldLivePoll = activeProcessingCount > 0 || pendingExecutionCount > 0;

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const statusParam = statusFilter === 'all' ? '' : statusFilter;
    const cacheKey = `executions:list:${pageSize}:0:${debouncedSearchTerm}:${statusParam}:${sortBy}:${sortDir}`;
    const cached = getCachedQuery<{
      executions: ExpandedExecution[];
      nextOffset: number;
      hasMore: boolean;
    }>(cacheKey, 20_000);

    if (cached) {
      setExecutions(cached.executions);
      setFilteredExecutions(cached.executions);
      setOffset(cached.nextOffset);
      setHasMore(cached.hasMore);
      setIsLoadingExecutions(false);
    } else {
      setIsLoadingExecutions(true);
    }

    async function load() {
      try {
        const requestStatusParam = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
        const res = await fetch(
          `/api/executions?limit=${pageSize}&offset=0&search=${encodeURIComponent(debouncedSearchTerm)}${requestStatusParam}&sortBy=${sortBy}&sortDir=${sortDir}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load executions');
        if (cancelled) return;
        const list = (data.executions || []) as ExpandedExecution[];
        const nextOffset = data.nextOffset || 0;
        const nextHasMore = Boolean(data.hasMore);
        setExecutions(list);
        setFilteredExecutions(list);
        setOffset(nextOffset);
        setHasMore(nextHasMore);
        setCachedQuery(cacheKey, {
          executions: list,
          nextOffset,
          hasMore: nextHasMore,
        });
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        console.error('[v0] ExecutionsPage: Error loading executions:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingExecutions(false);
        }
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
        const res = await fetch('/api/accounts?limit=300&offset=0');
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
    if (!activeProcessingCount) return;
    const timer = setInterval(() => {
      setActiveTaskProgress((current) => {
        const next: Record<string, number> = {};
        for (const [taskId, progress] of Object.entries(current)) {
          const delta = 2 + Math.floor(Math.random() * 6);
          next[taskId] = clampProgress(Math.min(94, progress + delta));
        }
        return next;
      });
    }, 520);

    return () => clearInterval(timer);
  }, [activeProcessingCount]);

  const handleRefresh = (options: { showLoading?: boolean } = {}) => {
    const showLoading = options.showLoading !== false;
    const statusParam = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
    if (showLoading) {
      setIsLoadingExecutions(true);
    }

    return fetch(`/api/executions?limit=${pageSize}&offset=0&search=${encodeURIComponent(debouncedSearchTerm)}${statusParam}&sortBy=${sortBy}&sortDir=${sortDir}`)
      .then(res => res.json())
      .then(data => {
        if (!data.success) throw new Error(data.error || 'Failed to load executions');
        const list = (data.executions || []) as ExpandedExecution[];
        setExecutions(list);
        setFilteredExecutions(list);
        setOffset(data.nextOffset || 0);
        setHasMore(Boolean(data.hasMore));
      })
      .catch(error => {
        console.error('[v0] ExecutionsPage: Error refreshing executions:', error);
      })
      .finally(() => {
        if (showLoading) {
          setIsLoadingExecutions(false);
        }
      });
  };

  useEffect(() => {
    if (!shouldLivePoll) return;
    const timer = setInterval(() => {
      void handleRefresh({ showLoading: false });
    }, 2500);
    return () => clearInterval(timer);
  }, [shouldLivePoll, pageSize, debouncedSearchTerm, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    let filtered = executions;

    // Search filter
    if (searchTerm) {
      const normalizedSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(
        e =>
          e.taskName?.toLowerCase().includes(normalizedSearch) ||
          e.originalContent.toLowerCase().includes(normalizedSearch) ||
          e.sourceAccountName?.toLowerCase().includes(normalizedSearch) ||
          e.targetAccountName?.toLowerCase().includes(normalizedSearch)
      );
    }

    setFilteredExecutions(filtered);
  }, [searchTerm, statusFilter, executions]);

  const handleLoadMore = async () => {
    if (isLoadingMore) return;
    try {
      setIsLoadingMore(true);
      const statusParam = statusFilter === 'all' ? '' : `&status=${statusFilter}`;
      const res = await fetch(
        `/api/executions?limit=${pageSize}&offset=${offset}&search=${encodeURIComponent(debouncedSearchTerm)}${statusParam}&sortBy=${sortBy}&sortDir=${sortDir}`
      );
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load executions');
      const next = [...executions, ...(data.executions || [])];
      setExecutions(next);
      setFilteredExecutions(next);
      setOffset(data.nextOffset || offset);
      setHasMore(Boolean(data.hasMore));
    } catch (error) {
      console.error('[v0] ExecutionsPage: Error loading more executions:', error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRetryTask = async (taskId: string) => {
    if (!taskId || retryingTaskId) return;
    try {
      setRetryingTaskId(taskId);
      setActiveTaskProgress((current) => ({ ...current, [taskId]: 8 }));
      const res = await fetch(`/api/tasks/${taskId}/run`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to trigger retry');
      setActiveTaskProgress((current) => ({ ...current, [taskId]: 100 }));
      toast.success('Task retry queued successfully');
      await handleRefresh({ showLoading: false });
      window.setTimeout(() => {
        setActiveTaskProgress((current) => {
          const next = { ...current };
          delete next[taskId];
          return next;
        });
      }, 900);
    } catch (error) {
      setActiveTaskProgress((current) => {
        const next = { ...current };
        delete next[taskId];
        return next;
      });
      toast.error(error instanceof Error ? error.message : 'Failed to trigger retry');
    } finally {
      setRetryingTaskId(null);
    }
  };

  const stats = {
    total: executions.length,
    successful: executions.filter(e => e.status === 'success').length,
    failed: executions.filter(e => e.status === 'failed').length,
    processing: Math.max(pendingExecutionCount, activeProcessingCount),
  };
  const activeProgressValues = Object.values(activeTaskProgress);
  const aggregateLiveProgress =
    activeProgressValues.length > 0
      ? clampProgress(
          activeProgressValues.reduce((sum, value) => sum + value, 0) /
            activeProgressValues.length
        )
      : isLoadingExecutions
        ? 26
        : 0;
  const latestExecutionByTask = new Map<string, { id: string; timestamp: number }>();
  for (const item of filteredExecutions) {
    const timestamp = new Date(item.executedAt).getTime();
    const current = latestExecutionByTask.get(item.taskId);
    if (!current || timestamp > current.timestamp) {
      latestExecutionByTask.set(item.taskId, { id: item.id, timestamp });
    }
  }

  return (
    <div className="min-h-screen bg-background control-app">
      <Sidebar />
      <Header />

      <main className="control-main">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Execution History
            </h1>
            <p className="text-muted-foreground">
              Track all your task executions and their results
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => void handleRefresh()}>
              <RefreshCw size={18} className="mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.href = '/api/executions/export';
              }}
            >
              <Download size={18} className="mr-2" />
              Export
            </Button>
          </div>
        </div>

        {(shouldLivePoll || isLoadingExecutions) && (
          <Card className="mb-6 border-primary/25 bg-card/92 shadow-lg">
            <CardContent className="pt-5">
              <div className="flex items-start gap-3">
                <Loader2 size={18} className="mt-0.5 animate-spin text-primary" />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-foreground">
                      {activeProcessingCount > 0
                        ? `Processing ${activeProcessingCount} task${activeProcessingCount > 1 ? 's' : ''}`
                        : 'Refreshing executions stream'}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {aggregateLiveProgress}% complete
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tracking message processing in real time. The list auto-refreshes until execution is complete.
                  </p>
                  <div className="execution-progress-track mt-3">
                    <div
                      className="execution-progress-fill"
                      style={{ width: `${aggregateLiveProgress}%` }}
                    />
                    <div className="execution-progress-indeterminate" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {isInitialLoading ? (
          <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="animate-pulse space-y-3">
                    <div className="mx-auto h-3 w-24 rounded bg-muted/50" />
                    <div className="mx-auto h-8 w-16 rounded bg-muted/65" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 mb-6 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm mb-1">Total Executions</p>
                  <p className="text-3xl font-bold text-foreground">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm mb-1">Successful</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                    {stats.successful}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm mb-1">Failed</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                    {stats.failed}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm mb-1">Processing</p>
                  <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                    {stats.processing}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card className="mb-6 sticky-toolbar">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Search
                </label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by text, source, or target..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Status
                </label>
                <Select
                  value={statusFilter}
                  onValueChange={(value: any) => setStatusFilter(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Successful</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Processing</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Sort By
                </label>
                <Select
                  value={`${sortBy}:${sortDir}`}
                  onValueChange={(value: string) => {
                    const [by, dir] = value.split(':') as any;
                    setSortBy(by);
                    setSortDir(dir);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="executedAt:desc">Date (Newest)</SelectItem>
                    <SelectItem value="executedAt:asc">Date (Oldest)</SelectItem>
                    <SelectItem value="status:asc">Status (A→Z)</SelectItem>
                    <SelectItem value="status:desc">Status (Z→A)</SelectItem>
                    <SelectItem value="taskName:asc">Task (A→Z)</SelectItem>
                    <SelectItem value="taskName:desc">Task (Z→A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Executions List */}
        {isInitialLoading ? (
          <Card>
            <CardContent className="py-6">
              <div className="space-y-3">
                {[0, 1, 2].map((idx) => (
                  <div key={idx} className="animate-pulse rounded-xl border border-border/60 p-4">
                    <div className="h-4 w-48 rounded bg-muted/55" />
                    <div className="mt-2 h-3 w-72 rounded bg-muted/40" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : filteredExecutions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No executions found. {executions.length === 0 ? 'Create and run some tasks to see execution history.' : 'Try a different search filter.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredExecutions.map((execution) => {
              const sourceAccountLabel =
                execution.sourceAccountName || execution.sourceAccount || 'Unknown source';
              const targetAccountLabel =
                execution.targetAccountName || execution.targetAccount || 'Unknown target';
              const messageText = toDisplayText(execution.originalContent);
              const messagePreview =
                messageText.length > 220 ? `${messageText.slice(0, 220)}...` : messageText;
              const messageLinks = extractExecutionMessageLinks(execution.responseData);
              const isSuccess = execution.status === 'success';
              const isFailed = execution.status === 'failed';
              const isLatestForTask = latestExecutionByTask.get(execution.taskId)?.id === execution.id;
              const pendingProgress = isLatestForTask ? activeTaskProgress[execution.taskId] : undefined;
              const isPending = execution.status === 'pending' || typeof pendingProgress === 'number';
              const statusText = isSuccess ? 'Success' : isFailed ? 'Failed' : 'Processing';
              const statusClass = isSuccess
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : isFailed
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
              const liveProgress = clampProgress(typeof pendingProgress === 'number' ? pendingProgress : 64);
              const sourcePlatformId = accountById[execution.sourceAccount]?.platformId as PlatformId | undefined;
              const targetPlatformId = accountById[execution.targetAccount]?.platformId as PlatformId | undefined;

              return (
                <Card
                  key={execution.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer"
                >
                  <CardContent className="p-6">
                    <div
                      className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
                      onClick={() =>
                        setExpandedId(
                          expandedId === execution.id ? null : execution.id
                        )
                      }
                    >
                      <div className="flex-1">
                        <div className="mb-2 flex items-start gap-3">
                          <p className="font-semibold text-foreground break-words">
                            {messagePreview}
                          </p>
                          <span
                            className={`inline-block shrink-0 px-3 py-1 rounded-full text-xs font-semibold ${statusClass}`}
                          >
                            {statusText}
                          </span>
                        </div>

                        <p className="text-sm text-muted-foreground">
                          Executed {new Date(execution.executedAt).toLocaleString()}
                        </p>

                        {isPending && (
                          <div className="mt-4 execution-processing-card">
                            <div className="mb-2 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-2">
                                <span className="execution-live-dot" />
                                Processing message and preparing destination post
                              </span>
                              <span>{liveProgress}%</span>
                            </div>
                            <div className="mb-2 execution-flow-track">
                              <span className="execution-platform-chip">
                                {sourcePlatformId ? <PlatformIcon platformId={sourcePlatformId} size={14} /> : 'SRC'}
                              </span>
                              <span className="execution-flow-arrow">
                                <ArrowRight size={14} />
                              </span>
                              <span className="execution-platform-chip">
                                {targetPlatformId ? <PlatformIcon platformId={targetPlatformId} size={14} /> : 'DST'}
                              </span>
                            </div>
                            <div className="execution-progress-track">
                              <div
                                className="execution-progress-fill"
                                style={{ width: `${liveProgress}%` }}
                              />
                              <div className="execution-progress-indeterminate" />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:ml-4 sm:self-start">
                        <ChevronDown
                          size={20}
                          className={`transition-transform text-muted-foreground ${
                            expandedId === execution.id ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>

                    {expandedId === execution.id && (
                      <div className="mt-6 space-y-4 border-t border-border pt-6">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs text-muted-foreground">Source</p>
                            <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                              {sourcePlatformId ? <PlatformIcon platformId={sourcePlatformId} size={14} /> : null}
                              <span>{sourceAccountLabel}</span>
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs text-muted-foreground">Target</p>
                            <p className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                              {targetPlatformId ? <PlatformIcon platformId={targetPlatformId} size={14} /> : null}
                              <span>{targetAccountLabel}</span>
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs text-muted-foreground">Status</p>
                            <p
                              className={`text-sm font-semibold ${
                                isSuccess
                                  ? 'text-green-600 dark:text-green-400'
                                  : isFailed
                                    ? 'text-red-600 dark:text-red-400'
                                    : 'text-amber-600 dark:text-amber-300'
                              }`}
                            >
                              {statusText}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs text-muted-foreground">Error Reason</p>
                            <p className="text-sm text-foreground">
                              {isPending
                                ? 'Execution is still processing. Error details will appear only if the run fails.'
                                : execution.error?.trim() || 'No error'}
                            </p>
                          </div>
                        </div>

                        {isPending ? (
                          <p className="text-xs text-muted-foreground">
                            Result links will appear automatically once message processing is complete.
                          </p>
                        ) : isSuccess ? (
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                              <p className="mb-2 text-xs text-muted-foreground">Source Message Link</p>
                              {messageLinks.sourceUrl ? (
                                <a
                                  href={messageLinks.sourceUrl}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent"
                                >
                                  Open Source
                                </a>
                              ) : (
                                <p className="text-xs text-muted-foreground">Not available</p>
                              )}
                            </div>
                            <div>
                              <p className="mb-2 text-xs text-muted-foreground">Target Message Link</p>
                              {messageLinks.targetUrl ? (
                                <a
                                  href={messageLinks.targetUrl}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  onClick={(event) => event.stopPropagation()}
                                  className="inline-flex items-center rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-primary hover:bg-accent"
                                >
                                  Open Target
                                </a>
                              ) : (
                                <p className="text-xs text-muted-foreground">Not available</p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            Message links appear when execution succeeds.
                          </p>
                        )}

                        {!isSuccess && (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleRetryTask(execution.taskId);
                              }}
                              disabled={retryingTaskId === execution.taskId || isPending}
                            >
                              {retryingTaskId === execution.taskId ? 'Retrying...' : 'Retry Task Now'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
        {hasMore && (
          <div className="mt-6 flex justify-center">
            <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
