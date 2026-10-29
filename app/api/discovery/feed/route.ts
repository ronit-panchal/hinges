import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Fetch authenticated user's current institution & preferences
  const { data: currentUserProfile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, institution_id, discovery_preferences, onboarding_completed, is_suspended, institution:institutions(name)')
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
  const targetInstitutionId = exploreInstitutionId || currentUserProfile.institution_id;

  // 2. Retrieve IDs of already-swiped profiles (likes table)
  const { data: swipedLikes } = await supabase
    .from('likes')
    .select('recipient_id')
    .eq('actor_id', user.id);

  const swipedIds = swipedLikes?.map((l) => l.recipient_id) || [];

  // 3. Retrieve IDs of blocked users (both directions)
  const { data: userBlocks } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', user.id);

  const { data: blockedByUsers } = await supabase
    .from('blocks')
    .select('blocker_id')
    .eq('blocked_id', user.id);

  const blockedIds = [
    ...(userBlocks?.map((b) => b.blocked_id) || []),
    ...(blockedByUsers?.map((b) => b.blocker_id) || []),
  ];

  const excludedIds = Array.from(new Set([user.id, ...swipedIds, ...blockedIds]));

  // 4. Query candidate profiles belonging to the target institution
  let candidates: any[] = [];
  let isCrossCampus = false;

  let query = supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      date_of_birth,
      bio,
      height_cm,
      gender_identity,
      relationship_intentions,
      affiliation_type,
      department,
      graduation_year,
      city,
      verification_status,
      is_discoverable,
      created_at,
      institution:institutions(id, name, city, country),
      photos:profile_photos(id, storage_path, display_order),
      interests:profile_interests(interest:interests(id, name, category))
    `)
    .eq('is_discoverable', true)
    .eq('is_suspended', false)
    .eq('onboarding_completed', true)
    .limit(20);

  if (targetInstitutionId) {
    query = query.eq('institution_id', targetInstitutionId);
  }

  if (excludedIds.length > 0) {
    query = query.not('id', 'in', `(${excludedIds.join(',')})`);
  }

  const { data: fetchedCandidates, error: queryErr } = await query;

  if (queryErr) {
    console.error('Feed query error:', queryErr);
  } else if (fetchedCandidates && fetchedCandidates.length > 0) {
    candidates = fetchedCandidates;
  }

  // Fallback: If no peers in specific campus, search across other partner campuses
  if (candidates.length === 0 && targetInstitutionId && !exploreInstitutionId) {
    let wideQuery = supabase
      .from('profiles')
      .select(`
        id,
        display_name,
        date_of_birth,
        bio,
        height_cm,
        gender_identity,
        relationship_intentions,
        affiliation_type,
        department,
        graduation_year,
        city,
        verification_status,
        is_discoverable,
        created_at,
        institution:institutions(id, name, city, country),
        photos:profile_photos(id, storage_path, display_order),
        interests:profile_interests(interest:interests(id, name, category))
      `)
      .eq('is_discoverable', true)
      .eq('is_suspended', false)
      .eq('onboarding_completed', true)
      .limit(20);

    if (excludedIds.length > 0) {
      wideQuery = wideQuery.not('id', 'in', `(${excludedIds.join(',')})`);
    }

    const { data: wideData } = await wideQuery;
    if (wideData && wideData.length > 0) {
      candidates = wideData;
      isCrossCampus = true;
    }
  }

  // Format candidates
  const formattedCandidates = candidates.map((cand: any) => ({
    ...cand,
    photos: (cand.photos || []).sort((a: any, b: any) => a.display_order - b.display_order),
    interests: (cand.interests || [])
      .map((i: any) => i.interest || i.interests)
      .filter(Boolean),
  }));

  const instName =
    (currentUserProfile.institution as any)?.name || 'Campus Feed';

  return NextResponse.json({
    candidates: formattedCandidates,
    institutionId: targetInstitutionId,
    institutionName: instName,
    isExplore: Boolean(exploreInstitutionId) || isCrossCampus,
    currentUser: currentUserProfile,
  });
}
