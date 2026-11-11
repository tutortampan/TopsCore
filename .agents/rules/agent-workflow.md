# TOPSCORE LMS — AGENT WORKFLOW & EXECUTION PROTOCOLS

## 1. Mandatory Task List on Proceed (Step Zero)
- **Immediate Upfront Pre-Execution**: The moment an implementation plan is approved or "Proceed" is triggered, the agent MUST IMMEDIATELY create the authoritative `tasks.md` artifact and launch it in the center editor tab as STEP ZERO AT THE VERY BEGINNING, BEFORE any code changes, file edits, or scripts are executed.
- **Auto-Open & Pin in Center Screen**: Immediately execute:
  `& "$env:LOCALAPPDATA\Programs\Antigravity IDE\bin\antigravity-ide.cmd" -r "<path/to/tasks.md>"`
  to focus and keep `tasks.md` pinned in the central editor tabs as a persistent anchor.
- **Inline Chat Rendering**: Render the active task list checklist directly in the chat response at the start so progress is immediately visible in the center of the screen. Maintain dynamic checklist updates (`- [x]`) throughout execution.

## 2. Mandatory Prompt & Typo Correction
- ALWAYS inspect user prompts for typos and grammatical errors.
- Present the corrected, polished prompt at the very beginning of the response under `### 🎯 Perbaikan Perintah (Typo Fixed)` before proceeding with any action or execution.

## 3. Standard Plan Artifact Naming Convention & Repository Dual-Write Protocol
- **Naming Standard**: All plan artifacts must strictly use the date-prefixed format:
  `YYYYMMDD - <Plan Name>.md` (e.g., `20261111 - Refactor Session Monitor.md`).
- **Repository-First Persistence (Multi-Device Git Sync)**:
  To ensure plans are accessible across multiple laptops and machines via Git, every plan artifact MUST be dual-written:
  1. Primary Repository File: `docs/plans/YYYYMMDD - <Plan Name>.md` in the TopsCore workspace.
  2. Brain Session Mirror: `<appDataDir>\brain\<conversation-id>\YYYYMMDD - <Plan Name>.md` with `ArtifactMetadata` so interactive Antigravity chat widgets and the "Proceed" button remain fully functional.

## 4. Mandatory Mockup Design & Visual Pre-Flight Protocol for UI Changes
- Whenever designing, modifying, or restyling UI components, screens, modals, or tables:
  1. Capture/embed **Current State Screenshot (Before)**.
  2. Provide interactive/high-fidelity **Visual Mockup Design (Proposed / After)**.
  3. Embed the authoritative **Visual Pre-Flight Verification Checklist** from `.agents/skills/visual-preflight/examples/checklist_template.md`.
  4. Subagent delegation and production UI code edits are strictly gated until verified by `scripts/verify_plan_preflight.mjs` and explicitly approved by the user.

## 5. Mandatory Automated Verification & Zero Manual Burden
- All verification steps must be executed completely automatically using Node.js scripts, Playwright, or test assertions.
- The burden of proof rests 100% on automated tools. Never ask the user to manually verify features or inspect elements as an acceptance mechanism.

## 6. Middle-Panel Tab Hygiene & Editor Cleanup
- After files are saved and no longer actively needed, they must not linger in the middle editor tab group.
- The agent must not open arbitrary source files in the editor; ONLY the authoritative `tasks.md` progress anchor is focused and pinned.
- Workspace editor limits enforce a maximum of 3 open editor tabs (`workbench.editor.limit.enabled: true`, `max: 3`).

## 7. Context Window Hygiene & Post-Milestone Compaction
- After completing a multi-phase implementation milestone, recommend the `/compact` slash command to summarize trajectory and free context tokens.
- Archive completed technical details in `docs/CHANGELOG.md` and `docs/DECISIONS.md`.

## 8. Side Quest Protocol for Side Conversations (/btw)
- Whenever an instruction or investigation originates from a side thread (`/btw`) or side-branched conversation:
  1. Create a dedicated plan artifact named: `Side Quest — <Descriptive Title>`.
  2. Isolate the request, technical diagnostic, and resolution without modifying the active milestone scope of the primary roadmap.

