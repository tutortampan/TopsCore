# DATABASE SCHEMA & SPECIFICATION — TOPSCORE LMS

> **Status:** Rationalized Core Architecture (Phase 386)  
> **Target Schema:** 13 Canonical Core Tables (Zero Legacy Baggage)

---

## 1. Canonical Core Schema Overview (13 Tables)

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

PLATFORM & AUDIT:
- site_settings               (Global system configuration & background settings)
- audit_logs                  (Security, authentication, and material admin actions)
- theme_program_assignments   (Mapping of curriculum themes to academic programs)
```

---

## 2. Table Specifications

### 2.1 Attempts Table (`public.attempts`)

Stores assessment submission attempts, authoritative evaluation scores, calculated grades, and remedial states.

```sql
CREATE TABLE IF NOT EXISTS public.attempts (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    test_id uuid NOT NULL REFERENCES public.tests(id) ON DELETE CASCADE,
    attempt_number integer DEFAULT 1 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    submitted_at timestamp with time zone,
    status text DEFAULT 'in_progress'::text NOT NULL,
    score numeric(5,2),
    correct_count integer DEFAULT 0,
    total_questions integer DEFAULT 0,
    percentage numeric(5,2),
    grade text,
    effective_score numeric(5,2),
    is_best_score boolean DEFAULT false,
    is_remedial_unlocked boolean DEFAULT false,
    is_remedial boolean DEFAULT false,
    is_forgiven boolean DEFAULT false,
    forgiven_reason text,
    forgiven_by text,
    forgiven_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);
```

### 2.2 Attempt Answers Table (`public.attempt_answers`)

Stores immutable question-level responses, answer snapshots, evaluation codes, and awarded points.

```sql
CREATE TABLE IF NOT EXISTS public.attempt_answers (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    attempt_id uuid NOT NULL REFERENCES public.attempts(id) ON DELETE CASCADE,
    question_number integer NOT NULL,
    question_text text NOT NULL,
    student_answer text,
    correct_answer text,
    is_correct boolean DEFAULT false,
    score numeric(3,2) DEFAULT 0,
    evaluation_result text, -- 'correct', 'minor_spelling_error', 'minor_word_form_error', 'incorrect'
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
```

### 2.3 Tests Table (`public.tests`)

Stores test definition, shell codes, dynamic shell configurations, thresholds, and timers.

```sql
CREATE TABLE IF NOT EXISTS public.tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
    class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE,
    level_id uuid REFERENCES public.levels(id) ON DELETE SET NULL,
    institution_id uuid REFERENCES public.institutions(id) ON DELETE SET NULL,
    program_id uuid REFERENCES public.programs(id) ON DELETE SET NULL,
    test_type text NOT NULL, -- 'quiz' (Task) | 'exam' (Exam)
    test_subtype text,       -- 'VOCAB_TASK', 'PHRASE_TASK', 'VOCAB_EXAM', 'PHRASE_EXAM'
    title text NOT NULL,
    display_name text,
    shell_code text,
    status text DEFAULT 'DRAFT'::text NOT NULL, -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
    availability_start timestamp with time zone,
    availability_end timestamp with time zone,
    working_duration_minutes integer DEFAULT 60,
    minimum_required_score numeric DEFAULT 60,
    prerequisite_test_id uuid REFERENCES public.tests(id) ON DELETE SET NULL,
    is_dynamic_shell boolean DEFAULT true NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    display_order integer DEFAULT 999,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);
```

### 2.4 Vocabulary Vault (`public.vocabulary_vault`)

Master dynamic dictionary storing 2,141 words, phrases, idioms, phonetic metadata, and theme assignments.

---

## 3. Official Grading Scale & Palette (Single Source of Truth)

| Symbol | Predicate (Label) | Score Range | Main Color & Gradient | Hex Code |
|:---:|:---:|:---:|:---:|:---:|
| ★ | Excellent | 100% | Pure Green | `#00c000ff` (`#00c000`) |
| A | Very Good | 90% – 99% | Pure Green | `#00c000ff` (`#00c000`) |
| B | Good | 80% – 89% | Electric Lime | `#95ff00ff` (`#95ff00`) |
| C | Enough | 60% – 79% | Pure Yellow | `#FFFF00` |
| D | Less | 30% – 59% | Dark Orange | `#FF8C00` |
| E | Fail | 0% – 29% | Pure Red | `#FF0000` |

### Key Invariants
- **Non-standard grades `"S"`, `"F"`, and `"R"` are strictly eliminated.**
- **Remedial Effective Score Cap:** Maximum effective score is capped at **60%** (Grade `C`).
- **Remedial 'R' Placement:** A small letter "R" (`<sup class="asm-rem-sup">R</sup>` atau `ᴿ`) appears **ONLY** beside the **Score** percentage (e.g. `60%ᴿ`).
- **Unified Color Tokens:** Imported from `TOPSCORE_COLORS` in `js/grading.js` and referenced via CSS variables in `css/style.css`.
