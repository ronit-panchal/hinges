import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Authorization Check: Is user a participant in this conversation's match?
  const { data: conv, error: convErr } = await supabase
    .from('conversations')
    .select(`
      id,
      match:matches!conversations_match_id_fkey(
        id,
        user_a_id,
        user_b_id,
        status,
        user_a:profiles!matches_user_a_id_fkey(id, display_name, verification_status, photos:profile_photos(storage_path)),
        user_b:profiles!matches_user_b_id_fkey(id, display_name, verification_status, photos:profile_photos(storage_path))
      )
    `)
    .eq('id', conversationId)
    .single();

  if (convErr || !conv || !conv.match) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const match = conv.match as any;
  const isParticipant = match.user_a_id === user.id || match.user_b_id === user.id;

  if (!isParticipant) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const otherUser = match.user_a_id === user.id ? match.user_b : match.user_a;

  // 2. Fetch messages in this conversation
  const { data: messages, error: msgErr } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, is_read, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (msgErr) {
    return NextResponse.json({ error: msgErr.message }, { status: 500 });
  }

  return NextResponse.json({
    conversationId,
    matchId: match.id,
    matchStatus: match.status,
    otherUser,
    messages: messages || [],
  });
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
    const { conversationId, body } = await request.json();

    if (!conversationId || !body || !body.trim()) {
      return NextResponse.json(
        { error: 'conversationId and non-empty body are required' },
        { status: 400 }
      );
    }

    if (body.trim().length > 2000) {
      return NextResponse.json(
        { error: 'Message exceeds 2000 character limit' },
        { status: 400 }
      );
    }

    // 1. Authorize participant and check match status
    const { data: conv, error: convErr } = await supabase
      .from('conversations')
      .select(`
        id,
        match:matches!conversations_match_id_fkey(id, user_a_id, user_b_id, status)
      `)
      .eq('id', conversationId)
      .single();

    if (convErr || !conv || !conv.match) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const match = conv.match as any;
    const isParticipant = match.user_a_id === user.id || match.user_b_id === user.id;

    if (!isParticipant) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (match.status !== 'active') {
      return NextResponse.json(
        { error: 'Cannot send messages to an inactive match' },
        { status: 400 }
      );
    }

    const otherUserId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id;

    // Check if blocked
    const { data: hasBlock } = await supabase
      .from('blocks')
      .select('blocker_id')
      .or(
        `and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`
      )
      .maybeSingle();

    if (hasBlock) {
      return NextResponse.json(
        { error: 'Cannot send message due to a block' },
        { status: 403 }
      );
    }

    // Insert message
    const { data: newMsg, error: insertErr } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: user.id,
        body: body.trim(),
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Touch conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversationId);

    return NextResponse.json({ success: true, message: newMsg });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Send message failed' },
      { status: 500 }
    );
  }
}

