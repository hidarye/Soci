# SocialFlow - Multi-Platform Social Media Automation

## Overview
SocialFlow is a Next.js 16 web application for managing and automating social media content across multiple platforms including Facebook, Instagram, Twitter, Telegram, TikTok, and YouTube.

## Project Structure
- `app/` - Next.js App Router pages and layouts
  - `page.tsx` - Main dashboard page
  - `dashboard/` - Dashboard components
  - `tasks/` - Task management pages
  - `accounts/` - Account management
  - `analytics/` - Analytics dashboard
  - `executions/` - Execution logs
  - `settings/` - Settings pages
  - `api/` - API routes
- `components/` - Reusable React components
- `lib/` - Utility functions and core logic
  - `automation-engine.ts` - Core automation logic
  - `platform-manager.ts` - Platform management
  - `services/` - Background services
  - `db.ts` - Database utilities
- `platforms/` - Platform-specific clients (Facebook, Instagram, Twitter, etc.)
- `public/` - Static assets
- `styles/` - Global styles

## Tech Stack
- Next.js 16 with React 19
- TypeScript
- Tailwind CSS 4
- Radix UI components
- Recharts for analytics
- pnpm as package manager

## Development
- Run: `pnpm dev` (starts on port 5000)
- Build: `pnpm build`
- Start production: `pnpm start`

## Recent Changes
- February 2, 2026: Initial import and Replit environment setup
  - Configured Next.js to allow all origins for Replit proxy
  - Set up development server on port 5000
