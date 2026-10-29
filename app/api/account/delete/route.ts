import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 1. Delete user profile (cascades to profile_photos, profile_interests, likes, blocks, matches, conversations, messages)
    const { error: delErr } = await supabase
      .from('profiles')
      .delete()
      .eq('id', user.id);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // 2. Sign user out
    await supabase.auth.signOut();

    return NextResponse.json({
      success: true,
      message: 'Account and associated records successfully deleted.',
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Account deletion failed' },
      { status: 500 }
    );
  }
}

