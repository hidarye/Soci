'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  ThumbsUp,
  MessageSquare,
  Share2,
  Eye,
  TrendingUp,
  Calendar,
  Facebook,
  Instagram,
  Twitter,
} from 'lucide-react'

const engagementData = [
  { date: 'Mon', facebook: 1200, instagram: 2100, twitter: 800 },
  { date: 'Tue', facebook: 1500, instagram: 2400, twitter: 950 },
  { date: 'Wed', facebook: 1800, instagram: 2800, twitter: 1200 },
  { date: 'Thu', facebook: 2200, instagram: 3200, twitter: 1500 },
  { date: 'Fri', facebook: 2800, instagram: 3800, twitter: 2100 },
  { date: 'Sat', facebook: 3200, instagram: 4200, twitter: 2400 },
  { date: 'Sun', facebook: 2900, instagram: 3900, twitter: 2200 },
]

const platformMetrics = [
  { name: 'Facebook', value: 3200, color: '#1F2937' },
  { name: 'Instagram', value: 4200, color: '#EC4899' },
  { name: 'Twitter', value: 2400, color: '#0EA5E9' },
  { name: 'TikTok', value: 5600, color: '#000000' },
  { name: 'LinkedIn', value: 1800, color: '#0A66C2' },
]

const postPerformance = [
  {
    id: 1,
    title: 'New Product Launch',
    platform: 'Instagram',
    likes: 2400,
    comments: 450,
    shares: 120,
    reach: 15600,
  },
  {
    id: 2,
    title: 'Behind the Scenes',
    platform: 'Twitter',
    likes: 1800,
    comments: 320,
    shares: 85,
    reach: 8900,
  },
  {
    id: 3,
    title: 'Team Celebration',
    platform: 'Facebook',
    likes: 3100,
    comments: 580,
    shares: 210,
    reach: 22400,
  },
]

const COLORS = ['#3B82F6', '#EC4899', '#0EA5E9', '#1F2937', '#0A66C2']

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('week')

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">Track your social media performance across all platforms</p>
          </div>

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last 7 Days</SelectItem>
              <SelectItem value="month">Last 30 Days</SelectItem>
              <SelectItem value="quarter">Last 90 Days</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Engagement</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">24.8K</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +12.5% vs last period
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Reach</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">89.2K</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +8.3% vs last period
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Posts Published</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">42</p>
              <p className="text-xs text-muted-foreground mt-1">Across all platforms</p>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg Engagement Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">7.2%</p>
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                +2.1% vs last period
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/40">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top Platform</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Instagram className="w-6 h-6 text-pink-600" />
                <span className="font-bold">Instagram</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">4.2K engagement</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <Tabs defaultValue="engagement" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="platforms">Platforms</TabsTrigger>
            <TabsTrigger value="posts">Top Posts</TabsTrigger>
          </TabsList>

          {/* Engagement Chart */}
          <TabsContent value="engagement">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle>Engagement Over Time</CardTitle>
                <CardDescription>Daily engagement metrics across all platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={engagementData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="facebook" stroke="#1F2937" strokeWidth={2} />
                    <Line type="monotone" dataKey="instagram" stroke="#EC4899" strokeWidth={2} />
                    <Line type="monotone" dataKey="twitter" stroke="#0EA5E9" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Platform Distribution */}
          <TabsContent value="platforms">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle>Engagement by Platform</CardTitle>
                  <CardDescription>Total engagement across platforms</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={platformMetrics}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {platformMetrics.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardHeader>
                  <CardTitle>Platform Breakdown</CardTitle>
                  <CardDescription>Engagement per platform</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {platformMetrics.map((platform, idx) => (
                    <div key={platform.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="font-medium">{platform.name}</span>
                      </div>
                      <span className="text-2xl font-bold">{platform.value.toLocaleString()}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Top Posts */}
          <TabsContent value="posts">
            <Card className="border-border/40">
              <CardHeader>
                <CardTitle>Top Performing Posts</CardTitle>
                <CardDescription>Your best content this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {postPerformance.map(post => (
                    <div key={post.id} className="p-4 rounded-lg border border-border/40 hover:border-border/60 transition">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium">{post.title}</h4>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {post.platform}
                          </Badge>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div className="flex items-center gap-2">
                          <ThumbsUp className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Likes</p>
                            <p className="font-semibold">{post.likes.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Comments</p>
                            <p className="font-semibold">{post.comments.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Shares</p>
                            <p className="font-semibold">{post.shares.toLocaleString()}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Reach</p>
                            <p className="font-semibold">{post.reach.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
