'use client';

import { createContext, useContext, type ReactNode } from 'react';

export type FxSnapshot = {
  rate: number | null;
  fetchedAt: string | null;
  source: string | null;
};

const FxContext = createContext<FxSnapshot>({ rate: null, fetchedAt: null, source: null });

export function FxProvider({ value, children }: { value: FxSnapshot; children: ReactNode }) {
  return <FxContext.Provider value={value}>{children}</FxContext.Provider>;
}

export function useFx(): FxSnapshot {
  return useContext(FxContext);
}

export function useXafPerUsd(): number | null {
  return useFx().rate;
}
