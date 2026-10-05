# TopsCore Audit Report: Phrase Distractor Pollution & Mobile UI Fixes

## 1. Distractor Category Isolation (Edge Function)
- **Problem**: Phrase tests were polluting their distractor pools with single-word vocabulary terms because the distractor query only filtered by `theme_code` and `target_level`, neglecting `category`.
- **Root Cause Fix**: Patched `supabase/functions/start-assessment/index.ts` to strictly enforce `.eq('category', payload.category)` when fetching distractors.
- **Client-Side Redundancy**: Applied the exact same `.eq('category', assessment.category)` filter to the client-side snapshot generation fallback in `js/api.js`.
- **Edge Function Deployment**: Deployed `start-assessment` to production via Supabase CLI (`npx supabase functions deploy start-assessment`), confirmed success (version uploaded to `xuiszvwfjccvucqpactf`).
- **State Clean-Up**: Using remote database execution, manually cleared the corrupted `in_progress` attempt for Student `301be589-aba1-43be-a999-aa8ddaf6c509`. This ensures the student receives a freshly generated attempt snapshot utilizing the strict category isolation rule upon their next start/refresh.

## 2. Mobile UI Layout & Layout Fixes
- **Problem**: `<select>` dropdown text was vertically clipping on mobile, and nested containers created double scrollbars. The bottom navigation bar crowded the bottom screen edge.
- **Select Clipping Fix (`assessment.html`)**: 
  - Adjusted inline CSS for dynamically generated `<select>` tags (`renderDropdown`): increased minimum height (`min-height: 64px; line-height: 1.5`), applied bottom margin, and removed `appearance: none;` allowing native browsers to render the dropdown arrow correctly.
  - Eliminated `overflow: hidden;` from `.speech-question-card` which was abruptly cropping dropdown overflow native painting boundaries.
- **Scrollbars & Footer Fix (`css/dashboard.css`)**:
  - Ensured `.bottom-nav-bar` incorporates Mobile Safari / iOS Safe Area constraints by adding `padding-bottom: env(safe-area-inset-bottom)` and `margin-bottom: 24px` to keep it visually floating above the system home bar.

## Summary
All identified targets for the phrase distractor pollution and UI clipping bug have been resolved across both the backend logic (Supabase Edge Function) and the frontend view logic.
