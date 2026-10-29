import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: blocks, error } = await supabase
      .from('blocks')
      .select(`
        blocked_id,
        created_at,
        blocked:profiles!blocks_blocked_id_fkey(id, display_name)
      `)
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ blocks: blocks || [] });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch blocks' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { blockedId } = await request.json();

    if (!blockedId) {
      return NextResponse.json({ error: 'blockedId is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', user.id)
      .eq('blocked_id', blockedId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'User unblocked' });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unblock failed' },
      { status: 500 }
    );
  }
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
    const { blockedId } = await request.json();

    if (!blockedId || blockedId === user.id) {
      return NextResponse.json({ error: 'Invalid user to block' }, { status: 400 });
    }

    // Insert block record
    const { error: blockErr } = await supabase.from('blocks').upsert({
      blocker_id: user.id,
      blocked_id: blockedId,
    });

    if (blockErr) {
      return NextResponse.json({ error: blockErr.message }, { status: 500 });
    }

    // Automatically set any mutual active match to 'blocked'
    await supabase
      .from('matches')
      .update({ status: 'blocked' })
      .or(
        `and(user_a_id.eq.${user.id},user_b_id.eq.${blockedId}),and(user_a_id.eq.${blockedId},user_b_id.eq.${user.id})`
      );

    return NextResponse.json({ success: true, message: 'User blocked' });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Block failed' },
      { status: 500 }
    );
  }
}

