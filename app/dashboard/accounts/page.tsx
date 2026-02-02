'use client'

import React from "react"

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Facebook,
  Instagram,
  Twitter,
  Music,
  Play,
  MessageCircle,
  Linkedin,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'

const platforms = [
  { id: 'facebook', name: 'Facebook', icon: Facebook, color: 'bg-blue-600' },
  { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-purple-600 to-pink-600' },
  { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'bg-sky-500' },
  { id: 'tiktok', name: 'TikTok', icon: Music, color: 'bg-black' },
  { id: 'youtube', name: 'YouTube', icon: Play, color: 'bg-red-600' },
  { id: 'telegram', name: 'Telegram', icon: MessageCircle, color: 'bg-sky-400' },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, color: 'bg-blue-700' },
]

export default function AccountsPage() {
  const [authMethod, setAuthMethod] = useState<'oauth' | 'manual'>('oauth')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('facebook')
  const [accounts, setAccounts] = useState<any[]>([])
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [formData, setFormData] = useState({ username: '', accessToken: '' })

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.username.trim()) {
      alert('Please enter username')
      return
    }

    const platform = platforms.find(p => p.id === selectedPlatform)
    const newAccount = {
      id: crypto.randomUUID(),
      platform: selectedPlatform,
      platformName: platform?.name || 'Unknown',
      username: formData.username,
      status: 'connected',
      connectedAt: new Date().toLocaleDateString(),
    }

    setAccounts([...accounts, newAccount])
    setFormData({ username: '', accessToken: '' })
    setShowAddDialog(false)
  }

  const handleRemoveAccount = (id: string) => {
    if (confirm('Are you sure you want to remove this account?')) {
      setAccounts(accounts.filter(a => a.id !== id))
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage Accounts</h1>
            <p className="text-muted-foreground">Connect and manage your social media accounts</p>
          </div>

          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Connect New Account</DialogTitle>
                <DialogDescription>Choose your authentication method and connect your social media account</DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Auth Method Selection */}
                <div>
                  <Label className="text-base font-semibold mb-4 block">Authentication Method</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setAuthMethod('oauth')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        authMethod === 'oauth'
                          ? 'border-primary bg-primary/5'
                          : 'border-border/40 hover:border-border/60'
                      }`}
                    >
                      <div className="font-semibold">OAuth</div>
                      <div className="text-sm text-muted-foreground">Secure, one-click login</div>
                    </button>
                    <button
                      onClick={() => setAuthMethod('manual')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        authMethod === 'manual'
                          ? 'border-primary bg-primary/5'
                          : 'border-border/40 hover:border-border/60'
                      }`}
                    >
                      <div className="font-semibold">Manual</div>
                      <div className="text-sm text-muted-foreground">API keys/tokens</div>
                    </button>
                  </div>
                </div>

                {/* Platform Selection */}
                <div>
                  <Label className="text-base font-semibold mb-4 block">Select Platform</Label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {platforms.map(platform => {
                      const Icon = platform.icon
                      return (
                        <button
                          key={platform.id}
                          onClick={() => setSelectedPlatform(platform.id)}
                          className={`p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2 ${
                            selectedPlatform === platform.id
                              ? 'border-primary bg-primary/5'
                              : 'border-border/40 hover:border-border/60'
                          }`}
                        >
                          <Icon className="w-6 h-6" />
                          <span className="text-xs font-medium text-center">{platform.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleAddAccount} className="space-y-4">
                  <div>
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="Your username"
                      value={formData.username}
                      onChange={e => setFormData({ ...formData, username: e.target.value })}
                    />
                  </div>

                  {authMethod === 'manual' && (
                    <div>
                      <Label htmlFor="token">Access Token / API Key</Label>
                      <Input
                        id="token"
                        placeholder="Paste your token here"
                        type="password"
                        value={formData.accessToken}
                        onChange={e => setFormData({ ...formData, accessToken: e.target.value })}
                      />
                    </div>
                  )}

                  <div className="flex gap-3 justify-end">
                    <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {authMethod === 'oauth' ? 'Connect with OAuth' : 'Add Account'}
                    </Button>
                  </div>
                </form>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {accounts.length === 0 ? (
          <Card className="border-border/40">
            <CardContent className="py-16 text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">No Accounts Connected</h3>
              <p className="text-muted-foreground mb-6">
                Connect your first social media account to get started with cross-platform posting.
              </p>
              <Button onClick={() => setShowAddDialog(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Add Your First Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Group by Platform */}
            {platforms.map(platform => {
              const platformAccounts = accounts.filter(a => a.platform === platform.id)
              if (platformAccounts.length === 0) return null

              const Icon = platform.icon
              return (
                <Card key={platform.id} className="border-border/40">
                  <CardHeader className="pb-4 border-b border-border/40">
                    <div className="flex items-center gap-3">
                      <Icon className="w-6 h-6" />
                      <div>
                        <CardTitle>{platform.name}</CardTitle>
                        <CardDescription>{platformAccounts.length} account(s) connected</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="space-y-3">
                      {platformAccounts.map(account => (
                        <div key={account.id} className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:border-border/60 transition">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1">
                              <p className="font-medium">{account.username}</p>
                              <p className="text-sm text-muted-foreground">Connected {account.connectedAt}</p>
                            </div>
                            <Badge variant="outline" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              {account.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button size="sm" variant="ghost" className="gap-1">
                              <Edit className="w-4 h-4" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleRemoveAccount(account.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
