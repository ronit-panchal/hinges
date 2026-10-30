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

async function testQuery() {
  const targetInstitutionId = '343e1e94-6beb-444c-9d6d-471897bcb16c';
  // Exclude user 2's id
  const excludedIds = ['146aad22-5a1a-4937-a86b-56f1c964f596'];

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

  const { data, error } = await query;
  console.log('Query result count:', data?.length);
  console.log('Query error:', error);
  if (data?.length) {
    console.log('Sample profile found:', data[0].display_name, 'photos:', data[0].photos);
  }
}

testQuery().catch(console.error);
