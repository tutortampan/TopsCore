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

## 4. Mandatory "Before & After" Visual Planning Protocol for All UI, Font, Color & Table Changes
Whenever designing, modifying, or restyling ANY visual presentation component (UI layout, Font typography, Color palettes, Tables, Modals, Buttons, Badges, or Spacing):
1. **Mandatory Standardized Before & After Comparative Matrix**:
   The plan artifact (`docs/plans/YYYYMMDD - <Plan Name>.md`) MUST explicitly provide a structured comparative breakdown before modifying any code using this exact 4-column standard:

   | Komponen / Properti | 🔴 Kondisi Saat Ini (BEFORE) | 🟢 Target Perubahan (AFTER) | Dasar Aturan / Alasan |
   | :--- | :--- | :--- | :--- |
   | `Selector / Token` | Nilai eksak, hex, font, atau screenshot baseline | Nilai target eksak, CSS rule, atau mockup | Invariant yang dipenuhi (Rule 2.10, 100vh lock, 12px, dll) |

2. **Visual Pre-Flight Verification**:
   - Embed **Current State Screenshot / Code (Before)**.
   - Embed **Proposed Visual Mockup / Code (After)**.
   - Embed the authoritative **Visual Pre-Flight Verification Checklist** from `.agents/skills/visual-preflight/examples/checklist_template.md`.
3. **Strict Execution Gate**:
   Subagent delegation and production UI code edits are STRICTLY PROHIBITED until the Before & After plan is reviewed and explicitly approved by the user.

## 5. Mandatory Automated Verification & Zero Manual Burden
- All verification steps must be executed completely automatically using Node.js scripts, Playwright, or test assertions.
- The burden of proof rests 100% on automated tools. Never ask the user to manually verify features or inspect elements as an acceptance mechanism.

## 6. Middle-Panel Tab Hygiene & Editor Cleanup
- After files are saved and no longer actively needed, they must not linger in the middle editor tab group.
- The agent must not open arbitrary source files in the editor; ONLY the authoritative `tasks.md` progress anchor is focused and pinned.
- Workspace editor limits enforce a maximum of 3 open editor tabs (`workbench.editor.limit.enabled: true`, `max: 3`).

## 7. Mandatory Context Window Hygiene & Automatic Compaction Advisory Trigger (`/compact all`)
- **Automated Advisory Trigger**: The agent MUST actively monitor conversation length and progress milestones.
- **Mandatory Trigger Conditions**:
  1. The moment a multi-phase task or implementation milestone is completed (`[x]` in `tasks.md`).
  2. Whenever the conversation history reaches $\ge 20$ interactive tool steps or turns.
- **Required Response Termination Action**:
  The agent is strictly forbidden from concluding its response without appending the prominent compaction advisory call-to-action:
  ```markdown
  ---
  > [!IMPORTANT]
  > 🔄 **Context Window Optimization Required**: Milestone telah selesai / percakapan telah mencapai batas optimal.
  > Segera ketik `/compact all` pada kolom chat untuk mengompres riwayat percakapan agar respons AI tetap cepat, akurat, dan hemat token context!
  ```
- **Post-Compaction Hygiene**: Ensure all technical details and decisions are persisted in `docs/CURRENT_STATE.md`, `docs/CHANGELOG.md`, and `docs/DECISIONS.md`.

## 8. Anti-Yapping Discipline & Chat-Artifact Separation
To strictly protect the user's context window budget from premature exhaustion:
- Whenever an artifact (plan, proposal, research report, or walkthrough) has been created or updated:
  1. The AI chat response is STRICTLY CAPPED at 15–20 lines maximum.
  2. The chat message MUST contain ONLY:
     - Direct clickable link to the artifact (`[filename.md](file:///...)`).
     - A concise bulleted summary of key architectural decisions or questions requiring user input.
     - The clear, immediate next action step.
  3. **Zero Duplication**: The agent is strictly prohibited from re-summarizing, pasting large code blocks, or duplicating tables that already exist inside the artifact.

