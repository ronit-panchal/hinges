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

  // Fetch matches where current user is user_a or user_b
  const { data: matches, error } = await supabase
    .from('matches')
    .select(`
      id,
      user_a_id,
      user_b_id,
      status,
      created_at,
      user_a:profiles!matches_user_a_id_fkey(
        id, display_name, date_of_birth, bio, verification_status,
        institution:institutions(name),
        photos:profile_photos(storage_path, display_order)
      ),
      user_b:profiles!matches_user_b_id_fkey(
        id, display_name, date_of_birth, bio, verification_status,
        institution:institutions(name),
        photos:profile_photos(storage_path, display_order)
      ),
      conversation:conversations(
        id,
        messages(id, body, created_at, sender_id, is_read)
      )
    `)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const formatted = (matches || []).map((m: any) => {
    const isUserA = m.user_a_id === user.id;
    const otherUser = isUserA ? m.user_b : m.user_a;
    const conversation = Array.isArray(m.conversation) ? m.conversation[0] : m.conversation;

    const messages = conversation?.messages || [];
    messages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const lastMessage = messages[0] || null;

    return {
      id: m.id,
      createdAt: m.created_at,
      conversationId: conversation?.id || null,
      otherUser: {
        ...otherUser,
        photos: (otherUser?.photos || []).sort((a: any, b: any) => a.display_order - b.display_order),
      },
      lastMessage,
    };
  });

  return NextResponse.json({ matches: formatted });
}

