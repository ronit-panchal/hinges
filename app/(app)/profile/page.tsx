'use client';

import React, { useState, useEffect } from 'react';
import {
  Upload,
  X,
  Building2,
  CheckCircle2,
  Save,
  Eye,
  Edit3,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { ProfileCard } from '@/components/discovery/ProfileCard';
import { Profile, Interest } from '@/lib/types/database';
import styles from './profile.module.css';

const RELATIONSHIP_OPTIONS = [
  'Long-term relationship',
  'Casual dating',
  'Friendship & social',
  'Open to seeing where it goes',
];

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [department, setDepartment] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [city, setCity] = useState('');
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [intentions, setIntentions] = useState<string[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [profRes, intRes] = await Promise.all([
          fetch('/api/profile'),
          fetch('/api/interests'),
        ]);

        if (profRes.ok) {
          const profData = await profRes.json();
          const p = profData.profile as Profile;
          setProfile(p);
          setDisplayName(p.display_name || '');
          setBio(p.bio || '');
          setHeightCm(p.height_cm ? String(p.height_cm) : '');
          setDepartment(p.department || '');
          setGraduationYear(p.graduation_year ? String(p.graduation_year) : '');
          setCity(p.city || '');
          setIsDiscoverable(p.is_discoverable ?? true);
          setPhotos(p.photos?.map((ph) => ph.storage_path) || []);
          setIntentions(p.relationship_intentions || []);
          setSelectedInterestIds(p.interests?.map((i) => i.id) || []);
        }

        if (intRes.ok) {
          const intData = await intRes.json();
          setAllInterests(intData.interests || []);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, slot: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (res.ok) {
        setPhotos((prev) => {
          const next = [...prev];
          next[slot] = data.publicUrl || data.storagePath;
          return next;
        });
      }
    } catch (err) {
      console.error('Photo upload failed:', err);
    }
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        displayName,
        bio,
        heightCm: heightCm ? parseInt(heightCm, 10) : null,
        department,
        graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
        city,
        isDiscoverable,
        relationshipIntentions: intentions,
        photoPaths: photos,
        interestIds: selectedInterestIds,
      };

      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
        Loading profile...
      </div>
    );
  }

  // Create mock preview profile object
  const previewProfileObj: Profile = {
    ...(profile as Profile),
    display_name: displayName,
    bio,
    height_cm: heightCm ? parseInt(heightCm, 10) : null,
    department,
    graduation_year: graduationYear ? parseInt(graduationYear, 10) : null,
    city,
    relationship_intentions: intentions,
    photos: photos.map((p, i) => ({ id: `p-${i}`, user_id: profile?.id || '', storage_path: p, display_order: i, created_at: '' })),
    interests: allInterests.filter((i) => selectedInterestIds.includes(i.id)),
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Your Profile</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {profile?.verification_status === 'verified' ? (
            <Badge variant="verified">Verified Member</Badge>
          ) : profile?.verification_status === 'pending' ? (
            <Badge variant="pending">Verification Pending</Badge>
          ) : (
            <Badge variant="unverified">Unverified</Badge>
          )}
        </div>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={[styles.tab, activeTab === 'edit' ? styles.active : ''].join(' ')}
          onClick={() => setActiveTab('edit')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Edit3 size={16} />
            <span>Edit Information</span>
          </span>
        </button>
        <button
          type="button"
          className={[styles.tab, activeTab === 'preview' ? styles.active : ''].join(' ')}
          onClick={() => setActiveTab('preview')}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Eye size={16} />
            <span>Campus Preview</span>
          </span>
        </button>
      </div>

      {activeTab === 'preview' ? (
        <div style={{ margin: '0 auto', width: '100%', maxWidth: '440px' }}>
          <ProfileCard
            profile={previewProfileObj}
            onSwipe={() => {}}
            onOpenReportModal={() => {}}
            disabled
          />
        </div>
      ) : (
        <form onSubmit={handleSaveProfile} className={styles.card}>
          {saveSuccess && (
            <div style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
              <CheckCircle2 size={16} />
              <span>Profile updated successfully!</span>
            </div>
          )}

          {/* Photo Management */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
              Profile Photos (Up to 3)
            </label>
            <div className={styles.photoGrid}>
              {[0, 1, 2].map((slot) => {
                const photoUrl = photos[slot];
                return (
                  <div
                    key={slot}
                    className={[styles.photoSlot, photoUrl ? styles.hasImage : ''].join(' ')}
                  >
                    {photoUrl ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={photoUrl} alt="Photo" className={styles.photoImg} />
                        <button
                          type="button"
                          className={styles.removePhoto}
                          onClick={() => handleRemovePhoto(slot)}
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <label style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handlePhotoUpload(e, slot)}
                        />
                        <Upload size={18} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Add
                        </span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.formGrid}>
            <Input
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />

            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.35rem' }}>
                Biography
              </label>
              <textarea
                rows={3}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border-subtle)', fontFamily: 'inherit', resize: 'vertical' }}
              />
            </div>

            <div className={styles.rowTwo}>
              <Input
                label="Department"
                placeholder="e.g. Computer Science"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              />
              <Input
                label="Class of"
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
              />
            </div>

            <div className={styles.rowTwo}>
              <Input
                label="City / Location"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <Input
                label="Height (cm)"
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
              />
            </div>

            {/* Relationship Intentions */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Relationship Intentions
              </label>
              <div className={styles.pillsGrid}>
                {RELATIONSHIP_OPTIONS.map((opt) => {
                  const isSelected = intentions.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      className={[styles.pillButton, isSelected ? styles.selected : ''].join(' ')}
                      onClick={() => {
                        if (isSelected) setIntentions((prev) => prev.filter((i) => i !== opt));
                        else setIntentions((prev) => [...prev, opt]);
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Interests */}
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                Interests & Passions
              </label>
              <div className={styles.pillsGrid}>
                {allInterests.map((interest) => {
                  const isSelected = selectedInterestIds.includes(interest.id);
                  return (
                    <button
                      key={interest.id}
                      type="button"
                      className={[styles.pillButton, isSelected ? styles.selected : ''].join(' ')}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedInterestIds((prev) => prev.filter((id) => id !== interest.id));
                        } else {
                          setSelectedInterestIds((prev) => [...prev, interest.id]);
                        }
                      }}
                    >
                      {interest.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Discoverability */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Campus Discoverability</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Pause your profile from appearing in discovery while keeping existing matches.
                </div>
              </div>
              <input
                type="checkbox"
                checked={isDiscoverable}
                onChange={(e) => setIsDiscoverable(e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--accent)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <Button variant="primary" size="md" type="submit" isLoading={saving} icon={<Save size={16} />}>
              Save Profile
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}

