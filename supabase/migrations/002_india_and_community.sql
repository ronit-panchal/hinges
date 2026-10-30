-- ====================================================================
-- HINGES 2.0: INDIA-ONLY INSTITUTIONS & CAMPUS COMMUNITY MIGRATION
-- ====================================================================

-- 1. Update Institutions Table for India Ecosystem
ALTER TABLE public.institutions 
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS district TEXT,
    ADD COLUMN IF NOT EXISTS normalized_name TEXT,
    ADD COLUMN IF NOT EXISTS aliases TEXT[] DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());

-- Update institution_type check constraint to support all Indian institution classifications
ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_institution_type_check;
ALTER TABLE public.institutions ADD CONSTRAINT institutions_institution_type_check 
    CHECK (institution_type IN (
        'university',
        'college',
        'engineering_college',
        'medical_college',
        'management_institute',
        'coaching_institute',
        'tuition_centre',
        'academy',
        'skill_institute',
        'training_centre',
        'office',
        'company',
        'workplace',
        'other'
    ));

-- Deactivate any non-Indian institutions (Harvard, Stanford, Oxford, etc.)
UPDATE public.institutions 
SET is_active = false 
WHERE country != 'India';

-- 2. Insert and Update Canonical Indian Institutions with Aliases & Search Normalization
INSERT INTO public.institutions (name, normalized_name, aliases, domain, institution_type, city, district, state, country, website, is_active)
VALUES
    -- Universities & Institutes of National Importance
    (
        'Lovely Professional University',
        'lovely professional university',
        ARRAY['LPU', 'LPU Phagwara', 'LPU Jalandhar'],
        'lpu.in',
        'university',
        'Phagwara',
        'Kapurthala',
        'Punjab',
        'India',
        'https://www.lpu.in',
        true
    ),
    (
        'Indian Institute of Technology Delhi',
        'indian institute of technology delhi',
        ARRAY['IITD', 'IIT Delhi', 'Indian Institute of Technology, Delhi'],
        'iitd.ac.in',
        'engineering_college',
        'New Delhi',
        'South Delhi',
        'Delhi',
        'India',
        'https://home.iitd.ac.in',
        true
    ),
    (
        'Indian Institute of Technology Bombay',
        'indian institute of technology bombay',
        ARRAY['IITB', 'IIT Bombay', 'IIT Powai'],
        'iitb.ac.in',
        'engineering_college',
        'Mumbai',
        'Mumbai Suburban',
        'Maharashtra',
        'India',
        'https://www.iitb.ac.in',
        true
    ),
    (
        'Indian Institute of Technology Madras',
        'indian institute of technology madras',
        ARRAY['IITM', 'IIT Madras', 'IIT Chennai'],
        'iitm.ac.in',
        'engineering_college',
        'Chennai',
        'Chennai',
        'Tamil Nadu',
        'India',
        'https://www.iitm.ac.in',
        true
    ),
    (
        'Indian Institute of Technology Kharagpur',
        'indian institute of technology kharagpur',
        ARRAY['IITKGP', 'IIT Kharagpur'],
        'iitkgp.ac.in',
        'engineering_college',
        'Kharagpur',
        'Paschim Medinipur',
        'West Bengal',
        'India',
        'https://www.iitkgp.ac.in',
        true
    ),
    (
        'Indian Institute of Technology Kanpur',
        'indian institute of technology kanpur',
        ARRAY['IITK', 'IIT Kanpur'],
        'iitk.ac.in',
        'engineering_college',
        'Kanpur',
        'Kanpur Nagar',
        'Uttar Pradesh',
        'India',
        'https://www.iitk.ac.in',
        true
    ),
    (
        'University of Delhi',
        'university of delhi',
        ARRAY['DU', 'Delhi University', 'North Campus', 'South Campus'],
        'du.ac.in',
        'university',
        'New Delhi',
        'North Delhi',
        'Delhi',
        'India',
        'https://www.du.ac.in',
        true
    ),
    (
        'Jawaharlal Nehru University',
        'jawaharlal nehru university',
        ARRAY['JNU', 'JNU Delhi'],
        'jnu.ac.in',
        'university',
        'New Delhi',
        'South West Delhi',
        'Delhi',
        'India',
        'https://www.jnu.ac.in',
        true
    ),
    (
        'Banaras Hindu University',
        'banaras hindu university',
        ARRAY['BHU', 'BHU Varanasi'],
        'bhu.ac.in',
        'university',
        'Varanasi',
        'Varanasi',
        'Uttar Pradesh',
        'India',
        'https://www.bhu.ac.in',
        true
    ),
    (
        'Birla Institute of Technology and Science, Pilani',
        'birla institute of technology and science pilani',
        ARRAY['BITS', 'BITS Pilani', 'BITS Goa', 'BITS Hyderabad'],
        'bits-pilani.ac.in',
        'engineering_college',
        'Pilani',
        'Jhunjhunu',
        'Rajasthan',
        'India',
        'https://www.bits-pilani.ac.in',
        true
    ),
    (
        'All India Institute of Medical Sciences, New Delhi',
        'all india institute of medical sciences new delhi',
        ARRAY['AIIMS', 'AIIMS Delhi', 'AIIMS New Delhi'],
        'aiims.edu',
        'medical_college',
        'New Delhi',
        'South Delhi',
        'Delhi',
        'India',
        'https://www.aiims.edu',
        true
    ),
    (
        'Indian Institute of Management Ahmedabad',
        'indian institute of management ahmedabad',
        ARRAY['IIMA', 'IIM Ahmedabad'],
        'iima.ac.in',
        'management_institute',
        'Ahmedabad',
        'Ahmedabad',
        'Gujarat',
        'India',
        'https://www.iima.ac.in',
        true
    ),
    (
        'Indian Institute of Management Bangalore',
        'indian institute of management bangalore',
        ARRAY['IIMB', 'IIM Bangalore'],
        'iimb.ac.in',
        'management_institute',
        'Bengaluru',
        'Bengaluru Urban',
        'Karnataka',
        'India',
        'https://www.iimb.ac.in',
        true
    ),
    (
        'Amity University Noida',
        'amity university noida',
        ARRAY['Amity', 'Amity Noida', 'Amity University'],
        'amity.edu',
        'university',
        'Noida',
        'Gautam Buddha Nagar',
        'Uttar Pradesh',
        'India',
        'https://www.amity.edu',
        true
    ),
    (
        'Manipal Academy of Higher Education',
        'manipal academy of higher education',
        ARRAY['MAHE', 'Manipal', 'Manipal University'],
        'manipal.edu',
        'university',
        'Manipal',
        'Udupi',
        'Karnataka',
        'India',
        'https://manipal.edu',
        true
    ),
    (
        'Vellore Institute of Technology',
        'vellore institute of technology',
        ARRAY['VIT', 'VIT Vellore', 'VIT Chennai'],
        'vit.ac.in',
        'engineering_college',
        'Vellore',
        'Vellore',
        'Tamil Nadu',
        'India',
        'https://vit.ac.in',
        true
    ),
    (
        'Thapar Institute of Engineering and Technology',
        'thapar institute of engineering and technology',
        ARRAY['TIET', 'Thapar', 'Thapar University', 'Thapar Patiala'],
        'thapar.edu',
        'engineering_college',
        'Patiala',
        'Patiala',
        'Punjab',
        'India',
        'https://www.thapar.edu',
        true
    ),
    (
        'Chandigarh University',
        'chandigarh university',
        ARRAY['CU', 'CU Gharuan', 'Chandigarh University Mohali'],
        'cuchd.in',
        'university',
        'Mohali',
        'SAS Nagar',
        'Punjab',
        'India',
        'https://www.cuchd.in',
        true
    ),
    -- Coaching Institutes & Academies
    (
        'Allen Career Institute Kota',
        'allen career institute kota',
        ARRAY['Allen', 'Allen Kota', 'Allen Career Institute'],
        'allen.ac.in',
        'coaching_institute',
        'Kota',
        'Kota',
        'Rajasthan',
        'India',
        'https://www.allen.ac.in',
        true
    ),
    (
        'FIITJEE South Delhi',
        'fiitjee south delhi',
        ARRAY['FIITJEE', 'FIITJEE Delhi', 'FIITJEE Kalu Sarai'],
        'fiitjee.com',
        'coaching_institute',
        'New Delhi',
        'South Delhi',
        'Delhi',
        'India',
        'https://www.fiitjee.com',
        true
    ),
    (
        'Resonance Eduventures Kota',
        'resonance eduventures kota',
        ARRAY['Resonance', 'Resonance Kota'],
        'resonance.ac.in',
        'coaching_institute',
        'Kota',
        'Kota',
        'Rajasthan',
        'India',
        'https://www.resonance.ac.in',
        true
    ),
    -- Workplaces & Technology Campuses
    (
        'Tata Consultancy Services - TCS Olympus',
        'tata consultancy services tcs olympus',
        ARRAY['TCS', 'TCS Thane', 'TCS Mumbai'],
        'tcs.com',
        'workplace',
        'Thane',
        'Thane',
        'Maharashtra',
        'India',
        'https://www.tcs.com',
        true
    ),
    (
        'Infosys Development Centre Bangalore',
        'infosys development centre bangalore',
        ARRAY['Infosys', 'Infosys Electronic City', 'Infosys Bangalore'],
        'infosys.com',
        'workplace',
        'Bengaluru',
        'Bengaluru Urban',
        'Karnataka',
        'India',
        'https://www.infosys.com',
        true
    )
ON CONFLICT (name) DO UPDATE SET
    normalized_name = EXCLUDED.normalized_name,
    aliases = EXCLUDED.aliases,
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    state = EXCLUDED.state,
    country = EXCLUDED.country,
    institution_type = EXCLUDED.institution_type,
    website = EXCLUDED.website,
    is_active = EXCLUDED.is_active,
    updated_at = timezone('utc'::text, now());

-- Update LPU and IIT Delhi records specifically if they were already inserted with basic schema
UPDATE public.institutions
SET 
    normalized_name = 'lovely professional university',
    aliases = ARRAY['LPU', 'LPU Phagwara', 'LPU Jalandhar'],
    district = 'Kapurthala',
    state = 'Punjab',
    country = 'India',
    is_active = true
WHERE name = 'Lovely Professional University';

UPDATE public.institutions
SET 
    normalized_name = 'indian institute of technology delhi',
    aliases = ARRAY['IITD', 'IIT Delhi'],
    district = 'South Delhi',
    state = 'Delhi',
    country = 'India',
    is_active = true
WHERE name = 'Indian Institute of Technology Delhi';

-- Index on aliases and normalized name for ultra-fast search
CREATE INDEX IF NOT EXISTS idx_institutions_normalized ON public.institutions (normalized_name);
CREATE INDEX IF NOT EXISTS idx_institutions_aliases ON public.institutions USING gin (aliases);
CREATE INDEX IF NOT EXISTS idx_institutions_state_city ON public.institutions (state, city);
CREATE INDEX IF NOT EXISTS idx_institutions_active_country ON public.institutions (is_active, country);

-- 3. Institution Addition Requests Table
CREATE TABLE IF NOT EXISTS public.institution_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    institution_type TEXT NOT NULL,
    city TEXT NOT NULL,
    district TEXT,
    state TEXT,
    country TEXT NOT NULL DEFAULT 'India',
    website TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewer_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    reviewed_at TIMESTAMPTZ
);

ALTER TABLE public.institution_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert institution requests"
    ON public.institution_requests FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own requests or admin all"
    ON public.institution_requests FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR is_current_user_admin());

CREATE POLICY "Admins can update institution requests"
    ON public.institution_requests FOR UPDATE
    TO authenticated
    USING (is_current_user_admin())
    WITH CHECK (is_current_user_admin());

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

-- RLS: Users can view active posts for their verified or explore institution
CREATE POLICY "Users can view active community posts"
    ON public.community_posts FOR SELECT
    TO authenticated
    USING (status = 'active' OR author_id = auth.uid() OR is_current_user_admin());

-- RLS: Users can insert posts only as themselves
CREATE POLICY "Users can insert community posts"
    ON public.community_posts FOR INSERT
    TO authenticated
    WITH CHECK (
        author_id = auth.uid() 
        AND status = 'active'
    );

-- RLS: Users can update their own posts or admin
CREATE POLICY "Users can update own community posts"
    ON public.community_posts FOR UPDATE
    TO authenticated
    USING (author_id = auth.uid() OR is_current_user_admin())
    WITH CHECK (author_id = auth.uid() OR is_current_user_admin());

-- RLS: Users can delete their own posts or admin
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

-- 6. Community Reactions Table (Likes on Posts)
CREATE TABLE IF NOT EXISTS public.community_reactions (
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reaction_type TEXT NOT NULL DEFAULT 'like' CHECK (reaction_type IN ('like', 'love', 'funny', 'support')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

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

-- Triggers to maintain likes_count and comments_count
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
    reason TEXT NOT NULL CHECK (reason IN (
        'doxxing',
        'harassment',
        'hate_speech',
        'defamation',
        'spam',
        'explicit_content',
        'other'
    )),
    details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'actioned', 'dismissed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_target_exists CHECK (post_id IS NOT NULL OR comment_id IS NOT NULL),
    CONSTRAINT chk_single_report_per_user_post UNIQUE (reporter_id, post_id),
    CONSTRAINT chk_single_report_per_user_comment UNIQUE (reporter_id, comment_id)
);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

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

