import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';

export const metadata: Metadata = {
  title: 'IQSEND - COD & Logistics Suite for Morocco',
  description:
    'Unified COD e-commerce management platform for Morocco: multi-stage order lifecycle, Darija AI confirmation agents, WhatsApp live inbox, packing workstation, and Sendit logistics integration.',
  applicationName: 'IQSEND',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'IQSEND - COD & Logistics Suite for Morocco',
    description:
      'Unified COD e-commerce management platform for Morocco: multi-stage order lifecycle, Darija AI confirmation agents, WhatsApp live inbox, packing workstation, and Sendit logistics integration.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'IQSEND',
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0F172A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" dir="ltr">
      <body className="min-h-screen bg-[#F8FAFC] font-sans antialiased selection:bg-emerald-500 selection:text-white">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

