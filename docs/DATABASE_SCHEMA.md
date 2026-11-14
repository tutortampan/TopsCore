# TOPSCORE LMS — DATABASE SCHEMA & RLS SPECIFICATION

> **Platform:** Supabase PostgreSQL  
> **Source of Truth for Migrations:** `supabase/migrations/`  
> **Architecture Status:** Canonical Core Architecture (13 Core Tables, Zero Legacy Baggage)  
> **Color & Grading SSOT:** [`AGENTS.md` Section 2.10](file:///AGENTS.md#210-grade)

---

## 1. Canonical Core Schema Overview (13 Tables)

The production database is strictly organized into 13 canonical tables adhering to the ABCD academic hierarchy:

```text
INSTITUTION (institutions)
  └── PROGRAM (programs)
        ├── BATCH (batches)
        │     └── STUDENT (students)
        │
        └── CLASS (classes)
              ├── LEVEL (levels + class_levels)
              └── TEST (tests)
                    ├── ATTEMPT (attempts)
                    │     └── ATTEMPT ANSWER (attempt_answers)
                    └── BANK MATERI (vocabulary_vault)

PLATFORM, CONFIG & AUDIT:
- site_settings               (Global system configuration & background telemetry)
- audit_logs                  (Security, auth, and material administrative audit logs)
- theme_program_assignments   (Multi-tenant curriculum theme to program mappings)
```

---

## 2. Relationships & Cardinalities

```text
institutions 1 ─── N programs
institutions 1 ─── N classes
programs     1 ─── N batches
programs     1 ─── N classes
batches      1 ─── N students
classes      1 ─── N class_levels ─── N levels
classes      1 ─── N tests
students     1 ─── N attempts
tests        1 ─── N attempts
attempts     1 ─── N attempt_answers
```

---

## 3. Authoritative Core Table Specifications

### 3.1 Attempts Table (`public.attempts`)
Stores assessment submission attempts, authoritative evaluation scores, calculated grades, and remedial states:
- `id` (uuid, PK, gen_random_uuid())
- `student_id` (uuid, FK public.students)
- `test_id` (uuid, FK public.tests)
- `attempt_number` (int, default 1)
- `started_at`, `expires_at`, `submitted_at` (timestamptz)
- `status` (text: 'in_progress', 'submitted', 'auto_submitted', 'expired', 'cancelled')
- `score` (numeric(5,2)), `correct_count` (int), `total_questions` (int), `percentage` (numeric(5,2)), `grade` (text)
- `effective_score` (numeric(5,2)), `is_best_score` (boolean)
- `is_remedial_unlocked` (boolean), `is_remedial` (boolean)
- `is_forgiven` (boolean), `forgiven_reason` (text), `forgiven_by` (text), `forgiven_at` (timestamptz)
- `created_at`, `updated_at` (timestamptz)

### 3.2 Attempt Answers Table (`public.attempt_answers`)
Stores immutable question-level responses, answer snapshots, evaluation codes, and awarded points:
- `id` (uuid, PK, gen_random_uuid())
- `attempt_id` (uuid, FK public.attempts)
- `question_number` (int)
- `question_text` (text)
- `student_answer` (text)
- `correct_answer_snapshot` (text)
- `is_correct` (boolean)
- `score` (numeric(3,2))
- `evaluation_result` (text: 'correct', 'minor_spelling_error', 'minor_word_form_error', 'incorrect', 'timeout', 'unanswered')
- `question_snapshot` (jsonb)
- `created_at` (timestamptz)

### 3.3 Tests Table (`public.tests`)
Stores test definitions, shell codes, dynamic configurations, thresholds, and timers:
- `id` (uuid, PK, gen_random_uuid())
- `class_id` (uuid, FK public.classes)
- `level_id` (uuid, FK public.levels)
- `institution_id` (uuid, FK public.institutions)
- `program_id` (uuid, FK public.programs)
- `test_type` (text: 'quiz' [Task] | 'exam' [Exam])
- `test_subtype` (text: 'VOCAB_TASK', 'PHRASE_TASK', 'VOCAB_EXAM', 'PHRASE_EXAM')
- `title` (text), `display_name` (text), `shell_code` (text)
- `status` (text: 'DRAFT', 'PUBLISHED', 'ARCHIVED')
- `working_duration_minutes` (int, default 60)
- `minimum_required_score` (numeric, default 60)
- `prerequisite_test_id` (uuid, FK public.tests)
- `is_dynamic_shell` (boolean, default true)
- `payload` (jsonb)
- `display_order` (int, default 999)
- `created_at`, `updated_at`, `deleted_at` (timestamptz)

### 3.4 Students Table (`public.students`)
Stores registered students within institutional programs:
- `id` (uuid, PK, gen_random_uuid())
- `institution_id` (uuid, FK public.institutions)
- `program_id` (uuid, FK public.programs)
- `batch_id` (uuid, FK public.batches)
- `level_id` (uuid, FK public.levels)
- `name` (text, required), `pin_hash` (text, required)
- `gender` (text), `dob` (date), `education_level` (text), `province` (text), `city` (text)
- `is_active` (boolean, default true)
- `created_at`, `updated_at`, `deleted_at` (timestamptz)
- *Strict Invariant: No business Student ID is used; database UUID is primary.*

### 3.5 Vocabulary Vault (`public.vocabulary_vault`)
Central lexicon dictionary storing words, phrases, idioms, phonetic metadata, and theme mappings:
- `id` (uuid, PK, gen_random_uuid())
- `institution_id` (uuid, FK public.institutions)
- `program_id` (uuid, FK public.programs)
- `topic` (text), `indonesian` (text), `english` (text)
- `word_type` (text), `target_level` (text), `theme` (text), `theme_code` (text), `topic_code` (text)
- `created_at`, `updated_at` (timestamptz)

### 3.6 Platform & Audit
- **`site_settings`**: Key-value system configurations (`anti_cheat_sound_type`, security overrides, timers).
- **`audit_logs`**: Administrative audit trail (`user_role`, `action`, `resource_type`, `old_value`, `new_value`, `ip_address`).
- **`theme_program_assignments`**: Junction table mapping curriculum themes across multi-tenant programs (`theme_name`, `program_id`).

---

## 4. Row Level Security (RLS) & Security Boundaries

1. **Student Boundary**:
   - Students may read only their assigned tests, active batch data, and own submissions/attempts.
   - Answer key snapshots (`correct_answer_snapshot`) must NEVER leak to students while attempts are `IN_PROGRESS`.
2. **Admin & Tutor Boundary**:
   - Admin operations require server-verified role checks. Client-side role claims are untrusted.
3. **Service Role Protection**:
   - The Supabase `service_role` key is strictly forbidden from client-side bundles. Used exclusively in Edge Functions.
4. **Soft Delete Rule**:
   - Business entities use `deleted_at IS NULL`. Hard deletes (`DELETE FROM`) on historical results, attempts, or students are strictly prohibited.
