# TopsCore LMS — Database Schema & RLS Specification

> **Platform:** Supabase PostgreSQL
> **Source of Truth for Migrations:** `supabase/migrations/`

---

## 1. Core Tables & Entities

The database preserves relational integrity, soft deletes, and historical attempt data:

```text
institutions
programs
batches
classes
users (students, teachers, admins)
modules
tests
test_items
test_topics
test_results
exam_history
progress
site_settings
audit_logs
```

---

## 2. Relationships & Cardinalities

```text
institutions 1 ─── N programs
institutions 1 ─── N classes (subjects)
classes 1 ─── N levels
programs N ─── N classes         via program_classes

institutions 1 ─── N tests (exams/tasks)
classes 1 ─── N tests
levels 1 ─── N tests
tests 1 ─── N questions (test_items)

students N ─── 1 programs
students N ─── 1 institutions   (direct column allowed for query convenience)
students N ─── 1 batches

students 1 ─── N attempts (student_submissions)
tests 1 ─── N attempts
attempts 1 ─── N attempt_answers
students 1 ─── N progress
```

---

## 3. Recommended Critical Fields

### institutions
- `id`, `name`, `is_active`, `created_at`, `updated_at`, `deleted_at`

### programs
- `id`, `institution_id`, `name`, `is_active`, `created_at`, `updated_at`, `deleted_at`

### classes (formerly subjects)
- `id`, `program_id`, `level_id`, `name`, `is_active`, `created_at`, `updated_at`, `deleted_at`

### levels
- `id`, `class_id`, `name`, `level_number`, `is_active`, `created_at`, `updated_at`, `deleted_at`

### users (students, teachers, admins)
- `id` (internal PK maps to auth.users)
- `institution_id`, `role` (`student`, `teacher`, `admin`), `full_name`, `pin_hash`, `created_at`, `updated_at`
- *No business student_id column is permitted.*

### tests
- `id`, `class_id`, `level_id`, `test_type` (`task` or `exam`), `title`, `name`, `status` (`draft`, `published`, `archived`), `is_active`, `working_duration_minutes`, `payload`, `created_at`, `updated_at`

### student_submissions (attempts)
- `id`, `student_id`, `test_id`, `status`, `started_at`, `submitted_at`, `overall_score`, `ai_transcript`, `ai_feedback`, `teacher_override_score`, `teacher_override_notes`

### exam_history (Audit Log)
- `id`, `submission_id`, `student_id`, `test_id`, `action_type`, `old_payload`, `new_payload`, `acted_by`, `created_at`

### progress
- Student, class, current/unlocked level, completion state, effective highest scores.

---

## 4. Row Level Security (RLS) & Authorization

Supabase Row Level Security is mandatory for browser-accessible tables containing user data:

### 4.1 Student Access
Students may read only data they are authorized to see:
- Own profile & credentials verification
- Own attempts & attempt answers
- Tests available to their unlocked levels/classes
- Progress records belonging to self

### 4.2 Admin Access
Admin operations require a server-verified admin role (`is_admin()` or JWT claim). Never trust client-side role definitions like `localStorage.role = 'admin'`.

### 4.3 Service-Role Key Protection
The Supabase `service_role` key MUST NEVER be embedded in browser JavaScript or client bundles. It exists exclusively in secure Edge Function environment secrets.

