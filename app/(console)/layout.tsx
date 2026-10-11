import type { ReactNode } from 'react';
import { needsAttention } from '../../lib/attention';
import { createServerSupabase } from '../../lib/supabase/server';
import type { AdminMe, FleetResponse } from '../../lib/types';
import { workerGet } from '../../lib/worker';
import { AccessScreen } from '../state-screen';
import ConsoleShell from './console-shell';

export default async function ConsoleLayout({ children }: { children: ReactNode }) {
  const me = await workerGet<AdminMe>('/admin/me');
  if (!me.ok) {
    return <AccessScreen status={me.status} error={me.error} code={me.code} />;
  }

  const [fleet, claims] = await Promise.all([
    workerGet<FleetResponse>('/admin/businesses'),
    createServerSupabase().then((supabase) => supabase.auth.getClaims()),
  ]);
  const shops = fleet.ok && Array.isArray(fleet.data.businesses) ? fleet.data.businesses : [];
  const attentionCount = shops.filter(needsAttention).length;
  const email = claims.data?.claims.email;

  return (
    <ConsoleShell role={me.data.role} email={typeof email === 'string' ? email : null} attentionCount={attentionCount}>
      {children}
    </ConsoleShell>
  );
}
