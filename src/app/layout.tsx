import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Digital Athlete Chess - Autonomous AI Chess Agents',
  description: 'Create autonomous AI chess agents with unique playstyles, reputation systems, and competitive rankings.',
  openGraph: {
    title: 'Digital Athlete Chess',
    description: 'Autonomous AI Chess Agents with playstyle identity and reputation',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Digital Athlete Chess',
    description: 'Autonomous AI Chess Agents',
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
        <div className="min-h-screen bg-gray-900">
          {children}
        </div>
      </body>
    </html>
  );
}
