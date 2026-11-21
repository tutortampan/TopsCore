-- Migration: Add plaintext pin column to students table
-- Purpose: Allow admin to view/recover student PIN when forgotten
-- The pin column stores plaintext PIN alongside pin_hash (SHA-256)
-- pin_hash is still used for login verification; pin is admin-visible only

ALTER TABLE "public"."students"
  ADD COLUMN IF NOT EXISTS "pin" "text";

-- Backfill default PIN for students whose pin_hash matches SHA-256('1234')
UPDATE "public"."students"
SET "pin" = '1234'
WHERE "pin" IS NULL
  AND "pin_hash" = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
