'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Pagination from './pagination';

/** Server-side paging: the page lives in the URL so the worker returns one page at a time. */
export default function UrlPager({
  page,
  pageSize,
  total,
  noun,
}: {
  page: number;
  pageSize: number;
  total: number;
  noun: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(next: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === 0) params.delete('page');
    else params.set('page', String(next));
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return <Pagination page={page} pageSize={pageSize} total={total} noun={noun} onChange={go} />;
}
