import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export default function Home() {
  const cookieStore = cookies();
  const session = cookieStore.get('iqsend_session');

  if (!session?.value) {
    redirect('/login');
  }

  redirect('/dashboard/orders');
}
