# TopsCore LMS — Product & Bootstrap Roadmap

> **Status:** Phase 0–14 Bootstrap Complete. Current active development track is documented dynamically in `docs/CURRENT_STATE.md` and `docs/CHANGELOG.md`.

---

## 1. Active Development Track (Phase 100+)
For ongoing features, milestones, session histories, and current sprint goals, refer to the live state files:
- [docs/CURRENT_STATE.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/docs/CURRENT_STATE.md) — Live status of current phase, completed features, in-progress items, and next exact actions.
- [docs/CHANGELOG.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/docs/CHANGELOG.md) — Chronological history of releases, features, fixes, and codifications.
- [docs/DECISIONS.md](file:///d:/Drives/Tutor%20Tampan/TopsCore/docs/DECISIONS.md) — Permanent architectural decision records (ADRs).

---

## 2. Historical Bootstrap Implementation Phases (Phase 0 — Phase 14)

The initial build sequence used during foundational platform construction:

### PHASE 0 — Repository bootstrap
Deliver:
- base folder structure
- `.gitignore`
- `.env.example`
- README
- AGENTS.md
- docs state files
- basic HTML shell
- base CSS/JS modules

Exit criteria:
- app opens
- no secrets committed
- documentation system exists

### PHASE 1 — Supabase foundation
Deliver:
- project connection
- environment configuration
- migration system
- initial schema
- RLS baseline
- storage buckets/strategy

Exit criteria:
- migration applies cleanly
- schema inspectable
- RLS policies documented

### PHASE 2 — Core master data
Implement:
- INSTITUTION
- PROGRAM
- Subject
- Level
- PROGRAM-Subject assignment
- Student

Exit criteria:
- CRUD works
- relational integrity enforced
- soft delete/restore works where applicable

### PHASE 3 — Authentication and role control
Implement:
- Admin auth
- Student login with INSTITUTION/PROGRAM/Name/PIN
- session management
- authorization
- first-login photo requirement

Exit criteria:
- unauthorized access denied server-side
- no plaintext PIN

### PHASE 4 — Exam management
Implement:
- create/edit exam
- Exam Type
- Exam Title
- answer type
- time limit
- prerequisite
- minimum score
- retake settings
- publish/unpublish
- exam/PROGRAM many-to-many assignment
- name generation

Exit criteria:
- exam list
- exam CRUD
- assignment works
- published state works

### PHASE 5 — Question management/import
Implement:
- question CRUD
- answer-type-specific templates
- download format
- upload
- validation
- preview
- confirm
- insertion

Exit criteria:
- all four answer types supported
- invalid rows never silently skipped

### PHASE 6 — Attempt engine
Implement:
- eligibility
- prerequisite
- attempt creation
- immutable snapshot
- resume
- save answer
- timer
- submit idempotency

Exit criteria:
- refresh resumes same attempt
- client cannot extend time
- double submit safe

### PHASE 7 — Scoring and results
Implement:
- all answer evaluators
- written typo tolerance
- score
- grade
- result persistence
- historical display

Exit criteria:
- all score boundaries tested
- snapshots prevent historical drift

### PHASE 8 — Progression
Implement:
- highest attempt score
- all-exams-in-level rule
- unlock next level
- overall score

Exit criteria:
- progression tests pass

### PHASE 9 — Admin UI
Complete:
- DATABASE
- PROGRAM
- STUDENT
- EXAM

Exit criteria:
- primary navigation matches specification
- CRUD/import/publish workflows usable

### PHASE 10 — Student UI
Complete:
- login
- subject selection
- progress
- exam runner
- result
- history

Exit criteria:
- critical journey complete

### PHASE 11 — Security hardening
Perform:
- RLS audit
- authz audit
- IDOR tests
- privilege escalation tests
- upload validation
- secret scan
- client manipulation tests

### PHASE 12 — Testing / regression
Run:
- unit
- integration
- E2E
- migration tests
- manual acceptance

### PHASE 13 — Deployment
Implement:
- Netlify/Vercel frontend deployment configuration
- Supabase production configuration
- environment variables
- build checks
- storage rules
- production smoke test

### PHASE 14 — Final handoff
Deliver:
- README
- architecture docs
- database docs
- API docs
- deployment docs
- test report
- known issues
- current state
- next action

