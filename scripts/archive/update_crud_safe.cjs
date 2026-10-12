const fs = require('fs');

const content = fs.readFileSync('js/admin/crud-modals.js', 'utf8');

const replacement = `    assessments: [
      { id: 'institution_id', label: 'Institution', type: 'select', source: 'institutions', required: true, readonly: true },
      { id: 'program_id', label: 'Program', type: 'select', source: 'programs', required: true, dependsOn: 'institution_id', readonly: true },
      { id: 'level_id', label: 'Level', type: 'select', source: 'levels', required: true, dependsOn: 'program_id', readonly: true },
      { id: 'class_id', label: 'Class', type: 'select', source: 'classes', required: true, dependsOn: 'level_id', readonly: true },
      { id: 'module_id', label: 'AI Module', type: 'select', source: 'modules', required: true, readonly: true },
      { id: 'shell_code', label: 'Shell Code / Code ID', type: 'text', required: true, readonly: true },
      { id: 'title', label: 'Assessment Title', type: 'text', required: true, readonly: true },
      { id: 'description', label: 'Description', type: 'textarea', readonly: true },
      { id: 'assessment_type', label: 'Assessment Type', type: 'text', readonly: true },
      { id: 'assessment_category', label: 'Category / Tier', type: 'text', readonly: true },
      { id: 'status', label: 'Status', type: 'select', options: [{value:'PUBLISHED',label:'PUBLISHED'},{value:'DRAFT',label:'DRAFT'},{value:'UNPUBLISHED',label:'UNPUBLISHED'},{value:'ARCHIVED',label:'ARCHIVED'}], required: true },
      { id: 'working_duration_minutes', label: 'Duration (Minutes)', type: 'number' },
      { id: 'question_order', label: 'Question Order', type: 'select', options: [{ value: 'sequential', label: 'Sequential' }, { value: 'random', label: 'Random' }] },
      { id: 'answer_type', label: 'Answer Type', type: 'select', options: [{ value: 'speech_to_text', label: 'Speech' }, { value: 'written', label: 'Written' }, { value: 'multiple_choice', label: 'Multiple Choice' }, { value: 'mixed', label: 'Mixed' }] },
      { id: 'prerequisite_assessment_id', label: 'Prerequisite (Optional)', type: 'select', source: 'assessments', required: false },
      { id: 'max_attempts', label: 'Max Attempts (blank = unlimited)', type: 'number' },
      { id: 'minimum_required_score', label: 'Passing Score %', type: 'number' },
      { id: 'display_order', label: 'Display Order', type: 'number' }
    ],`;

// We use string replacement to replace the whole `assessments` array up to `Assessments`
const startIndex = content.indexOf('assessments: [');
const endIndex = content.indexOf('questions: [');

const newContent = content.substring(0, startIndex) + replacement + '\n  ' + content.substring(endIndex);

fs.writeFileSync('js/admin/crud-modals.js', newContent);

// Add readonly support to inputs
let finalContent = fs.readFileSync('js/admin/crud-modals.js', 'utf8');
finalContent = finalContent.replace(/if \(f\.required\) sel\.required = true;/g, 'if (f.required) sel.required = true;\n          if (f.readonly) sel.disabled = true;');
finalContent = finalContent.replace(/if \(f\.required\) ta\.required = true;/g, 'if (f.required) ta.required = true;\n          if (f.readonly) ta.readOnly = true;');
finalContent = finalContent.replace(/if \(f\.required\) inp\.required = true;/g, 'if (f.required) inp.required = true;\n          if (f.readonly) inp.readOnly = true;');

fs.writeFileSync('js/admin/crud-modals.js', finalContent);
