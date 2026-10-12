const fs = require('fs');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    for (let r of replacements) {
        content = content.replace(r.search, r.replace);
    }
    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

// 1. Update assessment.html
replaceInFile('assessment.html', [
    { search: /answerType === 'speech_to_text'/g, replace: "(answerType === 'speech_to_text' || answerType === 'spoken')" },
    { search: /answerType === 'multiple_choice'/g, replace: "(answerType === 'multiple_choice' || answerType === 'selection')" }
]);

// 2. Update api.js
replaceInFile('js/api.js', [
    { search: /ansType === 'multiple_choice'/g, replace: "(ansType === 'multiple_choice' || ansType === 'selection')" },
    { search: /answer_type: 'speech_to_text'/g, replace: "answer_type: 'spoken'" },
    { search: /defaultAnswerType = 'speech_to_text'/g, replace: "defaultAnswerType = 'spoken'" },
    { search: /answerType = 'speech_to_text'/g, replace: "answerType = 'spoken'" },
    { search: /currentAnswerType = 'speech_to_text'/g, replace: "currentAnswerType = 'spoken'" }
]);

// 3. Update grading.js
replaceInFile('js/grading.js', [
    { search: /answerType === 'speech_to_text'/g, replace: "(answerType === 'speech_to_text' || answerType === 'spoken')" }
]);

// 4. Update crud-modals.js
replaceInFile('js/admin/crud-modals.js', [
    { search: /\{ value: 'speech_to_text', label: 'Speech' \}/g, replace: "{ value: 'spoken', label: 'Spoken' }" },
    { search: /\{ value: 'multiple_choice', label: 'Multiple Choice' \}/g, replace: "{ value: 'selection', label: 'Selection' }" },
    { search: /\{value:'speech_to_text',label:'Speaking Test'\}/g, replace: "{value:'spoken',label:'Speaking Test'}" },
    { search: /\{value:'multiple_choice',label:'Multiple Choice'\}/g, replace: "{value:'selection',label:'Selection'}" }
]);

// 5. Update admin formatters
const adminFormatterReplacements = [
    { search: /case 'speech_to_text': return '🎙️ Speech';/g, replace: "case 'speech_to_text':\n    case 'spoken': return '🎙️ Spoken';" },
    { search: /case 'multiple_choice': return '🔘 Mult Choice';/g, replace: "case 'multiple_choice':\n    case 'selection': return '🔘 Selection';" },
    { search: /if \(atype === 'speech_to_text'\) return 'Speaking Test';/g, replace: "if (atype === 'speech_to_text' || atype === 'spoken') return 'Speaking Test';" },
    { search: /if \(atype === 'multiple_choice'\) return 'Multiple Choice';/g, replace: "if (atype === 'multiple_choice' || atype === 'selection') return 'Selection';" }
];
replaceInFile('js/admin/classes-management.js', adminFormatterReplacements);
replaceInFile('js/admin/assessment-management.js', [
    { search: /case 'speech_to_text': return '[\s\S]*?Speech';/g, replace: "case 'speech_to_text':\n    case 'spoken': return '🎙️ Spoken';" },
    { search: /case 'multiple_choice': return '[\s\S]*?Mult Choice';/g, replace: "case 'multiple_choice':\n    case 'selection': return '🔘 Selection';" }
]);
replaceInFile('js/admin/app.js', adminFormatterReplacements);
replaceInFile('dashboard.html', adminFormatterReplacements);
replaceInFile('dashboard_utf8.html', adminFormatterReplacements);

// 6. Imports/exports
replaceInFile('js/admin/imports-exports.js', [
    { search: /<option value="speech_to_text">Speech to Text \(Suara\)<\/option>/g, replace: '<option value="spoken">Spoken (Suara)</option>' },
    { search: /<option value="multiple_choice">Multiple Choice<\/option>/g, replace: '<option value="selection">Selection</option>' },
    { search: /speech_to_text: \{/g, replace: "spoken: {" },
    { search: /multiple_choice: \{/g, replace: "selection: {" },
    { search: /downloadTemplateForType\('speech_to_text'\)/g, replace: "downloadTemplateForType('spoken')" },
    { search: /downloadTemplateForType\('multiple_choice'\)/g, replace: "downloadTemplateForType('selection')" }
]);

console.log("Basic type renames complete.");
