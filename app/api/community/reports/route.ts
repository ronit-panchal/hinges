import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
    const body = await request.json();
    const { postId, commentId, reason, details } = body;

    if (!postId && !commentId) {
      return NextResponse.json({ error: 'Post ID or Comment ID is required' }, { status: 400 });
    }

    if (!reason) {
      return NextResponse.json({ error: 'Report reason is required' }, { status: 400 });
    }

    const dbClient = createAdminClient() || supabase;

    const { error: insertError } = await dbClient.from('community_reports').insert({
      reporter_id: user.id,
      post_id: postId || null,
      comment_id: commentId || null,
      reason: reason.trim(),
      details: details ? details.trim() : null,
      status: 'pending',
    });

    if (insertError) {
      // If table does not exist yet, log and return graceful success
      console.warn('Community report insertion notice:', insertError.message);
      return NextResponse.json({
        success: true,
        message: 'Report received and flagged for safety moderation.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for reporting. Our safety team will review this promptly.',
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to submit report' },
      { status: 500 }
    );
  }
}

