# Phase 443: Elimination of Dead Database Calls & Legacy Table Queries

- [x] 0. Pre-Flight Setup & Environment Check <!-- id: 0 -->
- [x] 1. Clean `js/admin/admin-deck.js` (Purge `class_meetings`, `work_records`, `professional_skills`, `user_professionals`) <!-- id: 1 -->
- [ ] 2. Clean `js/admin/app.js` (Purge dead route aliases, `test_items` from `renderClassHub`, and legacy buttons) <!-- id: 2 -->
- [ ] 3. Clean `js/admin/class.js` (Remove dead uncalled `renderClassInstances`, `renderCentralQuestionImport`) <!-- id: 3 -->
- [ ] 4. Clean `js/admin/crud-modals.js` (Remove `test_items` update calls in test modal and bulk editor) <!-- id: 4 -->
- [ ] 5. Clean `js/admin/desk.js` (Repoint recycle bin to `vocabulary_vault`, remove `test_items` from orphan scan) <!-- id: 5 -->
- [ ] 6. Clean `js/admin/imports-exports.js` (Extract questions from `test.payload?.questions` without dead DB calls) <!-- id: 6 -->
- [ ] 7. Clean `js/admin/student-management.js` (Remove dead `assignments` query and enforce pure Rule 2.5) <!-- id: 7 -->
- [ ] 8. Clean `js/admin/tests-management.js` (Fix `duplicateTest`, remove `test_items` fetch and dead `renderQuestions`) <!-- id: 8 -->
- [ ] 9. Clean `js/api.js` (Remove dropped tables from `noDeletedAtTables`, clean delete/upsert hooks, provide clean stubs) <!-- id: 9 -->
- [ ] 10. Automated Verification & Regression Testing (`verify_dead_db_calls_elimination.mjs` & `npm run verify:all`) <!-- id: 10 -->
- [ ] 11. Update `docs/CURRENT_STATE.md` and `docs/CHANGELOG.md` to Phase 443 <!-- id: 11 -->
