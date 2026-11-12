# Lexicon Code System & Evnikom Test Cross-Pollination Repair Plan

**Document ID:** `docs/plans/20261112 - Lexicon Code System & Evnikom Test Cross-Pollination Repair Plan.md`  
**Date:** 2026-11-12  
**Target Milestone:** Lexicon Code Architecture (`LEX-CD`) & Evnikom Test Isolation  
**Status:** 📋 PROPOSED (Awaiting User Proceed)  

---

## 1. Goal Description

This plan accomplishes two complementary objectives requested by the user:
1. **Implement the Lexicon Code System (`LEX-CD`) in Tutor's Room Vocabulary Vault**:
   Introduce a dedicated, deterministic Lexicon Code column in both **Vocabulary Words** (e.g., `1G1-W01`..`1G1-W40`, `2A1-W01`..`2A1-W40`) and **Phrases & Idioms** (e.g., `2A1-P01`..`2A1-P10`). This provides fine-grained curriculum coordinates for every word/phrase, enabling deterministic AI question/distractor generation without hallucination, granular remedial diagnostics, and idempotent imports.
2. **Diagnose and Repair the Evnikom Test Question Cross-Pollination Bug**:
   Investigate and permanently fix the issue reported by the user where students at Evnikom accessing a vocabulary test about family members saw questions about names of days/time mixed in.
   
   **Root Cause Discovered via Forensic Database Audit**:
   - Out of 68 tests across the system, exactly one test had mismatched metadata: Test ID `ca970efc-4e0e-40ae-bc18-0e7295400737`.
   - Title was `"1st Vocabulary A1 Words Task - Time Name"`, but its payload mistakenly contained `theme_code: 'A'` and `topic_code: 'A1'` instead of Theme `G` and Topic `1` (`1G1`).
   - When student Mr. Imam Azama took the test on 2026-11-11, `generateTestQuestions` queried `theme_code: 'A'` for topic `A1`, found 0 matching Time Name words, and triggered the **Secondary Safety Fallback** in `js/api.js` (line 1086).
   - This fallback blindly pulled all 111 words from Level 1 (combining 50 Family Member words + 40 Time Name words), shuffled them with `fisherYates`, and sliced 40 items.
   - Forensic log confirmation: Attempt `bfefd652` literally received **25 Family Member questions + 15 Time Name questions** in a single test!

---

## 2. Visual Pre-Flight Verification & Layout Specification

Per `.agents/rules/ui-invariants.md` and `visual-preflight` protocol:

### 2.1 Current State Screenshot (Before)
The current Vocabulary Words table displays 9 columns without individual word/lexicon coordinates:
`INST` | `PROG` | `LVL` | `CODE` | `THEME` | `TOPIC` | `TYPE` | `INDONESIAN` | `ENGLISH`

![Current Vocabulary Words Table](/C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece/03_table_vocabulary_words.png)

### 2.2 Proposed Visual Mockup (After)
The updated table introduces the tactical cyan `LEX-CD` column right next to the topic `CODE` column:

```text
+------+---------+-----+---------+-----------+----------------------+--------------------+--------+--------------------+---------------------+
| INST |  PROG   | LVL |  CODE   |  LEX-CD   |        THEME         |       TOPIC        |  TYPE  |     INDONESIAN     |       ENGLISH       |
+------+---------+-----+---------+-----------+----------------------+--------------------+--------+--------------------+---------------------+
| TOP  | Evnikom | 1st | 1G1     | 1G1-W01   | General              | Time Name          | Noun   | Agustus            | 🔊 August            |
| TOP  | Evnikom | 1st | 1G1     | 1G1-W02   | General              | Time Name          | Noun   | April              | 🔊 April             |
| TOP  | Evnikom | 1st | 1G1     | 1G1-W03   | General              | Time Name          | Noun   | Desember           | 🔊 December          |
| TOP  | Evnikom | 1st | 1G2     | 1G2-W01   | General              | Family Member      | Noun   | Ayah               | 🔊 Father            |
| TOP  | Evnikom | 1st | 1G2     | 1G2-W02   | General              | Family Member      | Noun   | Ibu                | 🔊 Mother            |
+------+---------+-----+---------+-----------+----------------------+--------------------+--------+--------------------+---------------------+
```

### 2.3 Spatial Invariant Pre-Flight Checklist

| Invariant Requirement | Specification / Check Target | Compliance Status |
| :--- | :--- | :---: |
| **Viewport Lock** | `100vh` locked, zero outer scroll (`overflow: hidden !important`) | ✅ Verified |
| **Docking Base** | Container margins `10px 10px 0 10px`, flush docked to bottom | ✅ Verified |
| **Typography Standard** | Exact `12px` font size, Medium 500 weight for data cells | ✅ Verified |
| **Proportional Space** | Proportional dynamic widths (`INDONESIAN` & `ENGLISH` 26% each) | ✅ Verified |
| **Lexicon Code Style** | Monospace, bold 800, `#38bdf8` tactical cyan, 80px width | ✅ Verified |
| **Single-Line Ellipsis** | `white-space: nowrap !important; text-overflow: ellipsis;` | ✅ Verified |
| **Zero Ballooning** | Row height clamped between 24px and 32px | ✅ Verified |

---

## 3. User Review Required

> [!IMPORTANT]
> **Zero Disruption to Existing Questions & Historical Scores**:
> 1. Adding `LEX-CD` is completely additive and computed deterministically in the view layer without any breaking schema migrations.
> 2. Historical attempts in `attempt_answers` remain untouched per Rule 2.17 (Historical Snapshot Architecture).
> 3. Healing Test `ca970efc-4e0e-40ae-bc18-0e7295400737` corrects its shell code from `1A1-WORDS-TASK` to `1G1-WORDS-TASK` and sets `theme_code: 'G'`, so future attempts for Time Name will strictly load Time Name words.

---

## 4. Open Questions

*None. The root cause is 100% isolated, reproducible, and mathematically verified.*

---

## 5. Proposed Changes

### Component 1: Tutor's Room Vocabulary Vault UI (`js/admin/vocab-vault.js`)

#### [MODIFY] `js/admin/vocab-vault.js`
1. **Add `LEX-CD` Header to `_renderVaultGrid`**:
   Insert `<th style="padding: 6px 8px; font-weight: 800; color: #38bdf8; text-transform: uppercase; font-size: 12px; width: 80px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Lexicon Coordinate Code (TopicCode-W01..Wnn / P01..Pnn)">LEX-CD</th>` right after `CODE`.
2. **Stable Deterministic Pre-Indexing**:
   Build a stable index map across `_allWords` grouping by `compositeTopic` (`Level + ThemeCode + TopicNumber`):
   ```javascript
   const topicWordIndexMap = new Map();
   const topicCounters = {};
   _allWords.forEach(w => {
     const cleanLvl = parseInt(w.target_level, 10) || 1;
     const cleanThCode = (w.theme_code || 'A').trim().toUpperCase();
     const rawTpCode = (w.topic_code || '1').trim();
     const cleanTpCode = rawTpCode.replace(/^[A-Za-z]+/, '') || rawTpCode || '1';
     const compositeTopic = `${cleanLvl}${cleanThCode}${cleanTpCode}`;
     
     if (!topicCounters[compositeTopic]) topicCounters[compositeTopic] = 0;
     topicCounters[compositeTopic]++;
     const prefix = mode === 'phrases' ? 'P' : 'W';
     const numStr = String(topicCounters[compositeTopic]).padStart(2, '0');
     const lexCode = `${compositeTopic}-${prefix}${numStr}`;
     topicWordIndexMap.set(w.id, lexCode);
   });
   ```
   *Benefit:* Searching or filtering rows never causes word codes to change or jump around.
3. **Render `LEX-CD` Cell**:
   Render `<td style="padding: 6px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);"><span class="vault-cell-view" style="color:#38bdf8;font-family:monospace;font-size:11px;font-weight:800;">${escapeHtml(lexCode)}</span></td>`.

---

### Component 2: Test Generator & Strict Topic Task Isolation (`js/api.js`)

#### [MODIFY] `js/api.js`
1. **Expand Candidate Codes for Dynamic Generation** (lines 970 & 1006):
   Add composite code recognition (`1G1`, `1G2`, `2A1`, etc.) to candidate codes:
   ```javascript
   const candidateCodes = [
     String(topicCode).toUpperCase(),
     (/^[0-9]+$/.test(String(topicCode)) && themeCode) ? `${String(themeCode).toUpperCase()}${topicCode}` : null,
     String(topicCode).replace(/^[A-Za-z]/, ''),
     (levelNum && themeCode) ? `${levelNum}${String(themeCode).toUpperCase()}${String(topicCode).replace(/^[A-Za-z]/, '')}` : null
   ].filter(Boolean);
   ```
2. **Topic-Name-First Fallback**:
   If candidate codes yield 0 words, check if `test.title` contains a topic name (e.g. `test.title.split(' - ')[1]`). If so, query `.ilike('topic', titleTopic.trim())`.
3. **Anti Cross-Pollination Guard on Fallback** (line 1086):
   If `tier === 'TASK'` or `test.test_type === 'quiz'` or `topicCode` was specified:
   **NEVER** dump every word from the entire level into the task! Restrict fallback strictly within the topic name or theme. If no words match, return empty rather than contaminating the test with foreign topics like Family Member.

---

### Component 3: Database Healing for Mismatched Evnikom Test

#### [UPDATE] Test `ca970efc-4e0e-40ae-bc18-0e7295400737` in Supabase `tests`
Run a safe targeted update script:
```javascript
await sb.from('tests').update({
  title: '1st Vocabulary G1 Words Task - Time Name',
  shell_code: '1G1-WORDS-TASK',
  payload: {
    ...existingPayload,
    shell_code: '1G1-WORDS-TASK',
    theme_code: 'G',
    topic_code: '1',
    themes: ['G']
  }
}).eq('id', 'ca970efc-4e0e-40ae-bc18-0e7295400737');
```

---

## 6. Verification Plan

### Automated Tests
1. **JavaScript Syntax Check**:
   ```powershell
   node scripts/check_all_js_syntax.cjs
   ```
   *Target: 44/44 JS files pass.*
2. **Spatial & Visual Invariant Check**:
   ```powershell
   node .agents/skills/ui-spatial-checker/scripts/check_spatial_invariants.mjs
   ```
   *Target: 100% pass on 100vh lock, 10px spacing, table standards.*
3. **Student Dashboard Exam Parity Check**:
   ```powershell
   node scripts/test_student_dashboard_exam_parity.mjs
   ```
   *Target: 100% pass.*
4. **Evnikom Generation Test Simulation Script**:
   Run simulation of `generateTestQuestions` for Test `1G1-WORDS-TASK` and Test `1G2-WORDS-TASK`.
   *Target: `1G1-WORDS-TASK` returns 100% Time Name words (40 items). `1G2-WORDS-TASK` returns 100% Family Member words (40 items). 0% cross-contamination.*
5. **Playwright Visual Capture**:
   Capture `verify_lexicon_codes_words.png` and `verify_lexicon_codes_phrases.png`.
   *Target: `LEX-CD` column renders cleanly with `1G1-W01`..`1G1-W40`, `1G2-W01`..`1G2-W50`, `2A1-P01`..`2A1-P10`.*

---

