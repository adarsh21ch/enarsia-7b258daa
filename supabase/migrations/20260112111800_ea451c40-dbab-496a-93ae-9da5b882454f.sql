-- ============================================================
-- SNAPSHOT V2 TABLES FOR TRACKUP
-- ============================================================

-- 1. SAFE ENUM CREATION (idempotent)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'snapshot_source') THEN
        CREATE TYPE public.snapshot_source AS ENUM ('MANUAL', 'APPLICATION');
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'team_snapshot_source') THEN
        CREATE TYPE public.team_snapshot_source AS ENUM ('MANUAL', 'TEAM_MEMBERS');
    END IF;
END$$;

-- ============================================================
-- 2. personal_snapshot_v2
-- ============================================================
CREATE TABLE IF NOT EXISTS public.personal_snapshot_v2 (
    snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    upline_leader_id UUID NULL,
    date DATE NOT NULL,
    source snapshot_source NOT NULL DEFAULT 'MANUAL',
    total_leads INTEGER NOT NULL DEFAULT 0,
    total_responses INTEGER NOT NULL DEFAULT 0,
    response_tags JSONB NOT NULL DEFAULT '{}'::jsonb,
    stage_tags JSONB NOT NULL DEFAULT '{}'::jsonb,
    funnel_tag TEXT NULL,
    funnel_tag_count INTEGER NOT NULL DEFAULT 0,
    final_tag TEXT NULL,
    final_tag_count INTEGER NOT NULL DEFAULT 0,
    funnel_start_date DATE NULL,
    funnel_day INTEGER NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, date)
);

-- ============================================================
-- 3. team_snapshot_v2
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_snapshot_v2 (
    snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    leader_user_id UUID NOT NULL,
    date DATE NOT NULL,
    source team_snapshot_source NOT NULL DEFAULT 'MANUAL',
    total_leads INTEGER NOT NULL DEFAULT 0,
    total_responses INTEGER NOT NULL DEFAULT 0,
    response_tags JSONB NOT NULL DEFAULT '{}'::jsonb,
    stage_tags JSONB NOT NULL DEFAULT '{}'::jsonb,
    funnel_tag TEXT NULL,
    funnel_tag_count INTEGER NOT NULL DEFAULT 0,
    final_tag TEXT NULL,
    final_tag_count INTEGER NOT NULL DEFAULT 0,
    funnel_start_date DATE NULL,
    funnel_day INTEGER NULL,
    member_breakdown JSONB NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (leader_user_id, date)
);

-- ============================================================
-- 4. ENABLE RLS
-- ============================================================
ALTER TABLE public.personal_snapshot_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_snapshot_v2 ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. RLS POLICIES — personal_snapshot_v2
-- ============================================================
CREATE POLICY "personal_insert"
ON public.personal_snapshot_v2
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "personal_update"
ON public.personal_snapshot_v2
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "personal_delete"
ON public.personal_snapshot_v2
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "personal_select"
ON public.personal_snapshot_v2
FOR SELECT
USING (
    auth.uid() = user_id
    OR auth.uid() = upline_leader_id
);

-- ============================================================
-- 6. RLS POLICIES — team_snapshot_v2
-- ============================================================
CREATE POLICY "team_insert"
ON public.team_snapshot_v2
FOR INSERT
WITH CHECK (auth.uid() = leader_user_id);

CREATE POLICY "team_update"
ON public.team_snapshot_v2
FOR UPDATE
USING (auth.uid() = leader_user_id)
WITH CHECK (auth.uid() = leader_user_id);

CREATE POLICY "team_delete"
ON public.team_snapshot_v2
FOR DELETE
USING (auth.uid() = leader_user_id);

CREATE POLICY "team_select"
ON public.team_snapshot_v2
FOR SELECT
USING (auth.uid() = leader_user_id);

-- ============================================================
-- 7. INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_personal_snapshot_v2_user_date
ON public.personal_snapshot_v2 (user_id, date);

CREATE INDEX IF NOT EXISTS idx_personal_snapshot_v2_upline_date
ON public.personal_snapshot_v2 (upline_leader_id, date);

CREATE INDEX IF NOT EXISTS idx_team_snapshot_v2_leader_date
ON public.team_snapshot_v2 (leader_user_id, date);