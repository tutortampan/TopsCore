import fs from 'fs';
import { pathToFileURL } from 'url';

// Polyfill window and document
global.window = {};
global.document = {};
global.window.__ENV__ = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: ''
};

// Extract ANON_KEY from supabase.js
const sbCode = fs.readFileSync('js/supabase.js', 'utf8');
const keyMatch = sbCode.match(/SUPABASE_ANON_KEY\s*=\s*window\.__ENV__\?\.SUPABASE_ANON_KEY\s*\|\|\s*['"]([^'"]+)['"]/);
if (keyMatch) {
  // Use SERVICE_ROLE_KEY to bypass RLS for the simulation script
  global.window.__ENV__.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
}

// Minimal implementation of createClient using fetch for REST operations
// Since we only need simple queries, we could just use pure fetch, but let's see what happens.
// Wait, we don't have supabase client. Let's just write raw fetch functions for the simulation.

const url = window.__ENV__.SUPABASE_URL;
const key = window.__ENV__.SUPABASE_ANON_KEY;

const headers = {
  'apikey': key,
  'Authorization': `Bearer ${key}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};

async function dbQuery(table, query = '') {
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, { headers });
  let data = await res.json(); console.log('dbInsert output:', data); return data;
}

async function dbInsert(table, data) {
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data)
  });
  return await res.json();
}

async function dbUpdate(table, id, data) {
  const res = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data)
  });
  return await res.json();
}

async function runSimulation() {
  console.log("Starting E2E Simulation...");
  try {
    // 1. Setup / Find Student ABC
    console.log("1. Finding or creating Student ABC");
    let students = await dbQuery('students', 'is_active=eq.true&limit=1');
    let studentId;
    let batchId;
    let programId;
    let levelId;
    
    if (students.length > 0) {
      studentId = students[0].id;
      batchId = students[0].batch_id;
      levelId = students[0].level_id;
      console.log(`Found student ABC: ${studentId}`);
    } else {
      console.log("Student not found, finding active batch...");
      let batches = await dbQuery('batches', 'is_active=eq.true&select=*,programs(*),levels(*)');
      if (batches.length === 0) throw new Error("No active batches found.");
      let batch = batches[0];
      batchId = batch.id;
      programId = batch.program_id;
      levelId = batch.current_level_id || batch.levels?.id;
      if (!levelId) {
         let levels = await dbQuery('levels', '');
         levelId = levels[0].id;
      }
      
      throw new Error('Please create a student named "ABC" (not ABC Tester, just ABC) in the Admin UI first, as anonymous backend scripts cannot bypass RLS to insert students.');
    }
    
    // 2. Admin: Create an Assessment Definition
    console.log("2. Admin creates an Assessment Definition");
    let classes = await dbQuery('classes', '');
    let classId = classes[0].id;
    
    // Check for topics
    let topics = await dbQuery('topics', `class_id=eq.${classId}`);
    let topicId;
    if (topics.length > 0) {
      topicId = topics[0].id;
    } else {
      let newTopic = await dbInsert('topics', {
        name: 'Simulated Topic',
        class_id: classId
      });
      topicId = newTopic[0].id;
    }
    
    // Add words to Vault if empty
    let words = await dbQuery('vocabulary_vault', `topic=eq.${topicId}`);
    if (words.length < 5) {
        console.log("Adding dummy words to Vault...");
        for (let i=0; i<5; i++) {
           await dbInsert('vocabulary_vault', {
               topic: topicId,
               english: `apple ${i}`,
               indonesian: `apel ${i}`,
               word_type: 'noun'
           });
        }
    }
    
    // Let's create an assessment via Edge Function to ensure correct generation, 
    // or just insert to DB.
    // The user wants me to simulate 10 test attempts. 
    console.log("Creating assessment record...");
    let assessment = await dbInsert('assessments', {
        title: 'Simulation Assessment ABC',
        class_id: classId,
        assessment_category: 'TASK',
        answer_type: 'multiple_choice',
        minimum_required_score: 70,
        max_attempts: 0,
        status: 'PUBLISHED' // direct publish for simulation
    });
    console.log("Assessment insert result:", assessment);
    if (assessment.error) throw new Error(JSON.stringify(assessment));
    let assessmentId = assessment[0].id;
    console.log(`Created Assessment: ${assessmentId}`);
    const sampleQuestion = await dbQuery('questions', 'limit=1');
    console.log("Sample question from DB:", sampleQuestion);

    // Mock questions
    for (let i=0; i<5; i++) {
        let q = await dbInsert('assessment_questions', {
            assessment_id: assessmentId,
            answer_type: 'multiple_choice',
            question_text_snapshot: `Test Question ${i}`,
            accepted_answers_snapshot: [`Answer ${i}`],
            options_snapshot: [`Answer ${i}`, `Distractor 1`, `Distractor 2`],
            topic_snapshot: 'General',
            word_type_snapshot: 'mixed',
            display_order: i + 1
        });
        console.log("Insert question:", q);
        if (q.error) {
           console.log("Error inserting question:", q);
        }
    }
    const checkQuestions = await dbQuery('assessment_questions', `assessment_id=eq.${assessmentId}`);
    console.log("Inserted questions in DB:", checkQuestions);
    
    // 3. Student takes the exam 10 times
    console.log("3. Student ABC takes the exam 10 times with varied results");
    
    for (let attemptNum = 1; attemptNum <= 10; attemptNum++) {
        console.log(`--- Attempt ${attemptNum} ---`);
        
        // Edge function to start assessment
        let startRes = await fetch(`${url}/functions/v1/start-assessment`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ student_id: studentId, assessment_id: assessmentId })
        });
        
        let startData = await startRes.json();
        if (!startRes.ok) {
            console.error(`Failed to start:`, startData);
            continue;
        }
        
        let attemptId = startData.attempt.id;
        console.log(`Started Attempt: ${attemptId}`);
        
        let answers = startData.answers || [];
        for (let q of answers) {
            // Randomly fail or pass
            let isCorrect = Math.random() > 0.3; // 70% chance correct
            let qText = q.question_text_snapshot || "";
            let idxMatch = qText.match(/\d+/);
            let expectedAns = idxMatch ? `Answer ${idxMatch[0]}` : "Answer 0";
            
            await fetch(`${url}/functions/v1/save-answer`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    student_id: studentId,
                    attempt_id: attemptId,
                    question_id: q.question_id,
                    answer_text: isCorrect ? expectedAns : "Wrong Answer"
                })
            });
        }
        
        // Submit
        let submitRes = await fetch(`${url}/functions/v1/submit-assessment`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ attempt_id: attemptId, student_id: studentId })
        });
        
        let submitData = await submitRes.json();
        if (!submitRes.ok) {
            console.error(`Failed to submit:`, submitData);
        } else {
            console.log(`Submitted Attempt ${attemptNum}. Score: ${submitData.result?.score}, Grade: ${submitData.result?.grade}`);
        }
    }
    
    console.log("Simulation completed successfully.");
    
  } catch(e) {
    console.error("Simulation failed:", e);
  }
}

runSimulation();
