// ==============================================================================
// Script: scripts/sanitize_attempts_effective_score.mjs
// Description: Sanitizes corrupted effective_score entries in Supabase attempts table.
//              Resolves instances where raw score (points > 100) was stored in effective_score,
//              restoring authentic percentages (0-100) and authoritative grades (A, B, C, D, E, ★).
// ==============================================================================

import { getSupabase } from '../js/supabase.js';
import { calculateGrade } from '../js/grading.js';

async function sanitizeAttempts() {
  console.log('=== SANITIZING ATTEMPTS EFFECTIVE_SCORE & GRADE ===');
  const sb = await getSupabase();

  let allAttempts = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await sb
      .from('attempts')
      .select('id, student_id, test_id, score, total_questions, percentage, effective_score, is_remedial_unlocked, grade, status')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allAttempts.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  console.log(`Loaded ${allAttempts.length} total attempts from Supabase.`);

  const toUpdate = [];

  for (const att of allAttempts) {
    const totalQ = Number(att.total_questions || 0);
    const rawScore = Number(att.score || 0);
    let pct = Number(att.percentage);

    // If percentage is null/NaN or 0 while totalQ > 0 and rawScore > 0, recalculate percentage
    if (isNaN(pct) || (pct === 0 && rawScore > 0 && totalQ > 0)) {
      pct = Math.round((rawScore / totalQ) * 1000) / 10;
    }
    pct = Math.min(100.0, Math.max(0.0, Number(pct || 0)));

    const isRem = Boolean(att.is_remedial_unlocked);
    const expectedEff = isRem ? Math.min(pct, 60.0) : pct;
    const roundedExpectedEff = Math.round(expectedEff * 10) / 10;

    const curEff = att.effective_score != null ? Number(att.effective_score) : null;
    const curGrade = att.grade;
    const expectedGrade = calculateGrade(roundedExpectedEff);

    // Check if effective_score or grade needs fixing:
    const needsEffFix = curEff == null || curEff > 100.0 || Math.abs(curEff - roundedExpectedEff) > 0.1;
    const needsGradeFix = !curGrade || curGrade !== expectedGrade;

    if (needsEffFix || needsGradeFix) {
      toUpdate.push({
        id: att.id,
        percentage: pct,
        effective_score: roundedExpectedEff,
        grade: expectedGrade,
        old_eff: curEff,
        old_grade: curGrade,
        old_pct: att.percentage,
        score: att.score,
        total_questions: att.total_questions
      });
    }
  }

  console.log(`Found ${toUpdate.length} attempts needing effective_score / grade sanitization.`);

  if (toUpdate.length === 0) {
    console.log('No attempts need sanitization. Database is already clean.');
    return;
  }

  // Sample preview of changes
  console.log('\nPreview of first 5 updates:');
  toUpdate.slice(0, 5).forEach((u, i) => {
    console.log(`  [${i+1}] Attempt ${u.id.slice(0, 8)}... | PTS: ${u.score}/${u.total_questions} | EFF: ${u.old_eff} -> ${u.effective_score} | GRD: ${u.old_grade} -> ${u.grade}`);
  });

  // Batch update in chunks of 50
  const CHUNK_SIZE = 50;
  let updatedCount = 0;
  for (let i = 0; i < toUpdate.length; i += CHUNK_SIZE) {
    const chunk = toUpdate.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(async item => {
      const { error } = await sb
        .from('attempts')
        .update({
          percentage: item.percentage,
          effective_score: item.effective_score,
          grade: item.grade,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.id);
      if (error) {
        console.error(`Error updating attempt ${item.id}:`, error);
      } else {
        updatedCount++;
      }
    }));
    console.log(`Updated ${updatedCount}/${toUpdate.length} attempts...`);
  }

  console.log(`\n✅ Sanitization complete! ${updatedCount} attempts successfully sanitized.`);

  // Verify Laura Fardila's attempt
  const { data: lauraAtt } = await sb
    .from('attempts')
    .select('id, score, total_questions, percentage, effective_score, grade')
    .eq('id', '452540aa-3b61-4224-8b61-f38ac1fa954e')
    .single();
  console.log('\nVerified Laura Fardila Attempt:', lauraAtt);

  // Verify no attempts remain with effective_score > 100
  const { data: remainingOver100 } = await sb
    .from('attempts')
    .select('id, effective_score')
    .gt('effective_score', 100);
  console.log(`Remaining attempts with effective_score > 100: ${remainingOver100?.length || 0}`);
}

sanitizeAttempts().catch(err => {
  console.error('Fatal error during sanitization:', err);
  process.exit(1);
});

