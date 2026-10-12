require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { Client } = require('pg');

const supabaseUrl = 'http://127.0.0.1:54321';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSimulation() {
  console.log("Starting simulation for student ABC...");
  let pgClient;
  try {
    // 1. Get an active institution & program
    const { data: insts } = await supabase.from('institutions').select('id, name').limit(1);
    const institution = insts[0];
    if (!institution) throw new Error("No institution found.");

    const { data: progs } = await supabase.from('programs').select('id, name').eq('institution_id', institution.id).limit(1);
    const program = progs[0];
    if (!program) throw new Error("No program found.");

    // 2. Get an active batch
    const { data: batches } = await supabase.from('batches').select('id, name, current_level_id').eq('program_id', program.id).limit(1);
    const batch = batches[0];
    if (!batch) throw new Error("No batch found.");

    // 3. Create student ABC
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`Creating student ABC with PIN: ${pin}`);
    const { data: newStudent, error: errStudent } = await supabase.from('students').insert({
      name: "ABC",
      institution_id: institution.id,
      program_id: program.id,
      batch_id: batch.id,
      pin_hash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4", // '1234'
      is_active: true
    }).select().single();
    if (errStudent) throw errStudent;
    console.log(`Student ABC created successfully with ID: ${newStudent.id}`);

    // 4. Get a class to assign an assessment to
    const { data: classes } = await supabase.from('classes').select('id, name').limit(1);
    const cls = classes[0];
    if (!cls) throw new Error("No class found.");

    // 5. Create a new Assessment
    console.log(`Creating test assessment for class ${cls.name}...`);
    const { data: newAssessment, error: errAssessment } = await supabase.from('assessments').insert({
      title: "Simulation Test Assessment",
      class_id: cls.id,
      institution_id: institution.id,
      level_id: batch.current_level_id,
      assessment_type: "EXAM",
      status: "PUBLISHED"
    }).select().single();
    if (errAssessment) throw errAssessment;
    console.log(`Assessment created successfully with ID: ${newAssessment.id}`);

    // Edit assessment
    console.log(`Editing assessment title...`);
    const { error: errEdit } = await supabase.from('assessments').update({
      title: "Simulation Test Assessment (Edited)"
    }).eq('id', newAssessment.id);
    if (errEdit) throw errEdit;
    console.log(`Assessment updated.`);

    // 6. Simulate 10 attempts using direct PG to bypass RLS
    pgClient = new Client('postgres://postgres:postgres@127.0.0.1:54322/postgres');
    await pgClient.connect();

    console.log(`Simulating 10 attempts for student ABC...`);
    for (let i = 1; i <= 10; i++) {
      const maxScore = 100;
      // Randomize score: sometimes high, sometimes fail (< 60)
      const isFail = Math.random() > 0.6; // 40% chance of failing
      const totalScore = isFail ? Math.floor(Math.random() * 59) : Math.floor(60 + Math.random() * 40);
      
      const res = await pgClient.query('INSERT INTO attempts (student_id, assessment_id, status, started_at, submitted_at, expires_at, total_questions, score, percentage) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id', [newStudent.id, newAssessment.id, 'submitted', new Date(Date.now() - 3600000).toISOString(), new Date().toISOString(), new Date(Date.now() + 3600000).toISOString(), maxScore, totalScore, totalScore]);
      
      const attemptId = res.rows[0].id;
      console.log(`Attempt ${i}: Scored ${totalScore}/${maxScore} - ${isFail ? 'FAIL' : 'PASS'} (Attempt ID: ${attemptId})`);
    }

    console.log("Simulation complete!");

  } catch (err) {
    console.error("Simulation failed:", err);
  } finally {
    if (pgClient) {
        await pgClient.end();
    }
  }
}

runSimulation();
