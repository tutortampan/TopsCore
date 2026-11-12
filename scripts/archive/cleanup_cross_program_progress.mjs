import { getSupabase } from '../js/supabase.js';

async function runCleanup() {
  const isExecute = process.argv.includes('--execute');
  console.log(`=== TOPSCORE PROGRESS PURITY AUDIT & CLEANUP ===`);
  console.log(`Mode: ${isExecute ? 'EXECUTE (REAL CLEANUP)' : 'DRY-RUN (SIMULATION ONLY)'}\n`);

  const sb = await getSupabase();

  const [
    { data: students, error: sErr },
    { data: classes, error: cErr },
    { data: progress, error: pErr },
    { data: attempts, error: aErr },
    { data: tests, error: tErr }
  ] = await Promise.all([
    sb.from('students').select('id, name, program_id, batch_id'),
    sb.from('classes').select('id, name, program_id, is_active'),
    sb.from('progress').select('id, student_id, class_id, unlocked_level, highest_score'),
    sb.from('attempts').select('id, student_id, test_id'),
    sb.from('tests').select('id, class_id')
  ]);

  if (sErr || cErr || pErr) {
    console.error('Data fetch error:', { sErr, cErr, pErr });
    process.exit(1);
  }

  const studentMap = new Map((students || []).map(s => [s.id, s]));
  const classMap = new Map((classes || []).map(c => [c.id, c]));
  const testToClassMap = new Map((tests || []).map(t => [t.id, t.class_id]));

  // Build map of student -> set of class_ids where student actually has attempts
  const studentAttemptClasses = new Map();
  (attempts || []).forEach(att => {
    if (!att.student_id || !att.test_id) return;
    const cid = testToClassMap.get(att.test_id);
    if (!cid) return;
    if (!studentAttemptClasses.has(att.student_id)) {
      studentAttemptClasses.set(att.student_id, new Set());
    }
    studentAttemptClasses.get(att.student_id).add(cid);
  });

  const bogusProgressRows = [];

  (progress || []).forEach(p => {
    const student = studentMap.get(p.student_id);
    const cls = classMap.get(p.class_id);

    if (!student || !cls) {
      bogusProgressRows.push({
        id: p.id,
        reason: 'Orphaned student or class record',
        studentName: student?.name || 'Unknown',
        className: cls?.name || 'Unknown',
        hasAttempts: false
      });
      return;
    }

    const sProg = student.program_id;
    const cProg = cls.program_id;

    // Cross-program mismatch: Student is in Program A, but Class is in Program B (e.g. Evnikom in Camp)
    const isProgramMismatch = (sProg && cProg && sProg !== cProg) || (sProg && !cProg);

    if (isProgramMismatch) {
      const studentClassesWithAtts = studentAttemptClasses.get(p.student_id) || new Set();
      const hasAttempts = studentClassesWithAtts.has(p.class_id);

      bogusProgressRows.push({
        id: p.id,
        reason: `Cross-program mismatch (Student Prog: ${sProg}, Class Prog: ${cProg || 'null'})`,
        studentName: student.name,
        className: cls.name,
        hasAttempts
      });
    }
  });

  console.log(`Found ${bogusProgressRows.length} bogus/cross-program progress records:`);
  bogusProgressRows.forEach((r, idx) => {
    console.log(`  [${idx + 1}] ID: ${r.id} | Student: "${r.studentName}" | Class: "${r.className}" | Has Attempts: ${r.hasAttempts} | Reason: ${r.reason}`);
  });

  if (bogusProgressRows.length === 0) {
    console.log('\n✅ No cross-program progress pollution detected. Database is clean!');
    return;
  }

  const safeToDelete = bogusProgressRows.filter(r => !r.hasAttempts);
  console.log(`\nIdentified ${safeToDelete.length} records completely safe to purge (0 attempts).`);

  if (!isExecute) {
    console.log('\n[DRY RUN COMPLETE] To delete these bogus rows, run with --execute');
    return;
  }

  const idsToDelete = safeToDelete.map(r => r.id);
  console.log(`\nExecuting deletion of ${idsToDelete.length} bogus progress records...`);

  // Delete in batches of 50
  for (let i = 0; i < idsToDelete.length; i += 50) {
    const chunk = idsToDelete.slice(i, i + 50);
    const { error: delErr } = await sb.from('progress').delete().in('id', chunk);
    if (delErr) {
      console.error(`Error deleting batch ${i}:`, delErr);
      process.exit(1);
    }
  }

  console.log(`\n🎉 Successfully deleted ${idsToDelete.length} bogus progress records!`);
}

runCleanup().catch(err => {
  console.error('Fatal cleanup error:', err);
  process.exit(1);
});

