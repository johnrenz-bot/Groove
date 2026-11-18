import { redirect } from 'next/navigation';

/**
 * /client/appointments — preserved as a redirect so old bookmarks,
 * notifications CTAs and deep links land in the hub's Board view.
 */
export default async function ClientAppointmentsAlias({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  qs.set('view', 'board');
  for (const [key, value] of Object.entries(params ?? {})) {
    if (key === 'view') continue;
    if (Array.isArray(value)) value.forEach((v) => qs.append(key, v));
    else if (value !== undefined) qs.set(key, value);
  }
  redirect(`/client/messages?${qs.toString()}`);
}

