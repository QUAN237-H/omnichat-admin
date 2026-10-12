import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import '../../dashboard/app/styles/tokens.css';
import '../../dashboard/app/styles/base.css';
import '../../dashboard/app/styles/shell.css';
import '../../dashboard/app/globals.css';
import '../../dashboard/app/styles/auth.css';
import '../../dashboard/app/styles/pages-desk.css';
import '../../dashboard/app/styles/brand.css';
import './ops.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta', display: 'swap' });
const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  display: 'swap',
  axes: ['opsz'],
});

export const metadata: Metadata = {
  title: { default: 'OmniChat Ops', template: '%s · OmniChat Ops' },
  applicationName: 'OmniChat Ops',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#f7f7fb',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${bricolage.variable} ${GeistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
