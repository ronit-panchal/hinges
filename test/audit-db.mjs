import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Read .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runAudit() {
  console.log('--- 1. AUTH USERS ---');
  const { data: authData, error: authErr } = await supabase.auth.admin.listUsers();
  if (authErr) console.error('Auth error:', authErr);
  else {
    console.log(`Total auth users: ${authData.users.length}`);
    authData.users.forEach(u => {
      console.log(`- ID: ${u.id} | Email: ${u.email} | Created: ${u.created_at}`);
    });
  }

  console.log('\n--- 2. PROFILES ---');
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*');
  if (profErr) console.error('Profiles error:', profErr);
  else {
    console.log(`Total profiles: ${profiles.length}`);
    profiles.forEach(p => {
      console.log(JSON.stringify(p, null, 2));
    });
  }

  console.log('\n--- 3. INSTITUTIONS ---');
  const { data: institutions, error: instErr } = await supabase.from('institutions').select('*');
  if (instErr) console.error('Institutions error:', instErr);
  else {
    console.log(`Total institutions: ${institutions.length}`);
    institutions.forEach(i => {
      console.log(`- ID: ${i.id} | Name: ${i.name} | City: ${i.city} | Country: ${i.country} | Active: ${i.is_active}`);
    });
  }

  console.log('\n--- 4. LIKES ---');
  const { data: likes, error: likesErr } = await supabase.from('likes').select('*');
  if (likesErr) console.error('Likes error:', likesErr);
  else {
    console.log(`Total likes: ${likes.length}`);
    likes.forEach(l => console.log(l));
  }

  console.log('\n--- 5. BLOCKS ---');
  const { data: blocks, error: blocksErr } = await supabase.from('blocks').select('*');
  if (blocksErr) console.error('Blocks error:', blocksErr);
  else {
    console.log(`Total blocks: ${blocks.length}`);
    blocks.forEach(b => console.log(b));
  }

  console.log('\n--- 6. PHOTOS ---');
  const { data: photos, error: photosErr } = await supabase.from('profile_photos').select('*');
  if (photosErr) console.error('Photos error:', photosErr);
  else {
    console.log(`Total photos: ${photos.length}`);
    photos.forEach(ph => console.log(ph));
  }
}

runAudit().catch(console.error);
