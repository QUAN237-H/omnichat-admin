export const WINDOWS = [
  { days: 1, label: '24 hours' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
] as const;

export function windowDays(raw: string | undefined): number {
  const days = Number(raw);
  return WINDOWS.some((window) => window.days === days) ? days : 30;
}
