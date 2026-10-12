const fs = require('fs');
let c = fs.readFileSync('js/api.js', 'utf8');

c = c.replace(/let displayOrder = 1;/g, 'let displayOrder = 1;\n    let lastTaskId = null;');
c = c.replace(/let lastTaskId = null;\s*let hasAnyVocab = false;/, 'let hasAnyVocab = false;');
c = c.replace(/const \{ action \} = await upsertDynamicAssessmentShell/g, 'const { assessmentId, action } = await upsertDynamicAssessmentShell');
c = c.replace(/if \(action === 'updated'\) results\.updated\+\+;\s*\}/g, 'if (action === \'updated\') results.updated++;\n        lastTaskId = assessmentId;\n      }');

fs.writeFileSync('js/api.js', c);
