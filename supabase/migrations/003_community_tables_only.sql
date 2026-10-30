-- ====================================================================
-- HINGES 2.0: COMMUNITY TABLES ONLY
-- Run this in Supabase SQL Editor → New Query → Paste & Run
-- Safe to re-run (uses CREATE TABLE IF NOT EXISTS)
-- ====================================================================

-- 4. Community Posts Table
CREATE TABLE IF NOT EXISTS public.community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN (
        'confessions',
        'campus_gossip',
        'questions',
        'funny',
        'general',
        'experiences',
        'social'
    )),
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 3000),
    is_anonymous BOOLEAN NOT NULL DEFAULT true,
    content_warning TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'flagged', 'removed', 'hidden')),
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_comm_posts_institution ON public.community_posts (institution_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_posts_category ON public.community_posts (category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_posts_author ON public.community_posts (author_id);

-- Drop old policies if exist (safe)
DROP POLICY IF EXISTS "Users can view active community posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can insert community posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can update own community posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can delete own community posts" ON public.community_posts;

CREATE POLICY "Users can view active community posts"
    ON public.community_posts FOR SELECT
    TO authenticated
    USING (status = 'active' OR author_id = auth.uid() OR is_current_user_admin());

CREATE POLICY "Users can insert community posts"
    ON public.community_posts FOR INSERT
    TO authenticated
    WITH CHECK (
        author_id = auth.uid()
        AND status = 'active'
    );

CREATE POLICY "Users can update own community posts"
    ON public.community_posts FOR UPDATE
    TO authenticated
    USING (author_id = auth.uid() OR is_current_user_admin())
    WITH CHECK (author_id = auth.uid() OR is_current_user_admin());

CREATE POLICY "Users can delete own community posts"
    ON public.community_posts FOR DELETE
    TO authenticated
    USING (author_id = auth.uid() OR is_current_user_admin());

-- 5. Community Comments Table
CREATE TABLE IF NOT EXISTS public.community_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(trim(content)) > 0 AND char_length(content) <= 1000),
    is_anonymous BOOLEAN NOT NULL DEFAULT true,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'flagged', 'removed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_comm_comments_post ON public.community_comments (post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_comm_comments_author ON public.community_comments (author_id);

DROP POLICY IF EXISTS "Users can view active community comments" ON public.community_comments;
DROP POLICY IF EXISTS "Users can insert community comments" ON public.community_comments;
DROP POLICY IF EXISTS "Users can delete own community comments" ON public.community_comments;

CREATE POLICY "Users can view active community comments"
    ON public.community_comments FOR SELECT
    TO authenticated
    USING (status = 'active' OR author_id = auth.uid() OR is_current_user_admin());

CREATE POLICY "Users can insert community comments"
    ON public.community_comments FOR INSERT
    TO authenticated
    WITH CHECK (author_id = auth.uid() AND status = 'active');

CREATE POLICY "Users can delete own community comments"
    ON public.community_comments FOR DELETE
    TO authenticated
    USING (author_id = auth.uid() OR is_current_user_admin());

-- 6. Community Reactions Table
CREATE TABLE IF NOT EXISTS public.community_reactions (
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'funny', 'support')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view reactions" ON public.community_reactions;
DROP POLICY IF EXISTS "Users can insert own reaction" ON public.community_reactions;
DROP POLICY IF EXISTS "Users can delete own reaction" ON public.community_reactions;

CREATE POLICY "Users can view reactions"
    ON public.community_reactions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert own reaction"
    ON public.community_reactions FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own reaction"
    ON public.community_reactions FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Triggers to keep likes_count and comments_count accurate
CREATE OR REPLACE FUNCTION public.update_post_reaction_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.community_posts
        SET likes_count = likes_count + 1
        WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.community_posts
        SET likes_count = GREATEST(0, likes_count - 1)
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_reaction_count ON public.community_reactions;
CREATE TRIGGER trg_post_reaction_count
    AFTER INSERT OR DELETE ON public.community_reactions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_post_reaction_count();

CREATE OR REPLACE FUNCTION public.update_post_comment_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.community_posts
        SET comments_count = comments_count + 1
        WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.community_posts
        SET comments_count = GREATEST(0, comments_count - 1)
        WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_comment_count ON public.community_comments;
CREATE TRIGGER trg_post_comment_count
    AFTER INSERT OR DELETE ON public.community_comments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_post_comment_count();

-- 7. Community Reports Table
CREATE TABLE IF NOT EXISTS public.community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert community reports" ON public.community_reports;
DROP POLICY IF EXISTS "Reporters or admins can view reports" ON public.community_reports;
DROP POLICY IF EXISTS "Admins can update community reports" ON public.community_reports;

CREATE POLICY "Users can insert community reports"
    ON public.community_reports FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Reporters or admins can view reports"
    ON public.community_reports FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid() OR is_current_user_admin());

CREATE POLICY "Admins can update community reports"
    ON public.community_reports FOR UPDATE
    TO authenticated
    USING (is_current_user_admin())
    WITH CHECK (is_current_user_admin());

-- ====================================================================
-- Done! Community tables are now live.
-- ====================================================================

