import { redirect } from 'next/navigation';

export default function CreateTaskPage() {
  // Keep the legacy dashboard route, but use the redesigned wizard.
  redirect('/tasks/new');
}

