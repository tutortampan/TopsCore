-- Migration: 20261121000000_tutor_ecosystem_and_attendance.sql
-- Description: Tutor Ecosystem, Dual-Mode Attendance (Regular vs Exam), and 3-Column English Zone Punishment Ledger (FINE, PAID, DEBT)
-- Strict Additive Migration: Zero destructive alterations to existing tables

-- 1. Tutor Profiles (Pillar A & Mobile Tutor App Auth)
CREATE TABLE IF NOT EXISTS public.tutor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT,
  tutor_pin TEXT NOT NULL,
  invite_token TEXT UNIQUE,
  institution_id UUID REFERENCES public.institutions(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tutor_profiles_institution
  ON public.tutor_profiles (institution_id);

-- 2. Class Sessions (Meetings 1..24/30, Regular vs Exam)
CREATE TABLE IF NOT EXISTS public.class_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  tutor_id UUID REFERENCES public.tutor_profiles(id) ON DELETE SET NULL,
  session_number INT NOT NULL CHECK (session_number >= 1 AND session_number <= 30),
  session_type TEXT NOT NULL DEFAULT 'REGULAR' CHECK (session_type IN ('REGULAR', 'EXAM')),
  target_test_id UUID REFERENCES public.tests(id) ON DELETE SET NULL,
  custom_duration_minutes INT, -- Tutor manual override duration (DECISION-063)
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'CLOSED', 'CANCELLED')),
  beacon_lat DOUBLE PRECISION,
  beacon_lng DOUBLE PRECISION,
  beacon_radius_meters DOUBLE PRECISION NOT NULL DEFAULT 10.0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- High-performance indexes for session lookup
CREATE INDEX IF NOT EXISTS idx_class_sessions_active 
  ON public.class_sessions (class_id, batch_id, status);

CREATE INDEX IF NOT EXISTS idx_class_sessions_tutor
  ON public.class_sessions (tutor_id, status);

-- 3. Session Attendance Log
CREATE TABLE IF NOT EXISTS public.session_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'UNCHECKED' CHECK (status IN ('UNCHECKED', 'PRESENT_PROXIMITY', 'PRESENT_QR', 'LATE', 'EXCUSED', 'SICK', 'ALPHA')),
  distance_meters DOUBLE PRECISION,
  checked_in_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_session_attendance_lookup 
  ON public.session_attendance (session_id, student_id, status);

CREATE INDEX IF NOT EXISTS idx_session_attendance_student
  ON public.session_attendance (student_id);

-- 4. English Zone Punishment Ledger (3-Column: FINE, PAID, DEBT)
CREATE TABLE IF NOT EXISTS public.language_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  word_count INT NOT NULL DEFAULT 0 CHECK (word_count >= 0),
  fine_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (fine_amount >= 0),
  paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (paid_amount >= 0),
  debt_amount NUMERIC(12,2) GENERATED ALWAYS AS (fine_amount - paid_amount) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_violation_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_language_violations_session
  ON public.language_violations (session_id);

CREATE INDEX IF NOT EXISTS idx_language_violations_student
  ON public.language_violations (student_id);

-- 5. Language Violation Payment History
CREATE TABLE IF NOT EXISTS public.language_violation_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  violation_id UUID NOT NULL REFERENCES public.language_violations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL DEFAULT 'CASH' CHECK (payment_method IN ('CASH', 'TRANSFER')),
  received_by_tutor_id UUID REFERENCES public.tutor_profiles(id) ON DELETE SET NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_violation_payments_violation
  ON public.language_violation_payments (violation_id);

-- 6. RPC Function: Auto-Alpha Lockdown (Atomic & Safe)
CREATE OR REPLACE FUNCTION public.close_class_session_with_auto_alpha(p_session_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_batch_id UUID;
  v_alpha_count INT := 0;
BEGIN
  -- Validasi keberadaan sesi
  SELECT * INTO v_session FROM public.class_sessions WHERE id = p_session_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Session not found');
  END IF;

  IF v_session.status = 'CLOSED' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Session already closed', 'alpha_count', 0);
  END IF;

  v_batch_id := v_session.batch_id;

  -- 1. Insert status ALPHA untuk seluruh siswa aktif dalam batch yang belum tercatat sama sekali
  -- DECISION-074: Kecualikan siswa yang berstatus ALUMNI
  INSERT INTO public.session_attendance (session_id, student_id, status, notes)
  SELECT p_session_id, s.id, 'ALPHA', 'Auto-assigned upon session closure'
  FROM public.students s
  WHERE s.batch_id = v_batch_id
    AND s.is_active = true
    AND (s.program_status IS NULL OR s.program_status != 'ALUMNI')
    AND NOT EXISTS (
      SELECT 1 FROM public.session_attendance sa 
      WHERE sa.session_id = p_session_id AND sa.student_id = s.id
    );

  -- 2. Update status UNCHECKED menjadi ALPHA jika ada record yang belum terselesaikan
  UPDATE public.session_attendance
  SET status = 'ALPHA', notes = 'Auto-assigned upon session closure', updated_at = now()
  WHERE session_id = p_session_id AND status = 'UNCHECKED';

  GET DIAGNOSTICS v_alpha_count = ROW_COUNT;

  -- 3. Kunci Sesi
  UPDATE public.class_sessions
  SET status = 'CLOSED', closed_at = now()
  WHERE id = p_session_id;

  RETURN jsonb_build_object('success', true, 'session_id', p_session_id, 'alpha_count', v_alpha_count);
END;
$$;

-- 7. RLS Configuration (Row Level Security)
ALTER TABLE public.tutor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.language_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.language_violation_payments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- tutor_profiles policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tutor_profiles' AND policyname = 'tutor_profiles_anon_all') THEN
    CREATE POLICY "tutor_profiles_anon_all" ON public.tutor_profiles FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'tutor_profiles' AND policyname = 'tutor_profiles_auth_all') THEN
    CREATE POLICY "tutor_profiles_auth_all" ON public.tutor_profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- class_sessions policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'class_sessions' AND policyname = 'class_sessions_anon_all') THEN
    CREATE POLICY "class_sessions_anon_all" ON public.class_sessions FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'class_sessions' AND policyname = 'class_sessions_auth_all') THEN
    CREATE POLICY "class_sessions_auth_all" ON public.class_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- session_attendance policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'session_attendance' AND policyname = 'session_attendance_anon_all') THEN
    CREATE POLICY "session_attendance_anon_all" ON public.session_attendance FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'session_attendance' AND policyname = 'session_attendance_auth_all') THEN
    CREATE POLICY "session_attendance_auth_all" ON public.session_attendance FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- language_violations policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'language_violations' AND policyname = 'language_violations_anon_all') THEN
    CREATE POLICY "language_violations_anon_all" ON public.language_violations FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'language_violations' AND policyname = 'language_violations_auth_all') THEN
    CREATE POLICY "language_violations_auth_all" ON public.language_violations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- language_violation_payments policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'language_violation_payments' AND policyname = 'language_violation_payments_anon_all') THEN
    CREATE POLICY "language_violation_payments_anon_all" ON public.language_violation_payments FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'language_violation_payments' AND policyname = 'language_violation_payments_auth_all') THEN
    CREATE POLICY "language_violation_payments_auth_all" ON public.language_violation_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 8. Grants for Roles
GRANT ALL ON public.tutor_profiles TO anon, authenticated, service_role;
GRANT ALL ON public.class_sessions TO anon, authenticated, service_role;
GRANT ALL ON public.session_attendance TO anon, authenticated, service_role;
GRANT ALL ON public.language_violations TO anon, authenticated, service_role;
GRANT ALL ON public.language_violation_payments TO anon, authenticated, service_role;
