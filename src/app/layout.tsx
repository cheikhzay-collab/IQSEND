import type { Metadata } from 'next';
import './globals.css';
import { AppProviders } from '@/components/providers/AppProviders';

export const metadata: Metadata = {
  title: 'Sendit COD Platform | Suivi Logistique & Confirmation IA',
  description: 'Plateforme e-commerce Cash-on-Delivery avec automatisation WhatsApp par IA et intégration Sendit.ma',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-[#F8FAFC] antialiased">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
