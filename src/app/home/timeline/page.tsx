import { redirect } from 'next/navigation';

export default function HomeTimelinePage() {
  redirect('/timeline?filter=home_purchase');
}
