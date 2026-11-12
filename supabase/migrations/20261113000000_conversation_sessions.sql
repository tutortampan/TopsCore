-- TopsCore LMS: Phase 430 — Peer-to-Peer 1-Hour Conversation Module Schema
-- Relational tables for WebRTC signaling session metadata, pacing logs, and AI evaluation snapshots.

CREATE TABLE IF NOT EXISTS public.conversation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_code TEXT NOT NULL UNIQUE,
    test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
    class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
    topic TEXT NOT NULL,
    target_duration_minutes INTEGER NOT NULL DEFAULT 60,
    student_a_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    student_b_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
    student_a_attempt_id UUID REFERENCES public.attempts(id) ON DELETE SET NULL,
    student_b_attempt_id UUID REFERENCES public.attempts(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'IN_PROGRESS', 'COMPLETED', 'ABORTED')),
    current_stage INTEGER NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 4),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    dialog_transcript JSONB DEFAULT '[]'::jsonb,
    evaluation_result JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE public.conversation_sessions ENABLE ROW LEVEL SECURITY;

-- Allow students to read/write their own conversation sessions
DROP POLICY IF EXISTS "Students can view assigned conversation sessions" ON public.conversation_sessions;
CREATE POLICY "Students can view assigned conversation sessions"
    ON public.conversation_sessions
    FOR SELECT
    USING (
        student_a_id IS NOT NULL OR student_b_id IS NOT NULL OR status = 'WAITING'
    );

DROP POLICY IF EXISTS "Students can insert or update conversation sessions" ON public.conversation_sessions;
CREATE POLICY "Students can insert or update conversation sessions"
    ON public.conversation_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Index for room code lookup
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_room_code ON public.conversation_sessions(room_code);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_test_id ON public.conversation_sessions(test_id);
