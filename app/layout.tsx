import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'Hinges — Closer connections start here',
  description:
    'An India-focused, adult dating and social discovery platform connecting college, university, and collegiate communities through authentic compatibility and campus squares.',
  keywords: [
    'dating app india',
    'university dating',
    'college social discovery',
    'institution dating',
    'verified college singles',
    'lpu dating',
    'campus square',
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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link rel="dns-prefetch" href="https://cutmokgbycvlmotrtubu.supabase.co" />
      </head>
      <body>{children}</body>
    </html>
  );
}
