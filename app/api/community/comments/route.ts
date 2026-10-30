import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { validateCommunityContent } from '@/lib/services/community-safety';

export async function GET(request: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const postId = searchParams.get('postId');

  if (!postId) {
    return NextResponse.json({ error: 'postId parameter is required' }, { status: 400 });
  }

  try {
    const { data: comments, error } = await supabase
      .from('community_comments')
      .select(`
        id,
        post_id,
        author_id,
        content,
        is_anonymous,
        status,
        created_at,
        author:profiles!community_comments_author_id_fkey(id, display_name, verification_status, photos:profile_photos(storage_path))
      `)
      .eq('post_id', postId)
      .eq('status', 'active')
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ comments: [] });
    }

    const { data: caller } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isAdmin = Boolean(caller?.is_admin);

    // MASK ANONYMOUS AUTHOR DATA
    const sanitizedComments = (comments || []).map((c: any) => {
      const isAuthor = c.author_id === user.id;

      if (c.is_anonymous && !isAuthor && !isAdmin) {
        return {
          id: c.id,
          post_id: c.post_id,
          content: c.content,
          is_anonymous: true,
          created_at: c.created_at,
          author_name: 'Anonymous Member',
          author_verified: false,
          author_photo: null,
          is_own_comment: false,
        };
      }

      return {
        id: c.id,
        post_id: c.post_id,
        content: c.content,
        is_anonymous: c.is_anonymous,
        created_at: c.created_at,
        author_name: c.is_anonymous ? 'Anonymous Member (You)' : c.author?.display_name || 'Member',
        author_verified: c.is_anonymous ? false : c.author?.verification_status === 'verified',
        author_photo: c.is_anonymous ? null : c.author?.photos?.[0]?.storage_path || null,
        is_own_comment: isAuthor,
      };
    });

    return NextResponse.json({ comments: sanitizedComments });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch comments' },
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
    const body = await request.json();
    const { postId, content, isAnonymous } = body;

    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const validation = validateCommunityContent(content, 1000);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const { data: comment, error: insertError } = await supabase
      .from('community_comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content: validation.sanitizedContent,
        is_anonymous: isAnonymous ?? true,
        status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, comment });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Comment failed' },
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
    const { commentId } = await request.json();

    if (!commentId) {
      return NextResponse.json({ error: 'commentId is required' }, { status: 400 });
    }

    const { data: comment } = await supabase
      .from('community_comments')
      .select('author_id')
      .eq('id', commentId)
      .single();

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
    }

    const { data: caller } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (comment.author_id !== user.id && !caller?.is_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: delError } = await supabase
      .from('community_comments')
      .delete()
      .eq('id', commentId);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Comment removed' });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete comment failed' },
      { status: 500 }
    );
  }
}
