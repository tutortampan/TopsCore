-- ==============================================================================
-- TOPSCORE LMS — ONE-CLICK PRODUCTION CLEANUP & PURGE SCRIPT (V4 - ENHANCED)
-- Langsung jalankan di SQL Editor Supabase.
-- TRUNCATE & DELETE untuk membebaskan ruang disk + VACUUM ANALYZE untuk percepatan query.
-- ==============================================================================

-- 1. Kosongkan detail butir jawaban yang memenuhi kuota disk
TRUNCATE TABLE public.attempt_answers CASCADE;

-- 2. Hapus riwayat ujian yang BUKAN nilai terbaik (hanya sisakan nilai terbaik untuk rapor)
--    Menangani false dan NULL secara komprehensif
DELETE FROM public.attempts 
WHERE is_best_score = false OR is_best_score IS NULL;

-- 3. Hapus spam cheat event (siswa ganti tab / notif HP saat ujian)
DELETE FROM public.audit_logs 
WHERE action = 'CHEAT_ATTEMPT';

-- 4. Standarisasi nama akun dummy ke "Top" (Rule 2.24)
UPDATE public.students 
SET name = 'Top' 
WHERE LOWER(name) IN ('test', 'test student', 'test_student', 'dummy', 'dummy student');

UPDATE public.students 
SET name = 'Top Anon' 
WHERE LOWER(name) IN ('test_anon', 'test anon');

UPDATE public.students 
SET name = 'Top Evnikom' 
WHERE LOWER(name) IN ('test_evnikom', 'test evnikom');

-- 5. Bersihkan gelar kehormatan 'Mr.' dan 'Miss' dari tabel students (Rule 2.23 & DECISION-053)
UPDATE public.students
SET name = TRIM(REGEXP_REPLACE(name, '^(Mr\.|Miss\s+|Mr\s+|Miss\.)\s*', '', 'i'))
WHERE name ~* '^(Mr\.|Miss\s+|Mr\s+|Miss\.)';

-- 6. Defragmentasi tabel & perbarui statistik query planner Postgres (Percepatan Database)
VACUUM ANALYZE public.attempts;
VACUUM ANALYZE public.audit_logs;
VACUUM ANALYZE public.students;
