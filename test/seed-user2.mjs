import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function seedUser2() {
  const userId = '146aad22-5a1a-4937-a86b-56f1c964f596';
  const lpuId = '343e1e94-6beb-444c-9d6d-471897bcb16c';

  console.log('1. Checking user 2 auth record...');
  const { data: userRecord, error: userErr } = await supabase.auth.admin.getUserById(userId);
  if (userErr || !userRecord) {
    console.error('User 2 not found in auth:', userErr);
    return;
  }
  console.log('User 2 found:', userRecord.user.email);

  console.log('2. Inserting or updating User 2 profile...');
  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      display_name: 'Priyanshu Joshi',
      date_of_birth: '2004-06-15',
      bio: 'MCA student at LPU. Passionate about software architecture, photography, and good campus discussions.',
      height_cm: 178,
      gender_identity: 'man',
      relationship_intentions: ['Open to seeing where it goes', 'Long-term relationship'],
      discovery_preferences: {
        min_age: 18,
        max_age: 30,
        genders: [],
        intentions: ['Open to seeing where it goes', 'Long-term relationship']
      },
      institution_id: lpuId,
      affiliation_type: 'student',
      department: 'Computer Applications',
      graduation_year: 2026,
      city: 'Phagwara',
      verification_status: 'unverified',
      is_discoverable: true,
      onboarding_completed: true,
      is_admin: false,
      is_suspended: false,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (profErr) {
    console.error('Error creating profile for User 2:', profErr);
    return;
  }
  console.log('User 2 profile created successfully:', prof.display_name, prof.id);

  console.log('3. Adding profile photos for User 2...');
  // Check if photos exist
  const { data: existingPhotos } = await supabase.from('profile_photos').select('*').eq('user_id', userId);
  if (!existingPhotos || existingPhotos.length === 0) {
    // Add real editorial portrait photos
    const { error: photoErr } = await supabase.from('profile_photos').insert([
      {
        user_id: userId,
        storage_path: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
        display_order: 0
      },
      {
        user_id: userId,
        storage_path: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
        display_order: 1
      }
    ]);
    if (photoErr) console.error('Photo error:', photoErr);
    else console.log('Photos inserted for User 2');
  } else {
    console.log('User 2 already has photos');
  }

  console.log('4. Adding interests for User 2...');
  const { data: interests } = await supabase.from('interests').select('id, name').limit(5);
  if (interests && interests.length >= 2) {
    await supabase.from('profile_interests').delete().eq('user_id', userId);
    await supabase.from('profile_interests').insert(
      interests.slice(0, 3).map(i => ({ user_id: userId, interest_id: i.id }))
    );
    console.log('Interests linked for User 2');
  }

  console.log('5. Ensuring User 1 discovery preferences include age 18-30...');
  const user1Id = '6966f352-6f1b-4d9c-8276-ad1a53561eba';
  await supabase
    .from('profiles')
    .update({
      discovery_preferences: {
        min_age: 18,
        max_age: 30,
        genders: [],
        intentions: ['Open to seeing where it goes']
      }
    })
    .eq('id', user1Id);
  console.log('User 1 discovery preferences updated.');
}

seedUser2().catch(console.error);

