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
    .select('id, institution_id, discovery_preferences, onboarding_completed, is_suspended')
    .eq('id', user.id)
    .single();

  if (profileErr || !currentUserProfile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  if (currentUserProfile.is_suspended) {
    return NextResponse.json({ error: 'Account suspended' }, { status: 403 });
  }

  if (!currentUserProfile.onboarding_completed || !currentUserProfile.institution_id) {
    return NextResponse.json({ error: 'Onboarding required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  // Optional Explore parameter (allowed only when explicitly browsing Explore)
  const exploreInstitutionId = searchParams.get('exploreInstitutionId');

  // Enforce institution boundary:
  // Default is strictly the user's persisted institution_id.
  // If exploreInstitutionId is provided, we filter by that specific institution.
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
    .eq('institution_id', targetInstitutionId)
    .eq('is_discoverable', true)
    .eq('is_suspended', false)
    .eq('onboarding_completed', true)
    .limit(20);

  // Exclude current user and already interacted profiles
  if (excludedIds.length > 0) {
    query = query.not('id', 'in', `(${excludedIds.join(',')})`);
  }

  const { data: candidates, error: queryErr } = await query;

  if (queryErr) {
    return NextResponse.json({ error: queryErr.message }, { status: 500 });
  }

  // Sort photos by display_order for each candidate
  const formattedCandidates = (candidates || []).map((cand: any) => ({
    ...cand,
    photos: (cand.photos || []).sort((a: any, b: any) => a.display_order - b.display_order),
    interests: (cand.interests || []).map((i: any) => i.interest).filter(Boolean),
  }));

  return NextResponse.json({
    candidates: formattedCandidates,
    institutionId: targetInstitutionId,
    isExplore: Boolean(exploreInstitutionId),
  });
}

