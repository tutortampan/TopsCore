# DATABASE SCHEMA & GRADING SPECIFICATION — TOPSCORE LMS

## 1. Attempts Table (`public.attempts`)

The `attempts` table stores all assessment submission attempts, authoritative evaluation scores, calculated grades, and remedial states.

```sql
CREATE TABLE IF NOT EXISTS "public"."attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL PRIMARY KEY,
    "student_id" "uuid" NOT NULL REFERENCES public.students(id),
    "assessment_id" "uuid" NOT NULL REFERENCES public.assessments(id),
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "started_at" timestamp with time zone DEFAULT now() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "submitted_at" timestamp with time zone,
    "status" text DEFAULT 'in_progress'::text NOT NULL,
    "score" numeric(5,2),
    "correct_count" integer DEFAULT 0,
    "total_questions" integer DEFAULT 0,
    "percentage" numeric(5,2),
    "grade" text,
    "effective_score" numeric(5,2),
    "is_best_score" boolean DEFAULT false,
    "is_remedial_unlocked" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

### Key Field Semantics
- `percentage`: Raw percentage score earned by student: `round((score / total_questions) * 100, 2)`.
- `effective_score`: Authoritative score after applying remedial rules. If `is_remedial_unlocked = true`, effective score is capped at `min(percentage, 60.00)`.
- `grade`: Canonical 6-tier letter grade derived from `effective_score`:
  - `★`: effective_score >= 100.00
  - `A`: effective_score >= 90.00
  - `B`: effective_score >= 80.00
  - `C`: effective_score >= 60.00
  - `D`: effective_score >= 30.00
  - `E`: effective_score < 30.00
- `is_best_score`: Boolean flag denoting whether this attempt represents the student's highest effective score for the assessment. Resolved via `ORDER BY effective_score DESC, percentage DESC, created_at DESC`.
- `is_remedial_unlocked`: Indicates an authorized remedial retake session or individual student remedial authorization.

## 2. Canonical Grading Palette (Single Source of Truth)

| Symbol | Predicate (Label) | Score Range | Color Name | Hex Code | Purpose |
|:---:|:---:|:---:|:---:|:---:|:---|
| **★** | Excellent | 100% | Purple | `#A855F7` | Perfect Score Tier |
| **A** | Very Good | 90% – 99% | Deep Green | `#059669` | High Distinction |
| **B** | Good | 80% – 89% | Bright Lime | `#84CC16` | Above Average |
| **C** | Enough | 60% – 79% | Yellow | `#EAB308` | Minimum Passing Grade (KKM) |
| **D** | Less | 30% – 59% | Orange | `#F97316` | Below Passing |
| **E** | Fail | 0% – 29% | Red | `#EF4444` | Failure Tier |

Non-standard grades `"S"`, `"F"`, and `"R"` are strictly eliminated.
Remedial attempts receive Grade `C` upon passing at or above the 60% cap.
Tanda 'R' (`<sup class="asm-rem-sup">R</sup>` atau `ᴿ`) hanya boleh muncul di samping persentase nilai (Score %).
