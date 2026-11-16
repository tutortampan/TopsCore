# TOPSCORE LMS — AGENT WORKFLOW & EXECUTION PROTOCOLS (LEAN & AGILE)

## 0. Standing Operational Discipline: Cepat, Cermat, Tepat, dan Akurat
Setiap instruksi dan perintah dari pengguna WAJIB diterapkan berlandaskan 4 pilar operasional:
1. **Cepat (Fast & Direct)**: Langsung eksekusi ke inti perubahan tanpa overhead/seremonial dokumen yang tidak perlu.
2. **Cermat (Meticulous & Comprehensive)**: Teliti membaca file target, dependencies, dan dampak menyeluruh ke seluruh sistem sebelum/sesudah mengubah kode.
3. **Tepat (Precise & Aligned)**: Eksekusi presisi sesuai kemauan pengguna dan standar baku tanpa menyimpang dari SSOT dan hierarki aturan.
4. **Akurat (Accurate & Verified)**: Lakukan verifikasi otomatis setiap selesai mengedit untuk memastikan 0 syntax error, 0 regresi, dan 100% tests green.

## 1. Pragmatic Task Management (`tasks.md`)
- **Complex Multi-Step Tasks**: For complex features involving multiple files or phases, track progress in `tasks.md` in the workspace root.
- **Zero CLI Pinning Overhead**: DO NOT execute shell/PowerShell commands to force-pin `tasks.md` in IDE tabs. Keep file operations clean and silent.
- **Quick Tasks & Fixes**: For single-turn fixes, minor tweaks, or immediate requests, execute directly without creating or updating task boards.

## 2. Direct Intent Processing (No Typo Echoing)
- Process user requests directly. DO NOT analyze typos, grammar, or echo user prompts with `### 🎯 Perbaikan Perintah`.
- Focus 100% of reasoning and generation tokens on understanding intent and executing code/answers immediately.

### 2.1 Surgical Targeting & Anti-Grep Spree Protocol
- **Zero-Grep Spree Standard**: When the user requests a cosmetic tweak, acronym, label change (e.g. `Date of Birth` $\to$ `DOB`), or minor component adjustment, the agent MUST NOT run repeated global `git grep` sprees or read 8+ files across unrelated directories.
- **Direct Authoritative Component**: Directly open and edit the specific component that renders the element (e.g., `student-management.js` and `datagrid.js` for student tables). Limit initial lookups to $\le 1$ targeted grep if the exact file is uncertain.
- **Zero-Documentation Overhead on Micro-Tweaks**: Cosmetic label and wording adjustments do not require altering governance documentation (`ui-invariants.md`, `AGENTS.md`) or performing changelog rotations. Edit the code, run targeted tests, and report results immediately.

## 3. Plan Lifecycle & Auto-Purge Protocol
- **Naming Standard**: Major architectural or complex feature plans use `docs/plans/YYYYMMDD - <Plan Name>.md`.
- **Single-Write Persistence**: Save plans directly in the workspace repository (`docs/plans/`). Do not duplicate or dual-write unless explicitly generating an interactive artifact widget.
- **Active Directory Bounds**: `docs/plans/` must strictly hold ONLY active, pending, or in-review plans (bounded to $\le 3$ active plans).
- **Auto-Purge on Completion**: The moment a plan's implementation is verified and logged in `docs/CHANGELOG.md`, the agent MUST immediately delete or move the plan to `docs/archive/plans_completed/`. Never leave finished plans lingering in `docs/plans/`.
- **Auto-Purge on Rollback / Rejection**: If the user cancels, rejects, or requests a rollback of an experimental plan, the corresponding plan file MUST be purged immediately to prevent future hallucinations.

## 4. Scoped Visual Planning & Fast-Track UI Execution Protocol
- **Fast-Track UI Execution (Zero-Ceremony Rule)**: For all standard UI changes (styling tweaks, CSS colors, spacing, padding, alignment, typography, dropdowns, table columns, and modal layouts), the agent MUST execute changes directly in code without creating ceremonial planning documents, `/plan` artifacts, or Mermaid design diagrams.
- **Direct-to-Code**: Identify target CSS/JS files immediately, apply edits cleanly in-place, and run instant verification.
- **Major UI Overhaul / Redesign Only**: For foundational screen redesigns or large-scale layout overhauls, provide a concise Before & After summary before making destructive changes.

### 4.1 Single-Pass Table Editing Protocol
- **Single-Pass Cohesion**: When modifying, adding, or standardizing table columns, NEVER fragment edits across multiple turns. Always perform a single unified edit covering all table synchronization points:
  1. Header definitions and width allocations in JS (`columns: [...]`, `superHeaders: [...]`).
  2. Normal cell rendering (`<td>` text, badges, or values).
  3. Master Edit Mode controls (centered dark `<select class="student-inline-select text-center">` or borderless `<input>`).
  4. Footer summary calculations (`tfoot tr`, `tfoot td`, `.datagrid-summary-row` 40px height lock).
  5. Utility classes and calibrated column widths in CSS (`admin.css`).
- **Targeted Table Verification**: Verify table integrity immediately with:
  ```powershell
  npm run test:table
  ```
  *(Audits all 10 table pillars: 12px font, white Excel gridlines, 40px footer, zero truncation, and 60px spanning headers in **~0.5 seconds**).*

## 5. Pragmatic & Accelerated Quality Verification
- **Iterative UI & Feature Development**: During active UI or styling work, ALWAYS run the ultra-fast preflight:
  ```powershell
  npm run test:fast
  ```
  *(Executes in-process AST syntax check on 50 JS files + CSS compilation in **< 1.5 seconds**, avoiding slow process spawning and headless browsers).*
- **Smart Git-Aware Verification**: Use `npm test` (`node scripts/test_smart.mjs`) to automatically run targeted domain test suites based on modified files.
- **Full Regression Pool**: Run `npm run test:full` (`scripts/run_all_tests_parallel.mjs`) only once at the conclusion of a major phase or when touching core architecture files (`js/grading.js`, `js/api.js`, `package.json`).
- **Zero Backgrounding Guarantee**: Never run heavyweight monolithic sequential tests during interactive micro-turns.

### 5.1 Strict Ban on Headless Browser Spawning for Routine Click/DOM Debugging
- **Anti-Latency Invariant**: Spawning headless Chrome/Puppeteer/Playwright on Windows requires 5–10s per cycle and frequently triggers 10s background task timeouts. Agents MUST NEVER spawn a headless browser simply to trace why a button, dropdown, or tab did not respond to clicks.
- **Static Diagnostic First**: Diagnose click and interaction issues statically in < 0.2s:
  1. Inspect Event Delegation: Check if click handler uses `e.target.closest('[data-action]')` on a stable container.
  2. Inspect Pointer Events & Z-Index: Check CSS for `pointer-events: none`, invisible overlays, or negative z-indices.
  3. Inspect MutationObserver Re-entrancy: Check if an active observer is firing infinite loops on DOM mutations (per [ui-invariants.md §1.6.1](file:///.agents/rules/ui-invariants.md#161-mutationobserver-loop-prevention--dom-re-entrancy-guard-anti-freeze-invariant)).
- Headless browser suites are strictly reserved for permanent end-of-phase regression testing in `test:full`, never for exploratory iterative debugging.

### 5.2 Windows CLI Syntax & Anti-Backgrounding Execution Protocol
- **Use `npm.cmd` or direct `node`**: In Windows PowerShell, running bare `npm run ...` throws `npm.ps1 cannot be loaded because running scripts is disabled`. Always invoke `npm.cmd run ...` or directly run `node scripts/...`.
- **Synchronous Timeout Lock (`WaitMsBeforeAsync: 8000–10000`)**: Windows process instantiation takes 5–7 seconds. Setting `WaitMsBeforeAsync: 5000` causes unnecessary task backgrounding and polling delays. Always set `WaitMsBeforeAsync` to **8000–10000 ms** to ensure synchronous turn completion.

## 6. Workspace Hygiene & One-Off Eradication Protocol (Strict Invariant)
- **One-Off Scripts**: Any single-use test script, temporary diagnostic patch, single-shot screenshot capture, or scratch runner in `scripts/` MUST be deleted as soon as its verification or diagnostic step finishes. Only permanent regression test suites linked in `package.json` are permitted to persist.
- **One-Off Rules & Commands**: Ad-hoc session instructions or temporary experiment commands MUST NEVER be codified into permanent governance files (`AGENTS.md`, `.antigravityrules`, `.agents/rules/`). Permanent rule files are reserved strictly for enduring system architecture and non-negotiable business rules.
- **Scratch & Debug Files**: Temporary inspection files and dumps must reside exclusively in the brain scratch directory (`<appDataDir>/brain/<conversation-id>/scratch/`) and never be committed or left loose in the workspace root or `docs/`.
- **Editor Tab Discipline**: Keep the editor tidy and close temporary files when no longer needed. Do not run CLI commands to manipulate IDE window focus.

## 7. Natural Compaction & Context Management
- Recommend `/compact` naturally when a conversation becomes noticeably long or sluggish, or when major milestones finish.
- DO NOT append boilerplate warning banners or rigid milestone alerts to every response.

## 8. Anti-Yapping Discipline & Direct Communication
- Keep responses concise, direct, and actionable.
- When an artifact or plan exists, provide the direct clickable file link ([filename.md](file:///...)) and highlight only key decisions or blockers.
- Avoid repeating large blocks of code or re-summarizing entire documents in chat.

## 9. Lean Documentation Maintenance
- **`docs/CHANGELOG.md`**: Update with concise bullet points upon completing a feature or milestone (rolling window of latest 25 phases).
- **`docs/CURRENT_STATE.md`**: Update authoritative state after completing major features (capped at $\le 120$ lines). Do not log micro-steps or individual commits.
- **`docs/SESSION_LOG.md`**: Deprecated / optional.
- **`tasks.md`**: Dedicated active task board for the ongoing task.

## 10. Hub & Spoke SSOT Architecture & Zero Duplication
- **Single Source of Truth (SSOT)**: Every architectural concept has exactly ONE designated home:
  - Official Colors & Grade Scale: [`AGENTS.md` Section 2.10](file:///AGENTS.md#210-grade).
  - UI Layouts, 100vh lock, 10px Gap, 40px Sub Panel, Dynamic Tables & 3-Level Typography: [`.agents/rules/ui-invariants.md`](file:///.agents/rules/ui-invariants.md).
  - Agent Workflow & Execution Protocols: [`.agents/rules/agent-workflow.md`](file:///.agents/rules/agent-workflow.md).
  - Master Navigation & Rule Quick Index: [`.antigravityrules`](file:///.antigravityrules) at root.
  - Database Schema, Migrations & RLS: [`docs/DATABASE_SCHEMA.md`](file:///docs/DATABASE_SCHEMA.md).
- Reference by pointer links (`file:///...`) rather than copy-pasting redundant rule text.

## 11. Code Quality & File Guardrails
- **No Backup Suffixes**: DILARANG membuat file dengan suffix `_2.*`, `_3.*`, `_new.*`, atau file cadangan lainnya. Semua perubahan wajib dilakukan dengan *in-place editing*.
- **Module Variable Hoisting**: Selalu hoist variabel modul penting (seperti `_currentSection`, modal references) di baris teratas modul.
- **JavaScript Syntax Validation**: Setiap selesai mengedit file JavaScript, jalankan `npm run test:syntax` (in-process AST engine 0.14 detik untuk 50 file) atau `node --check <file>` untuk memastikan tidak ada syntax error.



