'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Heart, Star, X, Building2, UserCheck, Compass } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import styles from './likes.module.css';

interface IncomingLike {
  id: string;
  action_type: 'like' | 'super_like';
  created_at: string;
  actor: {
    id: string;
    display_name: string;
    date_of_birth: string;
    bio: string | null;
    verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
    institution?: { id: string; name: string };
    photos?: { storage_path: string }[];
    interests?: { id: string; name: string }[];
  };
}

export default function LikesPage() {
  const router = useRouter();
  const [likes, setLikes] = useState<IncomingLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionPendingId, setActionPendingId] = useState<string | null>(null);

  // Match Modal
  const [matchedActor, setMatchedActor] = useState<any | null>(null);
  const [matchedConversationId, setMatchedConversationId] = useState<string | null>(null);

  const fetchLikes = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/likes');
      const data = await res.json();
      if (res.ok) {
        setLikes(data.likes || []);
      }
    } catch (err) {
      console.error('Failed to load likes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLikes();
  }, []);

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

  const handleRespond = async (like: IncomingLike, actionType: 'like' | 'pass') => {
    try {
      setActionPendingId(like.id);
      const res = await fetch('/api/swipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: like.actor.id,
          actionType,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        // Remove from list
        setLikes((prev) => prev.filter((l) => l.id !== like.id));

        if (data.is_match) {
          setMatchedActor(like.actor);
          setMatchedConversationId(data.conversation_id);
        }
      }
    } catch (err) {
      console.error('Respond to like failed:', err);
    } finally {
      setActionPendingId(null);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Incoming Interest</h1>
        <p className={styles.subtitle}>
          People from your community who have expressed interest in connecting with you.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading your incoming likes...
        </div>
      ) : likes.length > 0 ? (
        <div className={styles.grid}>
          {likes.map((item) => {
            const actor = item.actor;
            const photoUrl = actor.photos?.[0]?.storage_path;
            const age = calculateAge(actor.date_of_birth);
            const isSuperLike = item.action_type === 'super_like';
            const isPending = actionPendingId === item.id;

            return (
              <div key={item.id} className={styles.likeCard}>
                <div className={styles.photoWrapper}>
                  {isSuperLike && (
                    <div className={styles.superLikeBadge}>
                      <Star size={12} fill="currentColor" />
                      <span>Super Like</span>
                    </div>
                  )}

                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoUrl} alt={actor.display_name} className={styles.photo} />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      No Photo
                    </div>
                  )}

                  <div className={styles.overlay}>
                    <div className={styles.nameAge}>
                      {actor.display_name}, {age}
                    </div>
                    {actor.institution && (
                      <div className={styles.institution}>
                        <Building2 size={13} />
                        <span>{actor.institution.name}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.details}>
                  {actor.bio && <p className={styles.bio}>&ldquo;{actor.bio}&rdquo;</p>}
                  {actor.interests && actor.interests.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      {actor.interests.slice(0, 3).map((int) => (
                        <span
                          key={int.id}
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: 'var(--bg-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {int.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className={styles.actions}>
                  <Button
                    variant="outline"
                    size="sm"
                    fullWidth
                    disabled={isPending}
                    onClick={() => handleRespond(item, 'pass')}
                    icon={<X size={15} />}
                  >
                    Pass
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    fullWidth
                    disabled={isPending}
                    onClick={() => handleRespond(item, 'like')}
                    icon={<Heart size={15} fill="currentColor" />}
                  >
                    Match Back
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TRUTHFUL EMPTY STATE */
        <div className={styles.emptyState}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', backgroundColor: 'var(--bg-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <Heart size={28} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem' }}>
            No pending likes yet
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            When someone from your campus or explore community likes your profile, they will appear here so you can decide whether to connect.
          </p>
          <Link href="/discover" style={{ width: '100%', marginTop: '0.5rem' }}>
            <Button variant="primary" size="md" fullWidth>
              Explore Campus Feed
            </Button>
          </Link>
        </div>
      )}

      {/* Match Confirmation Modal */}
      <Modal
        isOpen={Boolean(matchedActor)}
        onClose={() => setMatchedActor(null)}
        title="It's a Mutual Match!"
      >
        <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem' }}>
            You and {matchedActor?.display_name} matched!
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Your shared interest is confirmed. You can now chat safely.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            {matchedConversationId && (
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={() => {
                  router.push(`/messages/${matchedConversationId}`);
                  setMatchedActor(null);
                }}
              >
                Send Message
              </Button>
            )}
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={() => setMatchedActor(null)}
            >
              Continue Reviewing Likes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

