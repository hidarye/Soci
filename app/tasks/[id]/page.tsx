'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { db, type Task } from '@/lib/db';
import { taskProcessor } from '@/lib/services/task-processor';
import { advancedProcessingService } from '@/lib/services/advanced-processing';
import {
  Play,
  Pause,
  Edit2,
  Trash2,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Zap,
} from 'lucide-react';
import { useRouter, useParams } from 'next/navigation';

export default function TaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;

  const [task, setTask] = useState<Task | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [errorAnalysis, setErrorAnalysis] = useState<any[]>([]);
  const [failurePrediction, setFailurePrediction] = useState<any>(null);
  const [performanceReport, setPerformanceReport] = useState<any>(null);

  useEffect(() => {
    const currentTask = db.getTask(taskId);
    if (!currentTask) {
      router.push('/tasks');
      return;
    }

    setTask(currentTask);

    // جلب الإحصائيات
    const taskStats = taskProcessor.getExecutionStats(taskId);
    setStats(taskStats);

    // جلب التنفيذات
    const taskExecutions = db.getTaskExecutions(taskId);
    setExecutions(
      taskExecutions.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime())
    );

    // تحليل الأخطاء
    const errors = advancedProcessingService.analyzeErrors(currentTask);
    setErrorAnalysis(errors);

    // توقع الفشل
    const prediction = advancedProcessingService.predictFailure(currentTask);
    setFailurePrediction(prediction);

    // تقرير الأداء
    const report = advancedProcessingService.generatePerformanceReport(currentTask);
    setPerformanceReport(report);
  }, [taskId, router]);

  const handleRunTask = async () => {
    if (!task) return;

    try {
      const executions = await taskProcessor.processTask(taskId);
      alert(`Task executed! ${executions.length} transfer(s) completed.`);
      
      // تحديث البيانات
      const updated = db.getTask(taskId);
      setTask(updated);
      
      const updatedExecutions = db.getTaskExecutions(taskId);
      setExecutions(updatedExecutions.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime()));
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleToggleStatus = () => {
    if (!task) return;

    const newStatus = task.status === 'active' ? 'paused' : 'active';
    db.updateTask(taskId, { status: newStatus as any });
    setTask({ ...task, status: newStatus as any });
  };

  const handleDelete = () => {
    if (confirm('Delete this task? This action cannot be undone.')) {
      db.deleteTask(taskId);
      router.push('/tasks');
    }
  };

  if (!task || !stats) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar />
        <Header />
        <main className="ml-64 mt-16 p-8">
          <p className="text-muted-foreground">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />

      <main className="ml-64 mt-16 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {task.name}
            </h1>
            <p className="text-muted-foreground">
              Task ID: {taskId.substring(0, 8)}...
            </p>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleRunTask} size="lg">
              <Play size={20} className="mr-2" />
              Run Now
            </Button>

            <Button
              variant="outline"
              onClick={handleToggleStatus}
            >
              {task.status === 'active' ? (
                <>
                  <Pause size={18} className="mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play size={18} className="mr-2" />
                  Resume
                </>
              )}
            </Button>

            <Button variant="outline" size="icon">
              <Edit2 size={18} />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleDelete}
              className="text-destructive bg-transparent"
            >
              <Trash2 size={18} />
            </Button>
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-8">
          <span
            className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
              task.status === 'active'
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
            }`}
          >
            {task.status.toUpperCase()}
          </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm mb-2">Total Executions</p>
              <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm mb-2">Successful</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.successful}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm mb-2">Failed</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                {stats.failed}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-sm mb-2">Success Rate</p>
              <p className="text-3xl font-bold text-primary">
                {stats.successRate}%
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Task Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Task Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p className="text-foreground">{task.description || 'No description'}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Execution Type</p>
                    <p className="text-foreground capitalize">{task.executionType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Content Type</p>
                    <p className="text-foreground capitalize">{task.contentType}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Source Accounts</p>
                    <p className="text-foreground font-semibold">
                      {task.sourceAccounts.length} account(s)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Target Accounts</p>
                    <p className="text-foreground font-semibold">
                      {task.targetAccounts.length} account(s)
                    </p>
                  </div>
                </div>

                {task.scheduleTime && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Scheduled For</p>
                    <p className="text-foreground">
                      {new Date(task.scheduleTime).toLocaleString()}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Executions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Executions</CardTitle>
              </CardHeader>
              <CardContent>
                {executions.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No executions yet. Run the task to see execution history.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {executions.slice(0, 5).map((exec, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/50"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {exec.status === 'success' ? (
                            <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
                          ) : (
                            <AlertCircle size={16} className="text-red-600 dark:text-red-400" />
                          )}
                          <div className="text-sm">
                            <p className="font-medium text-foreground">
                              {exec.status === 'success' ? 'Success' : 'Failed'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(exec.executedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        {exec.error && (
                          <span className="text-xs text-red-600 dark:text-red-400">
                            {exec.error.substring(0, 50)}...
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          <div className="space-y-6">
            {/* Performance Report */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap size={18} />
                  Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Uptime</p>
                  <p className="text-lg font-semibold text-foreground">
                    {performanceReport?.uptime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Avg. Time</p>
                  <p className="text-lg font-semibold text-foreground">
                    {performanceReport?.averageExecutionTime}
                  </p>
                </div>
                <div className="pt-3 border-t border-border">
                  {performanceReport?.recommendations.map((rec, idx) => (
                    <p key={idx} className="text-xs text-muted-foreground">
                      • {rec}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Failure Prediction */}
            {failurePrediction && failurePrediction.riskLevel > 0 && (
              <Card className={failurePrediction.riskLevel > 50 ? 'border-destructive' : ''}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle size={18} />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground mb-2">
                      Risk Level: {failurePrediction.riskLevel}%
                    </p>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          failurePrediction.riskLevel > 50
                            ? 'bg-destructive'
                            : failurePrediction.riskLevel > 30
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{
                          width: `${failurePrediction.riskLevel}%`,
                        }}
                      />
                    </div>
                  </div>
                  {failurePrediction.factors.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-2">
                        Factors:
                      </p>
                      {failurePrediction.factors.map((factor, idx) => (
                        <p key={idx} className="text-xs text-muted-foreground">
                          • {factor}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Error Analysis */}
            {errorAnalysis.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle size={18} />
                    Error Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {errorAnalysis.map((error, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-card/50 border border-border/50"
                    >
                      <p className="text-sm font-semibold text-foreground mb-1">
                        {error.pattern}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {error.suggestion}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
