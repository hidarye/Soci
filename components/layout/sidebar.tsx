'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Zap, Settings, BarChart3, Plus, Users, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();

  const menuItems = [
    { icon: Home, label: 'Dashboard', href: '/' },
    { icon: Plus, label: 'Create Task', href: '/tasks/new' },
    { icon: Zap, label: 'My Tasks', href: '/tasks' },
    { icon: Users, label: 'Accounts', href: '/accounts' },
    { icon: BarChart3, label: 'Analytics', href: '/analytics' },
    { icon: Database, label: 'Executions', href: '/executions' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border h-screen flex flex-col fixed left-0 top-0">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <h1 className="text-2xl font-bold text-sidebar-primary flex items-center gap-2">
          <Zap size={24} />
          SocialFlow
        </h1>
        <p className="text-sidebar-foreground/60 text-sm mt-1">
          Multi-Platform Automation
        </p>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="bg-sidebar-accent/30 rounded-lg p-4">
          <p className="text-xs text-sidebar-foreground/60">
            Version 1.0.0 • Production Ready
          </p>
        </div>
      </div>
    </aside>
  );
}
