'use client';

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
import { Switch } from '@/components/ui/switch';
import { Save, Bell, Lock, Palette, Database } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    email: 'demo@example.com',
    timezone: 'UTC',
    theme: 'dark',
    notifications: {
      emailOnSuccess: true,
      emailOnError: true,
      pushNotifications: false,
    },
    privacy: {
      allowAnalytics: true,
      shareErrorLogs: false,
    },
  });

  const handleSave = () => {
    alert('Settings saved successfully!');
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Header />

      <main className="ml-64 mt-16 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account and application preferences
          </p>
        </div>

        <div className="max-w-3xl space-y-6">
          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock size={20} />
                Account
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={settings.email}
                  disabled
                  className="opacity-50 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Timezone
                </label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) =>
                    setSettings(prev => ({
                      ...prev,
                      timezone: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="EST">EST (Eastern Standard Time)</SelectItem>
                    <SelectItem value="CST">CST (Central Standard Time)</SelectItem>
                    <SelectItem value="MST">MST (Mountain Standard Time)</SelectItem>
                    <SelectItem value="PST">PST (Pacific Standard Time)</SelectItem>
                    <SelectItem value="GMT">GMT (Greenwich Mean Time)</SelectItem>
                    <SelectItem value="CET">CET (Central European Time)</SelectItem>
                    <SelectItem value="IST">IST (Indian Standard Time)</SelectItem>
                    <SelectItem value="JST">JST (Japan Standard Time)</SelectItem>
                    <SelectItem value="AEST">AEST (Australian Eastern Standard Time)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Appearance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette size={20} />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Theme
                </label>
                <Select
                  value={settings.theme}
                  onValueChange={(value) =>
                    setSettings(prev => ({
                      ...prev,
                      theme: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="auto">Auto (System)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell size={20} />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Email on Success
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when tasks complete successfully
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.emailOnSuccess}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        emailOnSuccess: checked,
                      },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Email on Error
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when tasks fail
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.emailOnError}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        emailOnError: checked,
                      },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Push Notifications
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Receive browser push notifications
                  </p>
                </div>
                <Switch
                  checked={settings.notifications.pushNotifications}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        pushNotifications: checked,
                      },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Privacy Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock size={20} />
                Privacy & Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Usage Analytics
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Help us improve by sharing anonymous usage data
                  </p>
                </div>
                <Switch
                  checked={settings.privacy.allowAnalytics}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      privacy: {
                        ...prev.privacy,
                        allowAnalytics: checked,
                      },
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-foreground">
                    Share Error Logs
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Help us debug issues by sharing error logs
                  </p>
                </div>
                <Switch
                  checked={settings.privacy.shareErrorLogs}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({
                      ...prev,
                      privacy: {
                        ...prev.privacy,
                        shareErrorLogs: checked,
                      },
                    }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Database Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database size={20} />
                Database & Storage
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-card/50 border border-border/50">
                <p className="text-sm text-foreground mb-2">
                  Database Status: <span className="font-semibold text-green-600">Connected</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Using in-memory database (Demo Mode). In production, this connects to Neon PostgreSQL.
                </p>
              </div>

              <Button variant="outline" className="w-full bg-transparent">
                Export Data
              </Button>
              <Button variant="outline" className="w-full bg-transparent">
                Clear Cache
              </Button>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex gap-3">
            <Button size="lg" onClick={handleSave}>
              <Save size={20} className="mr-2" />
              Save Settings
            </Button>
            <Button size="lg" variant="outline">
              Reset to Default
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
