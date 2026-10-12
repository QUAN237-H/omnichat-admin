import type { Metadata } from 'next';
import FleetPage from '../fleet-page';

export const metadata: Metadata = { title: 'Shops' };

export default function ShopsPage() {
  return <FleetPage view="all" />;
}
