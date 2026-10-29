import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const { data: institutions, error } = await supabase
    .from('institutions')
    .select('id, name, domain, institution_type, city, country, website, is_active')
    .eq('is_active', true)
    .order('name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ institutions: institutions || [] });
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

    if (!name || !city || !country) {
      return NextResponse.json(
        { error: 'Missing required institution fields' },
        { status: 400 }
      );
    }

    // Submit request (defaults to is_active = false for admin review)
    const { data, error } = await supabase
      .from('institutions')
      .insert({
        name: name.trim(),
        institution_type: institutionType || 'university',
        city: city.trim(),
        country: country.trim(),
        website: website?.trim() || null,
        is_active: false, // requires admin approval
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Institution request submitted for review.',
      institution: data,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Invalid request payload' },
      { status: 400 }
    );
  }
}

