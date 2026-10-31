import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function inspectAttempts() {
  const classId = 'ab33498a-90e6-44b7-83f4-5765f964543e';
  const { data: tests } = await sb.from('tests').select('id, title, display_order').eq('class_id', classId).order('display_order');
  const testIds = tests.map(t => t.id);
  const testMap = Object.fromEntries(tests.map(t => [t.id, t]));

  // Get Batch 133 students
  const batchId = '3b697c66-da5d-4a68-b823-ba3d06353852';
  const { data: students } = await sb.from('students').select('id, name, is_active').eq('batch_id', batchId).order('name');
  console.log('Total students in Batch 133:', students.length);
  const studentIds = students.map(s => s.id);

  // Fetch all attempts for these students in these tests
  let allAtts = [];
  let page = 0;
  while (true) {
    const { data: atts, error } = await sb.from('attempts')
      .select('id, student_id, test_id, attempt_number, score, total_questions, percentage, grade, effective_score, is_remedial_unlocked, is_best_score, status, started_at, submitted_at, created_at')
      .in('test_id', testIds)
      .in('student_id', studentIds)
      .range(page * 1000, (page + 1) * 1000 - 1);
    if (!atts || atts.length === 0) break;
    allAtts.push(...atts);
    if (atts.length < 1000) break;
    page++;
  }
  console.log('Total attempts for Batch 133 in 3rd Vocabulary:', allAtts.length);

  // Check how many have is_remedial_unlocked = true
  const remedialTrue = allAtts.filter(a => a.is_remedial_unlocked === true);
  console.log('Attempts with is_remedial_unlocked === true:', remedialTrue.length);

  // Check how many have status != SUBMITTED
  const nonSubmitted = allAtts.filter(a => a.status !== 'SUBMITTED');
  console.log('Non-submitted attempts:', nonSubmitted.length);

  const studentSummary = [];

  for (const s of students) {
    const sAtts = allAtts.filter(a => a.student_id === s.id);
    const bestAtts = sAtts.filter(a => a.is_best_score);
    const examOrders = [7, 8, 17, 18, 29, 30, 39, 40];
    const examAtts = bestAtts.filter(a => {
      const order = testMap[a.test_id]?.display_order;
      return examOrders.includes(order);
    });
    
    // Check which tests the student actually took
    const completedOrders = bestAtts.map(a => testMap[a.test_id]?.display_order).filter(Boolean).sort((a,b) => a-b);
    const completedExams = examAtts.map(a => testMap[a.test_id]?.display_order).sort((a,b) => a-b);
    
    studentSummary.push({
      name: s.name,
      isActive: s.is_active,
      totalAttempts: sAtts.length,
      bestAttempts: bestAtts.length,
      completedTestsCount: completedOrders.length,
      completedOrders,
      completedExamsCount: completedExams.length,
      completedExams
    });
  }

  console.table(studentSummary.map(s => ({
    Name: s.name,
    Active: s.isActive,
    'Tests Taken': s.completedTestsCount,
    'Exams Taken': s.completedExamsCount,
    'Exam List': s.completedExams.join(', ')
  })));

  fs.writeFileSync('scripts/student_real_attempts_summary.json', JSON.stringify(studentSummary, null, 2));
}

inspectAttempts();
