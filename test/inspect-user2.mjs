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

async function check() {
  const { data, error } = await supabase.auth.admin.getUserById('146aad22-5a1a-4937-a86b-56f1c964f596');
  if (error) console.error('Error:', error);
  else console.log('User 2:', JSON.stringify(data.user, null, 2));

  // Check if there are any records referencing User 2 in any table
  const tables = ['profiles', 'profile_photos', 'profile_interests', 'likes', 'blocks', 'affiliation_verifications'];
  for (const t of tables) {
    const col = t === 'likes' ? 'actor_id' : (t === 'blocks' ? 'blocker_id' : 'user_id');
    const { data: rows } = await supabase.from(t).select('*').eq(t === 'profiles' ? 'id' : col, '146aad22-5a1a-4937-a86b-56f1c964f596');
    console.log(`Table ${t}:`, rows?.length || 0, 'rows');
  }
}

check().catch(console.error);
