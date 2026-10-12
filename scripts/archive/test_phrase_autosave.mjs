import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xuiszvwfjccvucqpactf.supabase.co';
const supabaseKey = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAutoSave() {
    console.log("Fetching Phrase Assessment...");
    const { data: asm } = await supabase.from('assessments').select('*').ilike('title', '%Phrase%').limit(1);
    if (!asm || asm.length === 0) {
        console.log("No Phrase assessment found.");
        return;
    }
    const a = asm[0];
    
    console.log("Finding a Student...");
    const { data: stu } = await supabase.from('students').select('*').limit(1);
    if (!stu || stu.length === 0) {
        console.log("No student found.");
        return;
    }
    const s = stu[0];
    
    console.log(`Starting Attempt for Student ${s.name} on Assessment ${a.title}...`);
    // Need to use edge function or direct insert? Let's check API for start_assessment
    // Actually, e2e_test_runner uses RPC or fetch. In this project, start-assessment is an edge function.
    // Let's just do a direct insert into attempt_answers if we can, or just look up an existing attempt.
    const { data: existingAttempt } = await supabase.from('assessment_attempts').select('*').eq('assessment_id', a.id).eq('student_id', s.id).limit(1);
    
    let attemptId;
    if (existingAttempt && existingAttempt.length > 0) {
        attemptId = existingAttempt[0].id;
        console.log(`Found existing attempt: ${attemptId}`);
    } else {
        console.log("Creating new attempt...");
        const { data: newAttempt, error: err } = await supabase.from('assessment_attempts').insert({
            assessment_id: a.id,
            student_id: s.id,
            status: 'IN_PROGRESS',
            started_at: new Date().toISOString()
        }).select();
        if (err) { console.error(err); return; }
        attemptId = newAttempt[0].id;
        console.log(`Created new attempt: ${attemptId}`);
    }

    // Get a question
    const { data: questions } = await supabase.from('questions').select('*').eq('assessment_id', a.id).limit(1);
    if (!questions || questions.length === 0) {
        console.log("No questions found for this assessment.");
        return;
    }
    const q = questions[0];

    console.log(`Simulating Auto-Save for Question: ${q.id}`);
    const { error: saveError } = await supabase.from('attempt_answers').upsert({
        attempt_id: attemptId,
        question_id: q.id,
        answer_text: 'Test Phrase Answer',
        answered_at: new Date().toISOString()
    }, { onConflict: 'attempt_id, question_id' });

    if (saveError) {
        console.error("Auto-Save Failed!", saveError);
    } else {
        console.log("Auto-Save Succeeded!");
    }
}
testAutoSave();
