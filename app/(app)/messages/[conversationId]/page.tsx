'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Send,
  MoreVertical,
  ShieldAlert,
  UserX,
  Flag,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { createClient } from '@/lib/supabase/client';
import styles from './chat.module.css';

interface MessageItem {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

interface OtherUser {
  id: string;
  display_name: string;
  verification_status: string;
  photos?: { storage_path: string }[];
}

export default function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = use(params);
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [matchStatus, setMatchStatus] = useState<string>('active');
  const [inputBody, setInputBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  // Safety Menu & Modals
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUnmatchModalOpen, setIsUnmatchModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('inappropriate_content');
  const [reportDetails, setReportDetails] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user ID
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUserId(data.user.id);
    });
  }, []);

  // Fetch messages function
  const fetchMessages = async () => {
    try {
      const res = await fetch(`/api/messages?conversationId=${conversationId}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 404) {
          router.push('/matches');
        }
        return;
      }
      const data = await res.json();
      setMessages(data.messages || []);
      setOtherUser(data.otherUser || null);
      setMatchId(data.matchId || null);
      setMatchStatus(data.matchStatus || 'active');
    } catch (err) {
      console.error('Error fetching conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime messages for this conversation
    const supabase = createClient();
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as MessageItem;
          setMessages((prev) => {
            // Avoid duplicate if we already added it optimistically
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputBody.trim();
    if (!trimmed || sending || matchStatus !== 'active') return;

    try {
      setSending(true);
      setInputBody('');

      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          body: trimmed,
        }),
      });

      const data = await res.json();
      if (res.ok && data.message) {
        setMessages((prev) => [...prev, data.message]);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      // Restore input on failure
      setInputBody(trimmed);
    } finally {
      setSending(false);
    }
  };

  // Unmatch Action
  const handleUnmatch = async () => {
    if (!matchId) return;
    try {
      await fetch(`/api/matches/${matchId}/unmatch`, { method: 'POST' });
      router.push('/matches');
    } catch (err) {
      console.error('Failed to unmatch:', err);
    }
  };

  // Block Action
  const handleBlock = async () => {
    if (!otherUser) return;
    try {
      await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId: otherUser.id }),
      });
      router.push('/matches');
    } catch (err) {
      console.error('Failed to block user:', err);
    }
  };

  // Report Action
  const handleReport = async () => {
    if (!otherUser) return;
    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedUserId: otherUser.id,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      setIsReportModalOpen(false);
      // Also prompt block
      setIsBlockModalOpen(true);
    } catch (err) {
      console.error('Failed to report user:', err);
    }
  };

  const photoUrl = otherUser?.photos?.[0]?.storage_path;

  return (
    <div className={styles.chatContainer}>
      {/* Header */}
      <header className={styles.chatHeader}>
        <div className={styles.headerLeft}>
          <Link href="/matches" className={styles.backButton} aria-label="Back to matches">
            <ArrowLeft size={20} />
          </Link>

          <div className={styles.userProfile}>
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={otherUser?.display_name || 'Match'}
                className={styles.headerAvatar}
              />
            ) : (
              <div
                className={styles.headerAvatar}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                }}
              >
                {otherUser?.display_name?.charAt(0) || 'M'}
              </div>
            )}

            <div className={styles.headerInfo}>
              <div className={styles.headerName}>
                <span>{otherUser?.display_name || 'Match'}</span>
                {otherUser?.verification_status === 'verified' && (
                  <Badge variant="verified" icon={false}>
                    Verified
                  </Badge>
                )}
              </div>
              <span className={styles.headerStatus}>
                {matchStatus === 'active' ? 'Active Match' : 'Unmatched'}
              </span>
            </div>
          </div>
        </div>

        {/* Safety Dropdown Menu */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            className={styles.backButton}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Safety menu"
          >
            <MoreVertical size={20} />
          </button>

          {isMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-md)',
                width: '160px',
                zIndex: 30,
                overflow: 'hidden',
              }}
            >
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  width: '100%',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                  textAlign: 'left',
                }}
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsUnmatchModalOpen(true);
                }}
              >
                <UserX size={15} />
                <span>Unmatch</span>
              </button>
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  width: '100%',
                  fontSize: '0.85rem',
                  color: 'var(--danger)',
                  borderTop: '1px solid var(--border-subtle)',
                  textAlign: 'left',
                }}
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsBlockModalOpen(true);
                }}
              >
                <ShieldAlert size={15} />
                <span>Block User</span>
              </button>
              <button
                type="button"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem 1rem',
                  width: '100%',
                  fontSize: '0.85rem',
                  color: 'var(--text-secondary)',
                  borderTop: '1px solid var(--border-subtle)',
                  textAlign: 'left',
                }}
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsReportModalOpen(true);
                }}
              >
                <Flag size={15} />
                <span>Report User</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Messages Feed */}
      <div className={styles.messagesArea}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading conversation...
          </div>
        ) : messages.length === 0 ? (
          <div className={styles.emptyPrompt}>
            <p>You matched with <strong>{otherUser?.display_name}</strong>!</p>
            <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>
              Break the ice by mentioning a mutual interest or asking about their favorite campus spots.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isOutgoing = msg.sender_id === currentUserId;
            return (
              <div
                key={msg.id}
                className={[
                  styles.messageRow,
                  isOutgoing ? styles.outgoing : styles.incoming,
                ].join(' ')}
              >
                <div
                  className={[
                    styles.bubble,
                    isOutgoing ? styles.outgoing : styles.incoming,
                  ].join(' ')}
                >
                  {msg.body}
                </div>
                <span className={styles.messageTime}>
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input or Inactive Banner */}
      {matchStatus === 'active' ? (
        <form className={styles.inputForm} onSubmit={handleSendMessage}>
          <input
            type="text"
            className={styles.textInput}
            placeholder={`Message ${otherUser?.display_name || ''}...`}
            value={inputBody}
            onChange={(e) => setInputBody(e.target.value)}
            disabled={sending}
          />
          <button
            type="submit"
            className={styles.sendButton}
            disabled={!inputBody.trim() || sending}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </form>
      ) : (
        <div className={styles.inactiveBanner}>
          This match is no longer active. Messaging is disabled.
        </div>
      )}

      {/* Unmatch Confirmation Modal */}
      <Modal
        isOpen={isUnmatchModalOpen}
        onClose={() => setIsUnmatchModalOpen(false)}
        title="Unmatch Confirmation"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Are you sure you want to unmatch with <strong>{otherUser?.display_name}</strong>? This will remove this conversation and prevent further messages.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="ghost" size="sm" onClick={() => setIsUnmatchModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleUnmatch}>
              Unmatch
            </Button>
          </div>
        </div>
      </Modal>

      {/* Block Confirmation Modal */}
      <Modal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        title="Block User"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Blocking <strong>{otherUser?.display_name}</strong> will instantly end this match, delete conversation access, and prevent both profiles from appearing in discovery.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="ghost" size="sm" onClick={() => setIsBlockModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleBlock}>
              Block User
            </Button>
          </div>
        </div>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        title="Report to Moderation"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Reason
            </label>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontFamily: 'inherit' }}
            >
              <option value="inappropriate_content">Inappropriate Content or Messages</option>
              <option value="harassment">Harassment or Abuse</option>
              <option value="spam">Commercial Spam / Scams</option>
              <option value="impersonation">Fake Account</option>
              <option value="underage">Suspected Under 18</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem' }}>
              Details
            </label>
            <textarea
              rows={3}
              placeholder="Describe the issue..."
              value={reportDetails}
              onChange={(e) => setReportDetails(e.target.value)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <Button variant="ghost" size="sm" onClick={() => setIsReportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleReport}>
              Submit Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

