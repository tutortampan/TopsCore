import { getSupabase } from '../js/supabase.js';

async function main() {
  const supabase = await getSupabase();
  const batchId = '3e7288b7-a90e-4323-9b02-24e73991f0d7';
  
  // 1. Get Batch info
  const { data: batch } = await supabase.from('batches').select('id, name, program_id').eq('id', batchId).single();
  console.log(`=== BATCH: ${batch.name} (${batch.id}) ===\n`);

  // 2. Get All Students in Batch
  const { data: students } = await supabase
    .from('students')
    .select('id, name, is_active, level_id')
    .eq('batch_id', batchId)
    .order('name');

  console.log(`Found ${students.length} students in Batch ${batch.name}:\n`);

  // 3. Get Classes and Tests for this Program / Level
  const { data: classes } = await supabase
    .from('classes')
    .select('id, name, level_id, program_id')
    .eq('program_id', batch.program_id)
    .order('name');

  console.log('Classes for this program:', classes.map(c => `${c.name} (${c.id})`));

  // Focus on 2nd Vocabulary class
  const vocabClass = classes.find(c => c.name.includes('2nd Vocabulary')) || classes[0];
  console.log(`\nAuditing Class: ${vocabClass.name} (${vocabClass.id})`);

  const { data: tests } = await supabase
    .from('tests')
    .select('id, title, shell_code, test_type, minimum_required_score, display_order, payload')
    .eq('class_id', vocabClass.id)
    .is('deleted_at', null)
    .order('display_order', { ascending: true });

  console.log(`Tests in ${vocabClass.name}:`, tests.length);

  // Group tests by theme
  const themeTests = {};
  tests.forEach(t => {
    const tc = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : 'Other');
    if (!themeTests[tc]) themeTests[tc] = [];
    themeTests[tc].push(t);
  });
  console.log('Themes in class:', Object.keys(themeTests));

  // Get all attempts for all students in this class
  const studentIds = students.map(s => s.id);
  const testIds = tests.map(t => t.id);

  const { data: allAttempts } = await supabase
    .from('attempts')
    .select('id, student_id, test_id, percentage, effective_score, status, started_at, submitted_at, is_forgiven')
    .in('student_id', studentIds)
    .in('test_id', testIds)
    .order('created_at', { ascending: false });

  console.log(`Total attempts recorded in class: ${allAttempts?.length || 0}\n`);

  // Check in-progress or stuck attempts
  const inProgressAttempts = (allAttempts || []).filter(a => a.status === 'in_progress');
  console.log(`Currently IN_PROGRESS attempts: ${inProgressAttempts.length}`);
  if (inProgressAttempts.length > 0) {
    inProgressAttempts.forEach(a => {
      const stu = students.find(s => s.id === a.student_id);
      const tst = tests.find(t => t.id === a.test_id);
      console.log(`  - ⚠️ STUCK/IN_PROGRESS: Student "${stu?.name}" on "${tst?.title}" started at ${a.started_at}`);
    });
  }

  console.log('\n======================================================');
  console.log('DETAILED STUDENT-BY-STUDENT PROGRESSION BREAKDOWN');
  console.log('======================================================\n');

  for (const student of students) {
    const stuAtts = (allAttempts || []).filter(a => a.student_id === student.id);
    
    // Count passes per test (min score 50% or is_forgiven)
    const passCountByTest = {};
    const bestScoreByTest = {};
    const inProgByTest = {};

    stuAtts.forEach(a => {
      const tid = a.test_id;
      if (a.status === 'in_progress') {
        inProgByTest[tid] = a;
      } else {
        const score = a.effective_score != null ? Number(a.effective_score) : Number(a.percentage || 0);
        if (bestScoreByTest[tid] == null || score > bestScoreByTest[tid]) {
          bestScoreByTest[tid] = score;
        }
        if (a.is_forgiven || score >= 50) {
          passCountByTest[tid] = (passCountByTest[tid] || 0) + 1;
        }
      }
    });

    console.log(`👤 Student: ${student.name} (Active: ${student.is_active})`);
    
    // Let's see what they did in Theme C
    const themeCTasks = tests.filter(t => {
      const tc = t.payload?.theme_code || (t.shell_code ? t.shell_code.replace(/^[0-9]+/, '').charAt(0) : '');
      return tc === 'C';
    });

    themeCTasks.forEach(t => {
      const passes = passCountByTest[t.id] || 0;
      const best = bestScoreByTest[t.id] != null ? `${bestScoreByTest[t.id]}%` : 'No attempts';
      const inProg = inProgByTest[t.id] ? ' [⏳ IN_PROGRESS]' : '';
      const status = passes >= 7 ? '✅ MASTERED (>=7)' : (passes > 0 ? `🔄 IN DRILL (${passes}/7)` : '⚪ NOT STARTED');
      console.log(`   [${t.shell_code || t.title.substring(0, 15)}] Passes: ${passes}/7 | Best: ${best} | Status: ${status}${inProg}`);
    });

    // Also check Theme A and B status (did they pass theme A & B exams?)
    const examsA = tests.filter(t => t.test_type === 'exam' && (t.shell_code?.includes('A-') || t.title.includes('Theme A')));
    const examsB = tests.filter(t => t.test_type === 'exam' && (t.shell_code?.includes('B-') || t.title.includes('Theme B')));
    
    const passedExamsA = examsA.filter(e => (bestScoreByTest[e.id] || 0) >= 70 || (allAttempts || []).some(a => a.student_id === student.id && a.test_id === e.id && a.is_forgiven));
    const passedExamsB = examsB.filter(e => (bestScoreByTest[e.id] || 0) >= 70 || (allAttempts || []).some(a => a.student_id === student.id && a.test_id === e.id && a.is_forgiven));

    console.log(`   Theme A Exam Passed: ${passedExamsA.length}/${examsA.length} | Theme B Exam Passed: ${passedExamsB.length}/${examsB.length}`);
    console.log('');
  }
}

main().catch(console.error);
