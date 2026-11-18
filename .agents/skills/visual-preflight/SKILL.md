---
name: visual-preflight
description: >-
  Pre-flight verification protocol for all UI proposals, design overhauls, and planning mode (/plan) artifacts.
  Use this skill whenever initiating plans involving user interface screens, panels, modals, tables, or widgets to enforce mandatory mockups, current state screenshots, and spatial invariant checks before implementation.
---

# Visual Pre-Flight Checklist Protocol

This skill enforces rigorous UI planning standards in compliance with TopsCore `AGENTS.md` §0.2.1 & §5.2, `.agents/rules/ui-invariants.md` §1.7, and `.antigravityrules`:
1. **Current State Baseline**: Visual snapshot of the existing layout must be captured and embedded (adhering to compact resolution in `AGENTS.md` §5.2: max height ~600–800px, < 30 KB).
2. **Rolling Single Screenshot & Auto-Purge Protocol**: Saat screenshot baru dibuat, screenshot lama WAJIB langsung dihapus dari sistem (zero residual bloat). Tidak boleh menumpuk file screenshot historis.
3. **Proposed Visual Mockup**: Interactive or high-fidelity mockup showing the new layout must be embedded for user review.
4. **Spatial Invariants Verification**: 10px container gap, 40px Sub Panel (Lower Panel) height, 100vh lock, dynamic nowrap columns, and centered loading states must be explicitly validated in the plan before writing production code.

## When to Use

Activate this skill:
- During `/plan` mode whenever UI changes are involved.
- Before delegating coding tasks to subagents (`DeepCoder`).
- To generate the standard pre-flight checklist block.

## How to Apply

1. Embed the standard checklist from [checklist_template.md](./examples/checklist_template.md) into the `User Review Required` or `Verification Plan` section of the implementation plan artifact.
2. Copy uploaded user screenshots or capture existing screens into the artifact directory.
3. Construct an interactive HTML Generative UI mockup widget or code block.
4. Request explicit user approval (`request_feedback: true`) on the visual artifacts before proceeding with execution.
