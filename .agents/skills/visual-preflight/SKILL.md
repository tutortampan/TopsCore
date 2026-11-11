---
name: visual-preflight
description: >-
  Pre-flight verification protocol for all UI proposals, design overhauls, and planning mode (/plan) artifacts.
  Use this skill whenever initiating plans involving user interface screens, panels, modals, tables, or widgets to enforce mandatory mockups, current state screenshots, and spatial invariant checks before implementation.
---

# Visual Pre-Flight Checklist Protocol

This skill enforces rigorous UI planning standards in compliance with TopsCore AGENTS.md Rule 2.25 and `.antigravityrules`:
1. **Current State Baseline**: Visual snapshot of the existing layout must be captured and embedded.
2. **Proposed Visual Mockup**: Interactive or high-fidelity mockup showing the new layout must be embedded for user review.
3. **Spatial Invariants Verification**: 10px container gap, 50px lower panel height, 100vh lock, dynamic nowrap columns, and centered loading states must be explicitly validated in the plan before writing production code.

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
