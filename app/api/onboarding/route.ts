import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
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
      dateOfBirth,
      bio,
      heightCm,
      genderIdentity,
      relationshipIntentions,
      discoveryPreferences,
      institutionId,
      affiliationType,
      department,
      graduationYear,
      city,
      photoPaths,
      interestIds,
      verificationMethod,
      institutionalEmail,
    } = body;

    // Server-side age validation
    if (!dateOfBirth) {
      return NextResponse.json({ error: 'Date of birth is required' }, { status: 400 });
    }

    const dob = new Date(dateOfBirth);
    if (isNaN(dob.getTime())) {
      return NextResponse.json({ error: 'Invalid date of birth' }, { status: 400 });
    }

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      return NextResponse.json(
        { error: 'You must be at least 18 years old to join Hinges' },
        { status: 400 }
      );
    }

    if (!displayName || !displayName.trim()) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    if (!institutionId) {
      return NextResponse.json({ error: 'Institution selection is required' }, { status: 400 });
    }

    // Determine initial verification status
    // Default is unverified, or pending if user provided verification proof/request
    const initialVerificationStatus =
      verificationMethod && verificationMethod !== 'none' ? 'pending' : 'unverified';

    // 1. Upsert profile record
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName.trim(),
      date_of_birth: dateOfBirth,
      bio: bio ? bio.trim() : null,
      height_cm: heightCm ? Number(heightCm) : null,
      gender_identity: genderIdentity || null,
      relationship_intentions: relationshipIntentions || [],
      discovery_preferences: discoveryPreferences || {
        min_age: 18,
        max_age: 99,
        genders: [],
        intentions: [],
      },
      institution_id: institutionId,
      affiliation_type: affiliationType || 'student',
      department: department ? department.trim() : null,
      graduation_year: graduationYear ? Number(graduationYear) : null,
      city: city ? city.trim() : null,
      verification_status: initialVerificationStatus,
      is_discoverable: true,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 2. Insert photos if provided
    if (Array.isArray(photoPaths) && photoPaths.length > 0) {
      // Remove old photo records first
      await supabase.from('profile_photos').delete().eq('user_id', user.id);

      const photosToInsert = photoPaths.map((path: string, index: number) => ({
        user_id: user.id,
        storage_path: path,
        display_order: index,
      }));

      const { error: photosError } = await supabase
        .from('profile_photos')
        .insert(photosToInsert);

      if (photosError) {
        console.error('Photos insert error:', photosError);
      }
    }

    // 3. Insert user interests
    if (Array.isArray(interestIds) && interestIds.length > 0) {
      await supabase.from('profile_interests').delete().eq('user_id', user.id);

      const interestsToInsert = interestIds.map((interestId: string) => ({
        user_id: user.id,
        interest_id: interestId,
      }));

      await supabase.from('profile_interests').insert(interestsToInsert);
    }

    // 4. Record verification request if applicable
    if (verificationMethod && verificationMethod !== 'none') {
      await supabase.from('affiliation_verifications').insert({
        user_id: user.id,
        institution_id: institutionId,
        verification_method: verificationMethod,
        institutional_email: institutionalEmail || null,
        status: 'pending',
      });
    }

    return NextResponse.json({ success: true, redirect: '/discover' });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save profile' },
      { status: 500 }
    );
  }
}

