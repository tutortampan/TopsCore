# CURRENT STATE

Last Updated: 2026-11-09 19:20 UTC+8
Current Phase: Phase 387: Tutor Role & Strict Access Control (RBAC) [COMPLETE]
Status: COMPLETE

## Completed Work (Phase 387):
1. **Unified Session Role Engine (`js/session.js`)**:
   - Extended `setAdminSession(data)` to store authoritative user roles (`admin` or `tutor`) and usernames.
   - Added `getAdminRole()`, `isTutorRole()`, and `isAdminRole()` helpers with SSR/Node safe-fallbacks.

2. **Dual-Credential Authentication (`js/admin/app.js`)**:
   - Administrator authentication: Master credentials (`admin` / `admin123` or custom admin password override) or Supabase Auth.
   - Tutor Proctor authentication: Tutor credentials (`tutor` / `tutor123` or custom tutor password configured by admin; aliases: `tutor`, `guru`, `proctor`, `pengawas`).
   - Fast-boot CSS tagging via `admin-init.js` ensuring immediate `role-tutor` body class to eliminate layout flashing on page refresh.

3. **Strict Route & Navigation Guards**:
   - `loadSection()` & URL hash router strictly restrict tutors to `class-hub` (and `test-access` alias). Direct URL manipulation (e.g. `#tests`, `#settings`, `#students`, `#organization`, `#curriculum`, `#modules`, `#vocab_vault`) triggers a warning toast and auto-redirects to `class-hub`.
   - Sidebar UI dynamically scopes out Domain A (Admin), Domain B (Board), Domain D (System & Data), and non-permitted items in Domain C (`vocab_vault`, `tests`), leaving strictly the Class selector list for proctoring.

4. **Class Hub & Proctoring Specialization**:
   - Class Hub tabs filtered: Tutors strictly access `test-sessions` ("Buka Tutup Ujian", live test taker monitoring, time extensions, late additions) and `attendance` ("Cek Nilai", scorecards, points, percentages). `tests` (Test Builder, Generator, Blueprints) is completely excluded.
   - Attendance Matrix scoped: Manual grade override super-header, column, and inline edit buttons are removed for tutors.
   - Backend operation guards: `window._editRecord`, `window._deleteRecord`, `window.openCrudModal`, `window.openStudentFullEdit`, `window.saveRowManualInput`, `window.toggleRowManualInput`, `window.toggleAllManualInputMode`, and `labelAttemptRemedial` block tutor invocation with permission denied notices.

5. **System Settings Management (`js/admin/desk.js`)**:
   - Added "Tutor Proctor Credentials" security card in Pilar D allowing master administrators to update or reset the custom tutor password (`topscore_tutor_custom_password`).

6. **Automated Verification Suite**:
   - Created dedicated automated test suite `scripts/test_tutor_role_rbac.mjs` (`npm run test:rbac`), integrated directly into `npm test`.
   - Verified 8 distinct RBAC invariants: 100% PASS with 0 defects.
   - Full suite verified: `npm run test:syntax`, `npm run test:imports`, `npm run test:health`, `npm test` all 100% PASS.

## Next Exact Action:
- Commit and push changes to `main`.
