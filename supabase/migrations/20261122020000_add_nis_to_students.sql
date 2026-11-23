-- Migration: 20261122020000_add_nis_to_students.sql
-- Description: Add NIS (Nomor Induk Siswa) to students table, create indexes, and backfill CEC batches (Camp 134, 135, 131)
-- Strict Additive Migration: Zero destructive operations

-- 1. Add column nis to public.students
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS nis TEXT;

-- 2. Create index on (institution_id, nis) and global nis
CREATE INDEX IF NOT EXISTS idx_students_institution_nis
  ON public.students (institution_id, nis);

CREATE UNIQUE INDEX IF NOT EXISTS uq_students_institution_nis
  ON public.students (institution_id, nis)
  WHERE nis IS NOT NULL;

-- 3. Backfill Batch 134 (Camp 134 — 17 Students)
UPDATE public.students SET nis = '134001' WHERE id = '8422cae8-7fe5-45c4-b596-ec6f7bdb7f3c'; -- Muhamad Alifurrahman
UPDATE public.students SET nis = '134002' WHERE id = '3e8e4a9c-8d25-4318-b9c6-2d629d0d70b8'; -- Havvina Solehah
UPDATE public.students SET nis = '134003' WHERE id = 'b64a9245-1630-46f6-bcf3-4e291f4b3f8c'; -- Abdul Qoyyim Hanif Dahuri
UPDATE public.students SET nis = '134004' WHERE id = '60b73aba-b99c-4227-9615-b8e296538d5a'; -- Muhammad Afyani Farobi
UPDATE public.students SET nis = '134005' WHERE id = 'b0fce8b7-37c4-41c0-93b9-f3bab8142c83'; -- Isnantika Salsabila
UPDATE public.students SET nis = '134006' WHERE id = 'eca2a6ae-57b0-4d83-854f-32a9b13ca9ce'; -- Wildian Yusroni
UPDATE public.students SET nis = '134007' WHERE id = 'abbfbe3a-272a-4a1d-a57b-49fedb45f384'; -- Lalu Arman Maulana
UPDATE public.students SET nis = '134008' WHERE id = '547d7074-01e5-49d3-a0ef-08dbe1268143'; -- Muhammad Ariwil Asrori
UPDATE public.students SET nis = '134009' WHERE id = '4df43f93-048d-426b-a86a-0aab33912329'; -- Alfina Damayanti
UPDATE public.students SET nis = '134010' WHERE id = '9061b732-ae90-4786-a781-013b5ee68310'; -- Abdul Basit
UPDATE public.students SET nis = '134011' WHERE id = '66d73c5f-3f58-41d0-9be9-aad3158afb62'; -- Adinda Karunia Farela
UPDATE public.students SET nis = '134012' WHERE id = '240b1078-79f8-4158-9298-ffde0addb2e6'; -- Cinta Laura
UPDATE public.students SET nis = '134013' WHERE id = '63f0c1af-720e-4ff8-8e27-409b3b9eaaf7'; -- Sari Hikmah
UPDATE public.students SET nis = '134014' WHERE id = 'd8fc0882-cc75-4aa9-ae46-7a74615b0243'; -- Lalu Yuda Handika Prawira
UPDATE public.students SET nis = '134015' WHERE id = 'b3ed594c-6700-4f38-be11-cf3dd6c40c29'; -- Riska Fetrosia
UPDATE public.students SET nis = '134016' WHERE id = 'a5e9451f-9bb5-493c-8c2d-27dbdcbb5a6e'; -- Lalu Nune Mubarak
UPDATE public.students SET nis = '134017' WHERE id = 'bae52c8d-3456-4334-8f7a-7ba3c268c642'; -- Ayya Sofyandi Mzeth

-- 4. Backfill Batch 135 (Camp 135 — 30 Students)
UPDATE public.students SET nis = '135001' WHERE id = '5a13275c-be72-41e4-9a3d-b19482c4237c';
UPDATE public.students SET nis = '135002' WHERE id = 'c14fea91-9977-40a5-a363-e457b60bf988';
UPDATE public.students SET nis = '135003' WHERE id = '630d64b7-4dcc-4470-a018-3601892aeaed';
UPDATE public.students SET nis = '135004' WHERE id = '82101b63-8274-4d9c-af17-f629d98fdda3';
UPDATE public.students SET nis = '135005' WHERE id = '02ce6da0-94ff-4751-b677-9f4be72024cd';
UPDATE public.students SET nis = '135006' WHERE id = 'bebe3657-0e58-46db-9900-5acdb768bf64';
UPDATE public.students SET nis = '135007' WHERE id = '038dde15-f843-4b1a-967a-d5f8e9d6443a';
UPDATE public.students SET nis = '135008' WHERE id = 'af87633a-5fcf-407b-87cd-129a11951998';
UPDATE public.students SET nis = '135009' WHERE id = '180eea9c-6f67-45a6-b82f-5666afdde732';
UPDATE public.students SET nis = '135010' WHERE id = '79275c7d-27ed-4ed3-be9a-60df960e0146';
UPDATE public.students SET nis = '135011' WHERE id = '32dded8e-4942-4bf0-97d1-bd34575adf54';
UPDATE public.students SET nis = '135012' WHERE id = 'da5deef8-d544-4e16-8d42-bb21ca8dd437';
UPDATE public.students SET nis = '135013' WHERE id = 'b99abd8f-3032-445c-8214-60a17b8f812e';
UPDATE public.students SET nis = '135014' WHERE id = 'f6420c34-3ec8-4f32-9968-de17a48885f0';
UPDATE public.students SET nis = '135015' WHERE id = '3e7cdf4d-5c23-4dcc-b32a-f9bce43b69be';
UPDATE public.students SET nis = '135016' WHERE id = '5f064839-21f4-40a2-8c8d-e0f7f3d9589f';
UPDATE public.students SET nis = '135017' WHERE id = 'fe1731c8-e000-49e7-8327-682ca74dd8c1';
UPDATE public.students SET nis = '135018' WHERE id = '82e6da2a-51c9-4516-a440-f8dd7da320c7';
UPDATE public.students SET nis = '135019' WHERE id = 'e947da9b-44de-4443-a5e3-46e3f51ad5f2';
UPDATE public.students SET nis = '135020' WHERE id = '05e9bea0-1f82-457a-9ce9-e9964955966c';
UPDATE public.students SET nis = '135021' WHERE id = 'c114a1a8-4214-4799-b05c-05c30e253937';
UPDATE public.students SET nis = '135022' WHERE id = '2f5515df-7573-4910-b45a-35e6dca53806';
UPDATE public.students SET nis = '135023' WHERE id = 'c5fe286d-26eb-4020-8723-74e24a60d49e';
UPDATE public.students SET nis = '135024' WHERE id = '2274e763-680c-4374-b7cd-5ce4d436f66c';
UPDATE public.students SET nis = '135025' WHERE id = 'ce18456b-d1bf-43b5-8df5-ea20bbb41ce6';
UPDATE public.students SET nis = '135026' WHERE id = '31ea4dcd-38fa-41b9-b6f4-0439ab947912';
UPDATE public.students SET nis = '135027' WHERE id = '89800598-de35-4af5-a3f5-85ba9f26ee6a';
UPDATE public.students SET nis = '135028' WHERE id = '85372deb-0458-4bb7-893e-e0e1da269816';
UPDATE public.students SET nis = '135029' WHERE id = '9b2ac2ed-d84c-40f9-bb33-3aae35719a66';
UPDATE public.students SET nis = '135030' WHERE id = 'a18e3d00-1dd3-4667-a384-d70da9c29ee8';

-- 5. Backfill Batch 131 (Camp 131 — 17 Students)
UPDATE public.students SET nis = '131001' WHERE id = '96a3217e-908d-4e92-9a00-51b6a3821016';
UPDATE public.students SET nis = '131002' WHERE id = 'e7eb1594-5544-482a-a536-f09c6ae20894';
UPDATE public.students SET nis = '131003' WHERE id = '4363c0a9-cb0d-4a16-a36c-95b6a71cb0a8';
UPDATE public.students SET nis = '131004' WHERE id = '19c78854-2fb8-41cb-ad24-00842f1373d9';
UPDATE public.students SET nis = '131005' WHERE id = '65cee7d8-1123-455b-9d41-33296c05d76c';
UPDATE public.students SET nis = '131006' WHERE id = '3aae33f0-4613-40f0-8c26-5b9e0b12bcba';
UPDATE public.students SET nis = '131007' WHERE id = 'dea16453-2ce1-4ce8-b57d-944f77c271cf';
UPDATE public.students SET nis = '131008' WHERE id = '7fb8dafe-8cae-4f51-b0be-0bcfe3079963';
UPDATE public.students SET nis = '131009' WHERE id = 'be42f8a4-0498-4d51-aa9e-56e2c3fc6e4e';
UPDATE public.students SET nis = '131010' WHERE id = '73fd981f-eb3c-449e-b9b9-d2b388b1b26a';
UPDATE public.students SET nis = '131011' WHERE id = '732b223a-e999-4c22-9a4f-569d65ee1a68';
UPDATE public.students SET nis = '131012' WHERE id = 'abc0fe6a-2ee5-4b17-a068-d0694e9f727c';
UPDATE public.students SET nis = '131013' WHERE id = '36a921e3-2e45-42c2-841f-50ee979b009e';
UPDATE public.students SET nis = '131014' WHERE id = 'dbd5cd81-d130-4be6-aee7-4d9d17d5ce39';
UPDATE public.students SET nis = '131015' WHERE id = '301be589-aba1-43be-a999-aa8ddaf6c509';
UPDATE public.students SET nis = '131016' WHERE id = 'c7faeb2c-7b07-4e78-9556-91e7ee0a4595';
UPDATE public.students SET nis = '131017' WHERE id = '8caf0c0d-1e1b-410a-b32c-35492f15e7f1';
