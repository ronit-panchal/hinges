import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Common Indian institution aliases for instant fuzzy/acronym lookup
const ALIAS_MAP: Record<string, string> = {
  lpu: 'Lovely Professional University',
  'lpu phagwara': 'Lovely Professional University',
  'lpu jalandhar': 'Lovely Professional University',
  iitd: 'Indian Institute of Technology Delhi',
  'iit delhi': 'Indian Institute of Technology Delhi',
  iitb: 'Indian Institute of Technology Bombay',
  'iit bombay': 'Indian Institute of Technology Bombay',
  iitm: 'Indian Institute of Technology Madras',
  'iit madras': 'Indian Institute of Technology Madras',
  iitkgp: 'Indian Institute of Technology Kharagpur',
  'iit kharagpur': 'Indian Institute of Technology Kharagpur',
  iitk: 'Indian Institute of Technology Kanpur',
  'iit kanpur': 'Indian Institute of Technology Kanpur',
  du: 'University of Delhi',
  'delhi university': 'University of Delhi',
  'north campus': 'University of Delhi',
  'south campus': 'University of Delhi',
  jnu: 'Jawaharlal Nehru University',
  bhu: 'Banaras Hindu University',
  bits: 'Birla Institute of Technology and Science, Pilani',
  'bits pilani': 'Birla Institute of Technology and Science, Pilani',
  aiims: 'All India Institute of Medical Sciences, New Delhi',
  'aiims delhi': 'All India Institute of Medical Sciences, New Delhi',
  iima: 'Indian Institute of Management Ahmedabad',
  'iim ahmedabad': 'Indian Institute of Management Ahmedabad',
  iimb: 'Indian Institute of Management Bangalore',
  'iim bangalore': 'Indian Institute of Management Bangalore',
  amity: 'Amity University Noida',
  'amity noida': 'Amity University Noida',
  mahe: 'Manipal Academy of Higher Education',
  manipal: 'Manipal Academy of Higher Education',
  vit: 'Vellore Institute of Technology',
  'vit vellore': 'Vellore Institute of Technology',
  tiet: 'Thapar Institute of Engineering and Technology',
  thapar: 'Thapar Institute of Engineering and Technology',
  cu: 'Chandigarh University',
  'chandigarh university': 'Chandigarh University',
  allen: 'Allen Career Institute Kota',
  'allen kota': 'Allen Career Institute Kota',
  fiitjee: 'FIITJEE South Delhi',
  resonance: 'Resonance Eduventures Kota',
  tcs: 'Tata Consultancy Services - TCS Olympus',
  infosys: 'Infosys Development Centre Bangalore',
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const query = searchParams.get('q')?.trim().toLowerCase() || '';
  const typeFilter = searchParams.get('type')?.trim();

  // Strict India-only filter on active institutions
  let dbQuery = supabase
    .from('institutions')
    .select('id, name, domain, institution_type, city, country, website, is_active')
    .eq('is_active', true)
    .eq('country', 'India')
    .order('name');

  if (typeFilter && typeFilter !== 'all') {
    dbQuery = dbQuery.eq('institution_type', typeFilter);
  }

  const { data: allInstitutions, error } = await dbQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let results = allInstitutions || [];

  if (query) {
    const canonicalFromAlias = ALIAS_MAP[query];

    results = results.filter((inst) => {
      const nameLower = inst.name.toLowerCase();
      const cityLower = inst.city.toLowerCase();

      // Check direct substring in name or city
      if (nameLower.includes(query) || cityLower.includes(query)) return true;

      // Check alias mapping
      if (canonicalFromAlias && nameLower === canonicalFromAlias.toLowerCase()) return true;

      // Check reverse alias match
      for (const [alias, canonical] of Object.entries(ALIAS_MAP)) {
        if (canonical.toLowerCase() === nameLower && alias.includes(query)) {
          return true;
        }
      }

      return false;
    });
  }

  // Fetch member counts per institution for social proof
  const { data: profileCounts } = await supabase
    .from('profiles')
    .select('institution_id')
    .eq('onboarding_completed', true)
    .eq('is_discoverable', true);

  const countsMap: Record<string, number> = {};
  profileCounts?.forEach((p) => {
    if (p.institution_id) {
      countsMap[p.institution_id] = (countsMap[p.institution_id] || 0) + 1;
    }
  });

  const enriched = results.map((inst) => ({
    ...inst,
    memberCount: countsMap[inst.id] || 0,
  }));

  // Sort: matching institutions with existing members first, then alphabetical
  enriched.sort((a, b) => b.memberCount - a.memberCount || a.name.localeCompare(b.name));

  return NextResponse.json({ institutions: enriched });
}

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
    const { name, institutionType, city, country, website } = body;

    if (!name || !city) {
      return NextResponse.json(
        { error: 'Institution name and city are required' },
        { status: 400 }
      );
    }

    // Hinges is strictly India-focused
    if (country && country.trim().toLowerCase() !== 'india') {
      return NextResponse.json(
        { error: 'Hinges currently supports institutions within India only.' },
        { status: 400 }
      );
    }

    // Insert pending request in institutions table (is_active = false)
    const { data, error } = await supabase
      .from('institutions')
      .insert({
        name: name.trim(),
        institution_type: institutionType || 'university',
        city: city.trim(),
        country: 'India',
        website: website?.trim() || null,
        is_active: false, // Requires authorized admin review
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Indian institution request submitted for administrative review.',
      institution: data,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request payload' },
      { status: 400 }
    );
  }
}
