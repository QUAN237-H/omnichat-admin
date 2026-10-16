'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Art3D, type Art3DName, BrandMark, BrandWordmark } from '../brand';
import SignOutButton from '../sign-out-button';
import OpsAlertsControl from './ops-alerts-control';
import OpsMoreSheet, { useOpsMoreOpen } from './ops-more-sheet';

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
  const roleLabel = role === 'owner' ? 'Owner' : 'Operator';
  const [moreOpen, openMore, closeMore] = useOpsMoreOpen();

  const nav: NavItem[] = [
    {
      href: '/',
      label: 'Attention',
      art: 'attention',
      active: pathname === '/',
      count: attentionCount,
    },
    {
      href: '/shops',
      label: 'Shops',
      art: 'shops',
      active: pathname === '/shops' || pathname.startsWith('/businesses/'),
    },
    {
      href: '/waitlist',
      label: 'Waitlist',
      art: 'waitlist',
      active: pathname.startsWith('/waitlist'),
    },
    {
      href: '/costs',
      label: 'Costs',
      art: 'costs',
      active: pathname.startsWith('/costs'),
    },
    {
      href: '/flags',
      label: 'Flags',
      art: 'flags',
      active: pathname.startsWith('/flags'),
    },
    {
      href: '/notifications',
      label: 'Notifications',
      art: 'bell',
      active: pathname.startsWith('/notifications') || pathname.startsWith('/incidents'),
    },
    {
      href: '/platform',
      label: 'Platform',
      art: 'platform',
      active: pathname.startsWith('/platform'),
    },
    {
      href: '/audit',
      label: 'Audit',
      art: 'audit',
      active: pathname.startsWith('/audit'),
    },
  ];

  const mobileTabs = [
    nav[0]!,
    nav[1]!,
    nav[5]!,
  ] as const;
  const moreActive = ['/waitlist', '/costs', '/flags', '/platform', '/audit'].some((p) =>
    pathname === p || pathname.startsWith(`${p}/`),
  );

  return (
    <div className="app ops-app">
      <aside className="app-sidebar" aria-label="Main">
        <Link href="/" className="app-brand" aria-label="OmniChat Ops, needs attention">
          <BrandWordmark height={30} tagline="Operator console" />
        </Link>
        <div className="app-shop-card">
          <div className="app-shop-card-link">
            <Art3D name="audit" size={40} priority />
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
          <OpsAlertsControl />
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

      <nav className="app-tabbar ops-tabbar" aria-label="Ops">
        {mobileTabs.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="app-tab"
            aria-current={item.active ? 'page' : undefined}
          >
            <span className="app-tab-icon">
              <Art3D name={item.art} size={22} />
            </span>
            {item.label === 'Notifications' ? 'Alerts' : item.label}
            {item.count ? <span className="ops-tab-badge">{item.count}</span> : null}
          </Link>
        ))}
        <button
          type="button"
          className="app-tab"
          aria-current={moreActive || moreOpen ? 'page' : undefined}
          aria-expanded={moreOpen}
          onClick={openMore}
        >
          <span className="app-tab-icon">
            <Art3D name="flags" size={22} />
          </span>
          More
        </button>
      </nav>

      <OpsMoreSheet
        open={moreOpen}
        onClose={closeMore}
        footer={<SignOutButton variant="nav" />}
      />
    </div>
  );
}
