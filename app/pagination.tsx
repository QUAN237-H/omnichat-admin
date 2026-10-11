'use client';

import { ArrowLeft, ArrowRight } from '../lib/icons';

/** Page numbers to show: always first and last, the current page and its neighbours, gaps as null. */
function pageList(page: number, pageCount: number): (number | null)[] {
  const wanted = new Set([0, pageCount - 1, page - 1, page, page + 1]);
  const pages: (number | null)[] = [];
  for (let index = 0; index < pageCount; index += 1) {
    if (wanted.has(index)) pages.push(index);
    else if (pages[pages.length - 1] !== null) pages.push(null);
  }
  return pages;
}

export function paginate<T>(rows: readonly T[], page: number, pageSize: number): T[] {
  return rows.slice(page * pageSize, page * pageSize + pageSize);
}

export function pageCountFor(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export default function Pagination({
  page,
  pageSize,
  total,
  noun,
  onChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  noun: string;
  onChange: (page: number) => void;
}) {
  const pageCount = pageCountFor(total, pageSize);
  const first = total === 0 ? 0 : page * pageSize + 1;
  const last = Math.min(total, (page + 1) * pageSize);

  return (
    <nav className="ops-pager" aria-label={`${noun} pages`}>
      <span className="ops-pager-range">
        {first}–{last} of <span className="num">{total}</span> {noun}
      </span>
      {pageCount > 1 ? (
        <div className="ops-pager-pages">
          <button
            type="button"
            className="sm"
            onClick={() => onChange(page - 1)}
            disabled={page === 0}
            aria-label="Previous page"
          >
            <ArrowLeft size={14} aria-hidden="true" />
          </button>
          {pageList(page, pageCount).map((entry, index) =>
            entry === null ? (
              <span key={`gap-${index}`} className="ops-pager-gap" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={entry}
                type="button"
                className="ghost sm ops-pager-page"
                data-active={entry === page || undefined}
                aria-current={entry === page ? 'page' : undefined}
                onClick={() => onChange(entry)}
              >
                {entry + 1}
              </button>
            ),
          )}
          <button
            type="button"
            className="sm"
            onClick={() => onChange(page + 1)}
            disabled={page >= pageCount - 1}
            aria-label="Next page"
          >
            <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </nav>
  );
}
