/**
 * HINGES 2.0 — CANDIDATE ELIGIBILITY & MATCHING SERVICE
 * 
 * Central engine for institution-first candidate discovery, mutual preference evaluation,
 * ranking, and diagnostic reporting.
 */

export interface DiscoveryPreferences {
  min_age?: number;
  max_age?: number;
  genders?: string[];
  intentions?: string[];
}

export interface CandidateProfile {
  id: string;
  display_name: string;
  date_of_birth: string;
  bio?: string | null;
  height_cm?: number | null;
  gender_identity?: string | null;
  relationship_intentions?: string[];
  discovery_preferences?: DiscoveryPreferences;
  institution_id?: string | null;
  affiliation_type?: string | null;
  department?: string | null;
  graduation_year?: number | null;
  city?: string | null;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  is_discoverable: boolean;
  onboarding_completed: boolean;
  is_suspended: boolean;
  created_at: string;
  institution?: { id: string; name: string; city: string; country: string } | null;
  photos?: { id?: string; storage_path: string; display_order?: number }[];
  interests?: { id: string; name: string; category?: string }[];
}

export interface EligibilityResult {
  isEligible: boolean;
  reasons: string[];
  score: number;
}

export interface MatchingLaunchPolicy {
  allowUnverifiedInBeta: boolean;
  minAdultAge: number;
}

export const DEFAULT_LAUNCH_POLICY: MatchingLaunchPolicy = {
  allowUnverifiedInBeta: true, // Controlled beta policy: unverified allowed, rejected excluded
  minAdultAge: 18,
};

/**
 * Calculates current age in years from ISO YYYY-MM-DD date string.
 */
export function calculateAge(dobString: string): number {
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
}

/**
 * Evaluates mutual preference compatibility between viewer and candidate.
 * Evaluates both directions: Viewer -> Candidate AND Candidate -> Viewer.
 */
export function evaluateMutualCompatibility(
  viewer: CandidateProfile,
  candidate: CandidateProfile
): { compatible: boolean; reasons: string[] } {
  const reasons: string[] = [];

  const viewerAge = calculateAge(viewer.date_of_birth);
  const candidateAge = calculateAge(candidate.date_of_birth);

  // 1. Age Range Check: Viewer -> Candidate
  const vPrefs = viewer.discovery_preferences || {};
  const vMinAge = vPrefs.min_age ?? 18;
  const vMaxAge = vPrefs.max_age ?? 99;

  if (candidateAge > 0 && (candidateAge < vMinAge || candidateAge > vMaxAge)) {
    reasons.push(`Candidate age (${candidateAge}) is outside viewer preference (${vMinAge}-${vMaxAge})`);
  }

  // 2. Age Range Check: Candidate -> Viewer (Mutual)
  const cPrefs = candidate.discovery_preferences || {};
  const cMinAge = cPrefs.min_age ?? 18;
  const cMaxAge = cPrefs.max_age ?? 99;

  if (viewerAge > 0 && (viewerAge < cMinAge || viewerAge > cMaxAge)) {
    reasons.push(`Viewer age (${viewerAge}) is outside candidate preference (${cMinAge}-${cMaxAge})`);
  }

  // 3. Gender Preference Check: Viewer -> Candidate
  if (vPrefs.genders && vPrefs.genders.length > 0) {
    if (candidate.gender_identity && !vPrefs.genders.includes(candidate.gender_identity)) {
      reasons.push(`Candidate gender (${candidate.gender_identity}) does not match viewer preferred genders`);
    }
  }

  // 4. Gender Preference Check: Candidate -> Viewer (Mutual)
  if (cPrefs.genders && cPrefs.genders.length > 0) {
    if (viewer.gender_identity && !cPrefs.genders.includes(viewer.gender_identity)) {
      reasons.push(`Viewer gender (${viewer.gender_identity}) does not match candidate preferred genders`);
    }
  }

  // 5. Relationship Intentions Check (Compatibility)
  const vIntentions = viewer.relationship_intentions || [];
  const cIntentions = candidate.relationship_intentions || [];

  if (vIntentions.length > 0 && cIntentions.length > 0) {
    const hasOverlap = vIntentions.some((vi) => cIntentions.includes(vi));
    // If either party selected "Open to seeing where it goes", consider compatible
    const openVi = vIntentions.some((i) => i.toLowerCase().includes('open'));
    const openCi = cIntentions.some((i) => i.toLowerCase().includes('open'));

    if (!hasOverlap && !openVi && !openCi) {
      reasons.push('Relationship intentions do not overlap');
    }
  }

  return {
    compatible: reasons.length === 0,
    reasons,
  };
}

/**
 * Validates baseline candidate eligibility for discovery.
 */
export function evaluateCandidateEligibility(
  viewer: CandidateProfile,
  candidate: CandidateProfile,
  targetInstitutionId: string,
  swipedIds: Set<string>,
  blockedIds: Set<string>,
  policy: MatchingLaunchPolicy = DEFAULT_LAUNCH_POLICY
): EligibilityResult {
  const reasons: string[] = [];

  // Cannot discover self
  if (viewer.id === candidate.id) {
    return { isEligible: false, reasons: ['Self'], score: 0 };
  }

  // Already swiped
  if (swipedIds.has(candidate.id)) {
    return { isEligible: false, reasons: ['Already swiped'], score: 0 };
  }

  // Blocked (bidirectional)
  if (blockedIds.has(candidate.id)) {
    return { isEligible: false, reasons: ['Blocked'], score: 0 };
  }

  // Account state checks
  if (candidate.is_suspended) {
    reasons.push('Account is suspended');
  }

  if (!candidate.onboarding_completed) {
    reasons.push('Onboarding is not complete');
  }

  if (!candidate.is_discoverable) {
    reasons.push('Profile is paused / undiscoverable');
  }

  // Institution matching check (Canonical ID equality)
  if (!candidate.institution_id || candidate.institution_id !== targetInstitutionId) {
    reasons.push('Institution mismatch');
  }

  // Adult age verification check (18+)
  const age = calculateAge(candidate.date_of_birth);
  if (age < policy.minAdultAge) {
    reasons.push(`User is under ${policy.minAdultAge}`);
  }

  // Verification status check
  if (candidate.verification_status === 'rejected') {
    reasons.push('Affiliation verification was rejected');
  } else if (!policy.allowUnverifiedInBeta && candidate.verification_status === 'unverified') {
    reasons.push('Affiliation is unverified');
  }

  // Mutual compatibility check
  const compatibility = evaluateMutualCompatibility(viewer, candidate);
  if (!compatibility.compatible) {
    reasons.push(...compatibility.reasons);
  }

  // Calculate ranking score
  let score = 50; // baseline

  if (reasons.length === 0) {
    // Shared interests (+10 each)
    const viewerInterests = new Set((viewer.interests || []).map((i) => i.id));
    const sharedInterests = (candidate.interests || []).filter((i) => viewerInterests.has(i.id)).length;
    score += sharedInterests * 10;

    // Overlapping relationship intentions (+15)
    const vIntents = new Set(viewer.relationship_intentions || []);
    const sharedIntents = (candidate.relationship_intentions || []).filter((i) => vIntents.has(i)).length;
    score += sharedIntents * 15;

    // Department match bonus (+10)
    if (viewer.department && candidate.department && viewer.department.toLowerCase() === candidate.department.toLowerCase()) {
      score += 10;
    }

    // Verified affiliation bonus (+15)
    if (candidate.verification_status === 'verified') {
      score += 15;
    }

    // Photo quality (+5 per photo)
    const photoCount = candidate.photos?.length || 0;
    score += Math.min(photoCount * 5, 20);

    // Bio completeness bonus (+5)
    if (candidate.bio && candidate.bio.trim().length > 30) {
      score += 5;
    }
  }

  return {
    isEligible: reasons.length === 0,
    reasons,
    score,
  };
}

/**
 * Filter and rank candidates for discovery feed.
 */
export function rankCandidates(
  viewer: CandidateProfile,
  allCandidates: CandidateProfile[],
  targetInstitutionId: string,
  swipedIds: Set<string>,
  blockedIds: Set<string>,
  policy: MatchingLaunchPolicy = DEFAULT_LAUNCH_POLICY
): { eligible: CandidateProfile[]; diagnostics: Record<string, number> } {
  const eligible: { profile: CandidateProfile; score: number }[] = [];
  const diagnostics: Record<string, number> = {
    totalEvaluated: allCandidates.length,
    self: 0,
    alreadySwiped: 0,
    blocked: 0,
    suspended: 0,
    incompleteOnboarding: 0,
    undiscoverable: 0,
    institutionMismatch: 0,
    underage: 0,
    preferenceMismatch: 0,
    eligible: 0,
  };

  for (const candidate of allCandidates) {
    const res = evaluateCandidateEligibility(
      viewer,
      candidate,
      targetInstitutionId,
      swipedIds,
      blockedIds,
      policy
    );

    if (res.isEligible) {
      eligible.push({ profile: candidate, score: res.score });
      diagnostics.eligible++;
    } else {
      // Record diagnostics
      for (const reason of res.reasons) {
        if (reason.includes('Self')) diagnostics.self++;
        else if (reason.includes('swiped')) diagnostics.alreadySwiped++;
        else if (reason.includes('Blocked')) diagnostics.blocked++;
        else if (reason.includes('suspended')) diagnostics.suspended++;
        else if (reason.includes('Onboarding')) diagnostics.incompleteOnboarding++;
        else if (reason.includes('undiscoverable')) diagnostics.undiscoverable++;
        else if (reason.includes('Institution')) diagnostics.institutionMismatch++;
        else if (reason.includes('under 18')) diagnostics.underage++;
        else diagnostics.preferenceMismatch++;
      }
    }
  }

  // Sort by score descending
  eligible.sort((a, b) => b.score - a.score);

  return {
    eligible: eligible.map((e) => e.profile),
    diagnostics,
  };
}

