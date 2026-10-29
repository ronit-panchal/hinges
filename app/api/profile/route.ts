import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile, error } = await supabase
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
      is_admin,
      created_at,
      institution:institutions(id, name, city, country),
      photos:profile_photos(id, storage_path, display_order),
      interests:profile_interests(interest:interests(id, name, category))
    `)
    .eq('id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = {
    ...profile,
    photos: (profile.photos || []).sort((a: any, b: any) => a.display_order - b.display_order),
    interests: (profile.interests || []).map((i: any) => i.interest).filter(Boolean),
  };

  return NextResponse.json({ profile: formatted });
}

export async function PUT(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      displayName,
      bio,
      heightCm,
      genderIdentity,
      relationshipIntentions,
      department,
      graduationYear,
      city,
      isDiscoverable,
      institutionId,
      affiliationType,
      photoPaths,
      interestIds,
    } = body;

    // Update profile record (trigger guards is_admin and verification_status)
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        display_name: displayName?.trim(),
        bio: bio ? bio.trim() : null,
        height_cm: heightCm ? Number(heightCm) : null,
        gender_identity: genderIdentity || null,
        relationship_intentions: relationshipIntentions || [],
        department: department ? department.trim() : null,
        graduation_year: graduationYear ? Number(graduationYear) : null,
        city: city ? city.trim() : null,
        is_discoverable: isDiscoverable ?? true,
        institution_id: institutionId || undefined,
        affiliation_type: affiliationType || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Update photos if provided
    if (Array.isArray(photoPaths)) {
      await supabase.from('profile_photos').delete().eq('user_id', user.id);
      if (photoPaths.length > 0) {
        const photosToInsert = photoPaths.map((path: string, index: number) => ({
          user_id: user.id,
          storage_path: path,
          display_order: index,
        }));
        await supabase.from('profile_photos').insert(photosToInsert);
      }
    }

    // Update interests if provided
    if (Array.isArray(interestIds)) {
      await supabase.from('profile_interests').delete().eq('user_id', user.id);
      if (interestIds.length > 0) {
        const interestsToInsert = interestIds.map((interestId: string) => ({
          user_id: user.id,
          interest_id: interestId,
        }));
        await supabase.from('profile_interests').insert(interestsToInsert);
      }
    }

    return NextResponse.json({ success: true, message: 'Profile updated' });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 }
    );
  }
}

