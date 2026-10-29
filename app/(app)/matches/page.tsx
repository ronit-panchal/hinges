'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageCircle, Heart, Building2, ShieldCheck, Flame } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import styles from './matches.module.css';

interface MatchItem {
  id: string;
  createdAt: string;
  conversationId: string | null;
  otherUser: {
    id: string;
    display_name: string;
    date_of_birth: string;
    bio: string | null;
    verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
    institution?: { name: string };
    photos?: { storage_path: string }[];
  };
  lastMessage?: {
    id: string;
    body: string;
    created_at: string;
    sender_id: string;
  } | null;
}

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadMatches() {
      try {
        setLoading(true);
        const res = await fetch('/api/matches');
        const data = await res.json();
        if (res.ok) {
          setMatches(data.matches || []);
        }
      } catch (err) {
        console.error('Failed to load matches:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMatches();
  }, []);

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Matches & Conversations</h1>
        <p className={styles.subtitle}>
          Private conversations with members you have mutually connected with.
        </p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          Loading your matches...
        </div>
      ) : matches.length > 0 ? (
        <>
          {/* Recent Mutual Matches Strip */}
          <div>
            <h2 className={styles.sectionTitle}>Mutual Connections</h2>
            <div className={styles.matchesStrip}>
              {matches.map((item) => {
                const photo = item.otherUser.photos?.[0]?.storage_path;
                return (
                  <div
                    key={item.id}
                    className={styles.matchBubble}
                    onClick={() => {
                      if (item.conversationId) {
                        router.push(`/messages/${item.conversationId}`);
                      }
                    }}
                  >
                    <div className={styles.avatarRing}>
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt={item.otherUser.display_name}
                          className={styles.avatar}
                        />
                      ) : (
                        <div
                          style={{
                            width: '100%',
                            height: '100%',
                            borderRadius: '50%',
                            backgroundColor: 'var(--bg-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-muted)',
                            fontSize: '0.8rem',
                          }}
                        >
                          {item.otherUser.display_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span className={styles.matchName}>
                      {item.otherUser.display_name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Conversations List */}
          <div>
            <h2 className={styles.sectionTitle}>Messages</h2>
            <div className={styles.conversationsList}>
              {matches.map((item) => {
                const photo = item.otherUser.photos?.[0]?.storage_path;
                return (
                  <div
                    key={item.id}
                    className={styles.conversationItem}
                    onClick={() => {
                      if (item.conversationId) {
                        router.push(`/messages/${item.conversationId}`);
                      }
                    }}
                  >
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photo}
                        alt={item.otherUser.display_name}
                        className={styles.convAvatar}
                      />
                    ) : (
                      <div
                        className={styles.convAvatar}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {item.otherUser.display_name.charAt(0)}
                      </div>
                    )}

                    <div className={styles.convDetails}>
                      <div className={styles.convTop}>
                        <div className={styles.convName}>
                          <span>{item.otherUser.display_name}</span>
                          {item.otherUser.verification_status === 'verified' && (
                            <Badge variant="verified" icon={false}>
                              Verified
                            </Badge>
                          )}
                        </div>
                        <span className={styles.convTime}>
                          {item.lastMessage
                            ? formatTime(item.lastMessage.created_at)
                            : formatTime(item.createdAt)}
                        </span>
                      </div>

                      <div className={styles.convSnippet}>
                        {item.lastMessage ? (
                          item.lastMessage.body
                        ) : (
                          <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>
                            New match! Say hello...
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* TRUTHFUL EMPTY STATE */
        <div className={styles.emptyState}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            <MessageCircle size={30} />
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem' }}>
            No matches yet
          </h2>
          <p
            style={{
              fontSize: '0.92rem',
              color: 'var(--text-secondary)',
              lineHeight: '1.6',
            }}
          >
            When you and another member mutually like each other, your conversation will open right here.
          </p>
          <Link href="/discover" style={{ width: '100%', marginTop: '0.5rem' }}>
            <Button
              variant="primary"
              size="md"
              fullWidth
              icon={<Flame size={18} />}
            >
              Start Discovering
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}

