import { redirect } from 'next/navigation';

export default function OrderRedirectPage({
  params,
}: {
  params: { stage: string };
}) {
  redirect(`/dashboard/orders/${params.stage}`);
}
