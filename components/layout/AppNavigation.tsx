'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Flame,
  Heart,
  MessageCircle,
  Compass,
  User,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import styles from './AppNavigation.module.css';

interface AppNavigationProps {
  isAdmin?: boolean;
  likesCount?: number;
  matchesCount?: number;
}

export function AppNavigation({
  isAdmin = false,
  likesCount = 0,
  matchesCount = 0,
}: AppNavigationProps) {
  const pathname = usePathname();

  const navLinks = [
    {
      name: 'Discover',
      href: '/discover',
      icon: Flame,
    },
    {
      name: 'Likes',
      href: '/likes',
      icon: Heart,
      badge: likesCount > 0 ? likesCount : undefined,
    },
    {
      name: 'Matches',
      href: '/matches',
      icon: MessageCircle,
      badge: matchesCount > 0 ? matchesCount : undefined,
    },
    {
      name: 'Explore',
      href: '/explore',
      icon: Compass,
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: User,
    },
  ];

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={styles.desktopSidebar}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>H</div>
          <span className={styles.brandTitle}>Hinges</span>
        </div>

        <nav className={styles.navGroup}>
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[styles.navItem, isActive ? styles.active : '']
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className={styles.navIcon}>
                  <Icon size={20} />
                </span>
                <span>{item.name}</span>
                {item.badge !== undefined && (
                  <span className={styles.badgeCount}>{item.badge}</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className={styles.footerActions}>
          {isAdmin && (
            <Link
              href="/admin"
              className={[styles.navItem, pathname.startsWith('/admin') ? styles.active : '']
                .filter(Boolean)
                .join(' ')}
            >
              <span className={styles.navIcon}>
                <ShieldCheck size={20} />
              </span>
              <span>Admin</span>
            </Link>
          )}

          <Link
            href="/settings"
            className={[styles.navItem, pathname.startsWith('/settings') ? styles.active : '']
              .filter(Boolean)
              .join(' ')}
          >
            <span className={styles.navIcon}>
              <Settings size={20} />
            </span>
            <span>Settings</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className={styles.mobileBottomNav} aria-label="Mobile Navigation">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[styles.mobileNavItem, isActive ? styles.active : '']
                .filter(Boolean)
                .join(' ')}
            >
              <Icon size={22} />
              <span>{item.name}</span>
              {item.badge !== undefined && <span className={styles.mobileBadge} />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

