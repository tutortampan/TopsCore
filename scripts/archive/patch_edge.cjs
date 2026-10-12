const fs = require('fs');
let code = fs.readFileSync('d:/TopsCore/supabase/functions/start-assessment/index.ts', 'utf8');

// 1. Add item_code to snapQuestions mapping
code = code.replace(
  "question_text_snapshot: vw.indonesian || \"N/A\",",
  "item_code: vw.item_code || null,\n                 question_text_snapshot: vw.indonesian || \"N/A\","
);

// 2. Add item_code to attempt_answers insert
code = code.replace(
  "question_id: sq.question_id || null,",
  "question_id: sq.question_id || null,\n      item_code: sq.item_code || null,"
);
// wait, attempt_answers might not have item_code column. We must put it inside question_snapshot JSON.
code = code.replace(
  "question_text: sq.question_text_snapshot,",
  "item_code: sq.item_code || null,\n        question_text: sq.question_text_snapshot,"
);
// Also revert the attempt_answers outer item_code if it doesn't exist
code = code.replace(
  "question_id: sq.question_id || null,\n      item_code: sq.item_code || null,\n      question_snapshot:",
  "question_id: sq.question_id || null,\n      question_snapshot:"
);

fs.writeFileSync('d:/TopsCore/supabase/functions/start-assessment/index.ts', code);
console.log("Edge Function patched.");
