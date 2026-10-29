import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        textAlign: 'center',
        gap: '1rem',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'var(--accent)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'var(--font-serif)',
          fontSize: '1.4rem',
          fontWeight: 800,
        }}
      >
        H
      </div>
      <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.5rem' }}>
        Page Not Found
      </h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', lineHeight: '1.6' }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <div style={{ marginTop: '1rem' }}>
        <Link href="/">
          <Button variant="primary" size="md">
            Return to Hinges
          </Button>
        </Link>
      </div>
    </div>
  );
}

