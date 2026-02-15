'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, Zap, Users, TrendingUp, Plus, Play, Pause, Edit, Trash2, FileText, ArrowRight, ArrowDown, Send, MessageSquare, Linkedin, Clock } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/components/i18n/language-provider';

export default function DashboardPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[#F8FAFC] control-app">
      <Sidebar />
      <Header />

      <main className="control-main p-6 lg:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 animate-fade-up">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
              </span>
              Live Operations
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">
              {t('dashboard.welcomeTitle', 'SocialFlow Dashboard')}
            </h1>
            <p className="text-slate-500 text-lg max-w-2xl font-medium">
              Your mission control for multi-platform social automation and analytics.
            </p>
          </div>
          <Link href="/tasks/new">
            <Button size="lg" className="rounded-2xl px-8 h-14 text-md font-bold shadow-xl shadow-blue-500/20 hover:shadow-2xl hover:shadow-blue-500/40 transition-all duration-300">
              <Plus className="mr-2 h-5 w-5" />
              {t('dashboard.launchNewAutomation', 'New Automation')}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 animate-fade-up">
          <StatCard title="Total Tasks" value={12} icon={Zap} color="primary" trend={{ value: 8, direction: 'up' }} />
          <StatCard title="Connected Accounts" value={6} icon={Users} color="accent" trend={{ value: 2, direction: 'up' }} />
          <StatCard title="Active Tasks" value={4} icon={TrendingUp} color="secondary" />
          <StatCard title="Success Rate" value="98.5%" icon={BarChart3} color="primary" trend={{ value: 1.2, direction: 'up' }} />
        </div>

        <div className="grid grid-cols-1 gap-10">
          <section className="animate-fade-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Active Automations</h2>
              <Link href="/tasks" className="text-sm font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                View All <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Task Card - Professional UI Inspired by the user image */}
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 group">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <span className="px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                      ACTIVE
                    </span>
                    <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">Social Auto Post</h3>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-400">Success:</span>
                    <span className="text-sm font-black text-emerald-500">100%</span>
                  </div>
                </div>

                <p className="text-slate-500 font-medium mb-10">
                  Auto-post to multiple social media platforms simultaneously.
                </p>

                <div className="flex flex-col md:flex-row items-center justify-center gap-6 mb-10 p-6 rounded-[2rem] bg-slate-50/50 border border-slate-100/50">
                  {/* Sources */}
                  <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                      <Facebook className="w-6 h-6" />
                    </div>
                    <span className="text-slate-300 text-xl font-light">+</span>
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    </div>
                    <span className="text-slate-300 text-xl font-light">+</span>
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-red-500/20">
                      <Instagram className="w-6 h-6" />
                    </div>
                  </div>

                  <div className="hidden md:block text-slate-300">
                    <ArrowRight className="h-6 w-6" />
                  </div>
                  <div className="md:hidden text-slate-300">
                    <ArrowDown className="h-6 w-6" />
                  </div>

                  {/* Targets */}
                  <div className="flex items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-blue-400 flex items-center justify-center text-white">
                      <Send className="w-6 h-6 fill-current" />
                    </div>
                    <span className="text-slate-300 text-xl font-light">+</span>
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
                      <MessageSquare className="w-5 h-5 fill-current" />
                    </div>
                    <span className="text-slate-300 text-xl font-light">+</span>
                    <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white">
                      <Linkedin className="w-6 h-6 fill-current" />
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-blue-700 flex items-center justify-center text-white">
                      <Linkedin className="w-6 h-6 fill-current" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-50">
                  <div className="flex items-center gap-2 text-slate-400">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm font-bold tracking-tight">Last run: 5 min ago</span>
                  </div>
                  <div className="h-2 w-32 rounded-full bg-slate-100 overflow-hidden">
                    <div className="h-full bg-emerald-500 w-[100%]" />
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Button variant="ghost" className="h-12 rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-100/50 font-bold gap-2">
                    <Pause className="h-4 w-4 fill-current" /> Pause
                  </Button>
                  <Button variant="ghost" className="h-12 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100/50 font-bold gap-2">
                    <Edit className="h-4 w-4" /> Edit
                  </Button>
                  <Button variant="ghost" className="h-12 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100/50 font-bold gap-2">
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                  <Button variant="ghost" className="h-12 rounded-2xl bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-100/50 font-bold gap-2">
                    <FileText className="h-4 w-4" /> Logs
                  </Button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

// Helper icons
function Facebook(props: any) {
  return <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.03 1.764-6.227 6.04-6.227 1.108 0 2.252.115 2.252.115v3.058h-1.559c-1.971 0-2.34 1.133-2.34 2.304v2.33h3.578l-.572 3.667h-3.006v7.98H9.101Z"/></svg>;
}
function Instagram(props: any) {
  return <svg {...props} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>;
}
function Send(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polyline points="22 2 15 22 11 13 2 9 22 2"/></svg>;
}
function MessageSquare(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function Linkedin(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>;
}
function ArrowRight(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
}
function ArrowDown(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>;
}
function Clock(props: any) {
  return <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
