'use client';

import { useEffect, useRef, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Task } from '@/lib/db';
import { BarChart3, CheckCircle2, Zap, Users, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { getCachedQuery, setCachedQuery } from '@/lib/client/query-cache';
import { useLanguage } from '@/components/i18n/language-provider';

export default function DashboardPage() {
  const { t } = useLanguage();
  const hasLoadedOnceRef = useRef(false);
  const [stats, setStats] = useState({
    totalTasks: 0,
    totalAccounts: 0,
    activeTasksCount: 0,
    totalExecutions: 0,
  });

  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const isInitialLoading =
    isLoadingDashboard &&
    recentTasks.length === 0 &&
    recentExecutions.length === 0 &&
    stats.totalTasks === 0 &&
    stats.totalAccounts === 0 &&
    stats.activeTasksCount === 0 &&
    stats.totalExecutions === 0;

  useEffect(() => {
    if (hasLoadedOnceRef.current) return;
    hasLoadedOnceRef.current = true;

    let cancelled = false;
    const controller = new AbortController();
    const cacheKey = 'dashboard:summary';
    const cached = getCachedQuery<{
      stats: typeof stats;
      recentTasks: Task[];
      recentExecutions: any[];
    }>(cacheKey, 20_000);

    if (cached) {
      setStats(cached.stats);
      setRecentTasks(cached.recentTasks);
      setRecentExecutions(cached.recentExecutions);
      setIsLoadingDashboard(false);
    } else {
      setIsLoadingDashboard(true);
    }

    async function load() {
      try {
        const res = await fetch(`/api/dashboard`, { signal: controller.signal });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Failed to load dashboard');
        if (cancelled) return;
        setStats(data.stats);
        setRecentTasks(data.recentTasks || []);
        setRecentExecutions(data.recentExecutions || []);
        setCachedQuery(cacheKey, {
          stats: data.stats,
          recentTasks: data.recentTasks || [],
          recentExecutions: data.recentExecutions || [],
        });
      } catch (error) {
        if ((error as Error)?.name === 'AbortError') return;
        console.error('[v0] Dashboard: Error loading dashboard data:', error);
      } finally {
        if (!cancelled) {
          setIsLoadingDashboard(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background control-app">
      <Sidebar />
      <Header />

      <main className="control-main">
        <div className="page-header animate-fade-up">
          <div>
            <span className="kpi-pill">Live Operations</span>
            <h1 className="page-title mt-3">
            {t('dashboard.welcomeTitle', 'Welcome to SocialFlow')}
            </h1>
            <p className="page-subtitle">
              Manage and automate your social media content across multiple platforms
            </p>
          </div>
          <Link href="/tasks/new">
            <Button size="lg" className="animate-float-soft">
              <Plus size={18} />
              {t('dashboard.launchNewAutomation', 'Launch New Automation')}
            </Button>
          </Link>
        </div>

        {isInitialLoading ? (
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((idx) => (
              <Card key={idx}>
                <CardContent className="pt-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-3 w-24 rounded bg-muted/50" />
                    <div className="h-8 w-20 rounded bg-muted/65" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title="Total Tasks"
              value={stats.totalTasks}
              icon={Zap}
              color="primary"
              trend={{ value: 12, direction: 'up' }}
            />
            <StatCard
              title="Connected Accounts"
              value={stats.totalAccounts}
              icon={Users}
              color="accent"
              trend={{ value: 5, direction: 'up' }}
            />
            <StatCard
              title="Active Tasks"
              value={stats.activeTasksCount}
              icon={TrendingUp}
              color="secondary"
            />
            <StatCard
              title="Total Executions"
              value={stats.totalExecutions}
              icon={BarChart3}
              color="primary"
              trend={{ value: 24, direction: 'up' }}
            />
          </div>
        )}

        {!isInitialLoading && (
          <Card className="mb-8 animate-fade-up">
            <CardHeader className="pb-3">
              <CardTitle>Workspace Onboarding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  {
                    label: 'Connect at least one account',
                    done: stats.totalAccounts > 0,
                    href: '/accounts',
                  },
                  {
                    label: 'Create your first automation task',
                    done: stats.totalTasks > 0,
                    href: '/tasks/new',
                  },
                  {
                    label: 'Run at least one successful execution',
                    done: recentExecutions.some((item) => item.status === 'success'),
                    href: '/executions',
                  },
                ].map((step) => (
                  <div
                    key={step.label}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-card/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2
                        size={15}
                        className={step.done ? 'text-emerald-500' : 'text-muted-foreground'}
                      />
                      <p className="text-sm text-foreground">{step.label}</p>
                    </div>
                    {!step.done && (
                      <Link href={step.href}>
                        <Button variant="outline" size="sm">Open</Button>
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="animate-fade-up">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t('dashboard.recentTasks', 'Recent Tasks')}</CardTitle>
              <Link href="/tasks">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoadingDashboard ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="animate-pulse rounded-xl border border-border/50 p-4">
                      <div className="h-4 w-40 rounded bg-muted/55" />
                      <div className="mt-2 h-3 w-32 rounded bg-muted/40" />
                    </div>
                  ))}
                </div>
              ) : recentTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No tasks created yet
                  </p>
                  <Link href="/tasks/new">
                    <Button>
                      <Plus size={18} className="mr-2" />
                      Create First Task
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-card/45 p-4 transition-colors hover:bg-card/75"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">
                          {task.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {task.sourceAccounts.length} sources →{' '}
                          {task.targetAccounts.length} targets
                        </p>
                      </div>
                      <span
                        className={`status-pill ${
                          task.status === 'active'
                            ? 'status-pill--success'
                            : 'status-pill--neutral'
                        }`}
                      >
                        {task.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="animate-fade-up-delay">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Recent Executions</CardTitle>
              <Link href="/executions">
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoadingDashboard ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((idx) => (
                    <div key={idx} className="animate-pulse rounded-xl border border-border/50 p-3">
                      <div className="h-4 w-36 rounded bg-muted/55" />
                      <div className="mt-2 h-3 w-28 rounded bg-muted/40" />
                    </div>
                  ))}
                </div>
              ) : recentExecutions.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    No executions yet
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentExecutions.map((execution, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-border/60 bg-card/55 p-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <ArrowRight
                          size={16}
                          className="text-muted-foreground flex-shrink-0"
                        />
                        <div className="text-sm">
                          <p className="font-medium text-foreground">
                            Transfer executed
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(execution.executedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`status-pill ${
                          execution.status === 'success'
                            ? 'status-pill--success'
                            : 'status-pill--error'
                        }`}
                      >
                        {execution.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="surface-card mt-8 rounded-2xl border-primary/20 p-8">
          <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-2">
                {t('dashboard.readyToAutomate', 'Ready to Automate?')}
              </h3>
              <p className="text-muted-foreground md:max-w-lg">
                Create your first task to start syncing content across platforms
              </p>
            </div>
            <Link href="/tasks/new">
              <Button size="lg">
                <Plus size={18} />
                Create New Task
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
