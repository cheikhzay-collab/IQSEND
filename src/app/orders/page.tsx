import { redirect } from 'next/navigation';

export default function OrdersIndexRedirect() {
  redirect('/dashboard/orders');
}
