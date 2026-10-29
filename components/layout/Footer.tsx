import Link from 'next/link';
import styles from './Footer.module.css';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <div className={styles.brandName}>Hinges</div>
            <p className={styles.tagline}>
              Closer connections start here. Discover verified peers, build meaningful relationships, and connect within your community.
            </p>
          </div>

          <div className={styles.column}>
            <h4 className={styles.columnTitle}>Product</h4>
            <Link href="#how-it-works" className={styles.link}>
              How it works
            </Link>
            <Link href="/login" className={styles.link}>
              Sign in
            </Link>
            <Link href="/signup" className={styles.link}>
              Create account
            </Link>
          </div>

          <div className={styles.column}>
            <h4 className={styles.columnTitle}>Safety & Trust</h4>
            <Link href="/safety" className={styles.link}>
              Safety Tips
            </Link>
            <Link href="/community-guidelines" className={styles.link}>
              Community Guidelines
            </Link>
            <Link href="/privacy" className={styles.link}>
              Privacy Policy
            </Link>
            <Link href="/terms" className={styles.link}>
              Terms of Service
            </Link>
          </div>

          <div className={styles.column}>
            <h4 className={styles.columnTitle}>Community</h4>
            <span className={styles.link}>18+ Adults Only</span>
            <span className={styles.link}>Institution-Verified</span>
            <span className={styles.link}>Zero Fake Profiles</span>
          </div>
        </div>

        <div className={styles.bottom}>
          <p>&copy; {new Date().getFullYear()} Hinges Inc. All rights reserved.</p>
          <p>Designed for authentic, human connections.</p>
        </div>
      </div>
    </footer>
  );
}

