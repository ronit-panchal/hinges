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

async function checkTables() {
  const check = async (t) => {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    console.log(`Table ${t}:`, error ? `NOT FOUND (${error.message})` : `FOUND (${data.length} rows)`);
  };

  await check('institutions');
  await check('institution_requests');
  await check('community_posts');
  await check('community_comments');
  await check('community_reactions');
  await check('community_reports');
}

checkTables().catch(console.error);
