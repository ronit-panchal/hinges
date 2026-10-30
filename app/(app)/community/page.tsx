'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  Flame,
  Clock,
  Heart,
  MessageCircle,
  Flag,
  Trash2,
  ShieldCheck,
  Plus,
  Send,
  Building2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import styles from './community.module.css';

interface CommunityComment {
  id: string;
  post_id: string;
  author_name: string;
  body: string;
  is_author?: boolean;
  created_at: string;
}

interface CommunityPost {
  id: string;
  institution_id: string;
  category: string;
  content: string;
  is_anonymous: boolean;
  author_name: string;
  is_author?: boolean;
  reactions_count: number;
  comments_count: number;
  has_reacted?: boolean;
  created_at: string;
}

const CATEGORIES = [
  { value: 'all', label: 'All Topics' },
  { value: 'confessions', label: '🤫 Confessions' },
  { value: 'campus_gossip', label: '☕ Campus Scoop' },
  { value: 'questions', label: '💡 Questions & Advice' },
  { value: 'funny', label: '😂 Funny Moments' },
  { value: 'social', label: '🎉 Social & Events' },
  { value: 'general', label: '💬 General' },
];

export default function CommunityPage() {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'recent' | 'trending'>('recent');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [campusName, setCampusName] = useState<string>('Your Campus');

  // New Post Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState('confessions');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Active Expanded Comments State
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null);
  const [commentsMap, setCommentsMap] = useState<Record<string, CommunityComment[]>>({});
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});

  // Report Modal State
  const [reportingPostId, setReportingPostId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Fetch campus profile name
  useEffect(() => {
    async function fetchCampus() {
      try {
        const res = await fetch('/api/profile');
        if (res.ok) {
          const data = await res.json();
          if (data.profile?.institution?.name) {
            setCampusName(data.profile.institution.name);
          }
        }
      } catch (err) {
        console.error('Failed to load profile institution:', err);
      }
    }
    fetchCampus();
  }, []);

  const [setupRequired, setSetupRequired] = useState(false);

  // Fetch posts
  const loadPosts = useCallback(async () => {
    try {
      setLoading(true);
      const query = new URLSearchParams();
      query.set('filter', tab);
      if (selectedCategory !== 'all') {
        query.set('category', selectedCategory);
      }

      const res = await fetch(`/api/community/posts?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
        if (data.setupRequired) setSetupRequired(true);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    } finally {
      setLoading(false);
    }
  }, [tab, selectedCategory]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  // Handle Create Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      setCreating(true);
      setCreateError(null);

      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newContent.trim(),
          category: newCategory,
          isAnonymous,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit post');
      }

      setShowCreateModal(false);
      setNewContent('');
      loadPosts();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setCreating(false);
    }
  };

  // Handle Like/React
  const handleReact = async (postId: string) => {
    const targetPost = posts.find((p) => p.id === postId);
    if (!targetPost) return;

    const previousReacted = targetPost.has_reacted;
    const previousCount = targetPost.reactions_count;

    // Optimistic UI update
    setPosts((prev) =>
      prev.map((p) => {
        if (p.id === postId) {
          return {
            ...p,
            has_reacted: !previousReacted,
            reactions_count: previousReacted ? previousCount - 1 : previousCount + 1,
          };
        }
        return p;
      })
    );

    try {
      const res = await fetch('/api/community/reactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          reactionType: 'like',
        }),
      });

      if (!res.ok) {
        // Rollback
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, has_reacted: previousReacted, reactions_count: previousCount } : p))
        );
      }
    } catch {
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, has_reacted: previousReacted, reactions_count: previousCount } : p))
      );
    }
  };

  // Toggle Comments & Load
  const toggleComments = async (postId: string) => {
    if (activeCommentsPostId === postId) {
      setActiveCommentsPostId(null);
      return;
    }

    setActiveCommentsPostId(postId);

    if (!commentsMap[postId]) {
      try {
        setLoadingComments((prev) => ({ ...prev, [postId]: true }));
        const res = await fetch(`/api/community/comments?postId=${postId}`);
        if (res.ok) {
          const data = await res.json();
          setCommentsMap((prev) => ({ ...prev, [postId]: data.comments || [] }));
        }
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setLoadingComments((prev) => ({ ...prev, [postId]: false }));
      }
    }
  };

  // Submit Comment
  const handleAddComment = async (postId: string) => {
    const text = commentInputMap[postId]?.trim();
    if (!text) return;

    try {
      const res = await fetch('/api/community/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId,
          body: text,
          isAnonymous: true,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCommentsMap((prev) => ({
          ...prev,
          [postId]: [...(prev[postId] || []), data.comment],
        }));
        setCommentInputMap((prev) => ({ ...prev, [postId]: '' }));
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p))
        );
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
    }
  };

  // Delete Post
  const handleDeletePost = async (postId: string) => {
    if (!confirm('Are you sure you want to remove this post?')) return;

    try {
      const res = await fetch(`/api/community/posts?id=${postId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      }
    } catch (err) {
      console.error('Failed to delete post:', err);
    }
  };

  // Handle Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingPostId) return;

    try {
      setReportSubmitting(true);
      await fetch('/api/community/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: reportingPostId,
          reason: reportReason,
          details: reportDetails,
        }),
      });
      alert('Post reported. Thank you for keeping our campus space safe.');
      setReportingPostId(null);
      setReportDetails('');
    } catch (err) {
      console.error('Failed to report post:', err);
    } finally {
      setReportSubmitting(false);
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.badgeRow}>
          <span className={styles.campusPill}>
            <Building2 size={13} />
            {campusName}
          </span>
        </div>
        <h1 className={styles.title}>Campus Square</h1>
        <p className={styles.subtitle}>
          The private, verified community for your campus. Share honest confessions, ask questions, and chat freely without judgment.
        </p>
      </div>

      {/* Anonymity & Safety Banner */}
      <div className={styles.privacyBanner}>
        <ShieldCheck size={20} className={styles.privacyBannerIcon} />
        <div className={styles.privacyBannerText}>
          <strong>100% Anonymous & Protected:</strong> Your name, roll number, and dating profile are never shown to peers. Anti-doxxing shields automatically mask phone numbers and institutional emails.
        </div>
      </div>

      {/* Action Header & Tabs */}
      <div className={styles.actionBar}>
        <div className={styles.tabGroup}>
          <button
            type="button"
            className={[styles.tabButton, tab === 'recent' ? styles.active : ''].join(' ')}
            onClick={() => setTab('recent')}
          >
            <Clock size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            Recent
          </button>
          <button
            type="button"
            className={[styles.tabButton, tab === 'trending' ? styles.active : ''].join(' ')}
            onClick={() => setTab('trending')}
          >
            <Flame size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
            Trending
          </button>
        </div>

        <button
          type="button"
          className={styles.newPostBtn}
          onClick={() => setShowCreateModal(true)}
        >
          <Plus size={16} />
          Create Post
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className={styles.categoryPills}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            className={[styles.categoryBtn, selectedCategory === cat.value ? styles.selected : ''].join(' ')}
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Feed List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
          Loading campus discussions...
        </div>
      ) : posts.length === 0 ? (
        <div className={styles.emptyState}>
          <MessageSquare size={48} className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>Be the first to speak up</h2>
          <p className={styles.emptyDescription}>
            There are no discussions in this category yet. Share a confession, ask for professor advice, or break the ice!
          </p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Sparkles size={16} style={{ marginRight: 6 }} />
            Start Campus Discussion
          </Button>
        </div>
      ) : (
        <div className={styles.feedList}>
          {posts.map((post) => {
            const isCommentsOpen = activeCommentsPostId === post.id;
            const comments = commentsMap[post.id] || [];

            return (
              <article key={post.id} className={styles.postCard}>
                {/* Meta */}
                <div className={styles.postMeta}>
                  <div className={styles.authorRow}>
                    <div className={styles.avatarMask}>
                      {post.is_anonymous ? '?' : post.author_name[0]?.toUpperCase() || 'H'}
                    </div>
                    <div className={styles.authorInfo}>
                      <span className={styles.authorName}>
                        {post.author_name}
                      </span>
                      <span className={styles.postTime}>{formatTimeAgo(post.created_at)}</span>
                    </div>
                  </div>
                  <span className={styles.postTag}>{post.category}</span>
                </div>

                {/* Content */}
                <p className={styles.postContent}>{post.content}</p>

                {/* Post Actions */}
                <div className={styles.postActions}>
                  <div className={styles.actionButtonGroup}>
                    <button
                      type="button"
                      className={[styles.actionBtn, post.has_reacted ? styles.reacted : ''].join(' ')}
                      onClick={() => handleReact(post.id)}
                    >
                      <Heart size={16} fill={post.has_reacted ? 'currentColor' : 'none'} />
                      <span>{post.reactions_count}</span>
                    </button>

                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => toggleComments(post.id)}
                    >
                      <MessageCircle size={16} />
                      <span>{post.comments_count}</span>
                    </button>
                  </div>

                  <div className={styles.secondaryActions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      title="Report Post"
                      onClick={() => setReportingPostId(post.id)}
                    >
                      <Flag size={14} />
                    </button>
                    {post.is_author && (
                      <button
                        type="button"
                        className={[styles.iconBtn, styles.danger].join(' ')}
                        title="Delete Post"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expandable Comments Section */}
                {isCommentsOpen && (
                  <div className={styles.commentsContainer}>
                    {loadingComments[post.id] ? (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', padding: '0.5rem 0' }}>
                        Loading comments...
                      </div>
                    ) : comments.length > 0 ? (
                      <div className={styles.commentList}>
                        {comments.map((comment) => (
                          <div key={comment.id} className={styles.commentItem}>
                            <div className={styles.commentHeader}>
                              <span className={styles.commentAuthor}>{comment.author_name}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{formatTimeAgo(comment.created_at)}</span>
                            </div>
                            <p className={styles.commentBody}>{comment.body}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        No comments yet. Say something friendly!
                      </div>
                    )}

                    {/* Add Comment Input */}
                    <div className={styles.addCommentRow}>
                      <input
                        type="text"
                        className={styles.commentInput}
                        placeholder="Add an anonymous reply..."
                        value={commentInputMap[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputMap((prev) => ({ ...prev, [post.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleAddComment(post.id);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className={styles.commentSubmitBtn}
                        onClick={() => handleAddComment(post.id)}
                      >
                        <Send size={13} style={{ display: 'inline', marginRight: 4 }} />
                        Reply
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Create Post Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Post to Campus Square"
      >
        <form onSubmit={handleCreatePost} className={styles.createModal}>
          {createError && (
            <div style={{ color: '#dc2626', fontSize: '0.85rem', backgroundColor: '#fee2e2', padding: '0.6rem 0.8rem', borderRadius: '4px' }}>
              {createError}
            </div>
          )}

          <Select
            label="Category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            options={[
              { value: 'confessions', label: '🤫 Confession' },
              { value: 'campus_gossip', label: '☕ Campus Scoop' },
              { value: 'questions', label: '💡 Question & Advice' },
              { value: 'funny', label: '😂 Funny Moment' },
              { value: 'social', label: '🎉 Social & Events' },
              { value: 'general', label: '💬 General Conversation' },
            ]}
          />

          <textarea
            className={styles.textarea}
            placeholder="What's happening on campus? Share a thought, funny story, or question..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            maxLength={1000}
            required
          />

          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <span className={styles.toggleLabel}>Post Anonymously</span>
              <span className={styles.toggleSub}>Hides your profile and displays as Anonymous Member</span>
            </div>
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--accent)' }}
            />
          </div>

          <div className={styles.rulesBox}>
            🛡️ <strong>Hinges Campus Safety Rules:</strong> Do not include real phone numbers, roll numbers, or defamatory statements targeting specific individuals. Posts violating guidelines are automatically removed.
          </div>

          <Button type="submit" disabled={creating || !newContent.trim()}>
            {creating ? 'Publishing...' : 'Publish to Campus'}
          </Button>
        </form>
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={Boolean(reportingPostId)}
        onClose={() => setReportingPostId(null)}
        title="Report Post"
      >
        <form onSubmit={handleSubmitReport} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Select
            label="Reason for report"
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            options={[
              { value: 'harassment', label: 'Harassment or Bullying' },
              { value: 'doxxing', label: 'Doxxing (Personal Info / Phone / Roll No)' },
              { value: 'inappropriate_content', label: 'Inappropriate or Explicit Content' },
              { value: 'spam', label: 'Spam or Advertising' },
              { value: 'other', label: 'Other Safety Concern' },
            ]}
          />

          <textarea
            className={styles.textarea}
            placeholder="Please provide details about why this violates guidelines..."
            value={reportDetails}
            onChange={(e) => setReportDetails(e.target.value)}
            rows={3}
          />

          <Button type="submit" variant="danger" disabled={reportSubmitting}>
            {reportSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </form>
      </Modal>
    </div>
  );
}

