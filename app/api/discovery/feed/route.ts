import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import {
  rankCandidates,
  CandidateProfile,
  DEFAULT_LAUNCH_POLICY,
} from '@/lib/services/matching';

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Fetch authenticated user's current profile & canonical institution
  const { data: currentUserProfile, error: profileErr } = await supabase
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
      interests:profile_interests(interest:interests(id, name, category))
    `)
    .eq('id', user.id)
    .single();

  if (profileErr || !currentUserProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (currentUserProfile.is_suspended) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
  }

  if (!currentUserProfile.onboarding_completed) {
    return NextResponse.json({ error: 'Onboarding required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const exploreInstitutionId = searchParams.get('exploreInstitutionId');

  // Enforce institution boundary:
  // Default is strictly the user's own canonical institution.
  // Explore mode only when exploreInstitutionId is explicitly provided.
  const isExploreMode = Boolean(exploreInstitutionId && exploreInstitutionId !== currentUserProfile.institution_id);
  const targetInstitutionId = isExploreMode ? exploreInstitutionId! : currentUserProfile.institution_id;

  if (!targetInstitutionId) {
    return NextResponse.json({
      candidates: [],
      institutionName: 'No Institution Selected',
      isExplore: false,
    });
  }

  // 2. Retrieve IDs of already-swiped profiles (likes table)
  const { data: swipedLikes } = await supabase
    .from('likes')
    .select('recipient_id')
    .eq('actor_id', user.id);

  const swipedIds = new Set((swipedLikes || []).map((l) => l.recipient_id));

  // 3. Retrieve IDs of blocked users (both directions)
  const { data: userBlocks } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id);

  const { data: blockedByUsers } = await supabase
    .from('blocks')
    .select('blocker_id')
    .eq('blocked_id', user.id);

  const blockedIds = new Set([
    ...(userBlocks || []).map((b) => b.blocked_id),
    ...(blockedByUsers || []).map((b) => b.blocker_id),
  ]);

  // 4. Query candidate profiles belonging to the target institution
  const { data: rawCandidates, error: queryErr } = await supabase
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
    `)
    .eq('institution_id', targetInstitutionId)
    .eq('is_discoverable', true)
    .eq('is_suspended', false)
    .eq('onboarding_completed', true)
    .not('id', 'eq', user.id)
    .limit(50);

  if (queryErr) {
    console.error('Candidate query error:', queryErr);
    return NextResponse.json({ error: queryErr.message }, { status: 500 });
  }

  // Format candidate data
  const formattedCandidates: CandidateProfile[] = (rawCandidates || []).map((cand: any) => ({
    ...cand,
    photos: (cand.photos || []).sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    interests: (cand.interests || [])
      .map((i: any) => i.interest || i.interests)
      .filter(Boolean),
  }));

  // Format viewer profile for engine
  const viewerProfile: CandidateProfile = {
    ...currentUserProfile,
    interests: (currentUserProfile.interests || [])
      .map((i: any) => i.interest || i.interests)
      .filter(Boolean),
  } as unknown as CandidateProfile;

  // 5. Run matching eligibility and ranking engine
  const { eligible: rankedCandidates, diagnostics } = rankCandidates(
    viewerProfile,
    formattedCandidates,
    targetInstitutionId,
    swipedIds,
    blockedIds,
    DEFAULT_LAUNCH_POLICY
  );

  // 6. Fetch institution name for display
  let currentInstitutionName = (currentUserProfile.institution as any)?.name || 'Campus Feed';
  if (isExploreMode) {
    const { data: exploreInst } = await supabase
      .from('institutions')
      .select('name')
      .eq('id', targetInstitutionId)
      .single();
    if (exploreInst) {
      currentInstitutionName = exploreInst.name;
    }
  }

  return NextResponse.json({
    candidates: rankedCandidates,
    institutionId: targetInstitutionId,
    institutionName: currentInstitutionName,
    isExplore: isExploreMode,
    diagnostics,
  });
}
