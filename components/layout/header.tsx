'use client';

import { Bell, Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function Header() {
  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-8 fixed right-0 top-0 left-64 z-40">
      <div className="flex-1 max-w-xl">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search tasks, accounts..."
            className="pl-10 bg-input border-border"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full"></span>
        </Button>

        <Button variant="ghost" size="icon">
          <User size={20} />
        </Button>
      </div>
    </header>
  );
}
