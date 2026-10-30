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

async function testMutualDiscovery() {
  const user1Id = '6966f352-6f1b-4d9c-8276-ad1a53561eba'; // Ronit
  const user2Id = '146aad22-5a1a-4937-a86b-56f1c964f596'; // Priyanshu

  console.log('=== TEST 1: User 1 (Ronit) Discovery Feed ===');
  const { data: u1Profile } = await supabase.from('profiles').select('*').eq('id', user1Id).single();
  const { data: candsForU1, error: err1 } = await supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      institution_id,
      date_of_birth,
      photos:profile_photos(storage_path)
    `)
    .eq('institution_id', u1Profile.institution_id)
    .eq('onboarding_completed', true)
    .eq('is_discoverable', true)
    .not('id', 'eq', user1Id);

  if (err1) console.error('Err 1:', err1);
  else {
    console.log(`User 1 sees ${candsForU1.length} candidates:`, candsForU1.map(c => `${c.display_name} (${c.id})`));
  }

  console.log('\n=== TEST 2: User 2 (Priyanshu) Discovery Feed ===');
  const { data: u2Profile } = await supabase.from('profiles').select('*').eq('id', user2Id).single();
  const { data: candsForU2, error: err2 } = await supabase
    .from('profiles')
    .select(`
      id,
      display_name,
      institution_id,
      date_of_birth,
      photos:profile_photos(storage_path)
    `)
    .eq('institution_id', u2Profile.institution_id)
    .eq('onboarding_completed', true)
    .eq('is_discoverable', true)
    .not('id', 'eq', user2Id);

  if (err2) console.error('Err 2:', err2);
  else {
    console.log(`User 2 sees ${candsForU2.length} candidates:`, candsForU2.map(c => `${c.display_name} (${c.id})`));
  }
}

testMutualDiscovery().catch(console.error);

