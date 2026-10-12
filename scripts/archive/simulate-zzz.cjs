const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

async function runSimulation() {
  let pgClient;
  try {
    const SUPABASE_URL = "http://127.0.0.1:54321";
    const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    pgClient = new Client('postgres://postgres:postgres@127.0.0.1:54322/postgres');
    await pgClient.connect();

    console.log("1. Finding or creating Institution and Program");
    let res = await pgClient.query("SELECT id FROM institutions WHERE name = 'Tops'");
    if (res.rowCount === 0) res = await pgClient.query("INSERT INTO institutions (name, is_active) VALUES ('Tops', true) RETURNING id");
    const instId = res.rows[0].id;

    res = await pgClient.query("SELECT id FROM programs WHERE name = 'English Explorer'");
    if (res.rowCount === 0) res = await pgClient.query("INSERT INTO programs (name, institution_id, is_active) VALUES ('English Explorer', $1, true) RETURNING id", [instId]);
    const progId = res.rows[0].id;

    console.log("2. Ensuring Levels 1-3 exist");
    let level3Id = null;
    for (let i = 1; i <= 3; i++) {
        res = await pgClient.query("SELECT id FROM levels WHERE level_number = $1", [i]);
        if (res.rowCount === 0) res = await pgClient.query("INSERT INTO levels (level_number, name) VALUES ($1, $2) RETURNING id", [i, `Level ${i}`]);
        if (i === 3) level3Id = res.rows[0].id;
    }

    console.log("3. Creating Class");
    res = await pgClient.query("SELECT id FROM classes WHERE name = 'Vocab Master'");
    if (res.rowCount === 0) res = await pgClient.query("INSERT INTO classes (name, level_id, program_id, institution_id, is_active) VALUES ('Vocab Master', $1, $2, $3, true) RETURNING id", [level3Id, progId, instId]);
    const clsId = res.rows[0].id;

    console.log("4. Creating Batch '123' at Level 3");
    res = await pgClient.query("SELECT id FROM batches WHERE name = '123'");
    if (res.rowCount === 0) {
        res = await pgClient.query("INSERT INTO batches (name, program_id, current_level_id, is_active) VALUES ('123', $1, $2, true) RETURNING id", [progId, level3Id]);
    } else {
        await pgClient.query("UPDATE batches SET current_level_id = $1 WHERE id = $2", [level3Id, res.rows[0].id]);
    }
    const batchId = res.rows[0].id;

    console.log("5. Creating Student 'zzz'");
    res = await pgClient.query("SELECT id FROM students WHERE name = 'zzz' AND batch_id = $1", [batchId]);
    if (res.rowCount === 0) res = await pgClient.query("INSERT INTO students (name, pin_hash, batch_id, program_id, institution_id, is_active) VALUES ('zzz', 'testhash', $1, $2, $3, true) RETURNING id", [batchId, progId, instId]);
    const studentId = res.rows[0].id;

    console.log("6. Creating Dynamic Shell Assessment (TEST, final theme)");
    res = await pgClient.query("SELECT id FROM assessments WHERE title = 'Zzz Test'");
    if (res.rowCount === 0) {
       res = await pgClient.query(`
          INSERT INTO assessments 
          (title, class_id, level_id, institution_id, assessment_type, assessment_category, status, working_duration_minutes, payload, max_attempts) 
          VALUES ('Zzz Test', $1, $2, $3, 'TEST', 'TEST', 'PUBLISHED', 60, '{"is_dynamic_shell": true, "theme_code": "A", "category": "words", "answer_type": "multiple_choice"}'::jsonb, 1000) 
          RETURNING id`, [clsId, level3Id, instId]);
    } else {
       await pgClient.query("UPDATE assessments SET max_attempts = 1000 WHERE id = $1", [res.rows[0].id]);
    }
    const asmId = res.rows[0].id;
    
    // Check if we need some vocabulary words in vault for Level 3 Theme A
    res = await pgClient.query("SELECT id FROM vocabulary_vault WHERE target_level = 3 AND theme_code = 'A' LIMIT 1");
    if (res.rowCount === 0) {
        console.log("Inserting dummy vocabulary into vault for Level 3 Theme A");
        for (let i = 1; i <= 5; i++) {
           await pgClient.query(`
               INSERT INTO vocabulary_vault (target_level, theme_code, category, indonesian, english, word_type, is_active) 
               VALUES (3, 'A', 'words', $1, $2, 'Vocab', true)`, [`kata ${i}`, `word ${i}`]);
        }
    }

    console.log(`7. Simulating 100 attempts for student 'zzz' on assessment ${asmId} via Edge Functions`);
    let passCount = 0;
    
    for (let i = 1; i <= 100; i++) {
        // Reset state for this iteration
        await pgClient.query("DELETE FROM attempt_answers WHERE attempt_id IN (SELECT id FROM attempts WHERE student_id = $1)", [studentId]);
        await pgClient.query("DELETE FROM attempts WHERE student_id = $1", [studentId]);
        await pgClient.query("DELETE FROM progress WHERE student_id = $1", [studentId]);

        // start-assessment
        let startRes = await supabase.functions.invoke('start-assessment', {
            body: { student_id: studentId, assessment_id: asmId }
        });
        
        if (startRes.error) {
            let errMsg = startRes.error.message;
            if (startRes.error.context && typeof startRes.error.context.json === 'function') {
                try {
                    const errBody = await startRes.error.context.json();
                    errMsg += ' | ' + JSON.stringify(errBody);
                } catch(e){}
            }
            console.error(`Attempt ${i} start failed:`, errMsg);
            break;
        }
        
        const attempt = startRes.data;
        const attemptId = attempt?.id || attempt?.attempt_id || attempt?.attempt?.id;
        
        if (!attemptId) {
            console.log("No attemptId found. startRes.data is:", JSON.stringify(attempt));
            break;
        }
        
        // Let's get the attempt_answers inserted by start-assessment
        const { data: answers } = await supabase.from('attempt_answers').select('id, question_snapshot, accepted_answers_snapshot').eq('attempt_id', attemptId);
        
        // They need 60% to pass. We'll make them answer correctly 100% of the time to guarantee pass.
        let submittedAnswers = [];
        for (const ans of (answers || [])) {
            const acc = ans.accepted_answers_snapshot || [];
            let studentAns = Array.isArray(acc) && acc.length > 0 ? acc[0] : (typeof acc === 'string' ? acc.split('/')[0] : 'correct');
            submittedAnswers.push({
                attempt_answer_id: ans.id,
                student_answer: studentAns
            });
        }
        
        // submit-assessment
        let submitRes = await supabase.functions.invoke('submit-assessment', {
            body: { attempt_id: attemptId, answers: submittedAnswers, status: 'submitted' }
        });
        
        if (submitRes.error) {
            let errMsg = submitRes.error.message;
            if (submitRes.error.context && typeof submitRes.error.context.json === 'function') {
                try {
                    const errBody = await submitRes.error.context.json();
                    errMsg += ' | ' + JSON.stringify(errBody);
                } catch(e){}
            }
            console.error(`Attempt ${i} submit failed:`, errMsg);
            break;
        }
        
        const result = submitRes.data;
        
        // Check progress
        const { data: progFinal } = await supabase.from('progress').select('*').eq('student_id', studentId).single();
        if (progFinal && progFinal.level_status === 'Level Completed') {
            passCount++;
        } else {
            console.error(`Attempt ${i} failed to update progress correctly! Result:`, result, "ProgFinal:", progFinal);
            break;
        }
        
        if (i % 10 === 0) {
            console.log(`Completed ${i}/100 iterations... Passed: ${passCount}`);
        }
    }
    
    console.log(`Simulation complete. Student passed level successfully ${passCount}/100 times.`);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    if (pgClient) await pgClient.end();
  }
}

runSimulation();
