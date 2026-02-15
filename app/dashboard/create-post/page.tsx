import { redirect } from 'next/navigation';

export default function LegacyDashboardCreatePostPage() {
  redirect('/tasks/new');
}
