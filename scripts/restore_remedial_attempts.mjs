/**
 * restore_remedial_attempts.mjs
 * Restores the 821 synthetic remedial attempts deleted by Phase 227.
 *
 * Logic:
 * For each test that has forgiven_student_ids in its payload:
 *   For each student in that list:
 *     If student has NO submitted attempt for that test → create a 60% remedial attempt.
 * This restores the 60%ᴿ display that was visible in Image 2.
 *
 * The forgiven_student_ids array stays intact (used for prerequisite bypass).
 * Now that isForgiven is only triggered when no real attempt exists,
 * students with restored attempts will show 60%ᴿ (not F).
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';

console.log('SUPABASE_URL:', SUPABASE_URL);
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const now = new Date().toISOString();

// Grade helper
const gradeFor = (pct) => {
  if (pct >= 100) return '★';
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 30) return 'D';
  return 'E';
};

async function run() {
  console.log('\n=== RESTORE REMEDIAL ATTEMPTS ===\n');

  // 1. Fetch all tests that have forgiven_student_ids
  const { data: tests, error: tErr } = await sb
    .from('tests')
    .select('id, title, test_type, category, shell_code, payload, display_order')
    .not('payload->forgiven_student_ids', 'is', null);

  if (tErr) { console.error('Fetch tests error:', tErr); process.exit(1); }

  const withForgiven = (tests || []).filter(t => {
    const ids = t.payload?.forgiven_student_ids;
    return Array.isArray(ids) && ids.length > 0;
  });
  console.log(`Tests with forgiven_student_ids: ${withForgiven.length}`);

  if (withForgiven.length === 0) {
    console.log('Nothing to restore.');
    return;
  }

  // 2. Collect all unique student IDs across all tests
  const allStudentIds = [...new Set(withForgiven.flatMap(t => t.payload.forgiven_student_ids))];
  const allTestIds = withForgiven.map(t => t.id);

  console.log(`Unique forgiven students: ${allStudentIds.length}`);
  console.log(`Tests to check: ${allTestIds.length}`);

  // 3. Fetch all existing attempts for these students + tests
  const { data: existingAttempts, error: aErr } = await sb
    .from('attempts')
    .select('id, student_id, test_id, status, score, percentage, effective_score, total_questions')
    .in('student_id', allStudentIds)
    .in('test_id', allTestIds);

  if (aErr) { console.error('Fetch attempts error:', aErr); process.exit(1); }

  // Index by student_id + test_id
  const existingMap = {};
  (existingAttempts || []).forEach(a => {
    const k = `${a.student_id}_${a.test_id}`;
    if (!existingMap[k]) existingMap[k] = [];
    existingMap[k].push(a);
  });

  // 4. For each test + each forgiven student, check if submitted attempt exists
  const inserts = [];
  let skippedNaturalPass = 0;
  let skippedHasAttempt = 0;

  for (const test of withForgiven) {
    const forgivenIds = test.payload.forgiven_student_ids || [];

    // Determine max questions and fill score
    const totalQ = test.payload?.total_questions
      ? Number(test.payload.total_questions)
      : (test.test_type === 'exam' || (test.category||'').toUpperCase() === 'EXAM' ? 150 : 40);
    const fillPct = 60;
    const fillScore = Math.round(totalQ * (fillPct / 100) * 10) / 10;
    const fillCorrect = Math.round(totalQ * fillPct / 100);
    const fillGrade = gradeFor(fillPct);

    for (const sId of forgivenIds) {
      const k = `${sId}_${test.id}`;
      const atts = existingMap[k] || [];
      const submittedAtts = atts.filter(a =>
        ['submitted', 'auto_submitted', 'evaluated', 'graded'].includes(String(a.status || '').toLowerCase())
      );

      if (submittedAtts.length > 0) {
        // Check if best score is already >= fillPct (natural pass - never overwrite)
        const bestPct = Math.max(...submittedAtts.map(a => Number(a.effective_score ?? a.percentage ?? 0)));
        if (bestPct >= fillPct) {
          skippedNaturalPass++;
        } else {
          skippedHasAttempt++;
        }
        continue; // Student already has an attempt — no need to create
      }

      // No submitted attempt exists — create synthetic remedial
      inserts.push({
        student_id: sId,
        test_id: test.id,
        attempt_number: 1,
        started_at: now,
        expires_at: now,
        submitted_at: now,
        status: 'submitted',
        score: fillScore,
        correct_count: fillCorrect,
        total_questions: totalQ,
        percentage: fillPct,
        effective_score: fillScore,
        grade: fillGrade,
        is_best_score: true,
        is_remedial_unlocked: true,
        created_at: now,
        updated_at: now
      });
    }
  }

  console.log(`\nStudents with natural pass (skipped): ${skippedNaturalPass}`);
  console.log(`Students with existing attempt (skipped): ${skippedHasAttempt}`);
  console.log(`Attempts to create: ${inserts.length}`);

  if (inserts.length === 0) {
    console.log('All students already have attempts. Nothing to insert.');
    return;
  }

  // 5. Insert in chunks
  const chunk = 50;
  let inserted = 0;
  for (let i = 0; i < inserts.length; i += chunk) {
    const batch = inserts.slice(i, i + chunk);
    const { error: insErr } = await sb.from('attempts').insert(batch);
    if (insErr) {
      console.error(`Insert error at chunk ${i}:`, insErr.message);
    } else {
      inserted += batch.length;
      process.stdout.write(`\rInserted: ${inserted}/${inserts.length}`);
    }
  }

  console.log(`\n\n✅ DONE! Restored ${inserted} remedial attempts.`);
  console.log('Students will now show 60%ᴿ for forgiven prerequisite cells.');
  console.log('F marker will only appear for students with NO attempt in those cells.\n');
}

run().catch(e => { console.error(e); process.exit(1); });
