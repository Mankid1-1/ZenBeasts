import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';
import '@solana/wallet-adapter-react-ui/styles.css';

export const metadata: Metadata = {
  title: 'ZenBeasts - Solana NFT Ecosystem',
  description: 'Mint, evolve, and battle unique creatures on Solana'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-emerald-950 text-slate-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
