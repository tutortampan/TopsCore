# Learning Proposal: Mandatory Mockup Design & Current State Screenshot for UI Changes

## 1. Classification & Scope
* **Type:** Workspace Rule (Invariable Behavioral Guardrail)
* **Target File:** `AGENTS.md` (TopsCore Execution Contract)
* **Target Location:** Section 2 (`NON-NEGOTIABLE BUSINESS RULES`), under new Subsection `2.25`
* **Trigger Command:** `/learn`
* **Scope:** Universal across all UI change proposals (Class Hub, Test Room, Result Page, Student Gate, Tutor Room / Admin screens, Modals, and Widgets).

---

## 2. Rationale & Problem Statement
During UI change requests or redesign tasks, proposing changes solely through text descriptions, code snippets, or abstract planning can lead to misalignment with the user's intended aesthetic (as seen in earlier iterations of the hazard submit modal). 

The user has explicitly instructed:
> *"setiap kali ada rnacan perubahan pda UI harus disertai mock design dan sreen shot tampilan sekarang /learn"*

To ensure 100% visual alignment, eliminate ambiguity, and protect the user experience, the agent must treat the generation of a **Current State Screenshot (Before)** and a **Visual Mockup Design (After / Proposed)** as a mandatory prerequisite for any UI modification proposal.

---

## 3. Proposed Text Addition in `AGENTS.md`

```markdown
## 2.25 Mandatory Mockup Design & Current State Screenshot for All UI Proposals (/learn)

Whenever a task involves designing, modifying, restyling, or restructuring any user interface (screens, modals, panels, widgets, or components in `index.html`, `dashboard.html`, `test.html`, `result.html`, or `admin.html`), the agent MUST strictly provide visual artifacts before proceeding with production code changes.

Rules:
1. **Current State Screenshot (Before)**:
   - The agent MUST capture, retrieve, or present an accurate visual snapshot/screenshot of the current UI component or screen as it currently renders in the application.
   - This establishes an unambiguous baseline of the existing layout, dimensions, colors, and behavior.
2. **Visual Mockup Design (Proposed / After)**:
   - The agent MUST provide visual mockup designs illustrating the proposed appearance.
   - For interactive elements, modals, and layouts, the agent SHOULD deliver an interactive HTML mockup widget (via `generative_ui` inline embed or standalone preview suite) or high-fidelity visual mockups so the user can interactively test and preview the proposed layout, typography, colors, and responsive behavior.
3. **Integration with Planning Mode (`/plan`)**:
   - In any implementation plan involving UI changes, the plan artifact MUST embed or directly link both the current state visual/screenshot and the proposed visual mockup.
   - The agent MUST NOT write production UI code or modify production CSS/HTML until the user has reviewed and explicitly approved the visual mockup.
```

---

## 4. Verification & Approval
Once approved by the user, this new rule will be appended to `AGENTS.md` right after Section `2.24`, ensuring that all current and future agents working on TopsCore strictly adhere to this visual design protocol.
