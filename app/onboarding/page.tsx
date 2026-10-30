'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  X,
  Building2,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Institution, Interest } from '@/lib/types/database';
import styles from './onboarding.module.css';

const TOTAL_STEPS = 6;

const RELATIONSHIP_OPTIONS = [
  'Long-term relationship',
  'Casual dating',
  'Friendship & social',
  'Open to seeing where it goes',
];

const GENDER_OPTIONS = [
  { value: 'woman', label: 'Woman' },
  { value: 'man', label: 'Man' },
  { value: 'nonbinary', label: 'Non-binary' },
  { value: 'prefer_not_say', label: 'Prefer not to say' },
];

const AFFILIATION_OPTIONS = [
  { value: 'student', label: 'Student' },
  { value: 'faculty', label: 'Faculty / Professor' },
  { value: 'staff', label: 'University Staff' },
  { value: 'alumni', label: 'Alumni' },
  { value: 'other', label: 'Other Member' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [genderIdentity, setGenderIdentity] = useState('');
  const [heightCm, setHeightCm] = useState('');

  // Institution State
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [affiliationType, setAffiliationType] = useState('student');
  const [department, setDepartment] = useState('');
  const [graduationYear, setGraduationYear] = useState('');
  const [city, setCity] = useState('');
  const [verificationMethod, setVerificationMethod] = useState<'none' | 'institutional_email' | 'manual'>('none');
  const [institutionalEmail, setInstitutionalEmail] = useState('');

  // Request Institution Modal
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [reqInstName, setReqInstName] = useState('');
  const [reqInstCity, setReqInstCity] = useState('');
  const [reqInstCountry, setReqInstCountry] = useState('India');
  const [reqInstMessage, setReqInstMessage] = useState<string | null>(null);

  // Photos & Bio
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [bio, setBio] = useState('');
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [selectedInterestIds, setSelectedInterestIds] = useState<string[]>([]);

  // Intentions & Preferences
  const [intentions, setIntentions] = useState<string[]>([]);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(30);
  const [isDiscoverable, setIsDiscoverable] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Load reference institutions and interests
  useEffect(() => {
    async function loadData() {
      try {
        const [instRes, intRes] = await Promise.all([
          fetch('/api/institutions'),
          fetch('/api/interests'),
        ]);

        if (instRes.ok) {
          const data = await instRes.json();
          setInstitutions(data.institutions || []);
          if (data.institutions?.length > 0 && !selectedInstitutionId) {
            setSelectedInstitutionId(data.institutions[0].id);
          }
        }

        if (intRes.ok) {
          const data = await intRes.json();
          setAllInterests(data.interests || []);
        }
      } catch (err) {
        console.error('Error loading onboarding options:', err);
      }
    }
    loadData();
  }, [selectedInstitutionId]);

  // Age calculation helper
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

  // Step 1 Validation
  const validateStep1 = () => {
    setError(null);
    if (!displayName.trim()) {
      setError('Please provide a display name.');
      return false;
    }
    if (!dateOfBirth) {
      setError('Please enter your date of birth.');
      return false;
    }
    const age = calculateAge(dateOfBirth);
    if (age < 18) {
      setError('Hinges is strictly for adults (18+). You must be at least 18 years old to join.');
      return false;
    }
    if (!genderIdentity) {
      setError('Please select your gender identity.');
      return false;
    }
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    setError(null);
    if (!selectedInstitutionId) {
      setError('Please select your institution.');
      return false;
    }
    if (verificationMethod === 'institutional_email' && !institutionalEmail) {
      setError('Please enter your institutional email for verification.');
      return false;
    }
    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    setError(null);
    if (photos.length === 0) {
      setError('Please upload at least one profile photo.');
      return false;
    }
    if (selectedInterestIds.length < 2) {
      setError('Please select at least 2 interests.');
      return false;
    }
    return true;
  };

  // Step 4 Validation
  const validateStep4 = () => {
    setError(null);
    if (intentions.length === 0) {
      setError('Please choose at least one relationship intention.');
      return false;
    }
    return true;
  };

  // Step 5 Validation
  const validateStep5 = () => {
    setError(null);
    if (!termsAccepted) {
      setError('You must agree to the Terms, Privacy Policy, and Community Guidelines.');
      return false;
    }
    return true;
  };

  // Handle Next
  const handleNext = () => {
    let isValid = false;
    if (currentStep === 1) isValid = validateStep1();
    else if (currentStep === 2) isValid = validateStep2();
    else if (currentStep === 3) isValid = validateStep3();
    else if (currentStep === 4) isValid = validateStep4();
    else if (currentStep === 5) isValid = validateStep5();
    else isValid = true;

    if (isValid && currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setError(null);
      setCurrentStep((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Photo Upload Handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, slotIndex: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingIndex(slotIndex);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Photo upload failed');
      }

      setPhotos((prev) => {
        const next = [...prev];
        next[slotIndex] = data.publicUrl || data.storagePath;
        return next;
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Photo upload failed');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== indexToRemove));
  };

  // Submit Request for Institution
  const handleRequestInstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqInstName.trim() || !reqInstCity.trim()) return;

    try {
      const res = await fetch('/api/institutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: reqInstName,
          city: reqInstCity,
          country: reqInstCountry,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setReqInstMessage('Request submitted! Our team will review this institution.');
      setTimeout(() => {
        setIsRequestModalOpen(false);
        setReqInstMessage(null);
        setReqInstName('');
        setReqInstCity('');
      }, 1800);
    } catch (err: unknown) {
      setReqInstMessage(err instanceof Error ? err.message : 'Submission failed');
    }
  };

  // Final Profile Submit
  const handleCompleteOnboarding = async () => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        displayName,
        dateOfBirth,
        genderIdentity,
        heightCm: heightCm ? parseInt(heightCm, 10) : null,
        institutionId: selectedInstitutionId,
        affiliationType,
        department,
        graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
        city,
        verificationMethod,
        institutionalEmail,
        bio,
        photoPaths: photos,
        interestIds: selectedInterestIds,
        relationshipIntentions: intentions,
        discoveryPreferences: {
          min_age: minAge,
          max_age: maxAge,
          genders: [],
          intentions,
        },
      };

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      // Full navigation to ensure session and middleware pick up onboarding_completed state
      window.location.href = '/discover';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to finalize profile');
      setLoading(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const selectedInstObj = institutions.find((i) => i.id === selectedInstitutionId);

  return (
    <div className={styles.pageWrapper}>
      {/* Top Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <span className={styles.logo}>Hinges</span>
          <span className={styles.stepIndicator}>
            Step {currentStep} of {TOTAL_STEPS}
          </span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className={styles.progressBarContainer}>
        <div
          className={styles.progressBar}
          style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
        />
      </div>

      <main className={styles.container}>
        <div className={styles.stepCard}>
          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          {/* STEP 1: Basic Information */}
          {currentStep === 1 && (
            <>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>Let&apos;s start with the basics</h1>
                <p className={styles.stepDescription}>
                  Hinges is an adults-only platform for verified campus and collegiate communities.
                </p>
              </div>

              <div className={styles.formGrid}>
                <Input
                  label="Display Name"
                  placeholder="e.g. Alex"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  helperText="This is the name other members of your institution will see."
                  required
                />

                <Input
                  label="Date of Birth (Must be 18+)"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  helperText={
                    dateOfBirth
                      ? `Age: ${calculateAge(dateOfBirth)} years old ${
                          calculateAge(dateOfBirth) < 18 ? '(Must be at least 18)' : '✓'
                        }`
                      : 'Used strictly to confirm 18+ eligibility and calculate age.'
                  }
                  required
                />

                <div className={styles.rowTwo}>
                  <Select
                    label="Gender Identity"
                    placeholder="Select gender"
                    options={GENDER_OPTIONS}
                    value={genderIdentity}
                    onChange={(e) => setGenderIdentity(e.target.value)}
                    required
                  />

                  <Input
                    label="Height in cm (Optional)"
                    type="number"
                    placeholder="e.g. 175"
                    min="90"
                    max="250"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* STEP 2: Institution Affiliation */}
          {currentStep === 2 && (
            <>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>Your Institution</h1>
                <p className={styles.stepDescription}>
                  Your default discovery feed is locked to members of your verified institution.
                </p>
              </div>

              <div className={styles.formGrid}>
                <div>
                  <Select
                    label="Select Institution"
                    options={institutions.map((inst) => ({
                      value: inst.id,
                      label: `${inst.name} (${inst.city})`,
                    }))}
                    value={selectedInstitutionId}
                    onChange={(e) => setSelectedInstitutionId(e.target.value)}
                  />
                  <div style={{ marginTop: '0.5rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      style={{ fontSize: '0.85rem', color: 'var(--accent)', textDecoration: 'underline' }}
                      onClick={() => setIsRequestModalOpen(true)}
                    >
                      Don&apos;t see your university? Request it here
                    </button>
                  </div>
                </div>

                <div className={styles.rowTwo}>
                  <Select
                    label="Affiliation"
                    options={AFFILIATION_OPTIONS}
                    value={affiliationType}
                    onChange={(e) => setAffiliationType(e.target.value)}
                  />

                  <Input
                    label="Department / Major"
                    placeholder="e.g. Computer Science, Architecture"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  />
                </div>

                <div className={styles.rowTwo}>
                  <Input
                    label="Graduation / Affiliation Year"
                    type="number"
                    placeholder="e.g. 2026"
                    value={graduationYear}
                    onChange={(e) => setGraduationYear(e.target.value)}
                  />

                  <Input
                    label="Campus City"
                    placeholder="e.g. Phagwara, Delhi"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>

                {/* Affiliation Verification Options */}
                <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.95rem' }}>
                    <ShieldAlert size={18} color="var(--accent)" />
                    <span>Campus Affiliation Verification</span>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Verified badges are earned through institutional verification. You can submit your institutional email now or request manual review.
                  </p>

                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      className={[styles.pillButton, verificationMethod === 'institutional_email' ? styles.selected : ''].join(' ')}
                      onClick={() => setVerificationMethod('institutional_email')}
                    >
                      Verify via Institutional Email
                    </button>
                    <button
                      type="button"
                      className={[styles.pillButton, verificationMethod === 'manual' ? styles.selected : ''].join(' ')}
                      onClick={() => setVerificationMethod('manual')}
                    >
                      Request Document / Manual Review
                    </button>
                    <button
                      type="button"
                      className={[styles.pillButton, verificationMethod === 'none' ? styles.selected : ''].join(' ')}
                      onClick={() => setVerificationMethod('none')}
                    >
                      Verify Later (Unverified)
                    </button>
                  </div>

                  {verificationMethod === 'institutional_email' && (
                    <Input
                      label="University Email"
                      placeholder="e.g. yourname@lpu.in"
                      type="email"
                      value={institutionalEmail}
                      onChange={(e) => setInstitutionalEmail(e.target.value)}
                      helperText="A confirmation link will be sent to verify your affiliation."
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {/* STEP 3: Photos & Interests */}
          {currentStep === 3 && (
            <>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>Photos & Interests</h1>
                <p className={styles.stepDescription}>
                  Add photos that reflect your authentic everyday self, plus passions that spark conversations.
                </p>
              </div>

              <div className={styles.formGrid}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Profile Photos (At least 1 required)
                  </label>
                  <div className={styles.photoGrid}>
                    {[0, 1, 2].map((slot) => {
                      const photoUrl = photos[slot];
                      const isUploading = uploadingIndex === slot;

                      return (
                        <div
                          key={slot}
                          className={[styles.photoSlot, photoUrl ? styles.hasImage : ''].join(' ')}
                        >
                          {photoUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={photoUrl} alt={`Photo ${slot + 1}`} className={styles.photoImage} />
                              <button
                                type="button"
                                className={styles.removePhotoButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemovePhoto(slot);
                                }}
                                aria-label="Remove photo"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <label style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                              <input
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className={styles.hiddenFileInput}
                                onChange={(e) => handlePhotoUpload(e, slot)}
                                disabled={isUploading}
                              />
                              <Upload size={22} color="var(--text-muted)" />
                              <span className={styles.photoUploadText}>
                                {isUploading ? 'Uploading...' : slot === 0 ? 'Primary Photo' : 'Add Photo'}
                              </span>
                            </label>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="bio-textarea" style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    About You (Bio)
                  </label>
                  <textarea
                    id="bio-textarea"
                    rows={3}
                    maxLength={500}
                    placeholder="What are your favorite study spots, campus passions, or what makes you smile on weekends?"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1.5px solid var(--border-subtle)',
                      fontFamily: 'inherit',
                      fontSize: '0.95rem',
                      resize: 'vertical',
                    }}
                  />
                  <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {bio.length}/500
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Interests (Select at least 2)
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
              </div>
            </>
          )}

          {/* STEP 4: Relationship Intentions */}
          {currentStep === 4 && (
            <>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>Relationship Intentions</h1>
                <p className={styles.stepDescription}>
                  Clarity creates better connections. What kind of relationship are you hoping to find?
                </p>
              </div>

              <div className={styles.formGrid}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {RELATIONSHIP_OPTIONS.map((option) => {
                    const isSelected = intentions.includes(option);
                    return (
                      <button
                        key={option}
                        type="button"
                        className={[
                          styles.pillButton,
                          isSelected ? styles.selected : '',
                        ].join(' ')}
                        style={{
                          textAlign: 'left',
                          padding: '1rem 1.25rem',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                        onClick={() => {
                          if (isSelected) {
                            setIntentions((prev) => prev.filter((item) => item !== option));
                          } else {
                            setIntentions((prev) => [...prev, option]);
                          }
                        }}
                      >
                        <span style={{ fontSize: '1rem', fontWeight: 600 }}>{option}</span>
                        {isSelected && <CheckCircle2 size={18} color="var(--accent)" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* STEP 5: Preferences & Privacy */}
          {currentStep === 5 && (
            <>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>Discovery & Privacy</h1>
                <p className={styles.stepDescription}>
                  Control how you appear to others and who appears in your feed.
                </p>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.rowTwo}>
                  <Input
                    label="Minimum Age"
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

                <div style={{ padding: '1.25rem', backgroundColor: 'var(--bg-canvas)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>Profile Discoverability</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      When enabled, compatible members of your institution can discover your profile.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={isDiscoverable}
                    onChange={(e) => setIsDiscoverable(e.target.checked)}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--accent)' }}
                  />
                </div>

                <div style={{ padding: '1rem', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    id="terms-cb"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    style={{ width: '18px', height: '18px', marginTop: '3px', accentColor: 'var(--accent)' }}
                  />
                  <label htmlFor="terms-cb" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                    I confirm that I am at least 18 years of age. I agree to the Hinges{' '}
                    <a href="/terms" target="_blank" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                      Terms of Service
                    </a>
                    ,{' '}
                    <a href="/privacy" target="_blank" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                      Privacy Policy
                    </a>
                    , and pledge to adhere to the{' '}
                    <a href="/community-guidelines" target="_blank" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                      Community Guidelines
                    </a>
                    .
                  </label>
                </div>
              </div>
            </>
          )}

          {/* STEP 6: Review & Preview */}
          {currentStep === 6 && (
            <>
              <div className={styles.stepHeader}>
                <h1 className={styles.stepTitle}>Review your profile</h1>
                <p className={styles.stepDescription}>
                  Here is how you will appear to fellow members at {selectedInstObj?.name || 'your institution'}.
                </p>
              </div>

              <div className={styles.previewCard}>
                <div className={styles.previewPhotoArea}>
                  {photos[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photos[0]} alt="Preview" className={styles.previewPhoto} />
                  ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      No Photo Added
                    </div>
                  )}

                  <div className={styles.previewOverlay}>
                    <div className={styles.previewName}>
                      <span>{displayName || 'Your Name'}</span>
                      <span className={styles.previewAge}>{calculateAge(dateOfBirth)}</span>
                    </div>
                    <div className={styles.previewInstitution}>
                      <Building2 size={15} />
                      <span>{selectedInstObj?.name}</span>
                    </div>
                  </div>
                </div>

                <div className={styles.previewDetails}>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {verificationMethod === 'none' ? (
                      <Badge variant="unverified">Unverified Member</Badge>
                    ) : (
                      <Badge variant="pending">Verification Pending</Badge>
                    )}
                    {affiliationType && (
                      <Badge variant="neutral">
                        {affiliationType.charAt(0).toUpperCase() + affiliationType.slice(1)}
                      </Badge>
                    )}
                    {department && <Badge variant="neutral">{department}</Badge>}
                  </div>

                  {bio && (
                    <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                      &ldquo;{bio}&rdquo;
                    </div>
                  )}

                  {intentions.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.4rem' }}>
                        Looking For
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {intentions.map((item) => (
                          <span key={item} className={styles.pillButton} style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}>
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedInterestIds.length > 0 && (
                    <div>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.4rem' }}>
                        Interests
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {allInterests
                          .filter((i) => selectedInterestIds.includes(i.id))
                          .map((i) => (
                            <span key={i.id} className={styles.pillButton} style={{ fontSize: '0.8rem', padding: '0.25rem 0.65rem' }}>
                              {i.name}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Step Actions */}
          <div className={styles.stepActions}>
            {currentStep > 1 ? (
              <Button
                variant="outline"
                size="md"
                onClick={handleBack}
                disabled={loading}
                icon={<ArrowLeft size={16} />}
              >
                Back
              </Button>
            ) : <div />}

            {currentStep < TOTAL_STEPS ? (
              <Button
                variant="primary"
                size="md"
                onClick={handleNext}
                disabled={loading}
                icon={<ArrowRight size={16} />}
              >
                Continue
              </Button>
            ) : (
              <Button
                variant="primary"
                size="lg"
                onClick={handleCompleteOnboarding}
                isLoading={loading}
                icon={<Sparkles size={18} />}
              >
                Enter Campus Feed
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* Modal to Request New Institution */}
      <Modal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        title="Request an Institution"
      >
        <form onSubmit={handleRequestInstitution} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {reqInstMessage && (
            <div style={{ padding: '0.75rem', backgroundColor: 'var(--success-bg)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              {reqInstMessage}
            </div>
          )}
          <Input
            label="Institution Name"
            placeholder="e.g. University of Delhi"
            value={reqInstName}
            onChange={(e) => setReqInstName(e.target.value)}
            required
          />
          <Input
            label="City"
            placeholder="e.g. New Delhi"
            value={reqInstCity}
            onChange={(e) => setReqInstCity(e.target.value)}
            required
          />
          <Input
            label="Country"
            value={reqInstCountry}
            onChange={(e) => setReqInstCountry(e.target.value)}
            required
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

