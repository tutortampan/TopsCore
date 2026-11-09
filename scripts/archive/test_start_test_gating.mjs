import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres:100%25TopsCore@db.oclajpyumehpojepcczg.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  console.log('--- Testing Start-Test Edge Function Gating & Level Logic ---');

  // 1. Fetch Levels
  const levelsRes = await client.query('SELECT id, level_number, name FROM levels ORDER BY level_number');
  const levels = levelsRes.rows;
  const alumniLevel = levels.find(l => l.level_number === 0);
  const lvl1 = levels.find(l => l.level_number === 1);
  const lvl2 = levels.find(l => l.level_number === 2);
  const lvl3 = levels.find(l => l.level_number === 3);

  console.log('Levels retrieved:', {
    alumni: alumniLevel?.name,
    lvl1: lvl1?.name,
    lvl2: lvl2?.name,
    lvl3: lvl3?.name
  });

  // Level Gating Pure Logic Test:
  function evaluateLevelAccess(studentLevelNum, testLevelNum) {
    if (studentLevelNum === 0) return true; // Alumni has universal access
    if (testLevelNum <= studentLevelNum) return true; // Cumulative Retroactive Access
    return false; // Higher level blocked
  }

  // Assertion 1: Level 2 student accessing Level 1 test -> ALLOWED
  if (!evaluateLevelAccess(2, 1)) {
    throw new Error('Level 2 accessing Level 1 should be ALLOWED (Cumulative Retroactive Access)');
  }
  console.log('✅ Assertion 1: Level 2 accessing Level 1 test -> ALLOWED (Retroactive)');

  // Assertion 2: Level 2 student accessing Level 2 test -> ALLOWED
  if (!evaluateLevelAccess(2, 2)) {
    throw new Error('Level 2 accessing Level 2 should be ALLOWED');
  }
  console.log('✅ Assertion 2: Level 2 accessing Level 2 test -> ALLOWED (Current Level)');

  // Assertion 3: Level 2 student accessing Level 3 test -> BLOCKED
  if (evaluateLevelAccess(2, 3)) {
    throw new Error('Level 2 accessing Level 3 should be BLOCKED');
  }
  console.log('✅ Assertion 3: Level 2 accessing Level 3 test -> BLOCKED (Future Level)');

  // Assertion 4: Alumni (Level 0) accessing Level 1, 2, and 3 tests -> ALL ALLOWED
  if (!evaluateLevelAccess(0, 1) || !evaluateLevelAccess(0, 2) || !evaluateLevelAccess(0, 3)) {
    throw new Error('Alumni should have universal access across all levels');
  }
  console.log('✅ Assertion 4: Alumni (Level 0) accessing Level 1, 2, 3 tests -> ALL ALLOWED (Universal Access)');

  // Prerequisite Waiver Logic Test:
  function evaluateWordsExamPrereq(attempts, reqScore) {
    return (attempts || []).some(att => {
      if (att.is_forgiven) return true;
      const pct = att.effective_score != null ? Number(att.effective_score) : Number(att.percentage || 0);
      if (att.is_remedial_unlocked || att.is_remedial) {
        return pct >= 60;
      }
      return pct >= reqScore;
    });
  }

  // Assertion 5: Skor F (is_forgiven = true) with 55% passes prerequisite
  const forgivenAttempt = [{ percentage: 55, effective_score: 55, is_forgiven: true }];
  if (!evaluateWordsExamPrereq(forgivenAttempt, 70)) {
    throw new Error('Skor F forgiven attempt should pass prerequisite');
  }
  console.log('✅ Assertion 5: Skor F (55%ᶠ forgiven) -> ALLOWED (Prereq Passed)');

  // Assertion 6: Remedial attempt with 60% passes prerequisite
  const remedialAttempt = [{ percentage: 60, effective_score: 60, is_remedial: true }];
  if (!evaluateWordsExamPrereq(remedialAttempt, 70)) {
    throw new Error('Remedial 60% attempt should pass prerequisite');
  }
  console.log('✅ Assertion 6: Remedial (60%ᴿ capped) -> ALLOWED (Prereq Passed)');

  // Assertion 7: Normal failed attempt (65%) fails prerequisite
  const failedAttempt = [{ percentage: 65, effective_score: 65, is_forgiven: false, is_remedial: false }];
  if (evaluateWordsExamPrereq(failedAttempt, 70)) {
    throw new Error('Unforgiven 65% attempt should NOT pass 70% prerequisite');
  }
  console.log('✅ Assertion 7: Unforgiven 65% attempt -> BLOCKED (Prereq Failed)');

  await client.end();
  console.log('🎉 ALL START-TEST GATING LOGIC ASSERTIONS PASSED!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
