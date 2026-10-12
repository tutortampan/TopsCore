const fs=require('fs'); 
let c=fs.readFileSync('js/admin/crud-modals.js', 'utf8'); 
c = c.replace(/assessments: \[\s*[\s\S]*?\],\s*Assessments: \[\s*[\s\S]*?\],/, `assessments: [
      { id: 'institution_id', label: 'Institution', type: 'select', source: 'institutions', required: true },
      { id: 'program_id', label: 'Program', type: 'select', source: 'programs', required: true, dependsOn: 'institution_id' },
      { id: 'level_id', label: 'Level', type: 'select', source: 'levels', required: true, dependsOn: 'program_id' },
      { id: 'class_id', label: 'Class', type: 'select', source: 'classes', required: true, dependsOn: 'level_id' },
      { id: 'module_id', label: 'AI Module', type: 'select', source: 'modules', required: true },
      { id: 'shell_code', label: 'Shell Code / Code ID', type: 'text', required: true },
      { id: 'title', label: 'Assessment Title', type: 'text', required: true },
      { id: 'description', label: 'Description', type: 'textarea' },
      { id: 'assessment_type', label: 'Assessment Type', type: 'text' },
      { id: 'assessment_category', label: 'Category / Tier', type: 'text' },
      { id: 'status', label: 'Status', type: 'select', options: [{value:'PUBLISHED',label:'PUBLISHED'},{value:'DRAFT',label:'DRAFT'},{value:'UNPUBLISHED',label:'UNPUBLISHED'},{value:'ARCHIVED',label:'ARCHIVED'}], required: true },
      { id: 'working_duration_minutes', label: 'Duration (Minutes)', type: 'number' },
      { id: 'display_order', label: 'Display Order', type: 'number' }
    ],`);
fs.writeFileSync('js/admin/crud-modals.js', c);
