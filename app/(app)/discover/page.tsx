'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Building2,
  SlidersHorizontal,
  Compass,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ProfileCard } from '@/components/discovery/ProfileCard';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Profile } from '@/lib/types/database';
import styles from './discover.module.css';

function DiscoverContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const exploreInstitutionId = searchParams.get('exploreInstitutionId');

  const [candidates, setCandidates] = useState<Profile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [institutionName, setInstitutionName] = useState('Campus Feed');

  // Match Modal State
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [matchedConversationId, setMatchedConversationId] = useState<string | null>(null);

  // Report & Block Modal State
  const [reportTargetProfile, setReportTargetProfile] = useState<Profile | null>(null);
  const [reportReason, setReportReason] = useState<string>('inappropriate_content');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccessMessage, setReportSuccessMessage] = useState<string | null>(null);

  // Touch swipe tracking
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Fetch candidates
  const fetchCandidates = useCallback(async () => {
    try {
      setLoading(true);
      const url = exploreInstitutionId
        ? `/api/discovery/feed?exploreInstitutionId=${encodeURIComponent(exploreInstitutionId)}`
        : '/api/discovery/feed';

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok) {
        setCandidates(data.candidates || []);
        if (data.institutionName) {
          setInstitutionName(data.institutionName);
        } else if (data.candidates?.length > 0 && data.candidates[0].institution) {
          setInstitutionName(data.candidates[0].institution.name);
        }
        setCurrentIndex(0);
      }
    } catch (err) {
      console.error('Error fetching discovery candidates:', err);
    } finally {
      setLoading(false);
    }
  }, [exploreInstitutionId]);

  useEffect(() => {
    fetchCandidates();
  }, [fetchCandidates]);

  // Swipe Action Handler
  const handleSwipe = useCallback(
    async (actionType: 'like' | 'pass' | 'super_like') => {
      if (actionPending || currentIndex >= candidates.length) return;

      const currentProfile = candidates[currentIndex];
      setActionPending(true);

      try {
        const res = await fetch('/api/swipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            recipientId: currentProfile.id,
            actionType,
          }),
        });

        const data = await res.json();

        if (res.ok) {
          if (data.is_match) {
            setMatchedProfile(currentProfile);
            setMatchedConversationId(data.conversation_id);
          }
          setCurrentIndex((prev) => prev + 1);
        }
      } catch (err) {
        console.error('Swipe action failed:', err);
      } finally {
        setActionPending(false);
      }
    },
    [actionPending, candidates, currentIndex]
  );

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (reportTargetProfile || matchedProfile) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSwipe('pass');
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSwipe('like');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleSwipe('super_like');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSwipe, reportTargetProfile, matchedProfile]);

  // Touch gesture listeners
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;

    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;

    const threshold = 65;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > threshold) {
        handleSwipe('like');
      } else if (deltaX < -threshold) {
        handleSwipe('pass');
      }
    } else {
      if (deltaY < -threshold) {
        handleSwipe('super_like');
      }
    }

    setTouchStartX(null);
    setTouchStartY(null);
  };

  // Submit Report & Block
  const handleReportAndBlock = async (shouldBlock: boolean) => {
    if (!reportTargetProfile) return;
    try {
      setReportSubmitting(true);

      // Submit report
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: reportTargetProfile.id,
          reason: reportReason,
          details: reportDetails,
        }),
      });

      // Submit block if requested
      if (shouldBlock) {
        await fetch('/api/blocks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            blockedId: reportTargetProfile.id,
          }),
        });
      }

      setReportSuccessMessage(
        shouldBlock
          ? 'Profile reported and blocked. You will no longer see each other.'
          : 'Report received. Our moderation team will review this profile.'
      );

      // Advance past this profile immediately
      setCurrentIndex((prev) => prev + 1);

      setTimeout(() => {
        setReportTargetProfile(null);
        setReportSuccessMessage(null);
        setReportDetails('');
      }, 1600);
    } catch (err) {
      console.error('Error submitting report:', err);
    } finally {
      setReportSubmitting(false);
    }
  };

  const currentCandidate = candidates[currentIndex];

  return (
    <div className={styles.container}>
      {/* Top Header Bar */}
      <div className={styles.topBar}>
        <div className={styles.institutionIndicator}>
          <Building2 size={18} color="var(--accent)" />
          <span>{institutionName}</span>
        </div>

        <Link href="/settings">
          <Button variant="ghost" size="sm" icon={<SlidersHorizontal size={16} />}>
            Filter
          </Button>
        </Link>
      </div>

      {/* Explore Mode Active Alert Banner */}
      {exploreInstitutionId && (
        <div className={styles.exploreAlert}>
          <span>Browsing other institution (Explore Mode)</span>
          <Link href="/discover">
            <Button variant="outline" size="sm">
              Return to Campus Feed
            </Button>
          </Link>
        </div>
      )}

      {/* Main Discovery Canvas */}
      <div
        className={styles.cardContainer}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-muted)' }}>
            Loading compatible profiles...
          </div>
        ) : currentCandidate ? (
          <ProfileCard
            key={currentCandidate.id}
            profile={currentCandidate}
            onSwipe={handleSwipe}
            onOpenReportModal={(prof) => setReportTargetProfile(prof)}
            disabled={actionPending}
          />
        ) : (
          /* EMPTY STATE */
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <CheckCircle2 size={32} />
            </div>
            <h2 className={styles.emptyTitle}>You&apos;re all set!</h2>
            <p className={styles.emptyDescription}>
              You&apos;ve completed onboarding. There are no other member profiles in your campus feed yet — as more students from your university join, they will appear here to match and chat.
            </p>
            <div className={styles.emptyActions}>
              <Link href="/profile" style={{ width: '100%' }}>
                <Button variant="primary" size="md" fullWidth icon={<Sparkles size={16} />}>
                  View &amp; Edit My Profile
                </Button>
              </Link>
              <Link href="/explore" style={{ width: '100%' }}>
                <Button variant="outline" size="md" fullWidth icon={<Compass size={16} />}>
                  Explore Other Institutions
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchCandidates}
                icon={<RotateCcw size={16} />}
              >
                Refresh Campus Feed
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mutual Match Modal */}
      <Modal
        isOpen={Boolean(matchedProfile)}
        onClose={() => setMatchedProfile(null)}
        title="It's a Match!"
      >
        <div className={styles.matchContent}>
          <span className={styles.matchBadge}>Mutual Connection</span>
          <h3 className={styles.matchTitle}>
            You and {matchedProfile?.display_name} liked each other
          </h3>
          <p className={styles.matchSubtitle}>
            Closer connections start here. Break the ice with a thoughtful opening message.
          </p>

          <div className={styles.matchActions}>
            {matchedConversationId ? (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={() => {
                  router.push(`/messages/${matchedConversationId}`);
                  setMatchedProfile(null);
                }}
              >
                Send a message
              </Button>
            ) : null}
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setMatchedProfile(null)}
            >
              Keep discovering
            </Button>
          </div>
        </div>
      </Modal>

      {/* Report & Block Modal */}
      <Modal
        isOpen={Boolean(reportTargetProfile)}
        onClose={() => setReportTargetProfile(null)}
        title={`Safety & Moderation: ${reportTargetProfile?.display_name}`}
      >
        {reportSuccessMessage ? (
          <div style={{ padding: '1rem', backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-sm)' }}>
            {reportSuccessMessage}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              We take safety seriously. Reports are reviewed by human moderators.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Reason for report
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontFamily: 'inherit' }}
              >
                <option value="inappropriate_content">Inappropriate Content or Photos</option>
                <option value="harassment">Harassment or Abusive Behavior</option>
                <option value="impersonation">Fake Profile or Impersonation</option>
                <option value="spam">Spam or Commercial Solicitation</option>
                <option value="underage">Suspected Under 18</option>
                <option value="other">Other Violation</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Details (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Help us understand the issue..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontFamily: 'inherit' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginTop: '0.5rem' }}>
              <Button
                variant="danger"
                size="md"
                fullWidth
                isLoading={reportSubmitting}
                onClick={() => handleReportAndBlock(true)}
              >
                Report & Block User
              </Button>
              <Button
                variant="outline"
                size="md"
                fullWidth
                disabled={reportSubmitting}
                onClick={() => handleReportAndBlock(false)}
              >
                Report Only
              </Button>
              <Button
                variant="ghost"
                size="sm"
                fullWidth
                onClick={() => setReportTargetProfile(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '4rem 1rem' }}>Loading campus feed...</div>}>
      <DiscoverContent />
    </Suspense>
  );
}

