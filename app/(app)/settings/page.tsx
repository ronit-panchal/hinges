'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  SlidersHorizontal,
  Shield,
  FileText,
  LogOut,
  Trash2,
  ChevronRight,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import styles from './settings.module.css';

export default function SettingsPage() {
  const router = useRouter();
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(35);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Blocked users
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [loadingBlocks, setLoadingBlocks] = useState(true);

  // Delete Account Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const profRes = await fetch('/api/profile');
        if (profRes.ok) {
          const { profile } = await profRes.json();
          if (profile?.discovery_preferences) {
            setMinAge(profile.discovery_preferences.min_age || 18);
            setMaxAge(profile.discovery_preferences.max_age || 35);
          }
        }

        // Fetch blocked users
        const blockRes = await fetch('/api/blocks');
        if (blockRes.ok) {
          const data = await blockRes.json();
          setBlockedUsers(data.blocks || []);
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setLoadingBlocks(false);
      }
    }
    loadSettings();
  }, []);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingPrefs(true);
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discoveryPreferences: {
            min_age: Number(minAge),
            max_age: Number(maxAge),
            genders: [],
            intentions: [],
          },
        }),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2500);
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleUnblock = async (blockedId: string) => {
    try {
      await fetch('/api/blocks', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedId }),
      });
      setBlockedUsers((prev) => prev.filter((b) => b.blocked_id !== blockedId));
    } catch (err) {
      console.error('Failed to unblock:', err);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    try {
      setDeleting(true);
      const res = await fetch('/api/account/delete', { method: 'POST' });
      if (res.ok) {
        router.push('/');
      }
    } catch (err) {
      console.error('Delete failed:', err);
      setDeleting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>
          Manage your discovery parameters, privacy preferences, and account controls.
        </p>
      </div>

      {/* Discovery Preferences */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <SlidersHorizontal size={20} color="var(--accent)" />
          <span>Discovery Range</span>
        </div>

        <form onSubmit={handleSavePreferences} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {saveSuccess && (
            <div style={{ padding: '0.65rem 1rem', backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              Discovery parameters updated.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <Input
              label="Minimum Age (18+)"
              type="number"
              min={18}
              max={99}
              value={minAge}
              onChange={(e) => setMinAge(Number(e.target.value))}
            />
            <Input
              label="Maximum Age"
              type="number"
              min={18}
              max={99}
              value={maxAge}
              onChange={(e) => setMaxAge(Number(e.target.value))}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" size="sm" type="submit" isLoading={savingPrefs}>
              Update Range
            </Button>
          </div>
        </form>
      </section>

      {/* Blocked Users */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <UserX size={20} color="var(--accent)" />
          <span>Blocked Members</span>
        </div>

        {loadingBlocks ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading blocked list...</div>
        ) : blockedUsers.length > 0 ? (
          <div>
            {blockedUsers.map((b) => (
              <div key={b.blocked_id} className={styles.blockedItem}>
                <span style={{ fontSize: '0.95rem', fontWeight: 500 }}>
                  {b.blocked?.display_name || 'Member'}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleUnblock(b.blocked_id)}
                >
                  Unblock
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            You haven&apos;t blocked any members.
          </p>
        )}
      </section>

      {/* Legal & Safety */}
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Shield size={20} color="var(--accent)" />
          <span>Safety & Standards</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <Link href="/safety" className={styles.linkItem}>
            <span>Safety Advice & Meeting Tips</span>
            <ChevronRight size={18} color="var(--text-muted)" />
          </Link>
          <Link href="/community-guidelines" className={styles.linkItem}>
            <span>Community Guidelines</span>
            <ChevronRight size={18} color="var(--text-muted)" />
          </Link>
          <Link href="/privacy" className={styles.linkItem}>
            <span>Privacy Policy</span>
            <ChevronRight size={18} color="var(--text-muted)" />
          </Link>
          <Link href="/terms" className={styles.linkItem}>
            <span>Terms of Service</span>
            <ChevronRight size={18} color="var(--text-muted)" />
          </Link>
        </div>
      </section>

      {/* Account Session & Danger Zone */}
      <section className={[styles.section, styles.dangerZone].join(' ')}>
        <div className={styles.sectionHeader} style={{ color: 'var(--danger)' }}>
          <Trash2 size={20} />
          <span>Account Controls</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Sign Out */}
          <form action="/auth/signout" method="POST">
            <Button variant="outline" size="md" fullWidth icon={<LogOut size={16} />}>
              Sign out of Hinges
            </Button>
          </form>

          {/* Delete Account */}
          <Button
            variant="danger"
            size="md"
            fullWidth
            onClick={() => setIsDeleteModalOpen(true)}
            icon={<Trash2 size={16} />}
          >
            Delete Account Permanently
          </Button>
        </div>
      </section>

      {/* Delete Account Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Permanently Delete Account?"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            This action is permanent and cannot be undone. Your profile, photos, mutual matches, and all private conversation records will be permanently deleted from Supabase.
          </p>
          <p style={{ fontSize: '0.85rem', color: 'var(--danger)', fontWeight: 600 }}>
            Type <strong>DELETE</strong> below to confirm:
          </p>
          <Input
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE"
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="ghost" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={deleteConfirmText !== 'DELETE'}
              isLoading={deleting}
              onClick={handleDeleteAccount}
            >
              Confirm Deletion
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

