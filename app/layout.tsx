import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { GeistMono } from 'geist/font/mono';
import { Bricolage_Grotesque, Plus_Jakarta_Sans } from 'next/font/google';
import '../styles/tokens.css';
import '../styles/base.css';
import '../styles/shell.css';
import '../styles/globals.css';
import '../styles/auth.css';
import '../styles/pages-desk.css';
import '../styles/brand.css';
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
  description: 'Internal operator console for OmniChat fleet health and shop controls.',
  robots: { index: false, follow: false },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'OmniChat Ops',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/brand/omnichat-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/brand/omnichat-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/brand/omnichat-icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
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
