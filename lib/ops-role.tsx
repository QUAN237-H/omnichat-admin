'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type OpsRole = 'operator' | 'owner';

const OpsRoleContext = createContext<OpsRole>('operator');

export function OpsRoleProvider({ role, children }: { role: OpsRole; children: ReactNode }) {
  return <OpsRoleContext.Provider value={role}>{children}</OpsRoleContext.Provider>;
}

export function useOpsRole(): OpsRole {
  return useContext(OpsRoleContext);
}

/** Owner can mutate; operators are read-only (worker still enforces). */
export function useCanMutate(): boolean {
  return useOpsRole() === 'owner';
}
