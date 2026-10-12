import { createClient } from '@supabase/supabase-js';
const supabase = createClient('https://xuiszvwfjccvucqpactf.supabase.co', 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4');

// Test 1: fetchCentralQuestions with created_at ordering (the fixed version)
const { data, error } = await supabase.from('questions').select('*, topics(name, class_id)').order('created_at').limit(3);
if (error) {
  console.log('FAIL - fetchCentralQuestions error:', error.message);
} else {
  console.log('PASS - fetchCentralQuestions query OK. Rows:', data.length, data.length > 0 ? 'Sample keys: ' + Object.keys(data[0]).join(', ') : '(table empty - that is fine)');
}

// Test 2: fetchAssessmentDefinitions which is also needed for edit
const { data: asms, error: asmErr } = await supabase.from('assessments').select('id, title, assessment_type, status, display_order, class_id, prerequisite_assessment_id').order('display_order').limit(5);
if (asmErr) {
  console.log('FAIL - fetchAssessmentDefinitions error:', asmErr.message);
} else {
  console.log('PASS - fetchAssessmentDefinitions OK. Rows:', asms.length);
  if (asms.length > 0) {
    console.log('  First assessment:', JSON.stringify({ id: asms[0].id, title: asms[0].title, status: asms[0].status, display_order: asms[0].display_order }));
  }
}

// Test 3: fetchClasses
const { data: classes, error: classErr } = await supabase.from('classes').select('id, name').limit(3);
if (classErr) {
  console.log('FAIL - fetchClasses error:', classErr.message);
} else {
  console.log('PASS - fetchClasses OK. Rows:', classes.length);
}

// Test 4: fetchTopics
const { data: topics, error: topicErr } = await supabase.from('topics').select('id, name, class_id').limit(3);
if (topicErr) {
  console.log('FAIL - fetchTopics error:', topicErr.message);
} else {
  console.log('PASS - fetchTopics OK. Rows:', topics.length);
}

console.log('\nAll wizard initialization queries tested.');
