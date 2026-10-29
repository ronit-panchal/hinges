'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './home.module.css';

function HomeContent() {
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    errorParam === 'account_suspended'
      ? 'This account has been suspended for violating Community Guidelines.'
      : errorParam
      ? 'Authentication failed. Please try again.'
      : null
  );

  const handleGoogle = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      const supabase = createClient();

      const redirectTo =
        mode === 'signup'
          ? `${window.location.origin}/auth/callback?next=/onboarding`
          : `${window.location.origin}/auth/callback`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: { access_type: 'offline', prompt: 'consent' },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className={styles.root}>
      {/* ── LEFT: Brand ────────────────────────────────── */}
      <div className={styles.brand}>
        <div className={styles.brandInner}>
          <div className={styles.logo}>
            <div className={styles.logoMark}>H</div>
            <span className={styles.logoText}>Hinges</span>
          </div>

          <div className={styles.brandCopy}>
            <h1 className={styles.headline}>
              Closer connections<br />
              <em>start here.</em>
            </h1>
            <p className={styles.tagline}>
              Meet people from your university who share your world, your interests, and the kind of connection you&apos;re looking for.
            </p>
          </div>

          {/* Decorative floating cards */}
          <div className={styles.cards}>
            <div className={`${styles.card} ${styles.cardA}`}>
              <div className={styles.avatar} style={{ background: 'linear-gradient(135deg,#f9a8d4,#ec4899)' }} />
              <div>
                <p className={styles.cardName}>Priya, 22</p>
                <p className={styles.cardMeta}>LPU · Architecture</p>
              </div>
              <span className={styles.cardEmoji}>❤️</span>
            </div>

            <div className={`${styles.card} ${styles.cardB}`}>
              <div className={styles.avatar} style={{ background: 'linear-gradient(135deg,#a78bfa,#7c3aed)' }} />
              <div>
                <p className={styles.cardName}>Aryan, 24</p>
                <p className={styles.cardMeta}>IIT Delhi · CS &amp; AI</p>
              </div>
              <span className={styles.cardEmoji}>✨</span>
            </div>

            <div className={styles.matchPill}>
              <span className={styles.dot} />
              It&apos;s a match!
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Auth panel ───────────────────────────── */}
      <div className={styles.panel}>
        <div className={styles.card2}>
          {/* Tab switcher */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
              onClick={() => { setMode('signup'); setErrorMessage(null); }}
            >
              Create account
            </button>
            <button
              className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              onClick={() => { setMode('login'); setErrorMessage(null); }}
            >
              Sign in
            </button>
          </div>

          {/* Heading */}
          <div className={styles.heading}>
            <div className={styles.headLogoMark}>H</div>
            {mode === 'signup' ? (
              <>
                <h2 className={styles.title}>Join Hinges</h2>
                <p className={styles.subtitle}>
                  Discover people from your institution. Real peers, real connections.
                </p>
              </>
            ) : (
              <>
                <h2 className={styles.title}>Welcome back</h2>
                <p className={styles.subtitle}>
                  Sign in to continue to your Hinges profile.
                </p>
              </>
            )}
          </div>

          {errorMessage && (
            <div className={styles.error} role="alert">
              {errorMessage}
            </div>
          )}

          {/* Google button */}
          <button
            type="button"
            className={styles.googleBtn}
            onClick={handleGoogle}
            disabled={loading}
          >
            <svg className={styles.googleIcon} viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{loading ? 'Connecting...' : 'Continue with Google'}</span>
          </button>

          {/* Disclaimer */}
          <p className={styles.disclaimer}>
            By continuing, you agree to Hinges&apos;{' '}
            <Link href="/terms">Terms of Service</Link> and{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>

          {/* Footer links */}
          <div className={styles.footerLinks}>
            <Link href="/safety">Safety</Link>
            <Link href="/community-guidelines">Guidelines</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>}>
      <HomeContent />
    </Suspense>
  );
}
