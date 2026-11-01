# TOPSCORE LMS — DEEP SYSTEM AUDIT REPORT (DETAILED)

**Execution Date:** 2026-10-12 | **Execution Mode:** STRICT READ-ONLY DISCOVERY  
**Target Repository:** `TopsCore` (`D:\TopsCore`)  
**Scope:** Complete Architectural, Database, RLS, RPC, Frontend Module, Vocabulary Engine, Edge Function, and Test Inventory Audit.

---

# MODULE 1: WORKSPACE TREE & CACHE SYNC

## 1.1 Directory Tree Map

The repository is structured as a static frontend application backed by Supabase PostgreSQL, Storage, and Edge Functions. The active file hierarchy (excluding `node_modules`, `.git`, `.supabase-cli`, `playwright-report`, `test-results`, `audit_screenshots`, and temporary build artifacts) is mapped below:

```text
D:\TopsCore\
├── admin.html                                    # Admin Console (ABCD System)
├── assessment.html                               # Student Assessment Interface & Runner
├── dashboard.html                                # Student Dashboard & Level Progression
├── index.html                                    # Public Entry Point & Student PIN Login
├── result.html                                   # Assessment Results & Report Card View
├── sw.js                                         # PWA Service Worker & Asset Caching
├── manifest.json                                 # Web App Manifest
├── netlify.toml                                  # Netlify Deployment Configuration
├── vercel.json                                   # Vercel Deployment Configuration
├── playwright.config.js                          # Playwright E2E Test Configuration
├── package.json                                  # NPM Root Package Configuration
├── package-lock.json                             # NPM Lockfile
├── AGENTS.md                                     # Execution Contract & Non-Negotiable Rules
├── README.md                                     # Project Readme
│
├── css/
│   ├── admin.css                                 # Admin Console UI Styles
│   ├── dashboard.css                             # Student Dashboard & Assessment Layout Styles
│   ├── style.css                                 # Core Design System, Auth, & Variables
│   └── components/
│       └── avatars.css                           # Avatar Engine CSS Components
│
├── js/
│   ├── ai-evaluation-engine.js                   # Client AI Audio Evaluation Module
│   ├── api.js                                    # Centralized Supabase API Client & Helpers
│   ├── app.js                                    # App Utilities, Modals, Toasts, Formatters
│   ├── excel-parser.js                           # Excel Import / Export Handler (SheetJS)
│   ├── grading.js                                # Centralized Grading, Levenshtein, & Tolerance
│   ├── session.js                                # Session Storage Manager (Student & Admin)
│   ├── speech.js                                 # Web Speech API Audio & STT Manager
│   ├── supabase.js                               # Supabase Client Factory & Config
│   ├── timer.js                                  # Authoritative Timer & Countdown Controller
│   │
│   ├── admin/
│   │   ├── admin-deck.js                         # Admin Deck (A-Panel) Dashboard & KPIs
│   │   ├── app.js                                # Admin Main Entry & Routing Orchestrator
│   │   ├── assessment-builder.js                 # Assessment Blueprint & Creation Modal
│   │   ├── assessment-management.js              # Assessment CRUD, Publishing & Inspection
│   │   ├── auto-gen-modal.js                     # Dynamic Shell Generation Modal
│   │   ├── class.js                              # Class & Subject Management Components
│   │   ├── classes-hub.js                        # Curriculum Hub Overview Panel
│   │   ├── classes-management.js                 # Class Entity Management
│   │   ├── crud-modals.js                        # Generic Curriculum CRUD Modal Handlers
│   │   ├── curriculum-management.js              # Institution / Program / Class Hierarchy
│   │   ├── cv-export.js                          # Student CV / Resume PDF & HTML Generator
│   │   ├── datagrid.js                           # Modular DataGrid Engine (Sorting, Search, Filter)
│   │   ├── desk.js                               # Desk (D-Panel) Settings, Backups, Scratchpad
│   │   ├── dossier_export.js                     # Student Dossier Data Exporter
│   │   ├── imports-exports.js                    # Excel Bulk Importers & Exporters
│   │   ├── modules.js                            # AI Evaluation Engine Registry & Config
│   │   ├── panel-c-builder.js                    # Curriculum Class Builder (C-Panel)
│   │   ├── program-management.js                 # Program & Batch Management
│   │   ├── student-management.js                 # Student Roster, PIN, & Photo Manager
│   │   └── vocab-vault.js                        # Vocabulary Vault Database Manager
│   │
│   └── utils/
│       ├── avatar-engine.js                      # SVG Avatar Generator & DiceBear Engine
│       └── dashboard_guards.js                   # Student Dashboard Safeguards & Session Checks
│
├── supabase/
│   ├── config.toml                               # Supabase CLI Local Configuration
│   ├── data.sql                                  # Baseline Production Seed Dump (7.3MB)
│   ├── schema.sql                                # Baseline PostgreSQL Schema Dump (100KB)
│   ├── setup-storage.sql                         # Supabase Storage Buckets Setup
│   │
│   ├── functions/                                # Deno Edge Functions (Server Authority)
│   │   ├── deno.json                             # Deno Import Map & Permissions Config
│   │   ├── duplicate-assessment/index.ts         # Duplicate Existing Assessment Edge Function
│   │   ├── evaluate-assessment/index.ts          # Stateless AI Speech & Monologue Evaluator
│   │   ├── generate-module-template/index.ts     # Template Generator for AI Modules
│   │   ├── import-questions/index.ts             # Bulk Question Import Edge Function
│   │   ├── import-students/index.ts              # Bulk Student Import & PIN Hash Edge Function
│   │   ├── start-assessment/index.ts             # Server-Authoritative Assessment & Shell Initiator
│   │   ├── student-login/index.ts                # Student Authentication & PIN Verifier
│   │   └── submit-assessment/index.ts            # Authoritative Scoring & Level Progression Engine
│   │
│   ├── migrations/                               # Active Incremental Migrations
│   │   ├── 20261011_backfill_classes_codes.sql   # Backfill Standardized Machine Codes
│   │   ├── 20261011_curriculum_admin_rls.sql     # Admin RLS Policies for Anon Curriculum CRUD
│   │   ├── 20261011_curriculum_institution_tree.sql # Institution & Program Detail Columns
│   │   ├── 20261011_fix_class_meetings_relations.sql # Foreign Key Cascade on Class Meetings
│   │   └── normalize_attempt_status.sql          # Attempt Status Lowercase Normalization
│   │
│   └── migrations_bak/                           # Archived Historical Migrations (45 migrations)
│
├── tests/
│   └── system-e2e.spec.js                        # Playwright System E2E Test Suite
│
├── temp_test/
│   ├── check_schema.mjs                          # Quick Database Schema Inspector
│   ├── db_status_audit.mjs                       # Database Status & Counts Verifier
│   ├── run_test.js                               # Local Test Runner Script
│   └── test_dynamic_shell_e2e.mjs                # Phase 11.3 E2E Dynamic Shell Test Suite
│
├── scripts/
│   └── archive/                                  # Historical Migration & Test Scripts (~140 files)
│
└── docs/
    ├── ARCHITECTURE.md                           # System Architecture & Topology
    ├── ASSESSMENT_EXECUTION_AUDIT.md             # Assessment Execution Safety Audit
    ├── BLOCKERS.md                               # Active Blocker Tracking
    ├── CHANGELOG.md                              # Historical Log of Code Changes
    ├── CURRENT_STATE.md                          # Single Restart Point & State Contract
    ├── DECISIONS.md                              # Architectural Decision Records (ADRs)
    ├── DEPLOYMENT.md                             # Netlify / Vercel / Supabase Deployment Guide
    ├── PRODUCT_SPEC.md                           # Product Requirements & Hierarchy Spec
    ├── SECURITY.md                               # Security, PIN Hashing, & RLS Specs
    ├── SESSION_LOG.md                            # Session Continuation Logs
    └── TODO.md                                   # Task Backlog
```

---

## 1.2 Cache-Busting Query Strings (`?v=...`) Audit

A deep audit across all HTML entry points, CSS stylesheets, ES module imports, dynamic imports, and the service worker revealed significant version divergence. The current state has 4 competing version tags in active circulation:
1. `?v=4.9.8` (Admin suite, CSS links on dashboard/admin/index, Service Worker cache)
2. `?v=4.7.12` (Student API, grading, assessment runner, session, timer, speech, supabase client)
3. `?v=4.7.6` (`index.html` student login script imports)
4. Unversioned / Empty Query Strings (`assessment.html` and `result.html` CSS stylesheets)

### Cache-Busting Matrix Across Entry Points

| File / Component | Target Resource | Specified Query String | Current Status / Mismatch Risk |
|---|---|---|---|
| **`index.html`** | `css/style.css` | `?v=4.9.8` | ✅ Matches latest CSS build |
| **`index.html`** | `./js/api.js` | `?v=4.7.6` | ⚠️ **MISMATCH:** `index.html` loads API v4.7.6, while `dashboard.html` loads v4.7.12 and admin loads v4.9.8 |
| **`index.html`** | `./js/session.js` | `?v=4.7.6` | ⚠️ **MISMATCH:** Loads v4.7.6 instead of aligned version |
| **`index.html`** | `./js/app.js` | `?v=4.7.6` | ⚠️ **MISMATCH:** Loads v4.7.6 instead of aligned version |
| **`admin.html`** | `css/style.css` | `?v=4.9.8` | ✅ Aligned with admin suite |
| **`admin.html`** | `css/admin.css` | `?v=4.9.8` | ✅ Aligned with admin suite |
| **`admin.html`** | `css/components/avatars.css` | `?v=4.9.8` | ✅ Aligned with admin suite |
| **`admin.html`** | `xlsx.full.min.js` | `?v=4.7.12` | ℹ️ CDN library tagged with legacy tag |
| **`admin.html`** | `./js/admin/datagrid.js` | `?v=4.9.8` | ✅ Aligned |
| **`admin.html`** | `js/admin/app.js` | `?v=4.9.8` | ✅ Aligned |
| **`js/admin/*.js` (All 17 modules)** | Internal admin imports | `?v=4.9.8` | ✅ Fully normalized to `v=4.9.8` |
| **`dashboard.html`** | `css/style.css` | `?v=4.9.8` | ✅ Aligned |
| **`dashboard.html`** | `css/dashboard.css` | `?v=4.9.8` | ✅ Aligned |
| **`dashboard.html`** | `css/components/avatars.css` | `?v=4.9.8` | ✅ Aligned |
| **`dashboard.html`** | `./js/api.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Stale student API version |
| **`dashboard.html`** | `./js/session.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Stale student session version |
| **`dashboard.html`** | `./js/app.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Stale student app utility version |
| **`dashboard.html`** | `./js/speech.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Stale student speech version |
| **`dashboard.html`** | Dynamic `import('./js/supabase.js')` | `?v=4.7.12` | ⚠️ **MISMATCH:** Dynamic import tagged with `v=4.7.12` |
| **`dashboard.html`** | Dynamic `import('./js/session.js')` | `?v=4.7.12` | ⚠️ **MISMATCH:** Dynamic import tagged with `v=4.7.12` |
| **`assessment.html`** | `css/style.css` | **NONE** (`href="css/style.css"`) | ❌ **UNVERSIONED:** Will be cached indefinitely by browser; changes will not bust cache! |
| **`assessment.html`** | `css/dashboard.css` | **NONE** (`href="css/dashboard.css"`) | ❌ **UNVERSIONED:** Will be cached indefinitely by browser; layout fixes won't show! |
| **`assessment.html`** | `./js/api.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Uses `v=4.7.12` |
| **`assessment.html`** | `./js/grading.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Uses `v=4.7.12` |
| **`assessment.html`** | `./js/session.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Uses `v=4.7.12` |
| **`assessment.html`** | `./js/app.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Uses `v=4.7.12` |
| **`assessment.html`** | `./js/timer.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Uses `v=4.7.12` |
| **`assessment.html`** | `./js/speech.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Uses `v=4.7.12` |
| **`assessment.html`** | `./js/supabase.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Uses `v=4.7.12` |
| **`result.html`** | `css/style.css` | **NONE** (`href="css/style.css"`) | ❌ **UNVERSIONED:** Will be cached indefinitely by browser |
| **`result.html`** | `css/dashboard.css` | **NONE** (`href="css/dashboard.css"`) | ❌ **UNVERSIONED:** Will be cached indefinitely by browser |
| **`result.html`** | `./js/api.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Uses `v=4.7.12` |
| **`result.html`** | `./js/session.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Uses `v=4.7.12` |
| **`result.html`** | `./js/app.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Uses `v=4.7.12` |
| **`result.html`** | `./js/supabase.js` | `?v=4.7.12` | ⚠️ **MISMATCH:** Uses `v=4.7.12` |
| **`sw.js`** | `ASSETS_TO_CACHE` | `style.css?v=4.9.8`, `admin.css?v=4.9.8`, `dashboard.css?v=4.9.8` | ⚠️ **SW CACHE BUG:** Pre-caches versioned CSS, but `assessment.html` and `result.html` request unversioned CSS, causing cache-miss. |
| **`sw.js` (Line 37)** | `url.pathname.endsWith('.js?v=4.7.12')` | `?v=4.7.12` | ❌ **LOGICAL DEFECT:** In the standard Web API, `url.pathname` NEVER contains query parameters (`?v=...`), so this condition ALWAYS evaluates to `false`. |

---

# MODULE 2: DATABASE, RLS & RPC INVENTORY

## 2.1 Complete Table Inventory (48 Tables)

Extracted from `supabase/schema.sql` and PostgreSQL catalogs:

```text
1.  achievement_targets
2.  additional_members
3.  assessment_attempt_answers
4.  assessment_attempts
5.  assessment_instances
6.  assessment_questions
7.  assessment_results
8.  assessment_topics
9.  assessments                       [CORE]
10. assignments
11. attempt_answers                   [CORE]
12. attempts                          [CORE]
13. audit_logs                        [CORE]
14. batches                           [CORE]
15. cec_app_state
16. class_instances
17. class_levels
18. class_meeting_exceptions
19. class_meetings
20. classes                           [CORE]
21. enrollments
22. exam_history
23. institutions                      [CORE]
24. levels                            [CORE]
25. modules                           [CORE]
26. professional_skills
27. programs                          [CORE]
28. progress                          [CORE]
29. question_types
30. question_usage_history
31. questions                         [CORE]
32. requirement_targets
33. requirements
34. scholarships
35. site_settings
36. student_accounts
37. student_import_logs
38. student_progress
39. student_requirement_progress
40. student_submissions
41. student_target_progress
42. students                          [CORE]
43. subjects                          (Legacy alias for classes)
44. topics                            [CORE]
45. user_professionals
46. vocabulary_vault                  [CORE]
47. word_types
48. work_records
```

---

## 2.2 Core Table Schemas, Constraints, Foreign Keys & Indexes

### 1. `attempts`
```sql
CREATE TABLE IF NOT EXISTS "public"."attempts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "student_id" "uuid" NOT NULL,
    "assessment_id" "uuid" NOT NULL,
    "attempt_number" integer DEFAULT 1 NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "submitted_at" timestamp with time zone,
    "status" "text" DEFAULT 'in_progress'::"text" NOT NULL,
    "score" numeric(5,2),
    "correct_count" integer DEFAULT 0,
    "total_questions" integer DEFAULT 0,
    "percentage" numeric(5,2),
    "grade" "text",
    "effective_score" numeric(5,2),
    "is_best_score" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "is_remedial_unlocked" boolean DEFAULT false,
    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attempts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE CASCADE,
    CONSTRAINT "attempts_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE CASCADE,
    CONSTRAINT "attempts_status_check" CHECK (("lower"("status") = ANY (ARRAY[
        'not_started'::"text", 'in_progress'::"text", 'submitted'::"text", 
        'auto_submitted'::"text", 'expired'::"text", 'cancelled'::"text", 
        'pending_evaluation'::"text", 'evaluated'::"text"
    ])))
);

CREATE INDEX "idx_attempts_assessment_id" ON "public"."attempts" USING "btree" ("assessment_id");
CREATE INDEX "idx_attempts_student_id" ON "public"."attempts" USING "btree" ("student_id");
```

### 2. `attempt_answers`
```sql
CREATE TABLE IF NOT EXISTS "public"."attempt_answers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "attempt_id" "uuid" NOT NULL,
    "question_id" "uuid",
    "question_snapshot" "jsonb" NOT NULL,
    "topic_snapshot" "text",
    "question_type_snapshot" "text",
    "accepted_answers_snapshot" "jsonb",
    "correct_answer_snapshot" "text",
    "student_answer" "text",
    "is_correct" boolean,
    "similarity_score" numeric(4,3),
    "evaluation_result" "text",
    "score" numeric(5,2),
    "answered_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "word_type_snapshot" "text",
    CONSTRAINT "attempt_answers_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "attempt_answers_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "public"."attempts"("id") ON DELETE CASCADE,
    CONSTRAINT "attempt_answers_evaluation_result_check" CHECK (("evaluation_result" = ANY (ARRAY[
        'correct'::"text", 'minor_spelling_error'::"text", 'incorrect'::"text", NULL::"text"
    ])))
);

CREATE INDEX "idx_attempt_answers_attempt_id" ON "public"."attempt_answers" USING "btree" ("attempt_id");
```

### 3. `assessments`
```sql
CREATE TABLE IF NOT EXISTS "public"."assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "class_id" "uuid",
    "level_id" "uuid",
    "assessment_type" "text" DEFAULT 'EVALUATION'::"text",
    "title" "text",
    "description" "text",
    "status" "text" DEFAULT 'DRAFT'::"text",
    "availability_start" timestamp with time zone,
    "availability_end" timestamp with time zone,
    "working_duration_minutes" integer DEFAULT 60,
    "prerequisite_assessment_id" "uuid",
    "created_by" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "deleted_at" timestamp with time zone,
    "institution_id" "uuid",
    "program_id" "uuid",
    "prerequisite_id" "uuid",
    "assessment_category" character varying(10),
    "module_type" "text",
    "schedule_mode" "text" DEFAULT 'flexible'::"text",
    "window_start" timestamp with time zone,
    "window_end" timestamp with time zone,
    "question_order" "text" DEFAULT 'random'::"text",
    "payload" "jsonb",
    "shell_code" "text",
    "module_id" "uuid",
    "answer_type" "text" DEFAULT 'MULTIPLE_CHOICE'::"text",
    "is_dynamic_shell" boolean DEFAULT false NOT NULL,
    "display_order" integer DEFAULT 999,
    "topic_id" "uuid",
    "category" "text" DEFAULT 'ASSESSMENT'::"text",
    "display_name" "text",
    "minimum_required_score" numeric DEFAULT 0,
    "max_attempts" integer DEFAULT 0,
    "retake_allowed" boolean DEFAULT true,
    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "assessments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE CASCADE,
    CONSTRAINT "assessments_level_id_fkey" FOREIGN KEY ("level_id") REFERENCES "public"."levels"("id") ON DELETE SET NULL,
    CONSTRAINT "assessments_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."modules"("id"),
    CONSTRAINT "assessments_prerequisite_id_fkey" FOREIGN KEY ("prerequisite_id") REFERENCES "public"."assessments"("id") ON DELETE SET NULL,
    CONSTRAINT "assessments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE SET NULL,
    CONSTRAINT "assessments_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "public"."topics"("id") ON DELETE SET NULL,
    CONSTRAINT "assessments_assessment_category_check" CHECK ((("assessment_category")::"text" = ANY ((ARRAY['TASK'::character varying, 'TEST'::character varying])::"text"[])))
);

CREATE INDEX "idx_assessments_class_id" ON "public"."assessments" USING "btree" ("class_id");
CREATE INDEX "idx_assessments_display_order" ON "public"."assessments" USING "btree" ("display_order");
CREATE INDEX "idx_assessments_status" ON "public"."assessments" USING "btree" ("status");
CREATE INDEX "idx_assessments_shell_code" ON "public"."assessments" USING "btree" ("shell_code");
```

### 4. `vocabulary_vault`
```sql
CREATE TABLE IF NOT EXISTS "public"."vocabulary_vault" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "topic" "text" NOT NULL,
    "indonesian" "text" NOT NULL,
    "english" "text" NOT NULL,
    "word_type" "text" DEFAULT 'Verb'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "target_level" integer DEFAULT 1,
    "theme" "text",
    "theme_code" character varying(10),
    "topic_code" character varying(10),
    CONSTRAINT "vocabulary_vault_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "idx_vocabulary_vault_target_level" ON "public"."vocabulary_vault" USING "btree" ("target_level");
CREATE INDEX "idx_vocabulary_vault_theme_code" ON "public"."vocabulary_vault" USING "btree" ("theme_code");
CREATE INDEX "idx_vocabulary_vault_topic_code" ON "public"."vocabulary_vault" USING "btree" ("topic_code");
CREATE INDEX "idx_vault_english_deleted" ON "public"."vocabulary_vault" USING "btree" ("english", "deleted_at");
CREATE INDEX "idx_vault_indonesian_deleted" ON "public"."vocabulary_vault" USING "btree" ("indonesian", "deleted_at");
```

---

## 2.3 Row Level Security (RLS) Policy Inventory

The database relies on PostgreSQL Row Level Security (RLS) across tables:

| Table Name | Policy Name | Command / Target Role | USING / WITH CHECK Clause | Architectural Risk Analysis |
|---|---|---|---|---|
| `attempts` | `anon_select_attempts` | `SELECT` to `anon` | `USING (true)` | ✅ Anon can view attempt data |
| `attempts` | `auth_all_attempts` | `ALL` to `authenticated` | `USING (true) WITH CHECK (true)` | Only for authenticated Supabase Auth users |
| `attempts` | `service_role_all_attempts` | `ALL` to `service_role` | `USING (true) WITH CHECK (true)` | Full access for Edge Functions |
| `attempts` | *(Direct UPDATE by Anon)* | **NONE** | **NO POLICY** | ❌ **CRITICAL DEFECT:** If `submitAssessment` fails and client attempts direct `PATCH` fallback on `/rest/v1/attempts` with anon key, PostgREST rejects the write! |
| `attempt_answers` | `anon_select_attempt_answers` | `SELECT` to `anon` | `USING (true)` | ✅ Anon can view answers |
| `attempt_answers` | `auth_all_attempt_answers` | `ALL` to `authenticated` | `USING (true) WITH CHECK (true)` | Authenticated users only |
| `attempt_answers` | `service_role_all_attempt_answers` | `ALL` to `service_role` | `USING (true) WITH CHECK (true)` | Edge functions only |
| `attempt_answers` | *(Direct UPDATE by Anon)* | **NONE** | **NO POLICY** | ❌ **CRITICAL DEFECT:** Client-side fallback saving of student answers via direct DB update will be rejected by RLS for unauthenticated anon sessions! |
| `assessments` | `anon_select_assessments` | `SELECT` to `anon` | `USING (true)` | ✅ Students can view published assessments |
| `assessments` | `Allow full access on assessments` | `ALL` to `public` | `USING (true)` | Allows CRUD |
| `vocabulary_vault` | `Vault public read` | `SELECT` to `public` | `USING (true)` | Anyone can read vocabulary |
| `vocabulary_vault` | `Vault auth manage` | `ALL` to `public` | `USING (true)` | Public manage allowed |
| `classes` | `admin_all_classes` | `ALL` to `anon` | `USING (true) WITH CHECK (true)` | Allows Top Office admin CRUD |
| `class_levels` | `admin_all_class_levels` | `ALL` to `anon` | `USING (true) WITH CHECK (true)` | Allows Top Office admin CRUD |
| `programs` | `admin_all_programs` | `ALL` to `anon` | `USING (true) WITH CHECK (true)` | Allows Top Office admin CRUD |
| `batches` | `admin_all_batches` | `ALL` to `anon` | `USING (true) WITH CHECK (true)` | Allows Top Office admin CRUD |
| `institutions` | `admin_all_institutions` | `ALL` to `anon` | `USING (true) WITH CHECK (true)` | Allows Top Office admin CRUD |
| `levels` | `admin_all_levels` | `ALL` to `anon` | `USING (true) WITH CHECK (true)` | Allows Top Office admin CRUD |

---

## 2.4 Stored Procedures / RPC Functions (Exact Definitions)

The PostgreSQL database houses 8 defined stored functions:

### 1. `get_server_time_wita()`
- **Signature:** `public.get_server_time_wita() -> timestamp with time zone`
- **Security:** `STABLE SECURITY DEFINER`
```sql
CREATE OR REPLACE FUNCTION "public"."get_server_time_wita"() 
RETURNS timestamp with time zone
LANGUAGE "sql" STABLE SECURITY DEFINER
AS $$
  SELECT NOW() AT TIME ZONE 'Asia/Makassar';
$$;
```

### 2. `auto_close_expired_attempts()`
- **Signature:** `public.auto_close_expired_attempts() -> void`
- **Security:** `VOLATILE`
```sql
CREATE OR REPLACE FUNCTION "public"."auto_close_expired_attempts"() 
RETURNS "void"
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
```
*(Note: Target table references legacy `challenge_attempts` instead of modern `attempts`)*.

### 3. `reorder_assessment(uuid, integer, uuid)`
- **Signature:** `public.reorder_assessment(p_assessment_id uuid, p_new_order integer, p_class_id uuid) -> void`
- **Security:** `VOLATILE SECURITY DEFINER`
```sql
CREATE OR REPLACE FUNCTION "public"."reorder_assessment"(
    "p_assessment_id" "uuid", 
    "p_new_order" integer, 
    "p_class_id" "uuid"
) RETURNS "void"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE
    v_old_order INTEGER;
BEGIN
    SELECT display_order INTO v_old_order
    FROM public.assessments
    WHERE id = p_assessment_id AND class_id = p_class_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Assessment not found in class %', p_class_id;
    END IF;

    IF v_old_order = p_new_order THEN
        RETURN;
    END IF;

    IF v_old_order < p_new_order THEN
        UPDATE public.assessments
        SET display_order = display_order - 1
        WHERE class_id = p_class_id
          AND display_order > v_old_order
          AND display_order <= p_new_order
          AND id != p_assessment_id;
    ELSE
        UPDATE public.assessments
        SET display_order = display_order + 1
        WHERE class_id = p_class_id
          AND display_order >= p_new_order
          AND display_order < v_old_order
          AND id != p_assessment_id;
    END IF;

    UPDATE public.assessments
    SET display_order = p_new_order
    WHERE id = p_assessment_id;
END;
$$;
```

### 4. `merge_student_import(text, jsonb)`
- **Signature:** `public.merge_student_import(import_filename text, records jsonb) -> jsonb`
- **Security:** `VOLATILE SECURITY DEFINER (Search Path: public)`
```sql
CREATE OR REPLACE FUNCTION "public"."merge_student_import"(
    "import_filename" "text", 
    "records" "jsonb"
) RETURNS "jsonb"
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
declare
  record_item jsonb;
  existing_student public.students%rowtype;
  imported_id text;
  imported_name text;
  imported_dob date;
  inserted_count integer := 0;
  updated_count integer := 0;
  rejected_count integer := 0;
  duplicate_warning_count integer := 0;
  errors jsonb := '[]'::jsonb;
begin
  if coalesce(auth.jwt()->'app_metadata'->>'role', '') <> 'tutor' then
    raise exception 'Tutor authorization is required';
  end if;
  if jsonb_typeof(records) <> 'array' then
    raise exception 'Import records must be an array';
  end if;

  for record_item in select value from jsonb_array_elements(records)
  loop
    imported_id := nullif(trim(record_item->>'student_id'), '');
    imported_name := nullif(trim(record_item->>'full_name'), '');
    imported_dob := nullif(record_item->>'date_of_birth', '')::date;

    if imported_id is null or imported_name is null then
      rejected_count := rejected_count + 1;
      errors := errors || jsonb_build_array(jsonb_build_object(
        'student_id', imported_id, 'full_name', imported_name,
        'error', 'Student ID and full name are required'
      ));
      continue;
    end if;

    select * into existing_student from public.students
      where student_id = imported_id
      or (lower(full_name) = lower(imported_name)
          and date_of_birth is not distinct from imported_dob)
      limit 1
      for update;

    if found then
      if existing_student.student_id <> imported_id then
        duplicate_warning_count := duplicate_warning_count + 1;
        errors := errors || jsonb_build_array(jsonb_build_object(
          'student_id', imported_id, 'full_name', imported_name,
          'error', 'Possible duplicate matched by name and date of birth'
        ));
        continue;
      end if;
      update public.students set
        full_name = imported_name,
        date_of_birth = imported_dob,
        gender = nullif(lower(record_item->>'gender'), ''),
        photo_url = nullif(record_item->>'photo_url', ''),
        program = nullif(trim(record_item->>'program'), ''),
        class_name = nullif(trim(record_item->>'class_name'), ''),
        current_level = nullif(trim(record_item->>'current_level'), ''),
        status = coalesce(nullif(record_item->>'status', ''), 'active')
        where id = existing_student.id;
      updated_count := updated_count + 1;
    else
      insert into public.students (
        student_id, full_name, date_of_birth, gender, photo_url,
        program, class_name, current_level, status
      ) values (
        imported_id, imported_name, imported_dob,
        nullif(lower(record_item->>'gender'), ''),
        nullif(record_item->>'photo_url', ''),
        nullif(trim(record_item->>'program'), ''),
        nullif(trim(record_item->>'class_name'), ''),
        nullif(trim(record_item->>'current_level'), ''),
        coalesce(nullif(record_item->>'status', ''), 'active')
      );
      inserted_count := inserted_count + 1;
    end if;
  end loop;

  insert into public.student_import_logs (
    performed_by, source_filename, processed_count, inserted_count,
    updated_count, rejected_count, duplicate_warning_count, status, errors
  ) values (
    auth.uid(), import_filename, jsonb_array_length(records), inserted_count,
    updated_count, rejected_count, duplicate_warning_count, 'committed', errors
  );

  return jsonb_build_object(
    'processed', jsonb_array_length(records),
    'inserted', inserted_count,
    'updated', updated_count,
    'rejected', rejected_count,
    'duplicate_warnings', duplicate_warning_count,
    'errors', errors
  );
exception when others then
  raise;
end;
$$;
```

### 5. `touch_student_updated_at()`
- **Signature:** `public.touch_student_updated_at() -> trigger`
```sql
CREATE OR REPLACE FUNCTION "public"."touch_student_updated_at"() 
RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

### 6. `trg_student_batch_change()`
- **Signature:** `public.trg_student_batch_change() -> trigger`
```sql
CREATE OR REPLACE FUNCTION "public"."trg_student_batch_change"() 
RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
BEGIN
    IF (OLD.batch_id IS DISTINCT FROM NEW.batch_id) THEN
        NEW.batch_joined_at = NOW();

        IF OLD.batch_id IS NOT NULL THEN
            INSERT INTO additional_members (class_instance_id, student_id)
            SELECT id, OLD.id
            FROM class_instances
            WHERE batch_id = OLD.batch_id
              AND status = 'active'
            ON CONFLICT (class_instance_id, student_id) DO NOTHING;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;
```

### 7. `update_updated_at()`
- **Signature:** `public.update_updated_at() -> trigger`
```sql
CREATE OR REPLACE FUNCTION "public"."update_updated_at"() 
RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
```

### 8. `validate_student_hierarchy()`
- **Signature:** `public.validate_student_hierarchy() -> trigger`
```sql
CREATE OR REPLACE FUNCTION "public"."validate_student_hierarchy"() 
RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
declare
  class_program_id uuid;
  level_class_id uuid;
begin
  if new.class_id is not null then
    select program_id, status into class_program_id
    from public.classes where id = new.class_id;
    if class_program_id is null or (new.program_id is not null and class_program_id <> new.program_id) then
      raise exception 'Student class does not belong to the selected program';
    end if;
  end if;
  if new.level_id is not null then
    select class_id into level_class_id from public.levels where id = new.level_id;
    if level_class_id is null or (new.class_id is not null and level_class_id <> new.class_id) then
      raise exception 'Student level does not belong to the selected class';
    end if;
  end if;
  return new;
end;
$$;
```

---

# MODULE 3: FRONTEND MODULES & STATE SAFETY

## 3.1 End-to-End Page Navigation Flows

```
[STUDENT FLOW]
  index.html (Cascading Auth)
     │ Select Institution -> Program -> Batch -> Student
     │ Input 4-digit PIN -> verifyStudentLogin() (Edge Function)
     ▼
  dashboard.html (Hub & Roster)
     │ Check First-Login Modal (Photo upload, Gender, Birthdate, Education)
     │ Display Unlocked Levels, Classes, Enrolled Batches, & Completed Scores
     │ Select Assessment -> window.location.href='assessment.html?...'
     ▼
  assessment.html (Runner & Anti-Cheat Engine)
     │ requireStudentSession() guard
     │ startASSESSMENT() -> calls Edge Function start-assessment
     │ Authoritative Timer Countdown & Real-Time Sync
     │ Render Questions: Speech (Mic), Written (Virtual Keyboard), Chips (Dropdown)
     │ Autosave Keystrokes -> localStorage Buffer
     │ Finish -> doSubmit() -> Edge Function submit-assessment
     ▼
  result.html (Scored Report Card)
     │ Auto-Submit Recovery Engine checks stranded sessionStorage fallback
     │ Displays Authoritative Grade (S..F), Breakdown, Answers Matrix
     │ Action: "Back to Dashboard" -> dashboard.html

[ADMIN FLOW]
  admin.html (Top Office — ABCD System)
     │ Master PIN / Password auth ('admin123' or custom)
     ├── [A] ADMIN: Executive Deck, KPI Cards, Assessment Performance
     ├── [B] BOARD: Batches, Student Rosters, Student CV / Dossier Export
     ├── [C] CLASS: Classes Hub, Levels, Curriculum, Assessment Blueprint, Vault
     └── [D] DATA / DESK: Master Settings, Database Backups, Scratchpad
```

---

## 3.2 ES Module Dependency Graph

```
js/supabase.js (Factory: getSupabase(), Supabase JS v2.39.3 ESM)
  │
  ├──► js/api.js
  │      ├── calls: startASSESSMENT, submitAssessment, student-login Edge Functions
  │      └── imports: js/supabase.js, js/grading.js
  │
  ├──► js/session.js
  │      └── manages: 'topscore_session', 'topscore_admin_session'
  │
  ├──► js/grading.js
  │      └── exports: damerauLevenshtein, normalizeAnswerText, evaluateAnswer, calculateGrade
  │
  ├──► js/timer.js
  │      └── exports: startCountdown, isExpired, formatRemainingTime
  │
  ├──► js/speech.js
  │      └── exports: createSpeechSession, isSpeechSupported
  │
  ├──► js/admin/app.js (Orchestrator)
  │      ├── imports: js/admin/datagrid.js, js/admin/student-management.js,
  │      │            js/admin/classes-management.js, js/admin/program-management.js,
  │      │            js/admin/class.js, js/admin/assessment-management.js,
  │      │            js/admin/vocab-vault.js, js/admin/modules.js,
  │      │            js/admin/desk.js, js/admin/imports-exports.js,
  │      │            js/admin/crud-modals.js, js/admin/curriculum-management.js,
  │      │            js/admin/classes-hub.js, js/admin/admin-deck.js
  │      └── dynamic imports: ./auto-gen-modal.js, ../api.js
  │
  └──► js/admin/vocab-vault.js
         └── dynamic imports: ./auto-gen-modal.js, ../app.js, ../supabase.js, ../api.js
```

---

## 3.3 Storage Lifecycle & Key Inventory

### `sessionStorage` Keys
- **`topscore_session`**: JSON string containing student session object (`student_id`, `student_name`, `gender`, `institution_id`, `program_id`, `batch_id`, `level_number`). Set by `index.html` via `setStudentSession()`, read by `dashboard.html`, `assessment.html`, `result.html`, cleared on logout.
- **`topscore_admin_session`**: JSON string `{ admin_id: 'admin-master', role: 'admin', authenticated_at: ISO }`. Set on successful admin login, checked by `admin.html` inline guard, cleared on admin logout.
- **`topscore_assessment_id`**: Active assessment UUID passed between `dashboard.html`, `assessment.html`, and `result.html`.
- **`topscore_attempt_id`**: Active attempt UUID. Set when attempt starts, read by `result.html` to load score sheet.
- **`topscore_student_token`**: Student auth token / identifier buffer.
- **`topscore_sec_${attemptId}`**: Current active section index during an assessment.
- **`topscore_fallback_payload_${attemptId}`**: **CRITICAL SAFETY BUFFER.** JSON string of all student answers formatted for submission. Populated by `assessment.html` right before calling Edge Function `submit-assessment`. Cleared on successful response. Stranded on network failure and read by `result.html` recovery engine.
- **`topscore_pending_levelup_celebration`**: Boolean flag set when Level Up trigger fires, consumed by `dashboard.html` to trigger fireworks modal.

### `localStorage` Keys
- **`topscore_admin_custom_password`**: Custom admin password stored when changed in Desk settings.
- **`topscore_admin_last_section`**: Preserves active admin section (e.g. `vault`, `board`, `class`, `desk`) across page refreshes.
- **`topscore_admin_scratchpad`**: Quick scratchpad notes saved in the Desk panel.
- **`topscore_remember_enabled`**: Boolean flag for "Remember Me" student selector checkbox on `index.html`.
- **`topscore_local_answers_${attemptId}`**: Real-time keystroke buffer updated on every answer input or speech transcription. Protects against tab closing or browser crash.
- **`topscore_sec_started_${attemptId}_${secIdx}`**: Timestamp when a section was first viewed.
- **`stu_photo_${studentId}`**: Local cached student avatar base64 or URL.
- **`stu_bd_${studentId}`**: Local cached birthdate string.
- **`ai_cooldown_limit_seconds`**: Cooldown limit configuration for client speech recording.
- **`ai_max_audio_duration_seconds`**: Maximum recording audio duration limit.

---

## 3.4 Inline Session Guards & Protected Entry Points

### 1. `admin.html` (Inline Pre-Render Script)
Located at line 345 of `admin.html`:
```html
<script>
  if (!sessionStorage.getItem('topscore_admin_session')) {
    document.getElementById('admin-login-screen')?.classList.remove('hidden');
    document.getElementById('admin-console')?.classList.add('hidden');
  }
</script>
```
**Mechanism:** Synchronous execution immediately before module scripts load. If the key is absent, the admin console DOM container is hidden with `.hidden` (`display: none !important`), and the login modal is displayed. When `js/admin/app.js` initializes, `getAdminSession()` re-verifies session state before fetching data.

### 2. Student Pages (`dashboard.html`, `assessment.html`, `result.html`)
- All three pages import `requireStudentSession` from `./js/session.js`.
- Execution occurs at top of main module script:
```javascript
const session = requireStudentSession();
```
- Inside `js/session.js`:
```javascript
export function requireStudentSession(redirectTo = '/index.html') {
  const session = getStudentSession();
  if (!session) {
    window.location.href = redirectTo;
    return null;
  }
  return session;
}
```
**Vulnerability Finding:** These pages lack a synchronous `<head>` inline guard. Because ES modules (`<script type="module">`) are deferred by browser spec, the DOM body renders momentarily before the session check executes, resulting in a minor Flash of Unauthenticated Content (FOUC) before redirect.

---

# MODULE 4: UNIFIED VOCABULARY ENGINE & ASSESSMENT LIFECYCLE

## 4.1 `vocabulary_vault` Table Schema & JSON Structure

The `vocabulary_vault` serves as the single source of truth for all vocabulary words, phrases, idioms, and distractors.

```sql
CREATE TABLE public.vocabulary_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    topic TEXT NOT NULL,                  -- e.g. "Workplace Communication"
    indonesian TEXT NOT NULL,             -- Indonesian prompt (e.g. "surat lamaran")
    english TEXT NOT NULL,                -- Accepted English answers (e.g. "cover letter/application letter")
    word_type TEXT DEFAULT 'Verb',        -- "Noun", "Verb", "Idiom", "Expression", "Phrase"
    target_level INTEGER DEFAULT 1,       -- 1, 2, 3
    theme TEXT,                           -- "General Theme A: Workplace"
    theme_code VARCHAR(10),               -- "A", "B", "C", "D"
    topic_code VARCHAR(10),               -- "1", "2", "3", "4", "5"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
```

### JSON Structure of Dynamic Shell Assessment (`assessments.payload`)
```json
{
  "is_dynamic_shell": true,
  "category": "phrases",
  "theme_code": "A",
  "topic_code": "3",
  "answer_type": "dropdown",
  "description": "3rd Vocabulary - A3 Phrases Task - Job Application Letter & Professional Email"
}
```

---

## 4.2 Dynamic Shell Question Generation & Rendering Tri-Split

When `start-assessment` Edge Function runs for an assessment with `is_dynamic_shell = true`:
1. It queries `vocabulary_vault` filtered by `target_level`, `theme_code`, and `topic_code`.
2. It filters rows by `category`:
   - If `category === 'phrases'`, keeps `word_type IN ('expression', 'idiom', 'proverb', 'phrase')`.
   - If `category === 'words'`, keeps all other parts of speech (nouns, verbs, adjectives).
3. It determines `answer_type`:
   - `VOCAB_TASK` -> `'speech_to_text'`
   - `VOCAB_TEST` -> `'written'`
   - `PHRASE_TASK` / `PHRASE_TEST` -> `'dropdown'`
4. If `answer_type === 'dropdown'`, it dynamically selects 4 distractor words from `vocabulary_vault` (prioritizing matching `word_type`), mixes them with the correct answer, and shuffles into a 5-option array stored in `options_snapshot`.
5. Snapshots all questions directly into `attempt_answers`.

### Question Rendering in `assessment.html`:

```javascript
// Branching logic at lines 1198-1210 of assessment.html:
if (answerType === 'speech_to_text' || answerType === 'spoken') {
  renderSpeech(answerArea, controlArea, row, savedAnswer, snap);
} else if (answerType === 'dropdown' || answerType === 'dropdown_10' || answerType === 'phrase_recognition') {
  renderPhraseChips(answerArea, row, savedAnswer, snap);
} else if (answerType === 'written') {
  renderWritten(answerArea, controlArea, row, savedAnswer, snap, vk);
}
```

### 1. Speech Mode (`renderSpeech`)
- Uses Web Speech API via `createSpeechSession` in `js/speech.js`.
- Renders large circular microphone button (`.speech-mic-btn-lg`) with pulse animation and audio wave indicators.
- Displays live interim transcript and records final transcript directly to `answeredMap[row.id]`.
- Includes US (`en-US`) and UK (`en-GB`) accent selectors.
- **Graceful Degradation:** If browser does not support `SpeechRecognition`, automatically falls back to `renderWritten()` and displays an on-screen notice.

### 2. Written Mode (`renderWritten`)
- Renders a frosted, centered textarea (`.written-input.frosted-input`).
- Sets `readonly="true"` and `inputmode="none"` to suppress mobile OS software keyboards in favor of TopsCore's custom on-screen Virtual Keyboard (`#virtual-keyboard-container`).
- Keystrokes enter via `window.activeKeyboardInput`.
- Emits autosave on blur and caches continuously to `localStorage`.

### 3. Chips / Dropdown Mode (`renderPhraseChips`)
- Renders 5 clickable option buttons (`.mc-option`) based on `snap.options_snapshot`.
- Tapping an option applies emerald highlight (`#34d399`), updates `answeredMap[row.id]`, saves to `localStorage`, and triggers auto-advance to next question after a 400ms delay.

---

## 4.3 Answer Collection, Serialization & Scoring Pipeline

1. **Answer Map Serialization:** All answers are keyed in memory as `answeredMap[attempt_answer_id] = student_answer`.
2. **Payload Construction:**
```javascript
const payload = allAnswerRows.map(row => ({
  attempt_answer_id: row.id,
  student_answer: answeredMap[row.id] || '',
}));
```
3. **Scoring Engine (`js/grading.js` and `supabase/functions/submit-assessment`):**
   - **Text Normalization:** `normalizeAnswerText(text)`: lowercases, collapses whitespace, strips trailing punctuation (`.,?!"'`), strips non-word characters except hyphens and apostrophes, expands contractions (`i'm` -> `i am`).
   - **Hyphen Tolerance:** If `stripHyphens(student) === stripHyphens(correct)` (e.g. "part time" vs "part-time"), award **Full 1.0 Point (`correct`)**.
   - **Damerau-Levenshtein Edit Distance:**
     - Exact match -> **1.0 Point** (`correct`).
     - Words >= 4 characters with edit distance <= 2 -> **0.5 Points** (`minor_spelling_error`).
     - Words of 3 characters with edit distance == 1 -> **0.5 Points** (`minor_spelling_error`).
     - Distance > 2 or words <= 2 characters mismatched -> **0.0 Points** (`incorrect`).
   - **Percentage & Grading:**
     - Percentage = `(totalScore / totalQuestions) * 100`.
     - Grade mapping: 100% = **S**, 91-99% = **A**, 71-90% = **B**, 51-70% = **C**, 31-50% = **D**, 11-30% = **E**, 0-10% = **F**.

---

# MODULE 5: EDGE FUNCTIONS & SUBMISSION FALLBACK MECHANISM

## 5.1 Edge Function Inventory (`supabase/functions/`)

All Edge Functions run on Deno with server-authoritative Service Role keys:

1. **`student-login`**: Verifies institution, program, student active status, and SHA-256 PIN hash.
2. **`start-assessment`**: Validates prerequisites, working duration, creates/resumes `attempts`, generates dynamic shell questions from `vocabulary_vault`.
3. **`submit-assessment`**: Server-authoritative answer scoring, Damerau-Levenshtein evaluation, `attempts` update, `is_best_score` resolution, Level Completion gate check.
4. **`evaluate-assessment`**: Multi-pillar AI monologue evaluation engine for speaking performance.
5. **`import-students`**: Bulk student importer, SHA-256 PIN generator, and batch assigner.
6. **`import-questions`**: Parallel chunk importer for legacy questions.
7. **`generate-module-template`**: Generates CSV/JSON templates for AI evaluation modules.
8. **`duplicate-assessment`**: Deep-clones an assessment and its question bank.

---

## 5.2 Client Submission Flow & Safety Buffer Mechanism

```
[assessment.html - doSubmit()]
  1. Stops countdown timer.
  2. Saves current answer into answeredMap.
  3. Prepares payload: [{ attempt_answer_id, student_answer }]
  4. WRITES SAFETY BUFFER:
     sessionStorage.setItem('topscore_fallback_payload_' + attemptData.id, JSON.stringify(payload));
  5. CALLS submitAssessment(attemptData.id, payload, { status: targetStatus });
     │
     ├──► SUCCESS (Edge Function returned 200 OK):
     │      - Clears localStorage['topscore_local_answers_' + attemptData.id]
     │      - Clears sessionStorage['topscore_fallback_payload_' + attemptData.id]
     │      - Redirects to result.html
     │
     └──► FAILURE (Network error, timeout, or 500 error):
            - If isAuto is true:
                Tries direct REST PATCH:
                fetch(`${SUPABASE_URL}/rest/v1/attempts?id=eq.${attemptData.id}`, {
                  headers: { 'apikey': SUPABASE_ANON_KEY },
                  body: JSON.stringify({ status: 'auto_submitted', submitted_at: new Date().toISOString() })
                })
            - Leaves sessionStorage['topscore_fallback_payload_' + attemptData.id] INTACT.
            - Redirects to result.html.
```

---

## 5.3 `result.html` Auto-Submit Recovery / Retry Engine

When `result.html` loads, it executes the Auto-Submit Recovery Engine (lines 305-350):

```javascript
// Check for stranded fallback payloads:
const fallbackRaw = sessionStorage.getItem('topscore_fallback_payload_' + attemptId);
const localAnswersRaw = localStorage.getItem('topscore_local_answers_' + attemptId);

let pendingPayload = null;
if (fallbackRaw) {
  try {
    const parsed = JSON.parse(fallbackRaw);
    if (Array.isArray(parsed) && parsed.length > 0) pendingPayload = parsed;
  } catch (_) {}
} else if (localAnswersRaw && Array.isArray(answers) && answers.length > 0) {
  try {
    const localMap = JSON.parse(localAnswersRaw) || {};
    if (Object.keys(localMap).length > 0) {
      pendingPayload = answers.map(a => ({
        attempt_answer_id: a.id,
        student_answer: localMap[a.id] || ''
      }));
    }
  } catch (_) {}
}

const isUnscored = !attempt.submitted_at || attempt.status === 'in_progress' || 
                   (answers.length > 0 && answers.every(a => a.student_answer == null));

if (pendingPayload && pendingPayload.length > 0 && (attempt.status === 'auto_submitted' || isUnscored)) {
  try {
    showLoading('Finalizing and calculating your assessment score...');
    // Re-invoke authoritative submission:
    await submitAssessment(attemptId, pendingPayload, { status: 'submitted' });
    sessionStorage.removeItem('topscore_fallback_payload_' + attemptId);
    localStorage.removeItem('topscore_local_answers_' + attemptId);
    
    // Refresh authoritative attempt and answers:
    const [refreshedAttempt, refreshedAnswers] = await Promise.all([
      fetchAttemptResult(attemptId),
      fetchAttemptAnswers(attemptId),
    ]);
    attempt = refreshedAttempt;
    answers = refreshedAnswers;
  } catch (retryErr) {
    console.warn('Auto-submit recovery failed:', retryErr);
  } finally {
    hideLoading();
  }
}
```

### Architectural & Security Vulnerability in Fallback Flow:
1. **Anon RLS Block:** If the Edge Function is down, the client-side direct PATCH in `assessment.html` attempts to update `attempts` using `SUPABASE_ANON_KEY`. However, our RLS audit in Module 2 revealed that `attempts` only has `anon_select_attempts` (`FOR SELECT`). PostgREST silently rejects updates from `anon`, meaning the fallback PATCH fails to persist to the database.
2. **Client-Side Grading Fallback (`api.js` line 670):** If Edge Function is unavailable, `api.js` attempts to evaluate answers and calculate grades client-side using `grading.js`, then writes directly to `attempts` and `attempt_answers`. This violates AGENTS.md §1.4 ("Students MUST NOT be trusted to calculate or submit authoritative score, grade, progression, eligibility") and is blocked by RLS policies when unauthenticated.

---

# MODULE 6: TEST TARGETS & EXISTING ASSETS

## 6.1 Existing Test Accounts, Batches & Seed Data

From inspection of `supabase/data.sql` and the active PostgreSQL database:

### 1. Institutions
- **`CEC`** (ID: `f51d4c2c-7c24-42ef-8d8f-b0f3e524a447`, Code: `CEC`)
- **`TOP`** (Formerly `Personal`, ID: `637fea53-ca64-4e1c-8ff7-6fd4dbdd8260`, Code: `TOP`)

### 2. Programs
- **`Camp`** (Institution: CEC, ID: `11deb53c-434a-44b0-83ca-1cc9b239cab3`)
- **`Tamata Persada`** (Institution: TOP, ID: `d80f47ef-0683-4137-8430-f6cae33e98cc`)
- **`Sheraton Hotel`** (Institution: TOP, ID: `20d64d86-6e8b-4677-a3c9-e497fa5d9177`)

### 3. Batches
- **`131`** (Program: Camp, ID: `c0648c2d-34f2-4151-bf04-dabf2c5a78b9`, Level 1)
- **`132`** (Program: Camp, ID: `2bb3f43a-d618-4f8a-9a98-31c157ff7a30`, Level 1)
- **`2026`** (Program: Sheraton Hotel, ID: `67108e07-e262-4707-b07e-970627061b54`, Level 1)
- **`2026`** (Program: Tamata Persada, ID: `e68e2182-07a9-48c6-9174-b478e38ee022`, Level 1)

### 4. Active Students & Prefix Naming Logic
In TopsCore, student names are automatically prefixed with **`Mr.`** or **`Miss`** via `formatStudentName` in `js/api.js` based on their gender:
- If gender is `male`/`m`/`l`, name displays as `Mr. <Name>`.
- If gender is `female`/`f`/`p`, name displays as `Miss <Name>`.

There are **44 seed students** in `supabase/data.sql`:
- Samples:
  - `Mr. Muhamad Warid Aldi` (ID: `73fd981f-a133-47a8-aa3c-268122fff996`)
  - `Mr. Muhammad Danil` (ID: `732b223a-619a-45aa-a2b4-5f6582fac554`)
  - `Miss Naila Atika Putri` (ID: `abc0fe6a-7213-4951-9b95-1fb4f36438e6`)
  - `Mr. Suharto` (ID: `9e06bf3b-a2cc-4ca1-bf59-4d2b28b0472d`)
  - `Mr. Unggul Wirakse` (ID: `7db1204a-0081-4535-9d1f-e4e62bb6effb`)
  - `Miss Arni Sayuni` (ID: `4363c0a9-5aaf-43fb-819e-807c6ee9cbeb`)
  - `Miss Siti Qori` (ID: `301be589-aba1-43be-a999-aa8ddaf6c509`)

### 5. Test Seed CSVs
- **`scripts/archive/test_students.csv`**: Contains student `"Test Student"`, Gender: `Male`, Birthdate: `2005-01-01`, PIN: `1234` (formats to `Mr. Test Student`).
- **`scripts/archive/test_students_import.csv`**: Contains student `"John Doe"`, Gender: `M`, Birthdate: `2010-01-01`, PIN: `1234` (formats to `Mr. John Doe`).

### 6. Dynamic Shell Assessment Inventory (42 Assessments)
- **1 Published Try-Out:**
  - `3rd Vocabulary - Try-Out Phrases (Comprehensive Themes A-D)` (ID: `e86e8751-86a9-4e89-b332-5c9a965a1918`, Status: `PUBLISHED`, Duration: 180 mins)
- **41 Draft Dynamic Shells:**
  - Themes A through D covering Words Tasks (`VOCAB_TASK`), Words Tests (`VOCAB_TEST`), Phrases Tasks (`PHRASE_TASK`), and Phrases Tests (`PHRASE_TEST`).

---

## 6.2 Test Suites & Verification Scripts

### 1. Playwright E2E Test Suite (`tests/system-e2e.spec.js`)
Configured in `playwright.config.js`. Runs headful/headless browser tests against local dev server (`http://localhost:3000`):
- `Student Login Cascading Containers Verification`: Tests `#sec-program`, step badge `#step-num-1`, and `#remember-me-banner`.
- `Assessment Runner Anti-Cheat and Timer Integrity`: Tests `/assessment.html?Assessment_id=demo-test`, validates `#Assessment-timer` and `#Assessment-sync-status`.
- `Admin Console ABCD Navigation Verification`: Tests `/admin.html`, validates navigation buttons `[data-domain="admin"]`, `[data-domain="board"]`, `[data-domain="class"]`, `[data-domain="desk"]`.

### 2. Standalone Dynamic Shell E2E Test (`temp_test/test_dynamic_shell_e2e.mjs`)
Direct Node.js test script using `pg` and `@supabase/supabase-js`:
- Selects a published `VOCAB_TASK` dynamic shell.
- Queries `vocabulary_vault` for expected words based on theme and topic.
- Simulates `start-assessment` Edge Function call (with fallback).
- Verifies 1-to-1 question snapshot mapping.
- Simulates student answer submission to `submit-assessment`.
- Verifies final score, 100% percentage calculation, and `S` grade assignment in `attempts` table.

### 3. Database Status Audit Tool (`temp_test/db_status_audit.mjs`)
Audit script that connects to local Postgres port `54322` to group and count distinct `attempts` and `assessments` statuses.

---

## 6.3 Manual Verification Instructions

### Admin Console Verification:
1. Open `admin.html` in browser.
2. Login credentials:
   - Username: `admin`
   - Password: `admin123`
3. Verify that the ABCD navigation bar loads:
   - **A — Admin**: KPI cards, pass rates, attempt charts.
   - **B — Board**: Student rosters, batch selector, student detail drawer, dossier export.
   - **C — Class**: Classes management, assessment blueprint generator, Vocabulary Vault grid.
   - **D — Desk**: Master settings, scratchpad, admin password manager.

### Student Flow Verification:
1. Open `index.html`.
2. Cascading Login:
   - Select Institution: `CEC`
   - Select Program: `Camp`
   - Select Batch: `132`
   - Select Student: `Mr. Unggul Wirakse` (or any active student)
   - Enter PIN: `1234`
3. Click **Login** -> Redirects to `dashboard.html`.
4. From `dashboard.html`, launch any published assessment.
5. In `assessment.html`, verify that countdown timer starts and questions render according to `answer_type` (Mic button for speech, chips for dropdown, textarea + virtual keyboard for written).
6. Click Submit -> Verify redirect to `result.html` with grade card.

---

# AUDIT SUMMARY OF CRITICAL FINDINGS & DEFECTS

1. **Cache-Busting Fragmentation:** Four distinct version regimes exist across the workspace (`v=4.9.8`, `v=4.7.12`, `v=4.7.6`, and unversioned). `assessment.html` and `result.html` do not version their CSS stylesheets.
2. **Service Worker Pattern Flaw:** In `sw.js` line 37, checking `url.pathname.endsWith('.js?v=4.7.12')` will never match because `pathname` excludes query parameters.
3. **RLS Anonymous Write Blockage:** If the `submit-assessment` Edge Function encounters an outage, the fallback direct client update in `assessment.html` and `api.js` fails because `anon` has no `UPDATE` or `INSERT` policy on `attempts` and `attempt_answers`.
4. **Legacy Target in `auto_close_expired_attempts`:** The database function `auto_close_expired_attempts` targets `challenge_attempts` rather than the active `attempts` table.
5. **Absence of Synchronous Head Guard on Student Pages:** `dashboard.html`, `assessment.html`, and `result.html` evaluate authentication inside deferred ES modules, creating a brief pre-redirect visual flicker for unauthenticated users.
