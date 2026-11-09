import fs from 'fs';

// 1. Patch supabase/functions/start-assessment/index.ts
let efContent = fs.readFileSync('supabase/functions/start-assessment/index.ts', 'utf8');
const isEfCrlf = efContent.includes('\r\n');
efContent = efContent.replace(/\r\n/g, '\n');

// Resumed branch patch
const oldEfResume = `      // Fetch saved answers for this attempt (strip answer keys for client)
      const { data: rawAnswers } = await supabase
        .from("attempt_answers")
        .select("id, question_id, question_snapshot, topic_snapshot, question_type_snapshot, student_answer, score")
        .eq("attempt_id", existing.id)
        .order("created_at");

      return new Response(JSON.stringify({
        attempt: existing,
        answers: rawAnswers || [],
        resumed: true,`;

const newEfResume = `      // Fetch saved answers for this attempt (strip answer keys for client)
      const { data: rawAnswers } = await supabase
        .from("attempt_answers")
        .select("id, question_id, question_snapshot, topic_snapshot, question_type_snapshot, student_answer, score")
        .eq("attempt_id", existing.id)
        .order("created_at");

      const sanitizedResumedAnswers = (rawAnswers || []).map((a: any) => {
        const snap = typeof a.question_snapshot === "string"
          ? (() => { try { return JSON.parse(a.question_snapshot); } catch(_) { return {}; } })()
          : (a.question_snapshot ? { ...a.question_snapshot } : {});
        delete snap.correct_answer;
        delete snap.accepted_answers;
        delete snap.accepted_answers_snapshot;
        delete snap.correct_answer_snapshot;
        return {
          id: a.id,
          question_id: a.question_id,
          question_snapshot: snap,
          topic_snapshot: a.topic_snapshot,
          question_type_snapshot: a.question_type_snapshot,
          student_answer: a.student_answer,
          score: a.score
        };
      });

      return new Response(JSON.stringify({
        attempt: existing,
        answers: sanitizedResumedAnswers,
        resumed: true,`;

// New attempt branch patch
const oldEfNew = `    // Return to client WITHOUT exposing accepted_answers_snapshot
    return new Response(JSON.stringify({
      attempt: newAttempt,
      answers: insertedAnswers || [],
      resumed: false,`;

const newEfNew = `    // Return to client WITHOUT exposing accepted_answers_snapshot
    const sanitizedNewAnswers = (insertedAnswers || []).map((a: any) => {
      const snap = typeof a.question_snapshot === "string"
        ? (() => { try { return JSON.parse(a.question_snapshot); } catch(_) { return {}; } })()
        : (a.question_snapshot ? { ...a.question_snapshot } : {});
      delete snap.correct_answer;
      delete snap.accepted_answers;
      delete snap.accepted_answers_snapshot;
      delete snap.correct_answer_snapshot;
      return {
        id: a.id,
        question_id: a.question_id,
        question_snapshot: snap,
        topic_snapshot: a.topic_snapshot,
        question_type_snapshot: a.question_type_snapshot,
        student_answer: a.student_answer,
        score: a.score
      };
    });

    return new Response(JSON.stringify({
      attempt: newAttempt,
      answers: sanitizedNewAnswers,
      resumed: false,`;

if (!efContent.includes(oldEfResume)) {
  console.error('Could not find oldEfResume in start-assessment/index.ts');
  process.exit(1);
}
if (!efContent.includes(oldEfNew)) {
  console.error('Could not find oldEfNew in start-assessment/index.ts');
  process.exit(1);
}

efContent = efContent.replace(oldEfResume, newEfResume);
efContent = efContent.replace(oldEfNew, newEfNew);
if (isEfCrlf) efContent = efContent.replace(/\n/g, '\r\n');
fs.writeFileSync('supabase/functions/start-assessment/index.ts', efContent, 'utf8');
console.log('Patched supabase/functions/start-assessment/index.ts');

// 2. Patch js/api.js
let apiContent = fs.readFileSync('js/api.js', 'utf8');
const isApiCrlf = apiContent.includes('\r\n');
apiContent = apiContent.replace(/\r\n/g, '\n');

const oldApiSnapshot = `        question_snapshot: {
          question_text: sq.question_text_snapshot,
          word_type: sq.word_type_snapshot,
          topic: sq.topic_snapshot,
          display_order: sq.display_order ?? (idx + 1),
          answer_type: sq.answer_type || 'written',
          options_snapshot: sq.options_snapshot || [],
          accepted_answers: sq.accepted_answers_snapshot,
          correct_answer: Array.isArray(sq.accepted_answers_snapshot) ? sq.accepted_answers_snapshot[0] : sq.accepted_answers_snapshot
        },`;

const newApiSnapshot = `        question_snapshot: {
          question_text: sq.question_text_snapshot,
          word_type: sq.word_type_snapshot,
          topic: sq.topic_snapshot,
          display_order: sq.display_order ?? (idx + 1),
          answer_type: sq.answer_type || 'written',
          options_snapshot: sq.options_snapshot || []
        },`;

const oldApiSelect = `  let { data: answers } = await sb.from('attempt_answers').select('*').eq('attempt_id', attempt.id);`;
const newApiSelect = `  let { data: answers } = await sb.from('attempt_answers').select('id, attempt_id, question_id, question_snapshot, topic_snapshot, question_type_snapshot, student_answer, score').eq('attempt_id', attempt.id);`;

if (!apiContent.includes(oldApiSnapshot)) {
  console.error('Could not find oldApiSnapshot in js/api.js');
  process.exit(1);
}
if (!apiContent.includes(oldApiSelect)) {
  console.error('Could not find oldApiSelect in js/api.js');
  process.exit(1);
}

apiContent = apiContent.replace(oldApiSnapshot, newApiSnapshot);
apiContent = apiContent.replace(oldApiSelect, newApiSelect);
if (isApiCrlf) apiContent = apiContent.replace(/\n/g, '\r\n');
fs.writeFileSync('js/api.js', apiContent, 'utf8');
console.log('Patched js/api.js');
