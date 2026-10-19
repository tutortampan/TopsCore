import {
  adminFetchAll, adminInsert, adminUpdate, adminSoftDelete,
  mergeDuplicateStudents, detectDuplicateStudents, mergeStudentPair,
  detectDuplicateQuestions, resequenceAssessmentQuestions, resolveDuplicateQuestionGroup, batchResolveAssessmentDuplicateQuestions,
  toLevelLetter
} from '../api.js?v=5.2.2';
import { cleanStudentName } from '../api.js?v=5.2.2';
import { showToast, showLoading, hideLoading, escapeHtml, escHtml } from '../app.js?v=5.2.2';
import { getSupabase } from '../supabase.js?v=5.2.2';

function formatLevelOption(l) {
  if (l && l.name) return l.name;
  if (l && typeof toLevelLetter === 'function') return toLevelLetter(l.level_number);
  return l ? `Level ${l.level_number ?? ''}` : '—';
}

// escapeHtml imported from app.js

async function hashPin(pin) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// -- Module-level state & DOM references (assigned lazily on first use) --
let crudModal   = null;
let crudForm    = null;
let _currentSection = null;
let _editId     = null;

const formFields = {
  
  work_records: [
    { id: 'company_name', label: 'Company / Organization', type: 'text', required: true },
    { id: 'role_title', label: 'Role / Job Title', type: 'text', required: true },
    { id: 'start_date', label: 'Start Date', type: 'date', required: true },
    { id: 'end_date', label: 'End Date', type: 'date', required: false },
    { id: 'description', label: 'Description', type: 'textarea', required: false }
  ],
  professional_skills: [
    { id: 'skill_name', label: 'Skill Name', type: 'text', required: true },
    { id: 'proficiency_level', label: 'Proficiency Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], required: true }
  ],
  institutions: [
    { id: 'name', label: 'Institution Name', type: 'text', required: true, placeholder: 'e.g. CEC Pare' },
    { id: 'code', label: 'Short Code', type: 'text', required: false, placeholder: 'e.g. CEC, TOP' },
    { id: 'logo_url', label: 'Logo URL / Image Link', type: 'text', required: false, placeholder: 'https://...' },
    { id: 'address', label: 'Address / City', type: 'textarea', required: false, placeholder: 'e.g. Jl. Brawijaya No. 10, Pare, Kediri' },
    { id: 'phone', label: 'Phone / WhatsApp', type: 'text', required: false, placeholder: 'e.g. 08123456789' },
    { id: 'email', label: 'Official Email', type: 'text', required: false, placeholder: 'e.g. info@cec.ac.id' },
    { id: 'is_active', label: 'Active', type: 'checkbox' },
  ],

  classes: [
    { id: 'institution_id', label: 'Institution', type: 'select', source: 'institutions', required: false, uiOnly: true },
    { id: 'program_id', label: 'Program', type: 'select', source: 'programs', required: true, dependsOn: 'institution_id' },
    { id: 'name', label: 'Class Name', type: 'text', required: true, placeholder: 'e.g. Vocabulary' },
    { id: 'code', label: 'Class Code', type: 'text', required: false, placeholder: 'e.g. VOCABULARY_1, BASIC_ENGLISH_1' },
    { id: 'level_id', label: 'Level', type: 'select', source: 'levels', required: false },
    { id: 'is_active', label: 'Active', type: 'checkbox' },
  ],
  class_instances: [
    { id: 'batch_id', label: 'Batch', type: 'select', source: 'batches', required: true },
    { id: 'class_id', label: 'Class Board', type: 'select', source: 'classes', required: true },
    { id: 'start_date', label: 'Start Date', type: 'date', required: false },
    { id: 'estimated_finish', label: 'Estimated Finish Date', type: 'date', required: false },
    { id: 'recurring_schedule', label: 'Recurring Schedule (JSON)', type: 'textarea', placeholder: 'e.g. [{"day": "Monday", "start_time": "15:00", "end_time": "16:30", "zoom_link": "https://zoom.us/j/123"}]', required: false },
    { id: 'status', label: 'Status', type: 'select', options: [{val:'active',text:'Active'},{val:'finished',text:'Finished'},{val:'inactive',text:'Inactive'}], required: true }
  ],
  levels: [
    { id: 'institution_id', label: 'Institution', type: 'select', source: 'institutions', required: true, uiOnly: true },
    { id: 'program_id', label: 'Program', type: 'select', source: 'programs', required: false, dependsOn: 'institution_id' },

    { id: 'level_number', label: 'Level Number', type: 'number', required: true, placeholder: 'e.g. 1' },
    { id: 'name', label: 'Level Name', type: 'text', required: true, placeholder: 'e.g. Level 1 - Beginner' },
    { id: 'is_active', label: 'Active', type: 'checkbox' },
  ],
  programs: [
    { id: 'name', label: 'Program Name', type: 'text', required: true, placeholder: 'e.g. Camp' },
    { id: 'code', label: 'Program Code', type: 'text', required: false, placeholder: 'e.g. CAMP-01' },
    { id: 'institution_id', label: 'Institution', type: 'select', source: 'institutions', required: true },
    { id: 'description', label: 'Description', type: 'textarea', required: false, placeholder: 'Program description or syllabus notes' },
    { id: 'is_active', label: 'Active', type: 'checkbox' },
  ],
  batches: [
    { id: 'institution_id', label: 'Institution', type: 'select', source: 'institutions', required: false, uiOnly: true },
    { id: 'program_id', label: 'Program', type: 'select', source: 'programs', required: true, dependsOn: 'institution_id' },
    { id: 'name', label: 'Batch Name', type: 'text', required: true, placeholder: 'e.g. 133' },
    { id: 'current_level_id', label: 'Current Level', type: 'select', source: 'levels', required: false },
    { id: 'enrollment_date', label: 'Start Date (Enrollment)', type: 'date', required: false },
    { id: 'actual_final_date', label: 'Finish Date', type: 'date', required: false },
    { id: 'is_active', label: 'Active', type: 'checkbox' },
  ],
  students: [
    { id: 'institution_id', label: 'Institution', type: 'select', source: 'institutions', required: true },
    { id: 'program_id', label: 'Program', type: 'select', source: 'programs', required: true, dependsOn: 'institution_id' },
    { id: 'batch_id', label: 'Batch', type: 'select', source: 'batches', required: false, dependsOn: 'program_id' },
    
    { id: 'name', label: 'Full Name', type: 'text', required: true },
    { id: 'gender', label: 'Gender', type: 'select', options: [
      { value: '', label: '— Unassigned (Student will choose) —' },
      { value: 'male', label: 'Male (Mr.)' },
      { value: 'female', label: 'Female (Miss)' }
    ]},
    { id: 'birth_date', label: 'Birth Date', type: 'date' },
    { id: 'pin_hash', label: 'PIN (4 digits)', type: 'password', placeholder: '****' },
    { id: 'is_active', label: 'Active', type: 'checkbox' },
  ],
          assessments: [
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
      { id: 'answer_type', label: 'Answer Type', type: 'select', options: [{ value: 'spoken', label: 'Spoken' }, { value: 'written', label: 'Written' }, { value: 'selection', label: 'Selection' }, { value: 'mixed', label: 'Mixed' }] },
      { id: 'prerequisite_assessment_id', label: 'Prerequisite (Optional)', type: 'select', source: 'assessments', required: false },
      { id: 'max_attempts', label: 'Max Attempts (blank = unlimited)', type: 'number' },
      { id: 'minimum_required_score', label: 'Passing Score %', type: 'number' },
      { id: 'display_order', label: 'Display Order', type: 'number' }
    ],
  questions: [
    { id: 'question_text', label: 'Question Text', type: 'textarea', required: true },
    { id: 'question_order', label: 'Order', type: 'number', required: true },
    { id: 'assessment_id', label: 'Assessment', type: 'select', source: 'Assessments', required: true },
    { id: 'answer_type', label: 'Answer Type', type: 'select', options: [
      {value:'selection',label:'Selection'},
      {value:'spoken',label:'Speaking Test'},
      {value:'written',label:'Written Test'}
    ], required: true },
    { id: 'correct_answer', label: 'Correct Answer', type: 'text', required: true, placeholder: 'e.g. run / jog / sprint  (use / ; or | to separate multiple accepted answers)' },
    { id: 'options_json', label: 'Options (separated by / ; or JSON array)', type: 'textarea', placeholder: 'e.g. Option A / Option B / Option C  (use / or ; to separate choices)' },
    { id: 'metadata', label: 'Metadata / Word Type', type: 'text', placeholder: 'e.g. 1 - VERB' },
  ],
};

function _ensureDomRefs() {
  if (!crudModal) crudModal = document.getElementById('crud-modal');
  if (!crudForm)  crudForm  = document.getElementById('crud-form');
}

async function openCrudModal(section, record) {
      _ensureDomRefs();
      _currentSection = section;
      _editId = record?.id || null;
      window.isProfileDirty = false;
      const sectionTitles = {
          programs: 'Program',
          batches: 'Batch',
          institutions: 'Institution',
          classes: 'Class',

          levels: 'Level',
          students: 'Student',
          Assessments: 'Assessment',
          class_instances: 'Class Instance',
          class_meetings: 'Meeting',
          topics: 'Topic',
          word_types: 'Word Type',
          questions: 'Question'
      };
      const titleName = sectionTitles[section] || section.charAt(0).toUpperCase() + section.slice(1);
      document.getElementById('crud-modal-title').textContent = record ? `Edit ${titleName}` : `Add ${titleName}`;

      crudForm.innerHTML = '';
      const fields = formFields[section];
      if (!fields) {
        crudForm.innerHTML = `<p class="text-muted">Form for "${section}" not yet configured.</p>`;
        crudModal.classList.remove('hidden');
        return;
      }

      const formGrid = document.createElement('div');
      formGrid.className = 'form-grid';

      for (const f of fields) {
        const group = document.createElement('div');
        const isFull = (['title', 'question_text', 'options_json'].includes(f.id) || (f.id === 'name' && _currentSection !== 'batches' && _currentSection !== 'classes') || f.type === 'textarea');
        group.className = `form-group ${isFull ? 'form-group-full' : ''}`;

        const label = document.createElement('label');
        label.className = 'form-label';
        label.setAttribute('for', `field-${f.id}`);
        label.textContent = f.label;
        group.appendChild(label);

        if (f.type === 'select' && f.source) {
          const sel = document.createElement('select');
          sel.className = 'form-control';
          sel.id = `field-${f.id}`;
          sel.name = f.id;
          if (f.required) sel.required = true;
          if (f.readonly) sel.disabled = true;
          if (f.id === 'prerequisite_assessment_id') {
            sel.innerHTML = `<option value="">None (Optional)</option>`;
            sel.disabled = false;
          } else if (f.source === 'levels' || f.id === 'level_id' || f.id === 'current_level_id') {
            sel.innerHTML = `<option value="">— No Level / Optional —</option>`;
            let opts = await adminFetchAll('levels');
            opts = (opts || []).filter(o => !o.deleted_at);
            opts.sort((a, b) => (Number(a.level_number) || 0) - (Number(b.level_number) || 0));
            const targetLvl = record ? (record.current_level_id || record.level_id || null) : null;
            opts.forEach(o => {
              const opt = document.createElement('option');
              opt.value = o.id;
              opt.textContent = formatLevelOption(o);
              if (targetLvl && o.id === targetLvl) opt.selected = true;
              sel.appendChild(opt);
            });
            if (targetLvl) sel.value = targetLvl;
            else sel.value = '';
          } else if (!f.dependsOn) {
            sel.innerHTML = `<option value="">— Select —</option>`;
            let opts = await adminFetchAll(f.source);
            opts = opts.filter(o => !o.deleted_at);
            
            // Phase 5: Filter out inactive items in dropdowns
            opts = opts.filter(o => {
              if (o.is_active !== undefined) return o.is_active === true;
              if (o.status !== undefined) return o.status !== 'cancelled' && o.status !== 'archived';
              if (o.status !== undefined) return o.status === 'published';
              return true;
            });

            opts.forEach(o => {
              const opt = document.createElement('option');
              opt.value = o.id;
              opt.textContent = o.name || o.title || o.title || o.id;
              if (record && (record[f.id] === o.id || (f.id === 'current_level_id' && record.level_id === o.id))) opt.selected = true;
              sel.appendChild(opt);
            });

            // If field is institution_id and none selected yet, auto-select active institution or first available
            if (f.id === 'institution_id' && !sel.value) {
              if (window._curriculumActiveInstId && opts.some(o => o.id === window._curriculumActiveInstId)) {
                sel.value = window._curriculumActiveInstId;
              } else if (sel.options.length > 1) {
                sel.value = sel.options[1].value;
              }
            }
          } else {
            sel.innerHTML = `<option value="">— Select Previous First —</option>`;
            sel.disabled = true;
          }
          group.appendChild(sel);
        } else if (f.type === 'select' && f.options) {
          const sel = document.createElement('select');
          sel.className = 'form-control';
          sel.id = `field-${f.id}`;
          sel.name = f.id;
          if (f.required) sel.required = true;
          if (f.readonly) sel.disabled = true;
          sel.innerHTML = `<option value="">— Select —</option>` + f.options.map(o => {
            const val = typeof o === 'object' ? o.value : o;
            const labelStr = typeof o === 'object' ? o.label : o;
            const isSelected = record?.[f.id] === val || (!record && val === 'sequential');
            return `<option value="${val}" ${isSelected ? 'selected' : ''}>${labelStr}</option>`;
          }).join('');
          group.appendChild(sel);
        } else if (f.type === 'textarea') {
          const ta = document.createElement('textarea');
          ta.className = 'form-control';
          ta.id = `field-${f.id}`;
          ta.name = f.id;
          ta.rows = 2;
          if (f.required) ta.required = true;
          if (f.readonly) ta.readOnly = true;
          if (f.placeholder) ta.placeholder = f.placeholder;
          if (record?.[f.id]) ta.value = typeof record[f.id] === 'object' ? JSON.stringify(record[f.id]) : record[f.id];
          group.appendChild(ta);
        } else if (f.type === 'checkbox') {
          const wrap = document.createElement('div');
          wrap.className = 'd-flex align-center gap-3 mt-1';
          const inp = document.createElement('input');
          inp.type = 'checkbox';
          inp.id = `field-${f.id}`;
          inp.name = f.id;
          inp.style.width = '18px';
          inp.style.height = '18px';
          inp.style.cursor = 'pointer';
          if (record ? record[f.id] : true) inp.checked = true;
          wrap.appendChild(inp);
          group.appendChild(wrap);
        } else {
          const inp = document.createElement('input');
          inp.className = 'form-control';
          inp.type = f.type || 'text';
          inp.id = `field-${f.id}`;
          inp.name = f.id;
          if (f.required) inp.required = true;
          if (f.readonly) inp.readOnly = true;
          if (f.placeholder) inp.placeholder = f.placeholder;
          if (record?.[f.id] !== undefined) inp.value = record[f.id];
          else if (f.defaultValue !== undefined) inp.value = f.defaultValue;
          group.appendChild(inp);
        }

        formGrid.appendChild(group);
      }

      crudForm.appendChild(formGrid);

      const progSelect = crudForm.querySelector('#field-institution_id');
      const classSelect = crudForm.querySelector('#field-program_id');
      const batchSelect = crudForm.querySelector('#field-batch_id');
      const Classeselect = crudForm.querySelector('#field-class_id');
      const prereqSelect = crudForm.querySelector('#field-prerequisite_assessment_id') || crudForm.querySelector('#field-prerequisite_assessment_id');
      const titleInput = crudForm.querySelector('#field-title') || crudForm.querySelector('#field-name');
      const levelSelect = crudForm.querySelector('#field-level_id') || crudForm.querySelector('#field-current_level_id');
      const AssessmentTypeInput = crudForm.querySelector('#field-assessment_type') || crudForm.querySelector('#field-category');
      const orderSelect = crudForm.querySelector('#field-order_num') || crudForm.querySelector('#field-display_order');

      const updatePrereqRequirement = () => {
        if (!prereqSelect) return;
        // Keep prerequisite optional unless business rules require it later
        prereqSelect.required = false; 
      };

      if (prereqSelect) {
        prereqSelect.disabled = false;
        const isNoneSelected = !record || !record.prerequisite_assessment_id;
        prereqSelect.innerHTML = `<option value="" ${isNoneSelected ? 'selected' : ''}>None (Optional)</option>`;
        const allAssessments = await adminFetchAll('assessments');
        const eligible = allAssessments.filter(e => !e.deleted_at && e.id !== _editId);
        eligible.sort((a, b) => (a.title || '').localeCompare(b.title || '')).forEach(e => {
          const opt = document.createElement('option');
          opt.value = e.id;
          opt.textContent = e.title || e.display_name || e.id;
          if (record && record.prerequisite_assessment_id === e.id) opt.selected = true;
          prereqSelect.appendChild(opt);
        });
        updatePrereqRequirement();
      }

            let _titleManuallyEdited = Boolean(_editId && (record?.title || record?.name));
      const triggerAutoTitle = () => {
        if (_titleManuallyEdited || !titleInput) return;
        if (_currentSection === 'Assessments') {
          const instText = progSelect && progSelect.selectedIndex > 0 ? progSelect.options[progSelect.selectedIndex].textContent.trim() : '';
          const pText = classSelect && classSelect.selectedIndex > 0 ? classSelect.options[classSelect.selectedIndex].textContent.trim() : '';
          const tText = Classeselect && Classeselect.selectedIndex > 0 ? Classeselect.options[Classeselect.selectedIndex].textContent.trim() : '';
          const selectedLvlOpt = levelSelect && levelSelect.selectedIndex > 0 ? levelSelect.options[levelSelect.selectedIndex] : null;
          const mText = selectedLvlOpt ? (selectedLvlOpt.getAttribute('data-level-letter') || selectedLvlOpt.textContent.trim()) : '';
          const typeText = AssessmentTypeInput ? AssessmentTypeInput.value.trim() : '';

          const parts = [instText, pText, tText, mText, typeText].filter(Boolean);
          if (parts.length > 0) {
            titleInput.value = parts.join(' - ');
          }
        } else if (_currentSection === 'assessments') {
          const mSelect = document.getElementById('field-module_id');
          const mText = mSelect && mSelect.selectedIndex > 0 ? mSelect.options[mSelect.selectedIndex].textContent.trim() : '';
          const progText = progSelect && progSelect.selectedIndex > 0 ? progSelect.options[progSelect.selectedIndex].textContent.trim() : '';
          const bSelect = document.getElementById('field-batch_id');
          const batchText = bSelect && bSelect.selectedIndex > 0 ? bSelect.options[bSelect.selectedIndex].textContent.trim() : '';

          const parts = [progText, batchText, mText].filter(Boolean);
          if (parts.length > 0) {
            titleInput.value = parts.join(' - ');
          }
        }
      };

      if (titleInput && (_currentSection === 'Assessments' || _currentSection === 'assessments')) {
        titleInput.addEventListener('input', () => {
          _titleManuallyEdited = true;
        });
      }

      const populateLevelsForSection = async () => {
        if (!levelSelect) return;
        const currentVal = levelSelect.value;
        const targetLvl = record ? (record.current_level_id || record.level_id || null) : null;
        
        levelSelect.innerHTML = `<option value="">— No Level / Optional —</option>`;
        
        const isLevelReadonly = fields.find(f => f.id === 'level_id' || f.id === 'current_level_id')?.readonly;
        levelSelect.disabled = !!isLevelReadonly;

        try {
          const allLevels = await adminFetchAll('levels');
          const activeLevels = (allLevels || []).filter(l => !l.deleted_at);

          const seen = new Set();
          activeLevels.sort((a, b) => (Number(a.level_number) || 0) - (Number(b.level_number) || 0)).forEach(l => {
            if (!seen.has(l.id)) {
              seen.add(l.id);
              const opt = document.createElement('option');
              opt.value = l.id;
              const letter = typeof toLevelLetter === 'function' ? toLevelLetter(l.level_number) : (l.name || `Level ${l.level_number}`);
              opt.textContent = formatLevelOption(l);
              opt.setAttribute('data-level-letter', letter);
              opt.setAttribute('data-level-num', l.level_number);

              if (targetLvl ? (targetLvl === l.id) : (currentVal === l.id)) {
                opt.selected = true;
              }

              levelSelect.appendChild(opt);
            }
          });

          // Pre-select existing level or retain selected value without forcing Level 1
          if (targetLvl) {
            levelSelect.value = targetLvl;
          } else if (currentVal && Array.from(levelSelect.options).some(o => o.value === currentVal)) {
            levelSelect.value = currentVal;
          } else {
            levelSelect.value = '';
          }
        } catch (lvlErr) {
          console.warn('[crud-modals] Level population notice:', lvlErr);
        }

        updatePrereqRequirement();
        triggerAutoTitle();
      };

      if (_currentSection === 'batches') {
        const enrollInput = crudForm.querySelector('#field-enrollment_date');
        const finalInput = crudForm.querySelector('#field-actual_final_date');
        if (enrollInput && finalInput) {
          // Live duration hint element placed after finish date group (keeps start and finish dates on one row!)
          let durationHint = crudForm.querySelector('#cec-batch-duration-hint');
          if (!durationHint) {
            durationHint = document.createElement('div');
            durationHint.id = 'cec-batch-duration-hint';
            durationHint.style.gridColumn = '1 / -1';
            durationHint.style.fontSize = '0.75rem';
            durationHint.style.marginTop = '-6px';
            durationHint.style.marginBottom = '4px';
            durationHint.style.color = 'var(--fm-text-muted)';
            finalInput.closest('.form-group')?.after(durationHint);
          }

          const calcCEC = () => {
            const val = enrollInput.value;
            if (!val) {
              if (durationHint) durationHint.innerHTML = '';
              return;
            }
            const parts = val.split('-');
            if (parts.length !== 3) return;
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            // Ignore incomplete partial year typing (e.g. 0002)
            if (isNaN(y) || y < 2000 || isNaN(m) || isNaN(d)) return;

            // Start Monday -> Saturday of Week 4 is Start Date + 26 days
            const startDate = new Date(Date.UTC(y, m - 1, d));
            const endDate = new Date(startDate.getTime() + 26 * 86400000);
            const endY = endDate.getUTCFullYear();
            const endM = String(endDate.getUTCMonth() + 1).padStart(2, '0');
            const endD = String(endDate.getUTCDate()).padStart(2, '0');
            finalInput.value = `${endY}-${endM}-${endD}`;

            if (durationHint) {
              durationHint.innerHTML = `<span style="color: #34d399; font-weight: 600;">⚡ 4 Weeks (Mon – Sat W4)</span>: Auto-calculated finish date (${endD}/${endM}/${endY})`;
            }
          };

          enrollInput.addEventListener('input', calcCEC);
          enrollInput.addEventListener('change', calcCEC);

          finalInput.addEventListener('input', () => {
            if (durationHint && finalInput.value) {
              durationHint.innerHTML = `<span style="color: #818cf8;">Custom Finish Date: ${finalInput.value}</span>`;
            }
          });

          // Run immediately on open if enrollment date is already filled
          if (enrollInput.value) {
            if (!finalInput.value) {
              calcCEC();
            } else {
              const parts = finalInput.value.split('-');
              if (parts.length === 3) {
                durationHint.innerHTML = `<span style="color: #34d399; font-weight: 600;">⚡ Scheduled Batch Duration</span>: Ends on ${parts[2]}/${parts[1]}/${parts[0]}`;
              }
            }
          }
        }
      }

      if (progSelect && classSelect) {
        const populateBatchesForClass = async (selectedClassId) => {
          if (!batchSelect) return;
          batchSelect.innerHTML = `<option value="">— Select Batch —</option>`;
          if (!selectedClassId) {
            batchSelect.disabled = true;
            batchSelect.innerHTML = `<option value="">— Select Program First —</option>`;
            return;
          }
          batchSelect.disabled = false;
          const allBatches = await adminFetchAll('batches');
          const filteredBatches = allBatches.filter(b => b.program_id === selectedClassId && !b.deleted_at && (b.is_active === undefined || b.is_active === true));
          filteredBatches.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = b.name;
            if (record && record.batch_id === b.id) opt.selected = true;
            batchSelect.appendChild(opt);
          });
        };

        const populateClassesForProgram = async (selectedProgId) => {
          classSelect.innerHTML = `<option value="">${_currentSection === 'levels' ? '— Select Program (Optional / All Programs) —' : '— Select Program —'}</option>`;
          if (batchSelect) {
            batchSelect.innerHTML = `<option value="">— Select Program First —</option>`;
            batchSelect.disabled = true;
          }
          if (!selectedProgId) {
            classSelect.disabled = true;
            return;
          }
          classSelect.disabled = false;
          const allClasses = await adminFetchAll('programs');
          const filteredClasses = allClasses.filter(c => c.institution_id === selectedProgId && !c.deleted_at && (c.is_active === undefined || c.is_active === true));
          filteredClasses.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.name;
            if (record && (record.program_id === c.id || record.id === c.id)) opt.selected = true;
            classSelect.appendChild(opt);
          });
          if (record?.program_id) {
            classSelect.value = record.program_id;
          } else if (!classSelect.value && classSelect.options.length > 1 && _currentSection !== 'levels') {
            classSelect.value = classSelect.options[1].value;
          }
          if (classSelect.value) {
            await populateBatchesForClass(classSelect.value);
          }
          await populateLevelsForSection();
          triggerAutoTitle();
        };

        let initialProgId = record?.institution_id || (record?.programs?.institution_id) || (record?.classes?.institution_id) || progSelect.value;
        if (!initialProgId && record?.program_id) {
          try {
            const allProgs = await adminFetchAll('programs');
            const foundProg = allProgs.find(p => p.id === record.program_id);
            if (foundProg && foundProg.institution_id) {
              initialProgId = foundProg.institution_id;
            }
          } catch (err) {
            console.warn('[crud-modals] Program lookup failed:', err);
          }
        }
        if (!initialProgId && window._curriculumActiveInstId) {
          initialProgId = window._curriculumActiveInstId;
        }
        if (!initialProgId && progSelect.options.length > 1) {
          initialProgId = progSelect.options[1].value;
        }

        if (initialProgId) {
          progSelect.value = initialProgId;
          await populateClassesForProgram(initialProgId);
          if (record?.program_id) {
            classSelect.value = record.program_id;
          } else if (!classSelect.value && classSelect.options.length > 1 && _currentSection !== 'levels') {
            classSelect.value = classSelect.options[1].value;
          }
          if (classSelect.value) {
            await populateBatchesForClass(classSelect.value);
            if (record?.batch_id && batchSelect) {
              batchSelect.value = record.batch_id;
            } else if (batchSelect && !batchSelect.value && batchSelect.options.length > 1 && _currentSection === 'students') {
              batchSelect.value = batchSelect.options[1].value;
            }
          }
        } else {
          classSelect.disabled = true;
          classSelect.innerHTML = `<option value="">— Select Program First —</option>`;
        }

        progSelect.addEventListener('change', async (e) => {
          await populateClassesForProgram(e.target.value);
        });
        classSelect.addEventListener('change', async (e) => {
          if (typeof populateBatchesForClass === 'function') {
            await populateBatchesForClass(e.target.value);
          }
          await populateLevelsForSection();
          triggerAutoTitle();
        });
      }

      // Program -> Class -> Level cascading dependencies
      if (progSelect && Classeselect) {
        const populateClassesForProgram = async (selectedProgId) => {
          Classeselect.innerHTML = `<option value="">— Select Class —</option>`;
          const currentProgramId = classSelect?.value || record?.program_id;
          if (!selectedProgId && !currentProgramId && !record?.class_id) {
            Classeselect.disabled = true;
            return;
          }
          Classeselect.disabled = false;
          const allClasses = await adminFetchAll('classes');
          const filteredClasses = allClasses.filter(s => {
            if (s.deleted_at) return false;
            if (currentProgramId && s.program_id === currentProgramId) return true;
            if (selectedProgId && s.institution_id === selectedProgId) return true;
            if (record && record.class_id === s.id) return true;
            return false;
          });
          filteredClasses.sort((a, b) => (a.name || '').localeCompare(b.name || '')).forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            if (record && record.class_id === s.id) opt.selected = true;
            Classeselect.appendChild(opt);
          });
          if (record && record.class_id) {
            Classeselect.value = record.class_id;
          }
          await populateLevelsForSection();
          triggerAutoTitle();
        };

        const initialProgIdForClass = record?.institution_id || (record?.classes?.institution_id) || progSelect?.value;
        if (Classeselect) {
          await populateClassesForProgram(initialProgIdForClass);
          Classeselect.addEventListener('change', async () => {
            await populateLevelsForSection();
            triggerAutoTitle();
          });
        }

        if (progSelect) {
          progSelect.addEventListener('change', async (e) => {
            await populateClassesForProgram(e.target.value);
          });
        }
        if (classSelect) {
          classSelect.addEventListener('change', async () => {
            await populateClassesForProgram(progSelect?.value);
          });
        }
      }

      if (levelSelect) {
        levelSelect.addEventListener('change', () => {
          updatePrereqRequirement();
          triggerAutoTitle();
        });
        await populateLevelsForSection();
      }
      if (orderSelect) {
        orderSelect.addEventListener('change', () => {
          updatePrereqRequirement();
          triggerAutoTitle();
        });
      }
      if (AssessmentTypeInput) {
        AssessmentTypeInput.addEventListener('change', triggerAutoTitle);
        AssessmentTypeInput.addEventListener('input', triggerAutoTitle);
      }


      crudModal.classList.remove('hidden');
    }

let _crudModalsInitialized = false;
function _initCrudModals() {
  if (_crudModalsInitialized) return;
  _ensureDomRefs();
  if (!crudForm) return; // DOM not ready yet
  _crudModalsInitialized = true;

  crudForm.addEventListener('input', () => { window.isProfileDirty = true; });
  crudForm.addEventListener('change', () => { window.isProfileDirty = true; });

  crudForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fields = formFields[_currentSection];
      if (!fields) return;

      const payload = {};
      for (const f of fields) {
        if (f.uiOnly) continue; // Skip UI-only fields (e.g. program filter for levels)
        const el = document.getElementById(`field-${f.id}`);
        if (!el) continue;
        if (f.type === 'checkbox') payload[f.id] = el.checked;
        else if (f.type === 'number') payload[f.id] = el.value ? parseFloat(el.value) : null;
        else if (f.id === 'recurring_schedule') {
          if (!el.value || !el.value.trim()) {
            payload[f.id] = null;
          } else {
            try {
              payload[f.id] = JSON.parse(el.value.trim());
            } catch (err) {
              alert('Invalid JSON format in Recurring Schedule.');
              return;
            }
          }
        }
        else if (f.id === 'options_json') {
          if (!el.value || !el.value.trim()) {
            payload[f.id] = null;
          } else {
            const raw = el.value.trim();
            if (raw.startsWith('[') && raw.endsWith(']')) {
              try {
                payload[f.id] = JSON.parse(raw);
              } catch {
                if (/[;/|]/.test(raw)) {
                  payload[f.id] = (raw || '').replace(/^[\[\]"']+|[\[\]"']+$/g, '').split(/[;/|]/).map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
                } else {
                  payload[f.id] = (raw || '').replace(/^[\[\]"']+|[\[\]"']+$/g, '').split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
                }
              }
            } else if (/[;/|]/.test(raw)) {
              payload[f.id] = raw.split(/[;/|]/).map(s => s.trim()).filter(Boolean);
            } else if (raw.includes(',')) {
              payload[f.id] = raw.split(',').map(s => s.trim()).filter(Boolean);
            } else {
              payload[f.id] = [raw];
            }
          }
        }
        else if (f.type === 'password' && _editId && !el.value) continue; // Don't overwrite PIN if empty on edit
        else if (f.type === 'password' && el.value) {
          payload[f.id] = await hashPin(el.value);
        }
        else if (f.readonly && _editId && record?.[f.id] !== undefined) {
          payload[f.id] = record[f.id];
        }
        else if (_editId && !el.value && record?.[f.id] !== undefined && (f.id === 'class_id' || f.id === 'program_id' || f.id === 'level_id' || f.id === 'institution_id')) {
          payload[f.id] = record[f.id];
        }
        else payload[f.id] = el.value || null;
      }

      // Prerequisite Assessment Validation: Must fill if level and order are not Level A and Order 1
      if (_currentSection === 'Assessments') {
        // Prerequisite logic handled in Assessment Builder
      }

      // Never send display_name (Postgres GENERATED ALWAYS STORED column causes 428C9)
      delete payload.display_name;

      const targetTable = (_currentSection || '').replace('-', '_');
      
      if (_currentSection === 'students') {
        if (payload.name) payload.name = cleanStudentName(payload.name);
        if (payload.batch_id) {
          try {
            const bList = await adminFetchAll('batches', 'id, program_id, programs(institution_id)');
            const bMatch = (bList || []).find(b => b.id === payload.batch_id);
            if (bMatch) {
              if (bMatch.program_id) payload.program_id = bMatch.program_id;
              if (bMatch.programs?.institution_id) payload.institution_id = bMatch.programs.institution_id;
            }
          } catch (e) { console.warn('Sync batch error in crud-modal:', e); }
        }
      }
      try {
        let payloadToSave = { ...payload };
        if (_editId) {
          try {
            await adminUpdate(targetTable, _editId, payloadToSave);
          } catch (err) {
            if (targetTable === 'levels' && payloadToSave.program_id && (err.message?.includes('program_id') || err.message?.includes('PGRST204') || err.message?.includes('400'))) {
              delete payloadToSave.program_id;
              await adminUpdate(targetTable, _editId, payloadToSave);
            } else if (targetTable === 'Assessments') {
              let retried = false;
              if ('program_id' in payloadToSave && (err.message?.includes('program_id') || err.message?.includes('PGRST204') || err.message?.includes('400'))) {
                delete payloadToSave.program_id;
                retried = true;
              }
              if ('prerequisite_assessment_id' in payloadToSave && (err.message?.includes('prerequisite') || err.message?.includes('PGRST204') || err.message?.includes('400'))) {
                delete payloadToSave.prerequisite_assessment_id;
                retried = true;
              }
              if ('Assessment_order' in payloadToSave && (err.message?.includes('order') || err.message?.includes('PGRST204') || err.message?.includes('400'))) {
                delete payloadToSave.Assessment_order;
                retried = true;
              }
              if (retried) {
                await adminUpdate(targetTable, _editId, payloadToSave);
              } else {
                throw err;
              }
            } else {
              throw err;
            }
          }
          if (targetTable === 'classes') {
            try {
              const sb = await getSupabase();
              if (sb) {
                await sb.from('class_levels').delete().eq('class_id', _editId);
                if (payloadToSave.level_id) {
                  await sb.from('class_levels').insert({ class_id: _editId, level_id: payloadToSave.level_id });
                }
              }
            } catch (clErr) {
              console.warn('[crud-modals] class_levels sync notice:', clErr);
            }
          }
          showToast('Record updated.', 'success');
        } else {
          // If manually adding a student, check if identical student already exists in same class
          if (_currentSection === 'students') {
            const existingList = await adminFetchAll('students');
            const existingMatch = existingList.find(s => !s.deleted_at && s.program_id === payload.program_id && (formatStudentName(s.name, s.gender) || '').toLowerCase().trim() === (payload.name || '').toLowerCase().trim());
            if (existingMatch) {
              await adminUpdate('students', existingMatch.id, { ...payload, updated_at: new Date().toISOString() });
              showToast('A student with this name already exists in the class. Data successfully merged/updated!', 'success');
              crudModal.classList.add('hidden');
              if (typeof window.loadSection === 'function') window.loadSection('students');
              return;
            }
          }
          let inserted = null;
          try {
            inserted = await adminInsert(targetTable, payloadToSave);
          } catch (err) {
            if (targetTable === 'levels' && payloadToSave.program_id && (err.message?.includes('program_id') || err.message?.includes('PGRST204') || err.message?.includes('400'))) {
              delete payloadToSave.program_id;
              inserted = await adminInsert(targetTable, payloadToSave);
            } else if (targetTable === 'Assessments') {
              let retried = false;
              if ('program_id' in payloadToSave && (err.message?.includes('program_id') || err.message?.includes('PGRST204') || err.message?.includes('400'))) {
                delete payloadToSave.program_id;
                retried = true;
              }
              if ('prerequisite_assessment_id' in payloadToSave && (err.message?.includes('prerequisite') || err.message?.includes('PGRST204') || err.message?.includes('400'))) {
                delete payloadToSave.prerequisite_assessment_id;
                retried = true;
              }
              if ('Assessment_order' in payloadToSave && (err.message?.includes('order') || err.message?.includes('PGRST204') || err.message?.includes('400'))) {
                delete payloadToSave.Assessment_order;
                retried = true;
              }
              if (retried) {
                inserted = await adminInsert(targetTable, payloadToSave);
              } else {
                throw err;
              }
            } else {
              throw err;
            }
          }
          if (targetTable === 'classes' && inserted?.id && payloadToSave.level_id) {
            try {
              const sb = await getSupabase();
              if (sb) {
                await sb.from('class_levels').insert({ class_id: inserted.id, level_id: payloadToSave.level_id });
              }
            } catch (clErr) {
              console.warn('[crud-modals] class_levels sync notice:', clErr);
            }
          }
          showToast('Record added.', 'success');
        }
        window.isProfileDirty = false;
        crudModal.classList.add('hidden');
        if (typeof window.loadSection === 'function') {
          window.loadSection(window._activeSectionAlias || _currentSection);
        }
      } catch(e) {
        showToast('Save failed: ' + e.message, 'error');
      }
    });


    // Note: window._editRecord is centralized in app.js

    // Note: window._deleteRecord and delete-confirm-btn are centralized with cascade safeguards in app.js


    // Modal close handlers
    ['close-crud-modal','crud-cancel-btn'].forEach(id => document.getElementById(id).addEventListener('click', () => {
      if (window.isProfileDirty) {
        if (!confirm('You have unsaved changes. Are you sure you want to close?')) return;
      }
      window.isProfileDirty = false;
      crudModal.classList.add('hidden');
      if (crudForm) {
        crudForm.reset();
        crudForm.innerHTML = '';
      }
    }));
    ['delete-cancel-btn'].forEach(id => document.getElementById(id).addEventListener('click', () => document.getElementById('delete-modal').classList.add('hidden')));

} // end _initCrudModals

// ============================================================
// DUPLICATE STUDENTS & QUESTIONS MODAL CONTROLLERS
// ============================================================
let currentDupStudScope = 'same_class';
let dupStudentGroups = [];
let currentDupQTab = 'same_Assessment';
let _dupModalsInitialized = false;

function _initDuplicateModals() {
  if (_dupModalsInitialized) return;
  const dupStudModal = document.getElementById('duplicate-students-modal');
  const dupQModal = document.getElementById('duplicate-questions-modal');
  if (!dupStudModal && !dupQModal) return; // DOM not ready yet
  _dupModalsInitialized = true;

  // --- Student Duplicate Modal Events ---
  document.getElementById('close-dup-students-modal')?.addEventListener('click', () => {
    dupStudModal?.classList.add('hidden');
    if (typeof window.loadSection === 'function') window.loadSection('students');
  });

  document.querySelectorAll('.dup-stud-tab-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      document.querySelectorAll('.dup-stud-tab-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
      });
      const target = e.currentTarget;
      target.classList.remove('btn-secondary');
      target.classList.add('btn-primary');
      currentDupStudScope = target.dataset.scope || 'same_class';
      await loadDuplicateStudents(currentDupStudScope);
    });
  });

  document.getElementById('btn-merge-all-visible-students')?.addEventListener('click', async () => {
    if (!dupStudentGroups || dupStudentGroups.length === 0) {
      showToast('No duplicate student groups to merge.', 'info');
      return;
    }
    if (!confirm(`Are you sure you want to quick-merge ALL ${dupStudentGroups.length} visible groups into their respective primary profiles?`)) return;

    showLoading('Batch merging duplicate students...');
    try {
      let successCount = 0;
      for (const group of dupStudentGroups) {
        const primaryId = group.recommendedPrimaryId || (group.candidates && group.candidates[0]?.id);
        if (!primaryId || !group.candidates) continue;
        for (const cand of group.candidates) {
          if (cand.id !== primaryId) {
            await mergeStudentPair(primaryId, cand.id);
            successCount++;
          }
        }
      }
      hideLoading();
      showToast(`Successfully processed batch merge (${successCount} records merged).`, 'success');
      await loadDuplicateStudents(currentDupStudScope);
    } catch (err) {
      hideLoading();
      showToast(`Batch merge interrupted: ${err.message}`, 'error');
      await loadDuplicateStudents(currentDupStudScope);
    }
  });

  // --- Question Duplicate Modal Events ---
  document.getElementById('close-dup-questions-modal')?.addEventListener('click', () => {
    dupQModal?.classList.add('hidden');
  });

  document.getElementById('dup-q-assessment-select')?.addEventListener('change', () => loadDuplicateQuestions());

  document.querySelectorAll('.dup-q-tab-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      document.querySelectorAll('.dup-q-tab-btn').forEach(b => {
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
      });
      const target = e.currentTarget;
      target.classList.remove('btn-secondary');
      target.classList.add('btn-primary');
      currentDupQTab = target.dataset.qtab || 'same_assessment';
      await loadDuplicateQuestions();
    });
  });

  const batchCleanQuestionsHandler = async () => {
    const dupQAssessmentselect = document.getElementById('dup-q-assessment-select');
    const AssessmentId = dupQAssessmentselect?.value || null;
    if (!AssessmentId) {
      showToast('Please select a specific Assessment from the filter above to perform Batch Auto-Resolve.', 'warning');
      return;
    }
    if (!confirm('Are you sure you want to batch resolve ALL duplicate questions for this Assessment? This is irreversible.')) return;

    showLoading('Batch resolving duplicate questions...');
    try {
      const res = await batchResolveAssessmentDuplicateQuestions(AssessmentId);
      hideLoading();
      showToast(`Successfully processed Assessment: repointed ${res.totalRepointedAnswers || 0} answers across ${res.groupsResolved || 0} duplicate groups.`, 'success');
      await loadDuplicateQuestions();
    } catch (err) {
      hideLoading();
      showToast(`Batch resolve failed: ${err.message}`, 'error');
      await loadDuplicateQuestions();
    }
  };

  document.getElementById('btn-batch-clean-assessment-questions')?.addEventListener('click', batchCleanQuestionsHandler);
}

// --- STUDENT DUPLICATE LOADER ---
async function loadDuplicateStudents(scope = 'same_class') {
  const dupStudContent = document.getElementById('dup-students-content');
  if (!dupStudContent) return;
  dupStudContent.innerHTML = '<div class="empty-state p-6 text-center"><div class="spinner"></div><p>Scanning for duplicate students...</p></div>';
  try {
    const duplicateGroups = await detectDuplicateStudents(scope);
    dupStudentGroups = duplicateGroups || [];

    // Update counters
    const totalDups = dupStudentGroups.reduce((acc, g) => acc + ((g.candidates?.length || 1) - 1), 0);
    const sameCountEl = document.getElementById('dup-stud-same-count');
    const crossCountEl = document.getElementById('dup-stud-cross-count');
    if (scope === 'same_class' && sameCountEl) sameCountEl.textContent = totalDups;
    if (scope === 'cross_class' && crossCountEl) crossCountEl.textContent = totalDups;

    if (dupStudentGroups.length === 0) {
      dupStudContent.innerHTML = '<div class="empty-state p-6 text-center"><p>✅ No duplicate students found.</p></div>';
      return;
    }

    let html = '';
    dupStudentGroups.forEach((group, gIdx) => {
      html += `
        <div class="card p-4 mb-4" style="border-left:4px solid var(--clr-primary); background:var(--clr-surface, #1e293b); border-radius:8px;">
          <div class="fw-700 mb-2" style="color:var(--clr-text, #f8fafc); font-size:1rem;">
            Duplicate Group ${gIdx + 1} — Name: "${escapeHtml(group.name)}"
          </div>
          <table class="table-sm w-100 mb-3 text-sm" style="border-collapse:collapse; width:100%;">
            <thead>
              <tr style="border-bottom:1px solid rgba(255,255,255,0.1); text-align:left;">
                <th style="padding:8px 4px;">Student ID</th>
                <th style="padding:8px 4px;">Program / Class</th>
                <th style="padding:8px 4px;">Batch / Cohort</th>
                <th style="padding:8px 4px;">Institution</th>
                <th style="padding:8px 4px;">Attempts</th>
                <th style="padding:8px 4px;">Created At</th>
                <th style="padding:8px 4px; text-align:right;">Action</th>
              </tr>
            </thead>
            <tbody>
      `;
      (group.candidates || []).forEach((student, sIdx) => {
        const isPrimary = student.id === group.recommendedPrimaryId || sIdx === 0;
        html += `
              <tr style="${isPrimary ? 'background:rgba(16, 185, 129, 0.12);' : ''} border-bottom:1px solid rgba(255,255,255,0.05);">
                <td style="padding:8px 4px; font-family:monospace; font-size:0.8rem;">${student.id.substring(0,8)}...</td>
                <td style="padding:8px 4px;">${escapeHtml(student.programName || student.programs?.name || '—')}</td>
                <td style="padding:8px 4px;">${escapeHtml(student.batchName || student.batches?.name || 'Unassigned')}</td>
                <td style="padding:8px 4px;">${escapeHtml(student.institutionName || student.institutions?.name || '—')}</td>
                <td style="padding:8px 4px;"><span class="badge" style="background:rgba(59,130,246,0.2); color:#60a5fa;">${student.attemptsCount || 0} attempts</span></td>
                <td style="padding:8px 4px; font-size:0.8rem; color:#94a3b8;">${new Date(student.created_at).toLocaleDateString()}</td>
                <td style="padding:8px 4px; text-align:right;">
                  ${isPrimary ? '<span class="badge badge-success" style="background:#10b981; color:#fff; padding:3px 8px; border-radius:4px; font-size:0.75rem;">Primary Target</span>' : `<button class="btn btn-warning btn-sm btn-merge-student" data-primary="${group.recommendedPrimaryId}" data-secondary="${student.id}" style="font-size:0.75rem; padding:3px 8px;">Merge to Primary</button>`}
                </td>
              </tr>
        `;
      });
      html += `
            </tbody>
          </table>
        </div>
      `;
    });
    dupStudContent.innerHTML = html;

    // Attach individual merge listeners
    dupStudContent.querySelectorAll('.btn-merge-student').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const primaryId = e.currentTarget.dataset.primary;
        const secondaryId = e.currentTarget.dataset.secondary;
        if (!confirm('Merge this student into the primary profile? All Assessment attempts and progress will be transferred, and this duplicate profile will be soft-deleted. This cannot be undone.')) return;

        e.currentTarget.disabled = true;
        e.currentTarget.innerHTML = '<div class="spinner" style="width:12px;height:12px;"></div>';
        try {
          const res = await mergeStudentPair(primaryId, secondaryId);
          showToast(`Successfully merged student! Transferred ${res.transferredAttempts || 0} attempts and ${res.transferredProgress || 0} progress records.`, 'success');
          await loadDuplicateStudents(currentDupStudScope);
        } catch (err) {
          showToast(`Merge failed: ${err.message}`, 'error');
          e.currentTarget.disabled = false;
          e.currentTarget.textContent = 'Merge to Primary';
        }
      });
    });

  } catch (err) {
    console.error('Error loading duplicate students:', err);
    dupStudContent.innerHTML = `<div class="empty-state p-6 text-center text-danger"><p>Error loading duplicate students: ${escapeHtml(err.message)}</p></div>`;
  }
}

// --- QUESTION DUPLICATE LOADER ---
async function loadDuplicateQuestions() {
  const dupQContent = document.getElementById('dup-questions-content');
  const dupQAssessmentselect = document.getElementById('dup-q-assessment-select');
  if (!dupQContent) return;

  dupQContent.innerHTML = '<div class="empty-state p-6 text-center"><div class="spinner"></div><p>Scanning for duplicate questions...</p></div>';
  try {
    const AssessmentId = dupQAssessmentselect?.value || null;
    const data = await detectDuplicateQuestions(AssessmentId);

    // Update count badges
    const sameCountEl = document.getElementById('dup-q-same-count');
    if (sameCountEl) sameCountEl.textContent = data.totalSameAssessmentDupCount || 0;
    const orderCountEl = document.getElementById('dup-q-order-count');
    if (orderCountEl) orderCountEl.textContent = (data.sameAssessmentOrderConflicts || []).length;
    const crossCountEl = document.getElementById('dup-q-cross-count');
    if (crossCountEl) crossCountEl.textContent = (data.crossAssessmentDuplicates || []).length;

    // View tab 1: SAME Assessment DUPLICATES
    if (currentDupQTab === 'same_assessment' || currentDupQTab === 'same_Assessment') {
      if (!data.sameAssessmentDuplicates || data.sameAssessmentDuplicates.length === 0) {
        dupQContent.innerHTML = '<div class="empty-state p-6 text-center"><p>✅ No duplicate questions found in this assessment scope.</p></div>';
        return;
      }

      let html = '';
      data.sameAssessmentDuplicates.forEach((group) => {
        const AssessmentTitle = group.AssessmentTitle || 'Unknown Assessment';
        const primaryQ = group.candidates[0];

        let optsDisplay = '';
        if (primaryQ.options_json) {
          try {
            const opts = typeof primaryQ.options_json === 'string' ? JSON.parse(primaryQ.options_json) : primaryQ.options_json;
            optsDisplay = Array.isArray(opts) ? opts.join(' | ') : String(primaryQ.options_json);
          } catch {
            optsDisplay = String(primaryQ.options_json);
          }
        }

        html += `
          <div class="card p-4 mb-4" style="border-left:4px solid var(--clr-warning, #f59e0b); background:var(--clr-surface, #1e293b); border-radius:8px;">
            <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
              <div class="fw-700" style="color:#f8fafc;">Duplicate Question in: ${escapeHtml(AssessmentTitle)}</div>
              <button class="btn btn-warning btn-sm btn-resolve-q-group" data-primary="${primaryQ.id}" style="font-size:0.75rem;">Auto-Resolve Group</button>
            </div>
            <div class="text-sm mb-3 px-3 py-2 rounded" style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08);">
              <div class="mb-2"><strong>Text:</strong> ${escapeHtml(primaryQ.question_text)}</div>
              ${optsDisplay ? `<div class="mb-2 text-muted"><strong>Options:</strong> ${escapeHtml(optsDisplay)}</div>` : ''}
              <div class="text-muted"><strong>Correct Answer:</strong> ${escapeHtml(primaryQ.correct_answer || '-')}</div>
            </div>
            <table class="table-sm w-100 text-xs" style="border-collapse:collapse; width:100%;">
              <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.1); text-align:left;">
                  <th style="padding:6px 4px;">ID</th>
                  <th style="padding:6px 4px;">Order</th>
                  <th style="padding:6px 4px;">Answer Type</th>
                  <th style="padding:6px 4px;">Logged Answers</th>
                  <th style="padding:6px 4px;">Created At</th>
                  <th style="padding:6px 4px; text-align:right;">Status</th>
                </tr>
              </thead>
              <tbody>
        `;
        group.candidates.forEach((q, qIdx) => {
          html += `
                <tr style="${qIdx === 0 ? 'background:rgba(16, 185, 129, 0.1);' : 'background:rgba(239, 68, 68, 0.05);'} border-bottom:1px solid rgba(255,255,255,0.05);">
                  <td style="padding:6px 4px; font-family:monospace;">${q.id.substring(0,8)}...</td>
                  <td style="padding:6px 4px; font-weight:700;">#${q.question_order}</td>
                  <td style="padding:6px 4px;">${escapeHtml(q.answer_type)}</td>
                  <td style="padding:6px 4px;" class="fw-700 text-primary">${q.answersCount || 0}</td>
                  <td style="padding:6px 4px; color:#94a3b8;">${new Date(q.created_at).toLocaleDateString()}</td>
                  <td style="padding:6px 4px; text-align:right;">${qIdx === 0 ? '<span class="badge badge-success" style="background:#10b981; color:#fff; padding:2px 6px; border-radius:3px;">Primary (Keep)</span>' : '<span class="badge badge-error" style="background:#ef4444; color:#fff; padding:2px 6px; border-radius:3px;">Duplicate (Remove)</span>'}</td>
                </tr>
          `;
        });
        html += `
              </tbody>
            </table>
          </div>
        `;
      });
      dupQContent.innerHTML = html;

      // Attach resolve listeners
      dupQContent.querySelectorAll('.btn-resolve-q-group').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const primaryId = e.currentTarget.dataset.primary;
          const group = data.sameAssessmentDuplicates.find(g => g.recommendedPrimaryId === primaryId);
          if (!group) return;

          if (!confirm('Resolve this duplicate question group? All student answers tied to the duplicates will be repointed to the primary question, and the duplicates will be removed. Finally, questions will be re-sequenced.')) return;

          e.currentTarget.disabled = true;
          e.currentTarget.innerHTML = '<div class="spinner" style="width:12px;height:12px;"></div>';
          try {
            let count = 0;
            for (let i = 1; i < group.candidates.length; i++) {
              await resolveDuplicateQuestionGroup(group.recommendedPrimaryId, group.candidates[i].id, false);
              count++;
            }
            await resequenceAssessmentQuestions(group.AssessmentId);
            showToast(`Resolved! Repointed answers. ${count} duplicates removed.`, 'success');
            await loadDuplicateQuestions();
          } catch (err) {
            showToast(`Resolve failed: ${err.message}`, 'error');
            e.currentTarget.disabled = false;
            e.currentTarget.textContent = 'Auto-Resolve Group';
          }
        });
      });
      return;
    }

    // View tab 2: ORDER CONFLICTS
    if (currentDupQTab === 'order_conflicts') {
      if (!data.sameAssessmentOrderConflicts || data.sameAssessmentOrderConflicts.length === 0) {
        dupQContent.innerHTML = '<div class="empty-state p-6 text-center"><p>✅ No question order conflicts detected.</p></div>';
        return;
      }

      let html = '';
      data.sameAssessmentOrderConflicts.forEach((group) => {
        const AssessmentTitle = group.AssessmentTitle || 'Unknown Assessment';
        html += `
          <div class="card p-4 mb-4" style="border-left:4px solid var(--clr-info, #3b82f6); background:var(--clr-surface, #1e293b); border-radius:8px;">
            <div class="d-flex justify-between align-center mb-2 flex-wrap gap-2">
              <div class="fw-700" style="color:#f8fafc;">Order Conflict (#${group.order}) in: ${escapeHtml(AssessmentTitle)}</div>
              <button class="btn btn-secondary btn-sm btn-resequence-Assessment" data-Assessment="${group.AssessmentId}" style="font-size:0.75rem;">Resequence Assessment (1..N)</button>
            </div>
            <table class="table-sm w-100 text-xs" style="border-collapse:collapse; width:100%;">
              <thead>
                <tr style="border-bottom:1px solid rgba(255,255,255,0.1); text-align:left;">
                  <th style="padding:6px 4px;">Order</th>
                  <th style="padding:6px 4px;">Question Text</th>
                  <th style="padding:6px 4px;">Answer Type</th>
                </tr>
              </thead>
              <tbody>
                ${group.candidates.map(q => `
                  <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
                    <td style="padding:6px 4px; font-weight:700; color:#f59e0b;">#${q.question_order}</td>
                    <td style="padding:6px 4px;">${escapeHtml(q.question_text || '')}</td>
                    <td style="padding:6px 4px;">${escapeHtml(q.answer_type || '')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      });
      dupQContent.innerHTML = html;

      dupQContent.querySelectorAll('.btn-resequence-Assessment').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const AssessmentId = e.currentTarget.dataset.Assessment;
          e.currentTarget.disabled = true;
          try {
            await resequenceAssessmentQuestions(AssessmentId);
            showToast('Assessment questions resequenced sequentially!', 'success');
            await loadDuplicateQuestions();
          } catch (err) {
            showToast(`Resequence failed: ${err.message}`, 'error');
            e.currentTarget.disabled = false;
          }
        });
      });
      return;
    }

    // View tab 3: CROSS Assessment DUPLICATES
    if (currentDupQTab === 'cross_Assessment') {
      if (!data.crossAssessmentDuplicates || data.crossAssessmentDuplicates.length === 0) {
        dupQContent.innerHTML = '<div class="empty-state p-6 text-center"><p>✅ No cross-Assessment duplicate questions found.</p></div>';
        return;
      }

      let html = '';
      data.crossAssessmentDuplicates.forEach((group) => {
        html += `
          <div class="card p-4 mb-4" style="border-left:4px solid var(--clr-primary, #6366f1); background:var(--clr-surface, #1e293b); border-radius:8px;">
            <div class="fw-700 mb-2" style="color:#f8fafc;">Identical Text in ${group.AssessmentCount} assessments (${group.candidatesCount} instances)</div>
            <div class="text-sm mb-2 px-3 py-2 rounded" style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.08);">
              ${escapeHtml(group.questionText)}
            </div>
            <div class="text-xs text-muted"><strong>Assessments:</strong> ${(group.Assessments || []).map(e => escapeHtml(e.title)).join(' • ')}</div>
          </div>
        `;
      });
      dupQContent.innerHTML = html;
      return;
    }

  } catch (err) {
    console.error('Error loading duplicate questions:', err);
    dupQContent.innerHTML = `<div class="empty-state p-6 text-center text-danger"><p>Error loading duplicates: ${escapeHtml(err.message)}</p></div>`;
  }
}

// --- POPULATE Assessment SELECT IN QUESTIONS MODAL ---
async function initDuplicateQuestionsSelect() {
  const dupQAssessmentselect = document.getElementById('dup-q-assessment-select');
  if (!dupQAssessmentselect) return;
  try {
    const Assessments = await adminFetchAll('assessments', 'id, title, status');
    const sortedAssessments = (Assessments || []).sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    dupQAssessmentselect.innerHTML = '<option value="">— All Assessments (Global Search) —</option>' +
      sortedAssessments.map(e => `<option value="${e.id}">${escapeHtml(e.title)} (${e.status || 'published'})</option>`).join('');
  } catch (e) {
    console.warn('Could not load Assessments for duplicate select:', e);
  }
}

// --- TOP-LEVEL MODAL OPENERS ---
async function openDuplicateStudentsModal() {
  _ensureDomRefs();
  _initDuplicateModals();
  const dupStudModal = document.getElementById('duplicate-students-modal');
  if (dupStudModal) dupStudModal.classList.remove('hidden');
  await loadDuplicateStudents(currentDupStudScope);
}

async function openDuplicateQuestionsModal() {
  _ensureDomRefs();
  _initDuplicateModals();
  const dupQModal = document.getElementById('duplicate-questions-modal');
  if (dupQModal) dupQModal.classList.remove('hidden');
  await initDuplicateQuestionsSelect();
  await loadDuplicateQuestions();
}

// Ensure global accessibility across all views
if (typeof window !== 'undefined') {
  window.openDuplicateStudentsModal = openDuplicateStudentsModal;
  window.openDuplicateQuestionsModal = openDuplicateQuestionsModal;
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    _initCrudModals();
    _initDuplicateModals();
  });
} else {
  _initCrudModals();
  _initDuplicateModals();
}




export { openCrudModal, openDuplicateStudentsModal, openDuplicateQuestionsModal, hashPin };


