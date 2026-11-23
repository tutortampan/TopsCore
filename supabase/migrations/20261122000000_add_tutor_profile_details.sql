-- Migration: 20261122000000_add_tutor_profile_details.sql
-- Description: Add gender, birth_date, address, specialty, photo_url to tutor_profiles (SSOT Faculty ID Badge & Rules §5.5, §2.38)
-- Strict Additive Migration: Zero destructive alterations to existing tables

ALTER TABLE public.tutor_profiles
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female')),
  ADD COLUMN IF NOT EXISTS birth_date DATE,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS specialty TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Seed default baseline faculty and instructors if table is empty or missing key members
INSERT INTO public.tutor_profiles (full_name, gender, birth_date, address, specialty, tutor_pin, is_active)
SELECT 'Mr. Taufan Hadi Ahmad', 'male', '1987-11-07'::date, 'Jl. Brawijaya No. 12, Pare, Kediri', 'Lead Academic Director & Speaking Specialist', '1234', true
WHERE NOT EXISTS (SELECT 1 FROM public.tutor_profiles WHERE full_name LIKE '%Taufan%' OR full_name = 'Mr. Top');

INSERT INTO public.tutor_profiles (full_name, gender, birth_date, address, specialty, tutor_pin, is_active)
SELECT 'Mr. Muhammad Amrullah', 'male', '1997-08-18'::date, 'Jl. Dahlia No. 8, Pare, Kediri', 'Senior Grammar & Basic English Tutor', '1234', true
WHERE NOT EXISTS (SELECT 1 FROM public.tutor_profiles WHERE full_name LIKE '%Amrullah%');

INSERT INTO public.tutor_profiles (full_name, gender, birth_date, address, specialty, tutor_pin, is_active)
SELECT 'Miss Elysa Supiani', 'female', '2002-01-22'::date, 'Mataram, Lombok Barat', 'Vocabulary & Monologue Specialist', '1234', true
WHERE NOT EXISTS (SELECT 1 FROM public.tutor_profiles WHERE full_name LIKE '%Elysa%');

INSERT INTO public.tutor_profiles (full_name, gender, birth_date, address, specialty, tutor_pin, is_active)
SELECT 'Miss Nizan', 'female', '2001-06-05'::date, 'Pare, Kediri, Jawa Timur', 'Pronunciation & Phonetics Instructor', '1234', true
WHERE NOT EXISTS (SELECT 1 FROM public.tutor_profiles WHERE full_name LIKE '%Nizan%');

INSERT INTO public.tutor_profiles (full_name, gender, birth_date, address, specialty, tutor_pin, is_active)
SELECT 'Miss Cita', 'female', '2003-09-12'::date, 'Mataram, Lombok Barat', 'Interactive Speaking & Dialogue Coach', '1234', true
WHERE NOT EXISTS (SELECT 1 FROM public.tutor_profiles WHERE full_name LIKE '%Cita%');

INSERT INTO public.tutor_profiles (full_name, gender, birth_date, address, specialty, tutor_pin, is_active)
SELECT 'Miss Amelia', 'female', '2002-03-30'::date, 'Senggigi, Lombok Barat', 'Storytelling & Speech Evaluation Specialist', '1234', true
WHERE NOT EXISTS (SELECT 1 FROM public.tutor_profiles WHERE full_name LIKE '%Amelia%');

INSERT INTO public.tutor_profiles (full_name, gender, birth_date, address, specialty, tutor_pin, is_active)
SELECT 'Miss Siti Qori'' Atun Hizbaeni', 'female', '2004-02-25'::date, 'Mataram, Lombok Barat', 'Hospitality & Tourism English Lead', '1234', true
WHERE NOT EXISTS (SELECT 1 FROM public.tutor_profiles WHERE full_name LIKE '%Siti Qori%');
