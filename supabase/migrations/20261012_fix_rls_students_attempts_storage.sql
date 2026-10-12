-- Migration: Fix RLS policies for students, attempts, attempt_answers, progress, and student-avatars storage
-- Date: 2026-10-12

-- 1. Enable RLS and Grant Permissions on "students" Table
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read students" ON public.students;
CREATE POLICY "Allow read students"
ON public.students
FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Allow update students" ON public.students;
CREATE POLICY "Allow update students"
ON public.students
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert students" ON public.students;
CREATE POLICY "Allow insert students"
ON public.students
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 2. Configure "student-avatars" Storage Bucket & Policies
INSERT INTO storage.buckets (id, name, public)
VALUES ('student-avatars', 'student-avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Allow upload student avatars" ON storage.objects;
CREATE POLICY "Allow upload student avatars"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'student-avatars');

DROP POLICY IF EXISTS "Allow update student avatars" ON storage.objects;
CREATE POLICY "Allow update student avatars"
ON storage.objects
FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'student-avatars');

DROP POLICY IF EXISTS "Allow public read student avatars" ON storage.objects;
CREATE POLICY "Allow public read student avatars"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'student-avatars');

-- 3. Fix "attempts" Table RLS Policies
ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_attempts" ON public.attempts;
CREATE POLICY "anon_all_attempts"
ON public.attempts
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. Fix "attempt_answers" Table RLS Policies
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_attempt_answers" ON public.attempt_answers;
CREATE POLICY "anon_all_attempt_answers"
ON public.attempt_answers
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. Fix "progress" Table RLS Policies
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_all_progress" ON public.progress;
CREATE POLICY "anon_all_progress"
ON public.progress
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);
