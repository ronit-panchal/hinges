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
    const { postId, reactionType = 'like' } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    // Check if user already reacted
    const { data: existingReaction } = await supabase
      .from('community_reactions')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingReaction) {
      // Toggle off (unlike)
      await supabase
        .from('community_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      return NextResponse.json({ success: true, hasLiked: false });
    } else {
      // Insert reaction
      const { error } = await supabase
        .from('community_reactions')
        .insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType,
        });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, hasLiked: true });
    }
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Reaction failed' },
      { status: 500 }
    );
  }
}
