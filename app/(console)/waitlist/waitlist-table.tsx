'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatPhone, timeAgo } from '../../../lib/format';
import { Search, X } from '../../../lib/icons';
import type { WaitlistEntry } from '../../../lib/types';
import { Art3D } from '../../brand';
import Pagination, { pageCountFor } from '../../pagination';

const PAGE_SIZE = 50;

export default function WaitlistTable({
  entries,
  total,
  page,
  q,
  generatedAt,
}: {
  entries: WaitlistEntry[];
  total: number;
  page: number;
  q: string;
  generatedAt: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const now = Date.parse(generatedAt);
  const currentPage = Math.min(page, pageCountFor(total, PAGE_SIZE) - 1);

  function commitSearch(next: string) {
    const params = new URLSearchParams();
    const trimmed = next.trim();
    if (trimmed) params.set('q', trimmed);
    const text = params.toString();
    router.push(text ? `/waitlist?${text}` : '/waitlist');
  }

  return (
    <section className="ops-panel">
      <div className="ops-toolbar">
        <p className="ops-group-note mt-0" style={{ margin: 0 }}>
          {total === 1 ? '1 person' : `${total.toLocaleString('en-US')} people`}
          {q ? ` matching “${q}”` : ''}
        </p>
        <div className="ops-toolbar-end">
          <form
            className="ops-search"
            onSubmit={(event) => {
              event.preventDefault();
              commitSearch(query);
            }}
          >
            <Search size={16} className="ops-search-icon" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search name, number or what they sell"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search waitlist"
            />
            {query ? (
              <button
                type="button"
                className="ops-search-clear"
                onClick={() => {
                  setQuery('');
                  commitSearch('');
                }}
                aria-label="Clear search"
              >
                <X size={12} />
              </button>
            ) : null}
          </form>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="ops-empty">
          <Art3D name="contacts" size={56} />
          <p className="ops-empty-title">{q ? 'No match on the waitlist' : 'Waitlist is empty'}</p>
          <p>
            {q
              ? 'Try a different name, WhatsApp number or product they sell.'
              : 'People who join from the landing page show up here.'}
          </p>
        </div>
      ) : (
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>WhatsApp</th>
                <th>Sells</th>
                <th>Lang</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>
                    <span className="ops-shop-name">{entry.name}</span>
                  </td>
                  <td className="phone num">{formatPhone(entry.whatsapp)}</td>
                  <td className={entry.sells ? undefined : 'ops-faint'}>{entry.sells ?? '—'}</td>
                  <td>
                    <span className="badge">{entry.lang === 'fr' ? 'FR' : 'EN'}</span>
                  </td>
                  <td className="ops-muted" title={new Date(entry.createdAt).toLocaleString()}>
                    {timeAgo(entry.createdAt, now)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {total > PAGE_SIZE ? (
        <Pagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={total}
          noun="people"
          onChange={(next) => {
            const params = new URLSearchParams();
            if (q) params.set('q', q);
            if (next > 0) params.set('page', String(next));
            const text = params.toString();
            router.push(text ? `/waitlist?${text}` : '/waitlist');
          }}
        />
      ) : null}
    </section>
  );
}
