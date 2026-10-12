import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xuiszvwfjccvucqpactf.supabase.co';
const supabaseKey = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testAutoSave() {
    console.log("Fetching Phrase Assessment...");
    const { data: asm } = await supabase.from('assessments')
        .select('*')
        .ilike('title', '%Phrase%')
        .eq('status', 'PUBLISHED')
        .limit(1);
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
    
    console.log(`Simulating Auto-Save for Student ${s.name} on Assessment ${a.title}...`);
    
    const H = {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
    };

    console.log("1. Calling start-assessment edge function via fetch...");
    const startReq = await fetch(`${supabaseUrl}/functions/v1/start-assessment`, {
        method: 'POST',
        headers: H,
        body: JSON.stringify({ student_id: s.id, assessment_id: a.id })
    });
    const startTxt = await startReq.text();
    if (!startReq.ok) {
        console.error("Failed to start assessment:", startReq.status, startTxt);
        return;
    }
    const startRes = JSON.parse(startTxt);
    console.log("Start Response:", JSON.stringify(startRes, null, 2).substring(0, 500)); // Log first 500 chars

    // In TopsCore, start-assessment usually returns { attempt_id, questions: [...] } or { attempt: {...}, questions: [...] }
    const attemptId = startRes.attempt_id || startRes.id || (startRes.attempt && startRes.attempt.id);
    console.log(`Attempt Started. ID: ${attemptId}`);
    
    console.log("2. Fetching generated attempt_answers...");
    const { data: answers } = await supabase.from('attempt_answers').select('*').eq('attempt_id', attemptId).limit(1);
    
    if (!answers || answers.length === 0) {
        console.log("No attempt_answers found for this attempt.");
        return;
    }
    const q = answers[0];
    
    console.log(`3. Direct updating attempt_answers row ${q.id} with student_answer...`);
    const { data: saveRes, error: saveErr } = await supabase.from('attempt_answers')
        .update({ student_answer: "Automated Phrase Test Answer", updated_at: new Date().toISOString() })
        .eq('id', q.id)
        .select();

    if (saveErr) {
        console.error("Auto-Save Failed:", saveErr);
    } else {
        console.log("Auto-Save Succeeded! Result:", saveRes);
    }
}

testAutoSave();
