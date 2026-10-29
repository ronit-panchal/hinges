import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { recipientId, actionType } = await request.json();

    if (!recipientId || !actionType) {
      return NextResponse.json(
        { error: 'recipientId and actionType are required' },
        { status: 400 }
      );
    }

    if (!['like', 'pass', 'super_like'].includes(actionType)) {
      return NextResponse.json({ error: 'Invalid actionType' }, { status: 400 });
    }

    // Call atomic Postgres function handle_swipe
    const { data, error } = await supabase.rpc('handle_swipe', {
      p_recipient_id: recipientId,
      p_action_type: actionType,
    });

    if (error) {
      // Fallback manual atomic handling if RPC is not compiled yet
      if (error.code === '42883') { // function does not exist
        // 1. Record like
        await supabase.from('likes').upsert({
          actor_id: user.id,
          recipient_id: recipientId,
          action_type: actionType,
        });

        // 2. Check mutual
        if (actionType === 'like' || actionType === 'super_like') {
          const { data: reciprocal } = await supabase
            .from('likes')
            .select('id')
            .eq('actor_id', recipientId)
            .eq('recipient_id', user.id)
            .in('action_type', ['like', 'super_like'])
            .maybeSingle();

          if (reciprocal) {
            const userA = user.id < recipientId ? user.id : recipientId;
            const userB = user.id < recipientId ? recipientId : user.id;

            const { data: match } = await supabase
              .from('matches')
              .upsert({ user_a_id: userA, user_b_id: userB, status: 'active' })
              .select('id')
              .single();

            let convId = null;
            if (match) {
              const { data: conv } = await supabase
                .from('conversations')
                .upsert({ match_id: match.id })
                .select('id')
                .single();
              convId = conv?.id;
            }

            return NextResponse.json({
              success: true,
              action: actionType,
              is_match: true,
              match_id: match?.id,
              conversation_id: convId,
            });
          }
        }

        return NextResponse.json({
          success: true,
          action: actionType,
          is_match: false,
        });
      }

      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Swipe action failed' },
      { status: 500 }
    );
  }
}

