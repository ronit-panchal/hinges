import React from 'react';
import { CheckCircle2, Clock, Building2 } from 'lucide-react';
import styles from './Badge.module.css';

interface BadgeProps {
  variant?: 'verified' | 'pending' | 'unverified' | 'institution' | 'neutral';
  children: React.ReactNode;
  icon?: boolean;
  className?: string;
}

export function Badge({
  variant = 'neutral',
  children,
  icon = true,
  className,
}: BadgeProps) {
  const renderIcon = () => {
    if (!icon) return null;
    switch (variant) {
      case 'verified':
        return <CheckCircle2 size={13} aria-hidden="true" />;
      case 'pending':
        return <Clock size={13} aria-hidden="true" />;
      case 'institution':
        return <Building2 size={13} aria-hidden="true" />;
      default:
        return null;
    }
  };

  return (
    <span
      className={[styles.badge, styles[variant], className || '']
        .filter(Boolean)
        .join(' ')}
    >
      {renderIcon()}
      <span>{children}</span>
    </span>
  );
}

