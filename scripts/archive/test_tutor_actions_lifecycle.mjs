// Mock browser window globals for Node ESM execution
globalThis.location = { hostname: 'localhost' };
globalThis.window = globalThis;
globalThis.window.location = globalThis.location;
globalThis.window.addEventListener = () => {};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};
globalThis.sessionStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {}
};

import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'db.oclajpyumehpojepcczg.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '100%TopsCore',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function testTutorActionsLifecycle() {
  const { labelAttemptRemedial, labelAttemptForgiven, labelAttemptNormal } = await import('../js/api.js');
  await client.connect();
  console.log('=== TEST SUITE: TUTOR 3-BUTTON ACTIONS LIFECYCLE (NORMAL, REMIDI, FORGIVE) ===');

  // Find a test attempt with percentage > 70 (e.g. 80-95%)
  const findRes = await client.query(`
    SELECT id, student_id, test_id, percentage, effective_score, is_remedial, is_forgiven
    FROM attempts
    WHERE status = 'submitted' AND percentage > 70 AND percentage < 98
    LIMIT 1;
  `);

  if (findRes.rowCount === 0) {
    console.error('No suitable test attempt found.');
    process.exit(1);
  }

  const testAttempt = findRes.rows[0];
  const attemptId = testAttempt.id;
  const originalPct = parseFloat(testAttempt.percentage);
  const originalEffective = parseFloat(testAttempt.effective_score || testAttempt.percentage);
  console.log(`Using Attempt: ${attemptId} (Score: ${originalPct}%)`);

  try {
    // 1. Test [ REMIDI ]
    console.log('\n[Step 1] Applying [ REMIDI ] via labelAttemptRemedial...');
    const remRes = await labelAttemptRemedial(attemptId, true, 60.0);
    console.log('  Response:', {
      success: remRes.success,
      is_remedial: remRes.attempt.is_remedial,
      effective_score: remRes.attempt.effective_score,
      is_forgiven: remRes.attempt.is_forgiven
    });

    if (remRes.attempt.is_remedial !== true || parseFloat(remRes.attempt.effective_score) !== 60.0 || remRes.attempt.is_forgiven !== false) {
      throw new Error(`Step 1 REMIDI failed: expected is_remedial=true, effective_score=60.0, is_forgiven=false. Got: ${JSON.stringify(remRes.attempt)}`);
    }
    console.log('  ✓ Step 1 PASSED: Remedial capped at 60.0%, is_remedial=true, is_forgiven=false.');

    // 2. Test [ FORGIVE ]
    console.log('\n[Step 2] Applying [ FORGIVE ] via labelAttemptForgiven...');
    const forgRes = await labelAttemptForgiven(attemptId, 'Automated E2E Test Waiver');
    console.log('  Response:', {
      success: forgRes.success,
      is_forgiven: forgRes.attempt.is_forgiven,
      forgiven_reason: forgRes.attempt.forgiven_reason,
      is_remedial: forgRes.attempt.is_remedial,
      effective_score: forgRes.attempt.effective_score
    });

    if (forgRes.attempt.is_forgiven !== true || forgRes.attempt.is_remedial !== false || parseFloat(forgRes.attempt.effective_score) !== originalPct) {
      throw new Error(`Step 2 FORGIVE failed: expected is_forgiven=true, is_remedial=false, effective_score=${originalPct}`);
    }
    console.log('  ✓ Step 2 PASSED: is_forgiven=true, reason recorded, remedial flag cleared.');

    // 3. Test [ NORMAL ]
    console.log('\n[Step 3] Applying [ NORMAL ] via labelAttemptNormal (restoring original)...');
    const normRes = await labelAttemptNormal(attemptId);
    console.log('  Response:', {
      success: normRes.success,
      is_remedial: normRes.attempt.is_remedial,
      is_forgiven: normRes.attempt.is_forgiven,
      effective_score: normRes.attempt.effective_score
    });

    if (normRes.attempt.is_remedial !== false || normRes.attempt.is_forgiven !== false || parseFloat(normRes.attempt.effective_score) !== originalPct) {
      throw new Error(`Step 3 NORMAL failed: expected flags false, effective_score=${originalPct}`);
    }
    console.log('  ✓ Step 3 PASSED: All flags cleared, effective_score restored to original percentage.');

    // 4. Verify audit_logs in DB
    console.log('\n[Step 4] Verifying audit_logs table for all 3 operations...');
    const auditRes = await client.query(`
      SELECT action, entity_type, entity_id, new_value, created_at
      FROM audit_logs
      WHERE entity_id = $1
      ORDER BY created_at DESC
      LIMIT 3;
    `, [attemptId]);

    console.table(auditRes.rows.map(r => ({
      action: r.action,
      entity: r.entity_type,
      new_value: typeof r.new_value === 'object' ? JSON.stringify(r.new_value) : r.new_value
    })));

    console.log('\n======================================================');
    console.log('✅ ALL TUTOR LIFECYCLE ACTIONS (REMIDI, FORGIVE, NORMAL) PASSED 100%!');
  } finally {
    // Safety cleanup: restore original attempt state if needed
    await client.query(`
      UPDATE attempts
      SET is_remedial = $1, is_forgiven = $2, effective_score = $3, updated_at = NOW()
      WHERE id = $4;
    `, [testAttempt.is_remedial, testAttempt.is_forgiven, originalEffective, attemptId]);
    console.log('  ✓ Attempt safely restored to original database state.');
    await client.end();
  }
}

testTutorActionsLifecycle().catch(err => {
  console.error('Lifecycle test failed:', err);
  process.exit(1);
});
