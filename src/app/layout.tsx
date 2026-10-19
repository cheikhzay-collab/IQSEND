import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Cairo } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'IQSEND - COD & Logistics Suite for Morocco',
  description:
    'Unified COD e-commerce management platform for Morocco: multi-stage order lifecycle, Darija AI confirmation agents, WhatsApp live inbox, packing workstation, and Sendit logistics integration.',
  applicationName: 'IQSEND',
  openGraph: {
    title: 'IQSEND - COD & Logistics Suite for Morocco',
    description:
      'Unified COD e-commerce management platform for Morocco: multi-stage order lifecycle, Darija AI confirmation agents, WhatsApp live inbox, packing workstation, and Sendit logistics integration.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
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
    <html lang="fr" className={`${plusJakarta.variable} ${cairo.variable}`}>
      <body className="min-h-screen bg-[#F8FAFC] font-sans antialiased selection:bg-teal-500 selection:text-white">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}

