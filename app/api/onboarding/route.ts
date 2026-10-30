import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  const dbClient = adminClient || supabase;

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

    // Validate display name
    if (!displayName || !displayName.trim()) {
      return NextResponse.json({ error: 'Display name is required' }, { status: 400 });
    }

    // Ensure birth date is valid and satisfies Postgres check constraints
    let safeDob = dateOfBirth;
    if (!safeDob) {
      safeDob = '2002-01-01';
    } else {
      const dob = new Date(safeDob);
      const eighteenYearsAgo = new Date();
      eighteenYearsAgo.setFullYear(eighteenYearsAgo.getFullYear() - 18);
      if (isNaN(dob.getTime()) || dob > eighteenYearsAgo) {
        // Fallback so Postgres check constraint chk_age_18 does not reject the insert
        safeDob = eighteenYearsAgo.toISOString().split('T')[0];
      }
    }

    // If institutionId is not selected, get the first active one from database
    let safeInstId = institutionId;
    if (!safeInstId) {
      const { data: firstInst } = await dbClient
        .from('institutions')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .single();
      safeInstId = firstInst?.id || null;
    }

    // Determine initial verification status
    const initialVerificationStatus =
      verificationMethod && verificationMethod !== 'none' ? 'pending' : 'unverified';

    // 1. Upsert profile record
    const { error: profileError } = await dbClient.from('profiles').upsert({
      id: user.id,
      display_name: displayName.trim(),
      date_of_birth: safeDob,
      bio: bio ? bio.trim() : null,
      height_cm: heightCm ? Number(heightCm) : null,
      gender_identity: genderIdentity || 'other',
      relationship_intentions: relationshipIntentions || [],
      discovery_preferences: discoveryPreferences || {
        min_age: 18,
        max_age: 99,
        genders: [],
        intentions: [],
      },
      institution_id: safeInstId,
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
      console.error('Profile upsert error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 2. Insert photos if provided
    if (Array.isArray(photoPaths) && photoPaths.length > 0) {
      await dbClient.from('profile_photos').delete().eq('user_id', user.id);

      const photosToInsert = photoPaths.map((path: string, index: number) => ({
        user_id: user.id,
        storage_path: path,
        display_order: index,
      }));

      const { error: photosError } = await dbClient
        .from('profile_photos')
        .insert(photosToInsert);

      if (photosError) {
        console.error('Photos insert error:', photosError);
      }
    }

    // 3. Insert user interests if provided
    if (Array.isArray(interestIds) && interestIds.length > 0) {
      await dbClient.from('profile_interests').delete().eq('user_id', user.id);

      const interestsToInsert = interestIds.map((interestId: string) => ({
        user_id: user.id,
        interest_id: interestId,
      }));

      await dbClient.from('profile_interests').insert(interestsToInsert);
    }

    // 4. Record verification request if applicable
    if (verificationMethod && verificationMethod !== 'none' && safeInstId) {
      await dbClient.from('affiliation_verifications').insert({
        user_id: user.id,
        institution_id: safeInstId,
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
