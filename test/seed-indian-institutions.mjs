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

const INDIAN_INSTITUTIONS = [
  // Universities & Technical Institutes
  {
    name: 'Lovely Professional University',
    institution_type: 'university',
    city: 'Phagwara',
    country: 'India',
    website: 'https://www.lpu.in',
    is_active: true,
  },
  {
    name: 'Indian Institute of Technology Delhi',
    institution_type: 'college',
    city: 'New Delhi',
    country: 'India',
    website: 'https://home.iitd.ac.in',
    is_active: true,
  },
  {
    name: 'Indian Institute of Technology Bombay',
    institution_type: 'college',
    city: 'Mumbai',
    country: 'India',
    website: 'https://www.iitb.ac.in',
    is_active: true,
  },
  {
    name: 'Indian Institute of Technology Madras',
    institution_type: 'college',
    city: 'Chennai',
    country: 'India',
    website: 'https://www.iitm.ac.in',
    is_active: true,
  },
  {
    name: 'Indian Institute of Technology Kharagpur',
    institution_type: 'college',
    city: 'Kharagpur',
    country: 'India',
    website: 'https://www.iitkgp.ac.in',
    is_active: true,
  },
  {
    name: 'Indian Institute of Technology Kanpur',
    institution_type: 'college',
    city: 'Kanpur',
    country: 'India',
    website: 'https://www.iitk.ac.in',
    is_active: true,
  },
  {
    name: 'University of Delhi',
    institution_type: 'university',
    city: 'New Delhi',
    country: 'India',
    website: 'https://www.du.ac.in',
    is_active: true,
  },
  {
    name: 'Jawaharlal Nehru University',
    institution_type: 'university',
    city: 'New Delhi',
    country: 'India',
    website: 'https://www.jnu.ac.in',
    is_active: true,
  },
  {
    name: 'Banaras Hindu University',
    institution_type: 'university',
    city: 'Varanasi',
    country: 'India',
    website: 'https://www.bhu.ac.in',
    is_active: true,
  },
  {
    name: 'Birla Institute of Technology and Science, Pilani',
    institution_type: 'university',
    city: 'Pilani',
    country: 'India',
    website: 'https://www.bits-pilani.ac.in',
    is_active: true,
  },
  {
    name: 'All India Institute of Medical Sciences, New Delhi',
    institution_type: 'college',
    city: 'New Delhi',
    country: 'India',
    website: 'https://www.aiims.edu',
    is_active: true,
  },
  {
    name: 'Indian Institute of Management Ahmedabad',
    institution_type: 'college',
    city: 'Ahmedabad',
    country: 'India',
    website: 'https://www.iima.ac.in',
    is_active: true,
  },
  {
    name: 'Indian Institute of Management Bangalore',
    institution_type: 'college',
    city: 'Bengaluru',
    country: 'India',
    website: 'https://www.iimb.ac.in',
    is_active: true,
  },
  {
    name: 'Amity University Noida',
    institution_type: 'university',
    city: 'Noida',
    country: 'India',
    website: 'https://www.amity.edu',
    is_active: true,
  },
  {
    name: 'Manipal Academy of Higher Education',
    institution_type: 'university',
    city: 'Manipal',
    country: 'India',
    website: 'https://manipal.edu',
    is_active: true,
  },
  {
    name: 'Vellore Institute of Technology',
    institution_type: 'university',
    city: 'Vellore',
    country: 'India',
    website: 'https://vit.ac.in',
    is_active: true,
  },
  {
    name: 'Thapar Institute of Engineering and Technology',
    institution_type: 'university',
    city: 'Patiala',
    country: 'India',
    website: 'https://www.thapar.edu',
    is_active: true,
  },
  {
    name: 'Chandigarh University',
    institution_type: 'university',
    city: 'Mohali',
    country: 'India',
    website: 'https://www.cuchd.in',
    is_active: true,
  },
  // Coaching & Academies
  {
    name: 'Allen Career Institute Kota',
    institution_type: 'academy',
    city: 'Kota',
    country: 'India',
    website: 'https://www.allen.ac.in',
    is_active: true,
  },
  {
    name: 'FIITJEE South Delhi',
    institution_type: 'academy',
    city: 'New Delhi',
    country: 'India',
    website: 'https://www.fiitjee.com',
    is_active: true,
  },
  {
    name: 'Resonance Eduventures Kota',
    institution_type: 'academy',
    city: 'Kota',
    country: 'India',
    website: 'https://www.resonance.ac.in',
    is_active: true,
  },
  // Workplaces
  {
    name: 'Tata Consultancy Services - TCS Olympus',
    institution_type: 'workplace',
    city: 'Thane',
    country: 'India',
    website: 'https://www.tcs.com',
    is_active: true,
  },
  {
    name: 'Infosys Development Centre Bangalore',
    institution_type: 'workplace',
    city: 'Bengaluru',
    country: 'India',
    website: 'https://www.infosys.com',
    is_active: true,
  },
];

async function seedInstitutions() {
  console.log('1. Deactivating non-Indian institutions...');
  const { error: deactErr } = await supabase
    .from('institutions')
    .update({ is_active: false })
    .neq('country', 'India');

  if (deactErr) console.error('Deactivate error:', deactErr);
  else console.log('Non-Indian institutions successfully deactivated.');

  console.log('2. Upserting Indian institutions...');
  for (const inst of INDIAN_INSTITUTIONS) {
    const { error: upsertErr } = await supabase
      .from('institutions')
      .upsert(inst, { onConflict: 'name' });
    if (upsertErr) {
      console.error(`Error with ${inst.name}:`, upsertErr.message);
    } else {
      console.log(`- ${inst.name} (${inst.city})`);
    }
  }

  const { data: allActive } = await supabase
    .from('institutions')
    .select('id, name, city, country, is_active')
    .eq('is_active', true);

  console.log(`\nActive Indian Institutions count: ${allActive?.length}`);
  allActive?.forEach(i => console.log(`  * ${i.name} [${i.city}, ${i.country}]`));
}

seedInstitutions().catch(console.error);
