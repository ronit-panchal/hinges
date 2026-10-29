import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, Playfair_Display } from 'next/font/google';
import '@/styles/globals.css';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-serif',
});

export const metadata: Metadata = {
  title: 'Hinges — Closer connections start here',
  description:
    'An institution-based dating and social discovery platform connecting university and collegiate communities through authentic compatibility.',
  keywords: [
    'dating app',
    'university dating',
    'college social discovery',
    'institution dating',
    'verified college singles',
    'meaningful connections',
  ],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${playfairDisplay.variable}`}>
      <head>
        <link rel="dns-prefetch" href="https://cutmokgbycvlmotrtubu.supabase.co" />
      </head>
      <body>{children}</body>
    </html>
  );
}
