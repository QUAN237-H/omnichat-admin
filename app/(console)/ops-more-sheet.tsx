'use client';

import Link from 'next/link';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { Art3D, type Art3DName } from '../brand';
import OpsAlertsControl from './ops-alerts-control';

type MoreLink = { href: string; label: string; art: Art3DName };

const LINKS: MoreLink[] = [
  { href: '/waitlist', label: 'Waitlist', art: 'waitlist' },
  { href: '/costs', label: 'Costs', art: 'costs' },
  { href: '/flags', label: 'Flags', art: 'flags' },
  { href: '/platform', label: 'Platform', art: 'platform' },
  { href: '/audit', label: 'Audit', art: 'audit' },
];

export default function OpsMoreSheet({
  open,
  onClose,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  footer?: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="ops-more" role="presentation">
      <button type="button" className="ops-more-scrim" aria-label="Close menu" onClick={onClose} />
      <div className="ops-more-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="ops-more-handle" aria-hidden="true" />
        <h2 id={titleId} className="ops-more-title">
          More
        </h2>
        <nav className="ops-more-nav" aria-label="More ops pages">
          {LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="ops-more-link" onClick={onClose}>
              <Art3D name={item.art} size={28} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ops-more-alerts">
          <OpsAlertsControl />
        </div>
        {footer}
      </div>
    </div>
  );
}

export function useOpsMoreOpen(): [boolean, () => void, () => void] {
  const [open, setOpen] = useState(false);
  return [open, () => setOpen(true), () => setOpen(false)];
}
