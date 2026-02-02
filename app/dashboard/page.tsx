'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  Plus,
  Settings,
  Share2,
  Zap,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Users,
  ArrowUpRight,
} from 'lucide-react'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    activeAccounts: 0,
    scheduledPosts: 0,
    activeTasks: 0,
    totalReach: 0,
  })

  const [recentActivity] = useState([
    { id: 1, action: 'Posted to Facebook & Instagram', time: '2 hours ago', status: 'success' },
    { id: 2, action: 'Scheduled 5 posts for tomorrow', time: '4 hours ago', status: 'success' },
    { id: 3, action: 'Twitter token expired', time: '1 day ago', status: 'warning' },
    { id: 4, action: 'New automation task created', time: '2 days ago', status: 'success' },
  ])

  useEffect(() => {
    // In production, fetch from API
    setStats({
      activeAccounts: 8,
      scheduledPosts: 24,
      activeTasks: 3,
      totalReach: 125400,
    })
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Manage all your social media accounts in one place</p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/dashboard/create-task">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Task
              </Button>
            </Link>
            <Link href="/dashboard/accounts">
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.activeAccounts}</p>
                  <p className="text-xs text-muted-foreground mt-1">Connected platforms</p>
                </div>
                <Users className="w-10 h-10 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled Posts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.scheduledPosts}</p>
                  <p className="text-xs text-muted-foreground mt-1">This month</p>
                </div>
                <Clock className="w-10 h-10 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.activeTasks}</p>
                  <p className="text-xs text-muted-foreground mt-1">Automation tasks</p>
                </div>
                <Zap className="w-10 h-10 text-primary/20" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Reach</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{stats.totalReach.toLocaleString()}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" />
                    +12.5% this week
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-primary/20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-md">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Recent Activity */}
              <Card className="border-border/40 lg:col-span-2">
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Your latest actions and updates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivity.map(activity => (
                      <div key={activity.id} className="flex items-start justify-between pb-4 border-b border-border/40 last:border-0">
                        <div className="flex items-start gap-3">
                          {activity.status === 'success' ? (
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                          ) : (
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                          )}
                          <div>
                            <p className="font-medium">{activity.action}</p>
                            <p className="text-sm text-muted-foreground">{activity.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="border-border/40 h-fit">
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/dashboard/create-post" className="block">
                    <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                      <Plus className="w-4 h-4" />
                      Create Post
                    </Button>
                  </Link>
                  <Link href="/dashboard/create-task" className="block">
                    <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                      <Zap className="w-4 h-4" />
                      Create Task
                    </Button>
                  </Link>
                  <Link href="/dashboard/accounts" className="block">
                    <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                      <Share2 className="w-4 h-4" />
                      Manage Accounts
                    </Button>
                  </Link>
                  <Link href="/dashboard/analytics" className="block">
                    <Button variant="outline" className="w-full justify-start gap-2 bg-transparent">
                      <BarChart3 className="w-4 h-4" />
                      View Analytics
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>

            {/* Platform Status */}
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle>Platform Status</CardTitle>
                <CardDescription>Connection status for all platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {['Facebook', 'Instagram', 'Twitter', 'TikTok', 'YouTube', 'Telegram', 'LinkedIn', 'Threads'].map(
                    platform => (
                      <div key={platform} className="flex items-center gap-2 p-3 rounded-lg bg-card border border-border/40">
                        <div className="w-2 h-2 rounded-full bg-green-600" />
                        <span className="text-sm font-medium">{platform}</span>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle>Automation Tasks</CardTitle>
                <CardDescription>Manage your cross-platform automation workflows</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No tasks created yet</p>
                  <Link href="/dashboard/create-task">
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Create Your First Task
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accounts Tab */}
          <TabsContent value="accounts">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle>Connected Accounts</CardTitle>
                <CardDescription>Manage your social media accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Share2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No accounts connected yet</p>
                  <Link href="/dashboard/accounts">
                    <Button className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Account
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>Performance metrics across all platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">Analytics data will appear here once you start posting</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
