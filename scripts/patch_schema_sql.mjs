import fs from 'fs';

let content = fs.readFileSync('supabase/schema.sql', 'utf8');

const oldFunc = `CREATE OR REPLACE FUNCTION "public"."auto_close_expired_attempts"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE challenge_attempts
  SET status = 'auto_submitted',
      submitted_at = COALESCE(expires_at, expected_end_at, NOW())
  WHERE status = 'in_progress'
    AND COALESCE(expires_at, expected_end_at) < NOW();
END;
$$;


ALTER FUNCTION "public"."auto_close_expired_attempts"() OWNER TO "postgres";`;

const newFunc = `CREATE OR REPLACE FUNCTION "public"."auto_close_expired_attempts"("p_attempt_id" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO "public"
    AS $$
BEGIN
  IF p_attempt_id IS NOT NULL THEN
    UPDATE public.attempts
    SET status = 'auto_submitted',
        submitted_at = COALESCE(expires_at, NOW()),
        updated_at = NOW()
    WHERE id = p_attempt_id
      AND lower(status) = 'in_progress';
  ELSE
    UPDATE public.attempts
    SET status = 'auto_submitted',
        submitted_at = COALESCE(expires_at, NOW()),
        updated_at = NOW()
    WHERE lower(status) = 'in_progress'
      AND expires_at < NOW();
  END IF;
END;
$$;


ALTER FUNCTION "public"."auto_close_expired_attempts"("p_attempt_id" "uuid") OWNER TO "postgres";`;

const oldGrants = `GRANT ALL ON FUNCTION "public"."auto_close_expired_attempts"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_close_expired_attempts"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_close_expired_attempts"() TO "service_role";`;

const newGrants = `GRANT ALL ON FUNCTION "public"."auto_close_expired_attempts"("p_attempt_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."auto_close_expired_attempts"("p_attempt_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_close_expired_attempts"("p_attempt_id" "uuid") TO "service_role";`;

// Normalize to check matching
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedOldFunc = oldFunc.replace(/\r\n/g, '\n');
const normalizedNewFunc = newFunc.replace(/\r\n/g, '\n');
const normalizedOldGrants = oldGrants.replace(/\r\n/g, '\n');
const normalizedNewGrants = newGrants.replace(/\r\n/g, '\n');

if (!normalizedContent.includes(normalizedOldFunc)) {
  console.error('Could not find oldFunc in schema.sql');
  process.exit(1);
}
if (!normalizedContent.includes(normalizedOldGrants)) {
  console.error('Could not find oldGrants in schema.sql');
  process.exit(1);
}

let updated = normalizedContent.replace(normalizedOldFunc, normalizedNewFunc);
updated = updated.replace(normalizedOldGrants, normalizedNewGrants);

// Restore CRLF if needed
if (content.includes('\r\n')) {
  updated = updated.replace(/\n/g, '\r\n');
}

fs.writeFileSync('supabase/schema.sql', updated, 'utf8');
console.log('Successfully updated supabase/schema.sql');
