const fs = require('fs');

function replaceInFile(filePath, searchReplaceArray) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (let r of searchReplaceArray) {
        content = content.replace(r.search, r.replace);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

// 1. ai-evaluation-engine.js
const aiEvalSearch = /case AI_MODULE_TYPES\.VOCAB_MASTERY: \{[\s\S]*?case AI_MODULE_TYPES\.PHRASE_RECOGNITION: \{[\s\S]*?\}\n/g;
const aiEvalReplace = `case AI_MODULE_TYPES.VOCAB_MASTERY: {
      const selected = lower;
      const accepted = Array.isArray(ctx.acceptedAnswers)
        ? ctx.acceptedAnswers.map(a => a.toLowerCase().trim())
        : [(ctx.targetWord || '').toLowerCase().trim()];
      const match = accepted.some(ans => selected === ans || selected.includes(ans));
      return {
        final_score: match ? 100 : 0,
        status: match ? 'Mastered' : 'Needs Review',
        word: ctx.targetWord || '',
        student_input: t,
        accepted_answers: ctx.acceptedAnswers || []
      };
    }
`;

replaceInFile('js/ai-evaluation-engine.js', [
    { search: aiEvalSearch, replace: aiEvalReplace },
    { search: /PHRASE_RECOGNITION:\s*'PHRASE_RECOGNITION',\s*\/\/[^\n]*\n/g, replace: '' }
]);

// 2. api.js
replaceInFile('js/api.js', [
    { search: /\|\|\s*assessmentType === 'PHRASE_RECOGNITION'/g, replace: '' },
    { search: /\|\|\s*ansType === 'phrase_recognition'/g, replace: '' }
]);

// 3. classes-management.js
replaceInFile('js/admin/classes-management.js', [
    { search: /const asmTypeTask = \(className \|\| ''\)\.toLowerCase\(\)\.includes\('phrase'\) \? 'PHRASE_RECOGNITION' : 'VOCAB_MASTERY';/g, replace: "const asmTypeTask = 'VOCAB_MASTERY';" },
    { search: /const asmTypeTest = \(className \|\| ''\)\.toLowerCase\(\)\.includes\('phrase'\) \? 'PHRASE_RECOGNITION' : 'VOCAB_MASTERY';/g, replace: "const asmTypeTest = 'VOCAB_MASTERY';" }
]);

// 4. panel-c-builder.js
replaceInFile('js/admin/panel-c-builder.js', [
    { search: /PHRASE_RECOGNITION: \{[\s\S]*?\},(?=\s*[A-Z_]+: \{)/g, replace: '' }
]);

// 5. result.html & temp_result_check.js
replaceInFile('result.html', [
    { search: /PHRASE_RECOGNITION:\s*'Phrase Recognition',?\n/g, replace: '' }
]);
replaceInFile('temp_result_check.js', [
    { search: /PHRASE_RECOGNITION:\s*'Phrase Recognition',?\n/g, replace: '' }
]);

// 6. Test/Misc Files
replaceInFile('test_e2e.html', [
    { search: /assessmentType: 'PHRASE_RECOGNITION'/g, replace: "assessmentType: 'VOCAB_MASTERY'" }
]);
replaceInFile('puppeteer_vocab.js', [
    { search: /assessmentType: 'PHRASE_RECOGNITION'/g, replace: "assessmentType: 'VOCAB_MASTERY'" }
]);
replaceInFile('assemble_vocab.js', [
    { search: /assessment_type: 'PHRASE_RECOGNITION'/g, replace: "assessment_type: 'VOCAB_MASTERY'" }
]);

console.log("PHRASE_RECOGNITION removed.");
