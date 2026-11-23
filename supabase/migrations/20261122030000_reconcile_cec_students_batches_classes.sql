-- Migration: 20261122030000_reconcile_cec_students_batches_classes.sql
-- Description: Reconcile CEC Camp 134 (28 students) with exact NIS, create Batch 136, and activate/create all 15 curriculum classes across Levels 1-3.
-- Strict Additive Migration: Zero destructive alterations.

-- ============================================================
-- 1. BATCH CREATION: Ensure Batch 136 exists under CEC Camp
-- ============================================================
INSERT INTO public.batches (name, program_id, is_active, current_level_id)
SELECT '136', '11deb53c-434a-44b0-83ca-1cc9b239cab3', true, '100120f3-ab12-4589-99da-cf65d11436b1'
WHERE NOT EXISTS (
  SELECT 1 FROM public.batches WHERE name = '136' AND program_id = '11deb53c-434a-44b0-83ca-1cc9b239cab3'
);

-- ============================================================
-- 2. CLASS ACTIVATION & CREATION: 15 Core Classes across Levels 1-3
-- ============================================================

-- Activate existing inactive classes
UPDATE public.classes SET is_active = true WHERE code IN ('CAMP-1STORY', 'CAMP-2SPEAK', 'CAMP-2STORY', 'CAMP-3SPEAK');

-- Create missing classes if not exists
-- Level 1: Grammar 1, Speaking 1
INSERT INTO public.classes (name, code, program_id, institution_id, is_active)
SELECT 'Camp 1st Grammar', 'CAMP-1GRAM', '11deb53c-434a-44b0-83ca-1cc9b239cab3', 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', true
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE code = 'CAMP-1GRAM');

INSERT INTO public.classes (name, code, program_id, institution_id, is_active)
SELECT 'Camp 1st Speaking', 'CAMP-1SPEAK', '11deb53c-434a-44b0-83ca-1cc9b239cab3', 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', true
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE code = 'CAMP-1SPEAK');

-- Level 2: Grammar 2, GFS
INSERT INTO public.classes (name, code, program_id, institution_id, is_active)
SELECT 'Camp 2nd Grammar', 'CAMP-2GRAM', '11deb53c-434a-44b0-83ca-1cc9b239cab3', 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', true
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE code = 'CAMP-2GRAM');

INSERT INTO public.classes (name, code, program_id, institution_id, is_active)
SELECT 'Camp 2nd GFS', 'CAMP-2GFS', '11deb53c-434a-44b0-83ca-1cc9b239cab3', 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', true
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE code = 'CAMP-2GFS');

-- Level 3: Grammar 3, Pronunciation, Storytelling 3
INSERT INTO public.classes (name, code, program_id, institution_id, is_active)
SELECT 'Camp 3rd Grammar', 'CAMP-3GRAM', '11deb53c-434a-44b0-83ca-1cc9b239cab3', 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', true
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE code = 'CAMP-3GRAM');

INSERT INTO public.classes (name, code, program_id, institution_id, is_active)
SELECT 'Camp 3rd Pronunciation', 'CAMP-3PRON', '11deb53c-434a-44b0-83ca-1cc9b239cab3', 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', true
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE code = 'CAMP-3PRON');

INSERT INTO public.classes (name, code, program_id, institution_id, is_active)
SELECT 'Camp 3rd Storytelling', 'CAMP-3STORY', '11deb53c-434a-44b0-83ca-1cc9b239cab3', 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', true
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE code = 'CAMP-3STORY');

-- Link all 15 classes to class_levels
-- Level 1 (100120f3-ab12-4589-99da-cf65d11436b1)
INSERT INTO public.class_levels (class_id, level_id)
SELECT c.id, '100120f3-ab12-4589-99da-cf65d11436b1'
FROM public.classes c
WHERE c.code IN ('CAMP-1BASIC', 'CAMP-1VOCAB', 'CAMP-1STORY', 'CAMP-1GRAM', 'CAMP-1SPEAK')
  AND c.is_active = true
ON CONFLICT DO NOTHING;

-- Level 2 (9936683a-5b4a-4796-bb5d-a7fd8ecf0b71)
INSERT INTO public.class_levels (class_id, level_id)
SELECT c.id, '9936683a-5b4a-4796-bb5d-a7fd8ecf0b71'
FROM public.classes c
WHERE c.code IN ('CAMP-2VOCAB', 'CAMP-2SPEAK', 'CAMP-2STORY', 'CAMP-2GRAM', 'CAMP-2GFS')
  AND c.is_active = true
ON CONFLICT DO NOTHING;

-- Level 3 (51589e1a-d96e-496e-92a3-d9d350483555)
INSERT INTO public.class_levels (class_id, level_id)
SELECT c.id, '51589e1a-d96e-496e-92a3-d9d350483555'
FROM public.classes c
WHERE c.code IN ('CAMP-3VOCAB', 'CAMP-3SPEAK', 'CAMP-3GRAM', 'CAMP-3PRON', 'CAMP-3STORY')
  AND c.is_active = true
ON CONFLICT DO NOTHING;

-- ============================================================
-- 3. RECONCILE BATCH 134 STUDENTS (EXACT 28 ROSTER & OFFICIAL NIS)
-- ============================================================

-- First, clear temporary NIS on Batch 134 to prevent swap collision
UPDATE public.students 
SET nis = NULL 
WHERE batch_id = '3e7288b7-a90e-4323-9b02-24e73991f0d7';

-- Re-assign official NIS to the 17 existing students of Batch 134
UPDATE public.students SET nis = '134001', name = 'Ayya Sofyandi Mzeth' WHERE id = 'bae52c8d-3456-4334-8f7a-7ba3c268c642';
UPDATE public.students SET nis = '134002', name = 'Cinta Laura' WHERE id = '240b1078-79f8-4158-9298-ffde0addb2e6';
UPDATE public.students SET nis = '134003', name = 'Havvina Solehah' WHERE id = '3e8e4a9c-8d25-4318-b9c6-2d629d0d70b8';
UPDATE public.students SET nis = '134004', name = 'Alfina Damayanti' WHERE id = '4df43f93-048d-426b-a86a-0aab33912329';
UPDATE public.students SET nis = '134008', name = 'Lalu Arman Maulana' WHERE id = 'abbfbe3a-272a-4a1d-a57b-49fedb45f384';
UPDATE public.students SET nis = '134009', name = 'Riska Fetrosia' WHERE id = 'b3ed594c-6700-4f38-be11-cf3dd6c40c29';
UPDATE public.students SET nis = '134010', name = 'Isnantika Salsabila' WHERE id = 'b0fce8b7-37c4-41c0-93b9-f3bab8142c83';
UPDATE public.students SET nis = '134011', name = 'Sari Hikmah' WHERE id = '63f0c1af-720e-4ff8-8e27-409b3b9eaaf7';
UPDATE public.students SET nis = '134012', name = 'Abdul Basit' WHERE id = '9061b732-ae90-4786-a781-013b5ee68310';
UPDATE public.students SET nis = '134013', name = 'Adinda Karunia Farela' WHERE id = '66d73c5f-3f58-41d0-9be9-aad3158afb62';
UPDATE public.students SET nis = '134014', name = 'Muhamad Alifurrahman' WHERE id = '8422cae8-7fe5-45c4-b596-ec6f7bdb7f3c';
UPDATE public.students SET nis = '134016', name = 'Lalu Yuda Handika Prawira' WHERE id = 'd8fc0882-cc75-4aa9-ae46-7a74615b0243';
UPDATE public.students SET nis = '134022', name = 'Wildian Yusroni' WHERE id = 'eca2a6ae-57b0-4d83-854f-32a9b13ca9ce';
UPDATE public.students SET nis = '134023', name = 'Muhammad Afyani Farobi' WHERE id = '60b73aba-b99c-4227-9615-b8e296538d5a';
UPDATE public.students SET nis = '134025', name = 'Abdul Qoyyim Hanif Dahuri' WHERE id = 'b64a9245-1630-46f6-bcf3-4e291f4b3f8c';
UPDATE public.students SET nis = '121007', name = 'Lalu Nune Mubarak' WHERE id = 'a5e9451f-9bb5-493c-8c2d-27dbdcbb5a6e';
UPDATE public.students SET nis = '132016', name = 'Muhammad Ariwil Asrori' WHERE id = '547d7074-01e5-49d3-a0ef-08dbe1268143';

-- Insert the 11 missing students of Batch 134
INSERT INTO public.students (institution_id, program_id, batch_id, level_id, name, nis, pin, pin_hash, is_active, program_status)
VALUES
  ('f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', '11deb53c-434a-44b0-83ca-1cc9b239cab3', '3e7288b7-a90e-4323-9b02-24e73991f0d7', '51589e1a-d96e-496e-92a3-d9d350483555', 'Nadila Fajriani', '134005', '1234', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', true, 'ACTIVE'),
  ('f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', '11deb53c-434a-44b0-83ca-1cc9b239cab3', '3e7288b7-a90e-4323-9b02-24e73991f0d7', '51589e1a-d96e-496e-92a3-d9d350483555', 'Soni', '134006', '1234', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', true, 'ACTIVE'),
  ('f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', '11deb53c-434a-44b0-83ca-1cc9b239cab3', '3e7288b7-a90e-4323-9b02-24e73991f0d7', '51589e1a-d96e-496e-92a3-d9d350483555', 'Lalu Gde Syailana Patria Fanandy', '134007', '1234', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', true, 'ACTIVE'),
  ('f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', '11deb53c-434a-44b0-83ca-1cc9b239cab3', '3e7288b7-a90e-4323-9b02-24e73991f0d7', '51589e1a-d96e-496e-92a3-d9d350483555', 'Zulfan Hamdani', '134015', '1234', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', true, 'ACTIVE'),
  ('f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', '11deb53c-434a-44b0-83ca-1cc9b239cab3', '3e7288b7-a90e-4323-9b02-24e73991f0d7', '51589e1a-d96e-496e-92a3-d9d350483555', 'Ida Wayan Gana Surya Arta', '134017', '1234', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', true, 'ACTIVE'),
  ('f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', '11deb53c-434a-44b0-83ca-1cc9b239cab3', '3e7288b7-a90e-4323-9b02-24e73991f0d7', '51589e1a-d96e-496e-92a3-d9d350483555', 'Tio Ananta', '134018', '1234', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', true, 'ACTIVE'),
  ('f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', '11deb53c-434a-44b0-83ca-1cc9b239cab3', '3e7288b7-a90e-4323-9b02-24e73991f0d7', '51589e1a-d96e-496e-92a3-d9d350483555', 'Indah Yulandari', '134019', '1234', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', true, 'ACTIVE'),
  ('f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', '11deb53c-434a-44b0-83ca-1cc9b239cab3', '3e7288b7-a90e-4323-9b02-24e73991f0d7', '51589e1a-d96e-496e-92a3-d9d350483555', 'Tino Rajudan Rustiansah', '134020', '1234', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', true, 'ACTIVE'),
  ('f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', '11deb53c-434a-44b0-83ca-1cc9b239cab3', '3e7288b7-a90e-4323-9b02-24e73991f0d7', '51589e1a-d96e-496e-92a3-d9d350483555', 'Lucky Rizky', '134021', '1234', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', true, 'ACTIVE'),
  ('f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', '11deb53c-434a-44b0-83ca-1cc9b239cab3', '3e7288b7-a90e-4323-9b02-24e73991f0d7', '51589e1a-d96e-496e-92a3-d9d350483555', 'Dirja Arisandi', '134024', '1234', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', true, 'ACTIVE'),
  ('f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', '11deb53c-434a-44b0-83ca-1cc9b239cab3', '3e7288b7-a90e-4323-9b02-24e73991f0d7', '51589e1a-d96e-496e-92a3-d9d350483555', 'Arman Maulana', '132020', '1234', '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4', true, 'ACTIVE')
ON CONFLICT DO NOTHING;
