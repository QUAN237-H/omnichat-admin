'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, X } from '../../../lib/icons';
import type { WaitlistEntry, WaitlistStatus } from '../../../lib/types';
import { Art3D } from '../../brand';
import Pagination, { pageCountFor } from '../../pagination';
import WaitlistRow from './waitlist-row';

const PAGE_SIZE = 50;

const FILTERS: { id: '' | WaitlistStatus; label: string }[] = [
  { id: '', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'converted', label: 'Converted' },
];

export default function WaitlistTable({
  entries,
  total,
  page,
  q,
  status,
  generatedAt,
}: {
  entries: WaitlistEntry[];
  total: number;
  page: number;
  q: string;
  status: string;
  generatedAt: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(q);
  const now = Date.parse(generatedAt);
  const currentPage = Math.min(page, pageCountFor(total, PAGE_SIZE) - 1);

  function push(nextQ: string, nextStatus: string, nextPage = 0) {
    const params = new URLSearchParams();
    const trimmed = nextQ.trim();
    if (trimmed) params.set('q', trimmed);
    if (nextStatus) params.set('status', nextStatus);
    if (nextPage > 0) params.set('page', String(nextPage));
    const text = params.toString();
    router.push(text ? `/waitlist?${text}` : '/waitlist');
  }

  return (
    <section className="ops-panel">
      <div className="ops-toolbar">
        <div className="ops-seg" role="group" aria-label="Waitlist status">
          {FILTERS.map((filter) => (
            <Link
              key={filter.id || 'all'}
              href={
                filter.id
                  ? `/waitlist?status=${filter.id}${q ? `&q=${encodeURIComponent(q)}` : ''}`
                  : q
                    ? `/waitlist?q=${encodeURIComponent(q)}`
                    : '/waitlist'
              }
              className={(status || '') === filter.id ? 'ops-seg-btn is-active' : 'ops-seg-btn'}
              aria-current={(status || '') === filter.id ? 'page' : undefined}
            >
              {filter.label}
            </Link>
          ))}
        </div>
        <div className="ops-toolbar-end">
          <form
            className="ops-search"
            onSubmit={(event) => {
              event.preventDefault();
              push(query, status);
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
                  push('', status);
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
          <p className="ops-empty-title">{q || status ? 'No match on the waitlist' : 'Waitlist is empty'}</p>
          <p>
            {q || status
              ? 'Try a different filter, name, WhatsApp number or product.'
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
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <WaitlistRow key={entry.id} entry={entry} now={now} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={currentPage}
        pageSize={PAGE_SIZE}
        total={total}
        noun="people"
        onChange={(next) => push(q, status, next)}
      />
    </section>
  );
}
