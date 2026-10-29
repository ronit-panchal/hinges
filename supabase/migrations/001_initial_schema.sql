-- ====================================================================
-- HINGES: Production Database Schema & Row-Level Security
-- ====================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Institutions Table
CREATE TABLE IF NOT EXISTS public.institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    domain TEXT,
    institution_type TEXT NOT NULL CHECK (institution_type IN ('university', 'college', 'academy', 'workplace', 'other')),
    city TEXT NOT NULL,
    country TEXT NOT NULL,
    website TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    bio TEXT,
    height_cm INTEGER CHECK (height_cm IS NULL OR (height_cm >= 90 AND height_cm <= 250)),
    gender_identity TEXT,
    relationship_intentions TEXT[] NOT NULL DEFAULT '{}',
    discovery_preferences JSONB NOT NULL DEFAULT '{"min_age": 18, "max_age": 99, "genders": [], "intentions": []}'::jsonb,
    institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
    affiliation_type TEXT CHECK (affiliation_type IN ('student', 'faculty', 'staff', 'alumni', 'other')),
    department TEXT,
    graduation_year INTEGER CHECK (graduation_year IS NULL OR (graduation_year >= 1950 AND graduation_year <= 2100)),
    city TEXT,
    verification_status TEXT NOT NULL DEFAULT 'unverified' CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
    is_discoverable BOOLEAN NOT NULL DEFAULT true,
    onboarding_completed BOOLEAN NOT NULL DEFAULT false,
    is_admin BOOLEAN NOT NULL DEFAULT false,
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_age_18 CHECK (date_of_birth <= CURRENT_DATE - INTERVAL '18 years')
);

-- 4. Profile Photos Table
CREATE TABLE IF NOT EXISTS public.profile_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_user_photo_order UNIQUE (user_id, display_order)
);

-- 5. Interests Taxonomy & User Interests
CREATE TABLE IF NOT EXISTS public.interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.profile_interests (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    interest_id UUID NOT NULL REFERENCES public.interests(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (user_id, interest_id)
);

-- 6. Likes Table
CREATE TABLE IF NOT EXISTS public.likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('like', 'pass', 'super_like')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_no_self_like CHECK (actor_id != recipient_id),
    CONSTRAINT uq_actor_recipient UNIQUE (actor_id, recipient_id)
);

-- 7. Matches Table (Canonical ordering user_a_id < user_b_id)
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'unmatched', 'blocked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_canonical_order CHECK (user_a_id < user_b_id),
    CONSTRAINT uq_match_pair UNIQUE (user_a_id, user_b_id)
);

-- 8. Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id UUID NOT NULL UNIQUE REFERENCES public.matches(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(trim(body)) > 0 AND char_length(body) <= 2000),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 10. Blocks Table
CREATE TABLE IF NOT EXISTS public.blocks (
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT chk_no_self_block CHECK (blocker_id != blocked_id)
);

-- 11. Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK (reason IN ('harassment', 'impersonation', 'inappropriate_content', 'spam', 'underage', 'other')),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_no_self_report CHECK (reporter_id != reported_user_id)
);

-- 12. Affiliation Verifications Table
CREATE TABLE IF NOT EXISTS public.affiliation_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    verification_method TEXT NOT NULL CHECK (verification_method IN ('institutional_email', 'document_upload', 'manual')),
    institutional_email TEXT,
    document_storage_path TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ
);

-- ====================================================================
-- INDEXES FOR PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_institution ON public.profiles (institution_id) WHERE is_discoverable = true AND is_suspended = false;
CREATE INDEX IF NOT EXISTS idx_profiles_verification ON public.profiles (verification_status);
CREATE INDEX IF NOT EXISTS idx_likes_actor ON public.likes (actor_id);
CREATE INDEX IF NOT EXISTS idx_likes_recipient ON public.likes (recipient_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_a ON public.matches (user_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON public.matches (user_b_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages (conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_blocks_lookup ON public.blocks (blocker_id, blocked_id);
CREATE INDEX IF NOT EXISTS idx_institutions_search ON public.institutions USING gin (to_tsvector('english', name || ' ' || city || ' ' || country));

-- ====================================================================
-- ROW-LEVEL SECURITY POLICIES
-- ====================================================================

ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliation_verifications ENABLE ROW LEVEL SECURITY;

-- Helper security function: Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT COALESCE(
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
        false
    );
$$;

-- Helper security function: Check if two users have an active block between them
CREATE OR REPLACE FUNCTION public.has_active_block(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.blocks
        WHERE (blocker_id = auth.uid() AND blocked_id = target_user_id)
           OR (blocker_id = target_user_id AND blocked_id = auth.uid())
    );
$$;

-- Institutions Policies
CREATE POLICY "Institutions viewable by authenticated users"
    ON public.institutions FOR SELECT
    TO authenticated
    USING (is_active = true OR is_current_user_admin());

CREATE POLICY "Institutions manageable only by admins"
    ON public.institutions FOR ALL
    TO authenticated
    USING (is_current_user_admin())
    WITH CHECK (is_current_user_admin());

-- Profiles Policies
CREATE POLICY "Users can view eligible profiles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        id = auth.uid() OR (
            onboarding_completed = true
            AND is_discoverable = true
            AND is_suspended = false
            AND NOT has_active_block(id)
        ) OR is_current_user_admin()
    );

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Trigger to guard privileged fields on profile update
CREATE OR REPLACE FUNCTION public.guard_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Prevent non-admins from making themselves admin or verified directly
    IF NOT is_current_user_admin() THEN
        NEW.is_admin := OLD.is_admin;
        NEW.is_suspended := OLD.is_suspended;
        -- If user changed institution, reset verification status to unverified
        IF NEW.institution_id IS DISTINCT FROM OLD.institution_id THEN
            NEW.verification_status := 'unverified';
        ELSE
            NEW.verification_status := OLD.verification_status;
        END IF;
    END IF;
    NEW.updated_at := timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_guard_profile_updates
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.guard_profile_updates();

-- Profile Photos Policies
CREATE POLICY "Photos viewable for eligible profiles"
    ON public.profile_photos FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_photos.user_id
              AND p.is_discoverable = true
              AND p.is_suspended = false
              AND NOT has_active_block(p.id)
        ) OR is_current_user_admin()
    );

CREATE POLICY "Users can insert own photos"
    ON public.profile_photos FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own photos"
    ON public.profile_photos FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own photos"
    ON public.profile_photos FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());

-- Interests & Profile Interests Policies
CREATE POLICY "Interests viewable by authenticated users"
    ON public.interests FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Profile interests viewable for eligible profiles"
    ON public.profile_interests FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = profile_interests.user_id
              AND NOT has_active_block(p.id)
        )
    );

CREATE POLICY "Users can manage own interests"
    ON public.profile_interests FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Likes Policies
CREATE POLICY "Users can view incoming and outgoing likes"
    ON public.likes FOR SELECT
    TO authenticated
    USING (actor_id = auth.uid() OR recipient_id = auth.uid());

CREATE POLICY "Users can insert own likes"
    ON public.likes FOR INSERT
    TO authenticated
    WITH CHECK (actor_id = auth.uid());

-- Matches Policies
CREATE POLICY "Users can view their active matches"
    ON public.matches FOR SELECT
    TO authenticated
    USING (user_a_id = auth.uid() OR user_b_id = auth.uid() OR is_current_user_admin());

CREATE POLICY "Users can update their match status"
    ON public.matches FOR UPDATE
    TO authenticated
    USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- Conversations Policies
CREATE POLICY "Users can view conversations they participate in"
    ON public.conversations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.matches m
            WHERE m.id = conversations.match_id
              AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
        ) OR is_current_user_admin()
    );

-- Messages Policies
CREATE POLICY "Users can view messages in their conversations"
    ON public.messages FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.conversations c
            JOIN public.matches m ON m.id = c.match_id
            WHERE c.id = messages.conversation_id
              AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
        ) OR is_current_user_admin()
    );

CREATE POLICY "Users can insert messages in their active conversations"
    ON public.messages FOR INSERT
    TO authenticated
    WITH CHECK (
        sender_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.conversations c
            JOIN public.matches m ON m.id = c.match_id
            WHERE c.id = messages.conversation_id
              AND m.status = 'active'
              AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
              AND NOT has_active_block(CASE WHEN m.user_a_id = auth.uid() THEN m.user_b_id ELSE m.user_a_id END)
        )
    );

-- Blocks Policies
CREATE POLICY "Users can view their blocks"
    ON public.blocks FOR SELECT
    TO authenticated
    USING (blocker_id = auth.uid() OR is_current_user_admin());

CREATE POLICY "Users can insert their blocks"
    ON public.blocks FOR INSERT
    TO authenticated
    WITH CHECK (blocker_id = auth.uid());

CREATE POLICY "Users can delete their blocks"
    ON public.blocks FOR DELETE
    TO authenticated
    USING (blocker_id = auth.uid());

-- Reports Policies
CREATE POLICY "Users can insert reports"
    ON public.reports FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Reports viewable by reporter or admins"
    ON public.reports FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid() OR is_current_user_admin());

CREATE POLICY "Reports updated by admins only"
    ON public.reports FOR UPDATE
    TO authenticated
    USING (is_current_user_admin())
    WITH CHECK (is_current_user_admin());

-- Affiliation Verifications Policies
CREATE POLICY "Users can view their verifications"
    ON public.affiliation_verifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR is_current_user_admin());

CREATE POLICY "Users can submit their verifications"
    ON public.affiliation_verifications FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update verifications"
    ON public.affiliation_verifications FOR UPDATE
    TO authenticated
    USING (is_current_user_admin())
    WITH CHECK (is_current_user_admin());

-- ====================================================================
-- ATOMIC RPC FUNCTION: HANDLE SWIPE & MATCHING
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_swipe(
    p_recipient_id UUID,
    p_action_type TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_id UUID;
    v_has_mutual_interest BOOLEAN := false;
    v_user_a UUID;
    v_user_b UUID;
    v_match_id UUID := NULL;
    v_conversation_id UUID := NULL;
BEGIN
    v_actor_id := auth.uid();
    IF v_actor_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF v_actor_id = p_recipient_id THEN
        RAISE EXCEPTION 'Cannot perform swipe action on self';
    END IF;

    IF p_action_type NOT IN ('like', 'pass', 'super_like') THEN
        RAISE EXCEPTION 'Invalid action type';
    END IF;

    -- Record or update the swipe action
    INSERT INTO public.likes (actor_id, recipient_id, action_type)
    VALUES (v_actor_id, p_recipient_id, p_action_type)
    ON CONFLICT (actor_id, recipient_id)
    DO UPDATE SET action_type = EXCLUDED.action_type, created_at = timezone('utc'::text, now());

    -- If this is a like or super_like, check for reciprocal like
    IF p_action_type IN ('like', 'super_like') THEN
        SELECT EXISTS (
            SELECT 1 FROM public.likes
            WHERE actor_id = p_recipient_id
              AND recipient_id = v_actor_id
              AND action_type IN ('like', 'super_like')
        ) INTO v_has_mutual_interest;

        IF v_has_mutual_interest THEN
            -- Determine canonical order
            IF v_actor_id < p_recipient_id THEN
                v_user_a := v_actor_id;
                v_user_b := p_recipient_id;
            ELSE
                v_user_a := p_recipient_id;
                v_user_b := v_actor_id;
            END IF;

            -- Insert or reactivate match
            INSERT INTO public.matches (user_a_id, user_b_id, status)
            VALUES (v_user_a, v_user_b, 'active')
            ON CONFLICT (user_a_id, user_b_id)
            DO UPDATE SET status = 'active'
            RETURNING id INTO v_match_id;

            -- Create conversation if not exists
            INSERT INTO public.conversations (match_id)
            VALUES (v_match_id)
            ON CONFLICT (match_id)
            DO UPDATE SET updated_at = timezone('utc'::text, now())
            RETURNING id INTO v_conversation_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'action', p_action_type,
        'is_match', v_has_mutual_interest,
        'match_id', v_match_id,
        'conversation_id', v_conversation_id
    );
END;
$$;

-- ====================================================================
-- INITIAL SEED REFERENCE DATA (Institutions & Interests Taxonomy)
-- ====================================================================
INSERT INTO public.institutions (name, domain, institution_type, city, country, website)
VALUES 
    ('Lovely Professional University', 'lpu.in', 'university', 'Phagwara', 'India', 'https://www.lpu.in'),
    ('Indian Institute of Technology Delhi', 'iitd.ac.in', 'university', 'New Delhi', 'India', 'https://home.iitd.ac.in'),
    ('Stanford University', 'stanford.edu', 'university', 'Stanford', 'United States', 'https://www.stanford.edu'),
    ('Harvard University', 'harvard.edu', 'university', 'Cambridge', 'United States', 'https://www.harvard.edu'),
    ('University of Oxford', 'ox.ac.uk', 'university', 'Oxford', 'United Kingdom', 'https://www.ox.ac.uk')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.interests (name, category)
VALUES
    ('Photography', 'Creative'),
    ('Architecture', 'Creative'),
    ('Writing & Poetry', 'Creative'),
    ('Indie Cinema', 'Arts'),
    ('Modern Art', 'Arts'),
    ('Coffee Roasting', 'Lifestyle'),
    ('Culinary Arts', 'Lifestyle'),
    ('Yoga & Mindfulness', 'Wellness'),
    ('Trail Running', 'Fitness'),
    ('Rock Climbing', 'Fitness'),
    ('Philosophy & Ethics', 'Intellectual'),
    ('Tech & Startups', 'Intellectual'),
    ('Classical Piano', 'Music'),
    ('Live Gigs & Jazz', 'Music'),
    ('Travel & Backpacking', 'Adventure'),
    ('Astronomy', 'Intellectual')
ON CONFLICT (name) DO NOTHING;

