import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

async function testSql() {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc`;
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/pg/query`, {
    method: 'POST',
    headers: {
      'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: 'SELECT 1;' })
  });
  console.log('PG query status:', res.status, await res.text());
}

testSql().catch(e => console.error(e.message));
