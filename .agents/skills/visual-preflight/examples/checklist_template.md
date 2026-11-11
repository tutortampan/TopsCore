# Visual Pre-Flight Checklist Template

When crafting an implementation plan (`/plan`) for any task that involves modifying or adding UI components, embed the following checklist into the plan artifact:

```markdown
### 📐 Visual Pre-Flight Verification Checklist
- [ ] **Current State Screenshot (Before)**: Embedded baseline visual showing existing appearance and dimensions.
- [ ] **Proposed Visual Mockup (After)**: Interactive generative UI widget or high-fidelity mockup showing the new layout.
- [ ] **Zero Outer Page Scroll**: Verified root `100vh` lock with `calc(100vh - 60px)` console sizing.
- [ ] **Container Spacing**: Verified strict 10px gap between all cards, tables, and top/lower panels.
- [ ] **Lower Panel Alignment**: Verified 50px fixed height aligned with `.sidebar-footer`.
- [ ] **Dynamic Columns & Nowrap**: Verified `white-space: nowrap !important;` on table cells with zero clipped text.
- [ ] **Zero Dead Space**: Verified tables and cards expand to fill 100% width cleanly.
- [ ] **Language Standard**: Verified all headers, labels, and loading messages use 100% direct English.
```
