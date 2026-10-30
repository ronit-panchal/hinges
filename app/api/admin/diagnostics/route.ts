import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  evaluateCandidateEligibility,
  calculateAge,
  CandidateProfile,
} from '@/lib/services/matching';

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check admin privileges
  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('id, is_admin, institution_id')
    .eq('id', user.id)
    .single();

  if (!callerProfile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get('userId') || user.id;

  try {
    // 1. Fetch viewer profile
    const { data: viewerData } = await supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        date_of_birth,
        bio,
        height_cm,
        gender_identity,
        relationship_intentions,
        discovery_preferences,
        institution_id,
        affiliation_type,
        department,
        graduation_year,
        city,
        verification_status,
        is_discoverable,
        onboarding_completed,
        is_suspended,
        created_at,
        institution:institutions(id, name, city, country)
      `)
      .eq('id', targetUserId)
      .single();

    if (!viewerData) {
      return NextResponse.json({ error: 'Target user profile not found' }, { status: 404 });
    }

    const viewer = viewerData as unknown as CandidateProfile;

    // 2. Fetch all profiles in the system
    const { data: allProfilesData } = await supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        date_of_birth,
        bio,
        height_cm,
        gender_identity,
        relationship_intentions,
        discovery_preferences,
        institution_id,
        affiliation_type,
        department,
        graduation_year,
        city,
        verification_status,
        is_discoverable,
        onboarding_completed,
        is_suspended,
        created_at,
        institution:institutions(id, name, city, country),
        photos:profile_photos(id, storage_path, display_order),
        interests:profile_interests(interest:interests(id, name, category))
      `);

    const allProfiles = (allProfilesData || []) as unknown as CandidateProfile[];

    // 3. Retrieve likes and blocks for the viewer
    const { data: swipedLikes } = await supabase
      .from('likes')
      .select('recipient_id')
      .eq('actor_id', viewer.id);

    const swipedIds = new Set((swipedLikes || []).map((l) => l.recipient_id));

    const { data: userBlocks } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', viewer.id);

    const { data: blockedByUsers } = await supabase
      .from('blocks')
      .select('blocker_id')
      .eq('blocked_id', viewer.id);

    const blockedIds = new Set([
      ...(userBlocks || []).map((b) => b.blocked_id),
      ...(blockedByUsers || []).map((b) => b.blocker_id),
    ]);

    // 4. Compute aggregate metrics
    const totalRegistered = allProfiles.length;
    let completedProfiles = 0;
    let eligibleAdults = 0;
    let withInstitution = 0;
    let verifiedCount = 0;
    let discoverableCount = 0;
    let sameInstitutionCount = 0;
    let excludedByPreferences = 0;
    let excludedByBlocks = 0;
    let excludedAlreadySwiped = 0;
    let finalEligibleCount = 0;

    const exclusionReasons: Record<string, number> = {};

    for (const cand of allProfiles) {
      if (cand.onboarding_completed) completedProfiles++;
      if (calculateAge(cand.date_of_birth) >= 18) eligibleAdults++;
      if (cand.institution_id) withInstitution++;
      if (cand.verification_status === 'verified') verifiedCount++;
      if (cand.is_discoverable && !cand.is_suspended) discoverableCount++;

      if (viewer.institution_id && cand.institution_id === viewer.institution_id && cand.id !== viewer.id) {
        sameInstitutionCount++;
      }

      if (cand.id === viewer.id) continue;

      const evalRes = evaluateCandidateEligibility(
        viewer,
        cand,
        viewer.institution_id || '',
        swipedIds,
        blockedIds
      );

      if (evalRes.isEligible) {
        finalEligibleCount++;
      } else {
        for (const reason of evalRes.reasons) {
          exclusionReasons[reason] = (exclusionReasons[reason] || 0) + 1;
          if (reason.includes('Blocked')) excludedByBlocks++;
          if (reason.includes('swiped')) excludedAlreadySwiped++;
          if (reason.includes('preference') || reason.includes('intentions') || reason.includes('gender') || reason.includes('age')) {
            excludedByPreferences++;
          }
        }
      }
    }

    return NextResponse.json({
      viewer: {
        id: viewer.id,
        display_name: viewer.display_name,
        institution_name: viewer.institution?.name || 'None',
      },
      diagnostics: {
        totalRegisteredUsers: totalRegistered,
        completedProfiles,
        eligibleAdultProfiles: eligibleAdults,
        profilesWithInstitution: withInstitution,
        verifiedProfiles: verifiedCount,
        discoverableProfiles: discoverableCount,
        sameInstitutionCandidates: sameInstitutionCount,
        excludedByPreferences,
        excludedByBlocks,
        excludedAlreadySwiped,
        finalEligibleCandidates: finalEligibleCount,
        exclusionReasonsBreakdown: exclusionReasons,
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Diagnostics query failed' },
      { status: 500 }
    );
  }
}

