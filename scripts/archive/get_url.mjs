import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xuiszvwfjccvucqpactf.supabase.co';
const supabaseKey = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const { data: asm } = await supabase.from('assessments').select('*').ilike('title', '%Phrase%').limit(1);
    if (!asm || asm.length === 0) {
        console.log("No Phrase assessment found.");
        return;
    }
    const a = asm[0];
    
    const { data: stu } = await supabase.from('students').select('*').limit(1);
    if (!stu || stu.length === 0) {
        console.log("No student found.");
        return;
    }
    const s = stu[0];
    await supabase.from('students').update({ pin: '1234' }).eq('id', s.id);
    
    console.log(`Assessment ID: ${a.id}`);
    console.log(`Student ID: ${s.id}`);
    console.log(`Student PIN: ${s.pin}`);
    console.log(`Student Name: ${s.name}`);
    console.log(`URL: http://localhost:3000/assessment.html?assessmentId=${a.id}&studentId=${s.id}`);
}
run();
