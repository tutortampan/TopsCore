-- Migration: Create student-avatars Supabase Storage bucket and public access policies
-- Date: 2026-10-12
-- Area: 9 (Database Hygiene & Media Egress)

-- 1. Ensure student-avatars bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'student-avatars',
  'student-avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/webp', 'image/jpeg', 'image/png'];

-- Allow reading public buckets
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'buckets'
      AND policyname = 'Public read buckets'
  ) THEN
    CREATE POLICY "Public read buckets"
      ON storage.buckets FOR SELECT
      USING (true);
  END IF;
END $$;

-- 2. Storage RLS Policies for student-avatars
-- Allow public / anon read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read student avatars'
  ) THEN
    CREATE POLICY "Public read student avatars"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'student-avatars');
  END IF;
END $$;

-- Allow upload into student-avatars bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow upload student avatars'
  ) THEN
    CREATE POLICY "Allow upload student avatars"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'student-avatars');
  END IF;
END $$;

-- Allow update in student-avatars bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Allow update student avatars'
  ) THEN
    CREATE POLICY "Allow update student avatars"
      ON storage.objects FOR UPDATE
      USING (bucket_id = 'student-avatars')
      WITH CHECK (bucket_id = 'student-avatars');
  END IF;
END $$;
