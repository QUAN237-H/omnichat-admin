'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Art3D, type Art3DName, BrandMark, BrandWordmark } from '../brand';
import SignOutButton from '../sign-out-button';

type NavItem = { href: string; label: string; art: Art3DName; active: boolean; count?: number };

export default function ConsoleShell({
  role,
  email,
  attentionCount,
  children,
}: {
  role: 'operator' | 'owner';
  email: string | null;
  attentionCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? '/';
  const view = useSearchParams()?.get('view');
  const roleLabel = role === 'owner' ? 'Owner' : 'Operator';

  const nav: NavItem[] = [
    {
      href: '/',
      label: 'Shops',
      art: 'store',
      active: (pathname === '/' && view !== 'attention') || pathname.startsWith('/businesses/'),
    },
    {
      href: '/?view=attention',
      label: 'Needs attention',
      art: 'bell',
      active: pathname === '/' && view === 'attention',
      count: attentionCount,
    },
    {
      href: '/metrics',
      label: 'Metrics',
      art: 'analytics',
      active: pathname.startsWith('/metrics'),
    },
    {
      href: '/waitlist',
      label: 'Waitlist',
      art: 'contacts',
      active: pathname.startsWith('/waitlist'),
    },
    {
      href: '/costs',
      label: 'AI costs',
      art: 'sale',
      active: pathname.startsWith('/costs'),
    },
    {
      href: '/incidents',
      label: 'Incidents',
      art: 'status',
      active: pathname.startsWith('/incidents'),
    },
    {
      href: '/audit',
      label: 'Audit log',
      art: 'key',
      active: pathname.startsWith('/audit'),
    },
  ];

  return (
    <div className="app">
      <aside className="app-sidebar" aria-label="Main">
        <Link href="/" className="app-brand" aria-label="OmniChat Ops, all shops">
          <BrandWordmark height={30} tagline="Operator console" />
        </Link>
        <div className="app-shop-card">
          <div className="app-shop-card-link">
            <Art3D name="key" size={40} priority />
            <span className="app-shop-card-text">
              <span className="app-brand-name">{roleLabel}</span>
              <span className="ops-identity">{email ?? 'Signed in'}</span>
            </span>
          </div>
        </div>
        <nav className="app-nav">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="app-nav-link"
              aria-current={item.active ? 'page' : undefined}
            >
              <span className="app-nav-art">
                <Art3D name={item.art} size={28} priority />
              </span>
              {item.label}
              {item.count ? <span className="notif-badge">{item.count}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="app-sidebar-footer">
          <SignOutButton variant="nav" />
        </div>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <Link href="/" className="ops-topbar-brand">
            <span className="app-topbar-mark">
              <BrandMark size={36} />
            </span>
            <span className="app-topbar-text">
              <span className="app-topbar-name">OmniChat Ops</span>
              <span className="ops-identity">{roleLabel}</span>
            </span>
          </Link>
          <div className="app-topbar-actions">
            <SignOutButton variant="icon" />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
