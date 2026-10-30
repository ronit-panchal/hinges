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

  // Fetch caller's profile & institution
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, institution_id, is_admin, onboarding_completed, institution:institutions(name)')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.onboarding_completed) {
    return NextResponse.json({ error: 'Onboarding required' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const exploreInstitutionId = searchParams.get('exploreInstitutionId');
  const category = searchParams.get('category');
  const sort = searchParams.get('sort') || 'recent'; // 'recent' | 'trending'

  const targetInstitutionId = exploreInstitutionId || profile.institution_id;

  if (!targetInstitutionId) {
    return NextResponse.json({ posts: [], institutionName: 'Campus Community' });
  }

  try {
    // Guard: return empty gracefully if tables don't exist yet
    const { error: tableCheckErr } = await supabase
      .from('community_posts')
      .select('id')
      .limit(0);

    if (tableCheckErr && tableCheckErr.code === 'PGRST205') {
      return NextResponse.json({
        posts: [],
        institutionName: (profile.institution as any)?.name || 'Campus Community',
        setupRequired: true,
      });
    }

    let query = supabase
      .from('community_posts')
      .select(`
        id,
        institution_id,
        author_id,
        category,
        content,
        is_anonymous,
        content_warning,
        status,
        likes_count,
        comments_count,
        created_at,
        updated_at,
        author:profiles!community_posts_author_id_fkey(id, display_name, verification_status, photos:profile_photos(storage_path))
      `)
      .eq('institution_id', targetInstitutionId)
      .eq('status', 'active');

    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (sort === 'trending') {
      query = query.order('likes_count', { ascending: false }).order('created_at', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.limit(50);

    const { data: posts, error } = await query;

    if (error) {
      console.warn('Community posts query error (table may need migration):', error.message);
      // Return empty list gracefully if table is not yet created
      return NextResponse.json({
        posts: [],
        institutionName: (profile.institution as any)?.name || 'Campus Community',
        migrationNotice: 'To enable campus discussions, run supabase/migrations/002_india_and_community.sql in Supabase SQL editor.',
      });
    }

    // Fetch user's reactions to these posts
    const postIds = (posts || []).map((p) => p.id);
    let userReactionMap = new Set<string>();

    if (postIds.length > 0) {
      const { data: userReactions } = await supabase
        .from('community_reactions')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);

      userReactionMap = new Set((userReactions || []).map((r) => r.post_id));
    }

    // SANITIZE ANONYMOUS POSTS: STRICT PRIVACY BOUNDARY
    // Ordinary users MUST NEVER see the author_id or author info of an anonymous post!
    const sanitizedPosts = (posts || []).map((post: any) => {
      const isAuthor = post.author_id === user.id;
      const isAdmin = Boolean(profile.is_admin);

      if (post.is_anonymous && !isAuthor && !isAdmin) {
        return {
          id: post.id,
          institution_id: post.institution_id,
          category: post.category,
          content: post.content,
          is_anonymous: true,
          content_warning: post.content_warning,
          likes_count: post.likes_count,
          comments_count: post.comments_count,
          created_at: post.created_at,
          author_name: 'Anonymous Member',
          author_verified: false,
          author_photo: null,
          has_liked: userReactionMap.has(post.id),
          is_own_post: false,
        };
      }

      return {
        id: post.id,
        institution_id: post.institution_id,
        category: post.category,
        content: post.content,
        is_anonymous: post.is_anonymous,
        content_warning: post.content_warning,
        likes_count: post.likes_count,
        comments_count: post.comments_count,
        created_at: post.created_at,
        author_name: post.is_anonymous ? 'Anonymous Member (You)' : post.author?.display_name || 'Member',
        author_verified: post.is_anonymous ? false : post.author?.verification_status === 'verified',
        author_photo: post.is_anonymous ? null : post.author?.photos?.[0]?.storage_path || null,
        has_liked: userReactionMap.has(post.id),
        is_own_post: isAuthor,
      };
    });

    let instName = (profile.institution as any)?.name || 'Campus Community';
    if (exploreInstitutionId && exploreInstitutionId !== profile.institution_id) {
      const { data: expInst } = await supabase
        .from('institutions')
        .select('name')
        .eq('id', exploreInstitutionId)
        .single();
      if (expInst) instName = expInst.name;
    }

    return NextResponse.json({
      posts: sanitizedPosts,
      institutionName: instName,
      isExplore: Boolean(exploreInstitutionId && exploreInstitutionId !== profile.institution_id),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch community posts' },
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, institution_id, onboarding_completed, is_suspended')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.onboarding_completed) {
    return NextResponse.json({ error: 'Onboarding required' }, { status: 403 });
  }

  if (profile.is_suspended) {
    return NextResponse.json({ error: 'Account is suspended' }, { status: 403 });
  }

  if (!profile.institution_id) {
    return NextResponse.json({ error: 'Institution affiliation is required to post' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { content, category, isAnonymous, contentWarning } = body;

    // Safety validation
    const validation = validateCommunityContent(content, 3000);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const validCategories = [
      'confessions',
      'campus_gossip',
      'questions',
      'funny',
      'general',
      'experiences',
      'social',
      // Also accept frontend short-form values and remap them
      'confession',
      'gossip',
      'question',
    ];

    // Remap short-form to DB canonical values
    const categoryAliasMap: Record<string, string> = {
      confession: 'confessions',
      gossip: 'campus_gossip',
      question: 'questions',
    };

    const resolvedCategory = categoryAliasMap[category] || category;

    if (!resolvedCategory || !validCategories.includes(category)) {
      return NextResponse.json({ error: 'Invalid post category' }, { status: 400 });
    }

    const { data: newPost, error: insertError } = await supabase
      .from('community_posts')
      .insert({
        institution_id: profile.institution_id,
        author_id: user.id,
        category: resolvedCategory,
        content: validation.sanitizedContent,
        is_anonymous: isAnonymous ?? true,
        content_warning: contentWarning?.trim() || null,
        status: 'active',
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Post shared to campus community!',
      post: newPost,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to publish post' },
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
    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 });
    }

    // Verify ownership or admin
    const { data: post } = await supabase
      .from('community_posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { data: caller } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    const isAuthor = post.author_id === user.id;
    const isAdmin = Boolean(caller?.is_admin);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: delError } = await supabase
      .from('community_posts')
      .delete()
      .eq('id', postId);

    if (delError) {
      return NextResponse.json({ error: delError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Post removed' });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 }
    );
  }
}

