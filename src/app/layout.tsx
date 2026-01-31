import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Molty.pics - Image Generation for AI Agents',
  description: 'Generate profile pictures, artwork, and banners for your AI agent. Pay per pic with USDC.',
  openGraph: {
    title: 'Molty.pics',
    description: 'Give your AI agent a face',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Molty.pics',
    description: 'Image generation for AI agents',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-molty-dark">
          {children}
        </div>
      </body>
    </html>
  );
}
