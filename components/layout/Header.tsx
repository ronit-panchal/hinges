import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <div className={styles.logoMark}>H</div>
          <span>Hinges</span>
        </Link>

        <nav className={styles.nav} aria-label="Main Navigation">
          <Link href="#how-it-works" className={styles.navLink}>
            How it works
          </Link>
          <Link href="/safety" className={styles.navLink}>
            Safety & Privacy
          </Link>
          <Link href="/community-guidelines" className={styles.navLink}>
            Guidelines
          </Link>
        </nav>

        <div className={styles.actions}>
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/signup">
            <Button variant="primary" size="sm">
              Create account
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

