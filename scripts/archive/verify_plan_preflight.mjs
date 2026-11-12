/**
 * verify_plan_preflight.mjs
 * 
 * Automated Pre-Flight Quality Gate for TopsCore LMS Implementation Plans.
 * Enforces Rule 23 (Visual Pre-Flight Verification Checklist & Subagent Gating).
 * 
 * Usage:
 *   node scripts/verify_plan_preflight.mjs <path-to-plan.md>
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

const planPath = process.argv[2];

if (!planPath) {
  console.error('❌ Error: Missing plan file path.\nUsage: node scripts/verify_plan_preflight.mjs <path-to-plan.md>');
  process.exit(1);
}

const resolvedPath = path.resolve(planPath);
if (!fs.existsSync(resolvedPath)) {
  console.error(`❌ Error: Plan file not found at ${resolvedPath}`);
  process.exit(1);
}

console.log(`🔍 [visual-preflight] Auditing plan: ${path.basename(resolvedPath)}...\n`);
const content = fs.readFileSync(resolvedPath, 'utf-8');

// 1. Check for Visual Pre-Flight Verification Checklist header
const hasChecklistHeader = /###?\s*(?:📐\s*)?Visual Pre-Flight Verification Checklist/i.test(content);
assert.ok(
  hasChecklistHeader,
  '❌ [Pre-Flight Gate Rejected] Plan must contain section "Visual Pre-Flight Verification Checklist" (Rule 23).'
);
console.log('  ✔ Visual Pre-Flight Verification Checklist section verified');

// 2. Detect UI modification scope
const uiKeywords = /\b(ui|css|table|tables|panel|panels|modal|modals|button|buttons|html|layout|viewport|screen|screens)\b/i;
const isUiPlan = uiKeywords.test(content);

if (isUiPlan) {
  console.log('  ℹ UI scope detected in plan. Checking visual artifact deliverables...');

  // 3. Must contain visual baseline or proposed mockup reference (images, generative UI, or mockups)
  const hasImage = /!\[.*?\]\(.*?\)/.test(content) || /<img\s+[^>]*src=/i.test(content);
  const hasMockupCode = /```(?:html|carousel|mermaid)[\s\S]*?```/i.test(content);
  const mentionsVisualBaseline = /baseline|screenshot|mockup|visual/i.test(content);

  assert.ok(
    (hasImage || hasMockupCode) && mentionsVisualBaseline,
    '❌ [Pre-Flight Gate Rejected] UI plans must include visual artifacts (images, mockups, or diagrams) under Rule 2.25 and Rule 23.'
  );
  console.log('  ✔ Visual deliverables (mockups/diagrams/screenshots) declared in plan');

  // 4. Check spatial invariant assertions in checklist
  const has100vh = /100vh|zero\s+(?:outer\s+)?(?:page\s+)?scroll/i.test(content);
  const has10pxGap = /10px\s+(?:container\s+)?gap/i.test(content);
  const has50pxPanel = /50px\s+(?:lower\s+)?panel|50px\s+fixed\s+height/i.test(content);
  const hasNowrap = /nowrap|single-line/i.test(content);
  const hasEnglish = /english/i.test(content);

  assert.ok(has100vh, '❌ [Pre-Flight Gate Rejected] Checklist must verify 100vh zero outer page scroll invariant.');
  assert.ok(has10pxGap, '❌ [Pre-Flight Gate Rejected] Checklist must verify 10px container gap invariant.');
  assert.ok(has50pxPanel, '❌ [Pre-Flight Gate Rejected] Checklist must verify 50px lower panel height invariant.');
  assert.ok(hasNowrap, '❌ [Pre-Flight Gate Rejected] Checklist must verify dynamic nowrap column invariant.');
  assert.ok(hasEnglish, '❌ [Pre-Flight Gate Rejected] Checklist must verify English language standard.');

  console.log('  ✔ Spatial invariants verified (100vh lock, 10px gap, 50px lower panel, nowrap columns, English UI)');
} else {
  console.log('  ℹ Non-UI architectural plan detected. Standard checklist validated.');
}

console.log('\n🎉 [visual-preflight] PLAN PRE-FLIGHT AUDIT PASSED (100%)! Subagent delegation permitted.\n');

