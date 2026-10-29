'use client';

import React, { useState } from 'react';
import {
  Building2,
  MoreVertical,
  X,
  Star,
  Heart,
  Briefcase,
  GraduationCap,
  MapPin,
  Ruler,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Profile } from '@/lib/types/database';
import styles from './ProfileCard.module.css';

interface ProfileCardProps {
  profile: Profile;
  onSwipe: (action: 'like' | 'pass' | 'super_like') => void;
  onOpenReportModal: (profile: Profile) => void;
  disabled?: boolean;
}

export function ProfileCard({
  profile,
  onSwipe,
  onOpenReportModal,
  disabled = false,
}: ProfileCardProps) {
  const [photoIndex, setPhotoIndex] = useState(0);

  const photos = profile.photos && profile.photos.length > 0
    ? profile.photos.map((p) => p.storage_path)
    : [];

  const currentPhoto = photos[photoIndex];

  // Calculate age
  const calculateAge = (dobString: string): number => {
    if (!dobString) return 0;
    const dob = new Date(dobString);
    if (isNaN(dob.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(profile.date_of_birth);

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoIndex > 0) {
      setPhotoIndex((prev) => prev - 1);
    }
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (photoIndex < photos.length - 1) {
      setPhotoIndex((prev) => prev + 1);
    }
  };

  return (
    <article className={styles.cardWrapper}>
      {/* Top badges & Report button */}
      <div className={styles.topBadgeRow}>
        {profile.verification_status === 'verified' && (
          <Badge variant="verified">Verified Member</Badge>
        )}
        {profile.verification_status === 'pending' && (
          <Badge variant="pending">Pending Verification</Badge>
        )}
      </div>

      <button
        type="button"
        className={styles.menuButton}
        onClick={() => onOpenReportModal(profile)}
        aria-label="Report or block profile"
      >
        <MoreVertical size={18} />
      </button>

      {/* Photo with Carousel tap zones */}
      <div className={styles.photoContainer}>
        {photos.length > 1 && (
          <div className={styles.photoIndicators}>
            {photos.map((_, idx) => (
              <div
                key={idx}
                className={[
                  styles.indicatorBar,
                  idx === photoIndex ? styles.active : '',
                ].join(' ')}
              />
            ))}
          </div>
        )}

        {photoIndex > 0 && (
          <div
            className={styles.photoTapZoneLeft}
            onClick={handlePrevPhoto}
            aria-label="Previous photo"
          />
        )}
        {photoIndex < photos.length - 1 && (
          <div
            className={styles.photoTapZoneRight}
            onClick={handleNextPhoto}
            aria-label="Next photo"
          />
        )}

        {currentPhoto ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentPhoto}
            alt={profile.display_name}
            className={styles.photo}
          />
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            No Photo Available
          </div>
        )}

        {/* Name and Basic Info Overlay */}
        <div className={styles.photoOverlay}>
          <div className={styles.nameRow}>
            <h2 className={styles.displayName}>{profile.display_name}</h2>
            <span className={styles.age}>{age}</span>
          </div>

          <div className={styles.institutionRow}>
            <Building2 size={16} />
            <span>{profile.institution?.name || 'Institution Member'}</span>
          </div>
        </div>
      </div>

      {/* Content Details */}
      <div className={styles.contentSection}>
        {profile.bio && (
          <blockquote className={styles.bioBlock}>
            &ldquo;{profile.bio}&rdquo;
          </blockquote>
        )}

        <div className={styles.detailsGrid}>
          {profile.affiliation_type && (
            <span className={styles.detailPill}>
              <Briefcase size={14} />
              <span>
                {profile.affiliation_type.charAt(0).toUpperCase() +
                  profile.affiliation_type.slice(1)}
              </span>
            </span>
          )}

          {profile.department && (
            <span className={styles.detailPill}>
              <GraduationCap size={14} />
              <span>{profile.department}</span>
            </span>
          )}

          {profile.graduation_year && (
            <span className={styles.detailPill}>
              <span>Class of &apos;{profile.graduation_year.toString().slice(-2)}</span>
            </span>
          )}

          {profile.height_cm && (
            <span className={styles.detailPill}>
              <Ruler size={14} />
              <span>{profile.height_cm} cm</span>
            </span>
          )}

          {profile.city && (
            <span className={styles.detailPill}>
              <MapPin size={14} />
              <span>{profile.city}</span>
            </span>
          )}
        </div>

        {/* Intentions */}
        {profile.relationship_intentions &&
          profile.relationship_intentions.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  color: 'var(--text-muted)',
                  fontWeight: 700,
                  marginBottom: '0.4rem',
                }}
              >
                Relationship Intentions
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {profile.relationship_intentions.map((intent) => (
                  <span
                    key={intent}
                    style={{
                      fontSize: '0.82rem',
                      padding: '0.3rem 0.75rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--accent-light)',
                      color: 'var(--accent)',
                      fontWeight: 500,
                    }}
                  >
                    {intent}
                  </span>
                ))}
              </div>
            </div>
          )}

        {/* Interests */}
        {profile.interests && profile.interests.length > 0 && (
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                fontWeight: 700,
                marginBottom: '0.4rem',
              }}
            >
              Interests & Passions
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {profile.interests.map((interest) => (
                <span
                  key={interest.id}
                  style={{
                    fontSize: '0.82rem',
                    padding: '0.3rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {interest.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Swipe Action Buttons */}
      <div className={styles.actionsContainer}>
        <button
          type="button"
          className={[styles.actionButton, styles.passButton].join(' ')}
          onClick={() => onSwipe('pass')}
          disabled={disabled}
          aria-label="Pass"
          title="Pass (Left arrow or swipe left)"
        >
          <X size={26} strokeWidth={2.5} />
        </button>

        <button
          type="button"
          className={[styles.actionButton, styles.superLikeButton].join(' ')}
          onClick={() => onSwipe('super_like')}
          disabled={disabled}
          aria-label="Super Like"
          title="Super Like (Up arrow or swipe up)"
        >
          <Star size={22} fill="currentColor" />
        </button>

        <button
          type="button"
          className={[styles.actionButton, styles.likeButton].join(' ')}
          onClick={() => onSwipe('like')}
          disabled={disabled}
          aria-label="Like"
          title="Like (Right arrow or swipe right)"
        >
          <Heart size={30} fill="currentColor" />
        </button>
      </div>
    </article>
  );
}

