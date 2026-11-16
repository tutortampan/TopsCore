# TopsCore

Online English assessment and testing platform built with Static HTML/CSS/JS and Supabase backend.

## Quick Start

1. **Supabase Setup**
   - Create a Supabase project at [supabase.com](https://supabase.com)
   - Run `supabase-setup.sql` in your Supabase SQL Editor
   - Copy `.env.example` to `.env` and fill in your credentials
   - Update `js/supabase.js` with your `SUPABASE_URL` and `SUPABASE_ANON_KEY`

2. **Deploy Edge Functions**
   ```bash
   supabase functions deploy student-login
   supabase functions deploy start-exam
   supabase functions deploy submit-exam
   ```

3. **Run Locally**
   Open `index.html` in any modern browser (Chrome/Edge recommended for Speech Recognition).
   Or serve with a local static file server:
   ```bash
   npx serve .
   ```

## Pages

| Page | Description |
|------|-------------|
| `index.html` | Student login (`INSTITUTION -> PROGRAM -> BATCH -> STUDENT NAME -> PIN`) |
| `dashboard.html` | Student dashboard with mobile-locked corridor (430px) & class/level progression |
| `test.html` | Test taking interface supporting the 8 AI evaluation modules |
| `result.html` | Test result with performance metrics & score review |
| `conversation.html` | Live WebRTC conversation and roleplay room |
| `admin.html` | Admin & Tutor console with ABCD System (`A — ADMIN`, `B — BOARD`, `C — CLASS`, `D — DATA`) |

## Architecture

- **Frontend**: Modular HTML5 + Vanilla CSS + ES Modules JavaScript (strictly static, deployable to Netlify/Vercel)
- **Backend**: Supabase PostgreSQL + RLS + Edge Functions (Deno)
- **Auth**: PIN-based student login (SHA-256 hashed), Supabase Auth for Admin/Tutors
- **Scoring**: Server-authoritative (`submit-exam` Edge Function / `grading.js`)
- **Timer**: Server-authoritative (`expected_end_at` from server)
- **Operational Discipline**: Cepat, Cermat, Tepat, dan Akurat (AGENTS.md §0.2)

## Business Rules

See [`AGENTS.md`](file:///AGENTS.md) for authoritative rules, [`.antigravityrules`](file:///.antigravityrules) for governance index, and `docs/` for modular specifications and decisions.

## Grades (Official Grading Scale — AGENTS.md Rule 2.10)

| Symbol | Predicate | Score Range | Main Color | Hex Code |
|:---:|:---:|:---:|:---:|:---:|
| ★ | Excellent | 100% | Electric Pink | `#ff2d87` |
| A | Very Good | 90% – 99% | Pure Green | `#00c000` |
| B | Good | 80% – 89% | Electric Lime | `#95ff00` |
| C | Enough | 60% – 79% | Pure Yellow | `#FFFF00` |
| D | Less | 30% – 59% | Dark Orange | `#FF8C00` |
| E | Fail | 0% – 29% | Pure Red | `#FF0000` |

*Special System Action Tokens:*
- **Grade R (Remedial)**: Pure Yellow (`#FFFF00`), score capped at 60% (Grade C).
- **Grade F (Forgiven / Waiver)**: Pure Red (`#FF0000`), administrative progression waiver.
- **Grade M (Manual Score)**: Tactical Cyan (`#38bdf8`), admin manual input/override.
- **Grade X (Alumni)**: Vibrant Purple (`#8b5cf6` / `#C084FC`), marks graduate alumni.
