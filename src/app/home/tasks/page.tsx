import { redirect } from 'next/navigation';

export default function HomeTasksPage() {
  redirect('/tasks?filter=home_purchase,loan,home_setup,home_updates');
}
