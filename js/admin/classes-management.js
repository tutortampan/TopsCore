import { adminFetchAll, adminInsert, adminSoftDelete, autoGenerateWordsAssessments, autoGeneratePhrasesAssessments } from '../api.js?v=4.7.9';
import { showToast } from '../app.js?v=4.7.9';
import { openAssessmentBuilder } from './assessment-builder.js?v=4.7.9';
import { DataGrid } from './datagrid.js?v=4.7.9';
import { openAssessmentBuilderModal as openVocabWizard } from './vocab-vault.js?v=4.7.9';

// ─────────────────────────────────────────────────────────────
// SMART CLASS-AWARE TASK / TEST ROUTERS
// Detects class type by name → opens the correct wizard.
// All new assessments use assessment_category: 'TASK' or 'TEST'
// (QUIZ/EXAM are @deprecated — do NOT use for new classes)
// ─────────────────────────────────────────────────────────────

/** Detects class type from its name */
function detectClassType(className) {
  const n = (className || '').toLowerCase();
  if (n.includes('vocab'))           return 'VOCABULARY';
  if (n.includes('phrase'))          return 'VOCABULARY';   // phrase classes use same vault
  if (n.includes('basic english'))   return 'BASIC_ENGLISH';
  if (n.includes('storytelling') && n.includes('1')) return 'STORYTELLING_L1';
  if (n.includes('telling story'))   return 'TELLING_STORY';
  if (n.includes('public speaking')) return 'PUBLIC_SPEAKING';
  if (n.includes('speaking project'))return 'SPEAKING_PROJECTS';
  return 'GENERIC';
}

/** 🟡 ADD TASK — opens the correct Task wizard for the class */
window.handleAddTask = (classId, className) => {
  const type = detectClassType(className);
  switch (type) {
    case 'VOCABULARY':
      // Vocab/Phrase Task → use existing Vocab Vault wizard (tier: TASK)
      const asmTypeTask = (className || '').toLowerCase().includes('phrase') ? 'PHRASE_RECOGNITION' : 'VOCAB_MASTERY';
      openVocabWizard(null, { classId, className, assessmentType: asmTypeTask, tier: 'TASK', category: 'TASK' });
      break;
    case 'BASIC_ENGLISH':
    case 'TELLING_STORY':
    case 'PUBLIC_SPEAKING':
    case 'SPEAKING_PROJECTS':
    case 'STORYTELLING_L1':
    case 'GENERIC':
    default:
      // All other Task types → generic Assessment Builder (with category pre-set to TASK)
      openAssessmentBuilder(null, classId, { category: 'TASK' });
      break;
  }
};

/** 🔴 ADD TEST — opens the correct Test wizard for the class */
window.handleAddTest = (classId, className) => {
  const type = detectClassType(className);
  switch (type) {
    case 'VOCABULARY':
      // Vocab Test → Aggregator mode (combines Task words into one Test)
      const asmTypeTest = (className || '').toLowerCase().includes('phrase') ? 'PHRASE_RECOGNITION' : 'VOCAB_MASTERY';
      openVocabWizard(null, { classId, className, assessmentType: asmTypeTest, tier: 'TEST', category: 'TEST' });
      break;
    case 'BASIC_ENGLISH':
    case 'TELLING_STORY':
    case 'PUBLIC_SPEAKING':
    case 'SPEAKING_PROJECTS':
    case 'STORYTELLING_L1':
    case 'GENERIC':
    default:
      // All other Test types → generic Assessment Builder (with category pre-set to TEST)
      openAssessmentBuilder(null, classId, { category: 'TEST' });
      break;
  }
};

/** @deprecated — Use handleAddTask / handleAddTest instead */
window.handleCreateClassAssessment = (classId, className) => {
  console.warn('[DEPRECATED] handleCreateClassAssessment — use handleAddTask or handleAddTest');
  window.handleAddTask(classId, className);
};


let currentSelectedClass = null;
let allLevels = [];
let allModules = [];
let currentArea = null;

export async function renderClasses(area) {
  currentArea = area;
  let [institutions, programs, classes, levels, modules] = await Promise.all([
    adminFetchAll('institutions', '*'),
    adminFetchAll('programs', '*'),
    adminFetchAll('classes', '*, class_levels(levels(name))'),
    adminFetchAll('levels', '*'),
    adminFetchAll('modules', '*')
  ]);
  
  institutions = (institutions || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  programs = (programs || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  classes = (classes || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  allLevels = (levels || []).sort((a, b) => a.level_number - b.level_number);
  allModules = (modules || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  window.lastRenderedClassesArray = classes;
  window.renderClassDetailGlobal = renderClassDetail;

  area.innerHTML = `
    <div class="workspace-split" style="display:flex; height:100%; width:100%; overflow:hidden;">
      <!-- Left Panel -->
      <div id="class-sidebar" style="width:260px; border-right:1px solid var(--clr-border); background:var(--clr-surface); display:flex; flex-direction:column; flex-shrink:0;">
        
        <!-- Tab Bar -->
        <div style="display:flex; border-bottom:1px solid var(--clr-border); flex-shrink:0;">
          <button id="tab-btn-classes" style="flex:1; padding:0.6rem 0; font-size:0.78rem; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; background:var(--clr-primary); color:#fff; border:none; cursor:pointer; border-radius:0;">
            🎓 Classes
          </button>
          <button id="tab-btn-org" style="flex:1; padding:0.6rem 0; font-size:0.78rem; font-weight:600; letter-spacing:0.04em; text-transform:uppercase; background:transparent; color:var(--clr-text-muted); border:none; cursor:pointer;">
            🏢 Org
          </button>
        </div>

        <!-- Classes Tab (default active) -->
        <div id="panel-classes-tab" style="flex:1; overflow-y:auto; display:flex; flex-direction:column;">
          <!-- Search -->
          <div style="padding:0.5rem 0.75rem; border-bottom:1px solid var(--clr-border); flex-shrink:0;">
            <input id="class-search-input" type="text" placeholder="Search classes..." style="width:100%; padding:0.35rem 0.6rem; font-size:0.82rem; background:var(--clr-bg-1); border:1px solid var(--clr-border); border-radius:4px; color:var(--clr-text); outline:none; box-sizing:border-box;">
          </div>
          <!-- Class List -->
          <div id="classes-flat-list" style="flex:1; overflow-y:auto; padding:0.4rem 0;">
            <!-- injected -->
          </div>
        </div>

        <!-- Org Tree Tab (hidden by default) -->
        <div id="panel-org-tab" style="flex:1; overflow-y:auto; display:none; flex-direction:column;">
          <div style="padding:0.6rem 0.75rem; border-bottom:1px solid var(--clr-border); display:flex; justify-content:space-between; align-items:center; flex-shrink:0;">
            <span style="font-size:0.78rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--clr-text-muted);">Organization</span>
            <button class="btn btn-primary btn-sm" id="btn-add-inst-global" style="padding:0.2rem 0.45rem; font-size:0.75rem;" title="Add Institution">+ Inst</button>
          </div>
          <div id="org-tree-list" style="flex:1; overflow-y:auto; padding:0.75rem; display:flex; flex-direction:column; gap:2px;">
            <!-- Tree injected here -->
          </div>
        </div>
      </div>
      
      <!-- Main Canvas -->
      <div id="class-detail-container" style="flex:1; overflow-y:auto; background:var(--clr-bg-1);">
        <div class="empty-state" style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:var(--clr-text-muted);">
          <div style="font-size:3rem; margin-bottom:1rem;">🎓</div>
          <p>Select a class from the left panel.</p>
        </div>
      </div>
    </div>
  `;

  // ── Tab switching ──
  const tabClasses = document.getElementById('tab-btn-classes');
  const tabOrg    = document.getElementById('tab-btn-org');
  const panelCls  = document.getElementById('panel-classes-tab');
  const panelOrg  = document.getElementById('panel-org-tab');

  function activateTab(which) {
    const isClasses = which === 'classes';
    tabClasses.style.background   = isClasses ? 'var(--clr-primary)' : 'transparent';
    tabClasses.style.color        = isClasses ? '#fff' : 'var(--clr-text-muted)';
    tabOrg.style.background       = isClasses ? 'transparent' : 'var(--clr-primary)';
    tabOrg.style.color            = isClasses ? 'var(--clr-text-muted)' : '#fff';
    panelCls.style.display        = isClasses ? 'flex' : 'none';
    panelOrg.style.display        = isClasses ? 'none' : 'flex';
  }
  tabClasses.addEventListener('click', () => activateTab('classes'));
  tabOrg.addEventListener('click',    () => activateTab('org'));

  // ── Build flat classes list ──
  const flatList = document.getElementById('classes-flat-list');

  function buildFlatList(filter = '') {
    flatList.innerHTML = '';
    const lc = filter.toLowerCase();
    const filtered = filter ? classes.filter(c => (c.name || '').toLowerCase().includes(lc)) : classes;

    if (!filtered.length) {
      flatList.innerHTML = '<div style="color:var(--clr-text-muted);font-size:0.8rem;text-align:center;padding:2rem 1rem;">No classes found</div>';
      return;
    }

    filtered.forEach(cls => {
      // Get level string
      let levelNames = [];
      if (cls.class_levels && cls.class_levels.length > 0) {
        levelNames = cls.class_levels.map(cl => cl.levels?.name).filter(Boolean);
      } else if (cls.levels?.name) {
        levelNames = [cls.levels.name];
      }
      const lvlStr = levelNames.length > 0 ? levelNames.join(', ') : '';

      // Find program name
      const prog = programs.find(p => p.id === cls.program_id);
      const progName = prog?.name || '';

      const item = document.createElement('div');
      item.className = 'cls-flat-item';
      item.dataset.classId = cls.id;
      item.style.cssText = `
        padding: 0.45rem 0.75rem;
        cursor:pointer; border-radius:4px; margin:1px 6px;
        border-left:3px solid transparent;
        transition: background 0.12s, border-color 0.12s;
      `;

      item.innerHTML = `
        <div style="font-size:0.85rem; font-weight:600; color:var(--clr-text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${cls.name.replace(/</g,'&lt;')}</div>
        ${progName || lvlStr ? `<div style="font-size:0.72rem; color:var(--clr-text-muted); margin-top:1px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${[progName, lvlStr].filter(Boolean).join(' · ')}</div>` : ''}
      `;

      item.addEventListener('mouseenter', () => {
        if (currentSelectedClass?.id !== cls.id) item.style.background = 'var(--clr-surface-2, rgba(255,255,255,0.04))';
      });
      item.addEventListener('mouseleave', () => {
        if (currentSelectedClass?.id !== cls.id) { item.style.background = ''; item.style.borderColor = 'transparent'; }
      });

      item.addEventListener('click', () => {
        // Deactivate all
        flatList.querySelectorAll('.cls-flat-item').forEach(el => {
          el.style.background = '';
          el.style.borderColor = 'transparent';
        });
        // Activate this
        item.style.background = 'var(--clr-primary-light, rgba(0,112,243,0.08))';
        item.style.borderColor = 'var(--clr-primary)';
        currentSelectedClass = cls;

        // Attach program and institution context
        if (prog) {
          const inst = institutions.find(i => i.id === prog.institution_id);
          cls.programs      = { name: prog.name };
          cls.institutions  = { name: inst?.name || '' };
        }
        renderClassDetail(cls);
      });

      // Restore active state
      if (currentSelectedClass?.id === cls.id) {
        item.style.background = 'var(--clr-primary-light, rgba(0,112,243,0.08))';
        item.style.borderColor = 'var(--clr-primary)';
      }

      flatList.appendChild(item);
    });
  }

  buildFlatList();

  // Search
  document.getElementById('class-search-input').addEventListener('input', (e) => {
    buildFlatList(e.target.value);
  });

  // ── Build Org Tree ──
  const listContainer = document.getElementById('org-tree-list');
  
  if (!institutions.length) {
    listContainer.innerHTML = '<div class="text-muted text-sm text-center" style="padding:1rem;">No institutions found. Create one to begin.</div>';
  } else {
    institutions.forEach(inst => {
      const instNode = document.createElement('div');
      instNode.innerHTML = `
        <div class="tree-node inst-node" style="padding:0.5rem; font-weight:700; color:var(--clr-text); cursor:pointer; display:flex; align-items:center; border-radius:4px;">
          <span style="margin-right:8px; font-size:1.2rem;">🏢</span> ${inst.name}
        </div>
      `;
      listContainer.appendChild(instNode);

      instNode.querySelector('.inst-node').onclick = () => {
        clearActiveNodes();
        instNode.querySelector('.inst-node').style.background = 'var(--clr-primary-light, rgba(0, 112, 243, 0.05))';
        renderInstitutionDetail(inst);
      };

      const instPrograms = programs.filter(p => p.institution_id === inst.id);
      instPrograms.forEach(prog => {
        const progNode = document.createElement('div');
        progNode.innerHTML = `
          <div class="tree-node prog-node" style="padding:0.4rem 0.5rem 0.4rem 2rem; font-weight:600; color:var(--clr-text-1); cursor:pointer; display:flex; align-items:center; border-radius:4px;">
            <span style="margin-right:6px; font-size:1rem; opacity:0.8;">📋</span> ${prog.name}
          </div>
        `;
        listContainer.appendChild(progNode);

        progNode.querySelector('.prog-node').onclick = () => {
          clearActiveNodes();
          progNode.querySelector('.prog-node').style.background = 'var(--clr-primary-light, rgba(0, 112, 243, 0.05))';
          renderProgramDetail(prog, inst);
        };

        const progClasses = classes.filter(c => c.program_id === prog.id);
        progClasses.forEach(cls => {
          let levelNames = [];
          if (cls.class_levels && cls.class_levels.length > 0) {
            levelNames = cls.class_levels.map(cl => cl.levels?.name).filter(Boolean);
          } else if (cls.levels?.name) {
            levelNames = [cls.levels.name];
          }
          const levelString = levelNames.length > 0 ? levelNames.join(', ') : 'Unassigned';

          const clsNode = document.createElement('div');
          clsNode.innerHTML = `
            <div class="tree-node cls-node" data-class-id="${cls.id}" style="padding:0.4rem 0.5rem 0.4rem 3.5rem; color:var(--clr-text-2); cursor:pointer; display:flex; align-items:center; justify-content:space-between; border-radius:4px; font-size:0.9rem;">
              <div><span style="margin-right:4px; font-size:0.9rem;">🎓</span> ${cls.name}</div>
              <div style="font-size:0.7rem; opacity:0.6; max-width:80px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${levelString}">${levelString}</div>
            </div>
          `;
          listContainer.appendChild(clsNode);

          clsNode.querySelector('.cls-node').onclick = () => {
            clearActiveNodes();
            clsNode.querySelector('.cls-node').style.background = 'var(--clr-primary-light, rgba(0, 112, 243, 0.05))';
            currentSelectedClass = cls;
            cls.programs     = { name: prog.name };
            cls.institutions = { name: inst.name };
            renderClassDetail(cls);
          };
          
          if (currentSelectedClass?.id === cls.id) {
            clsNode.querySelector('.cls-node').style.background = 'var(--clr-primary-light, rgba(0, 112, 243, 0.05))';
            cls.programs     = { name: prog.name };
            cls.institutions = { name: inst.name };
            renderClassDetail(cls);
          }
        });
      });
    });
  }
  
  function clearActiveNodes() {
    document.querySelectorAll('.tree-node').forEach(n => n.style.background = 'transparent');
  }

  document.getElementById('btn-add-inst-global')?.addEventListener('click', async () => {
    const name = prompt("Enter Institution Name (e.g., Top English):");
    if (!name) return;
    try {
      await adminInsert('institutions', { name, is_active: true, status: 'active' });
      showToast('Institution created successfully!', 'success');
      renderClasses(currentArea);
    } catch(e) {
      showToast('Error creating institution: ' + e.message, 'error');
    }
  });

  // Auto-open last selected class
  if (currentSelectedClass) {
    const prog = programs.find(p => p.id === currentSelectedClass.program_id);
    if (prog) {
      const inst = institutions.find(i => i.id === prog.institution_id);
      currentSelectedClass.programs     = { name: prog.name };
      currentSelectedClass.institutions = { name: inst?.name || '' };
      renderClassDetail(currentSelectedClass);
    }
  }
}


function renderInstitutionDetail(inst) {
  const container = document.getElementById('class-detail-container');
  container.innerHTML = `
    <div style="padding:2rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
        <div>
          <h2 style="margin:0; font-size:2rem; font-weight:700;">🏢 ${inst.name}</h2>
          <p class="text-muted" style="margin-top:0.5rem;">Institution Workspace</p>
        </div>
        <button class="btn btn-primary" id="btn-add-prog">+ Add Program</button>
      </div>
      <div class="card" style="padding:1.5rem; background:var(--clr-surface);">
        <h4 style="margin-top:0;">Institution Details</h4>
        <p><strong>Name:</strong> ${inst.name}</p>
        <p><strong>Status:</strong> ${inst.is_active !== false ? 'Active' : 'Inactive'}</p>
        <p class="text-muted text-sm mt-3">Additional configurations can be added here in the future.</p>
      </div>
    </div>
  `;
  document.getElementById('btn-add-prog').onclick = async () => {
    const name = prompt("Enter Program Name (e.g., General English):");
    if (!name) return;
    try {
      await adminInsert('programs', { name, institution_id: inst.id, is_active: true });
      showToast('Program created successfully!', 'success');
      renderClasses(currentArea);
    } catch(e) {
      showToast('Error creating program: ' + e.message, 'error');
    }
  };
}

function renderProgramDetail(prog, inst) {
  const container = document.getElementById('class-detail-container');
  container.innerHTML = `
    <div style="padding:2rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:2rem;">
        <div>
          <h2 style="margin:0; font-size:2rem; font-weight:700;">📋 ${prog.name}</h2>
          <p class="text-muted" style="margin-top:0.5rem;">Program under ${inst.name}</p>
        </div>
        <button class="btn btn-primary" id="btn-add-class">+ Add Class</button>
      </div>
      <div class="card" style="padding:1.5rem; background:var(--clr-surface);">
        <h4 style="margin-top:0;">Program Details</h4>
        <p><strong>Name:</strong> ${prog.name}</p>
        <p><strong>Institution:</strong> ${inst.name}</p>
        <p class="text-muted text-sm mt-3">Program-level configurations can be added here in the future.</p>
      </div>
    </div>
  `;
  document.getElementById('btn-add-class').onclick = () => {
    const modalEl = document.getElementById('add-class-modal');
    if (!modalEl) return showToast("Modal element not found", "error");
    
    document.getElementById('add-class-name').value = '';
    
    const programSelect = document.getElementById('add-class-program-id');
    if (programSelect) {
      programSelect.innerHTML = `<option value="${prog.id}" data-inst="${inst.id}" selected>${prog.name}</option>`;
      programSelect.disabled = true;
    }

    const levelCheckboxes = document.getElementById('add-class-level-checkboxes');
    if (levelCheckboxes) {
      levelCheckboxes.innerHTML = '';
      allLevels.forEach(l => {
        levelCheckboxes.innerHTML += `
          <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.9rem;">
            <input type="checkbox" name="class_levels[]" value="${l.id}"> ${l.name}
          </label>
        `;
      });
    }

    const labelEl = document.getElementById('add-class-level-label');
    if (labelEl) labelEl.textContent = 'New Class';
    modalEl.classList.remove('hidden');

    const saveBtn = document.getElementById('add-class-save-btn');
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    newSaveBtn.addEventListener('click', async () => {
      const name = document.getElementById('add-class-name').value.trim();
      const checkedLevels = Array.from(document.querySelectorAll('input[name="class_levels[]"]:checked')).map(cb => cb.value);
      
      if (!name) return showToast('Class name is required', 'error');
      if (checkedLevels.length === 0) return showToast('Please select at least one Level', 'error');

      try {
        newSaveBtn.disabled = true;
        newSaveBtn.textContent = 'Saving...';
        
        const primary_level_id = checkedLevels[0];
        const newClass = await adminInsert('classes', { name, program_id: prog.id, level_id: primary_level_id, status: 'active', is_active: true });
        
        if (newClass && newClass.id) {
          const classLevelsPayload = checkedLevels.map(lvlId => ({
            class_id: newClass.id,
            level_id: lvlId
          }));
          const sb = await import('../supabase.js?v=4.7.9').then(m => m.getSupabase());
          await sb.from('class_levels').insert(classLevelsPayload);
        }
        
        showToast('Class created successfully!', 'success');
        modalEl.classList.add('hidden');
        renderClasses(currentArea); // Update the Org Hub list
        
        // Zero-Reload Sidebar Update & Selection
        if (window.loadSidebarClasses && newClass && newClass.id) {
           window.loadSidebarClasses(newClass.id);
        }
      } catch (err) {
        showToast('Error creating class: ' + err.message, 'error');
      } finally {
        newSaveBtn.disabled = false;
        newSaveBtn.textContent = 'Save Class';
      }
    });
  };
}

function renderClassDetail(cls) {
  const container = document.getElementById('class-detail-container');
  if(!container) return;

  const progName = cls.programs?.name || 'Unassigned Program';
  const instName = cls.institutions?.name || 'Unassigned Institution';
  const lvlName = cls.levels?.name || 'Unassigned Level';
  const statusBadge = cls.is_active ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-neutral">Inactive</span>';

  const isVocab = (cls.name || '').toLowerCase().includes('vocab');

  container.innerHTML = `
    <!-- HEADER IDENTITY -->
    <div style="padding: 2rem 2rem 0 2rem; border-bottom: 1px solid var(--clr-border); background: var(--clr-surface);">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <h2 style="margin:0 0 0.75rem 0; font-size:1.6rem; color:var(--clr-text-1);">${cls.name.replace(/</g, '&lt;')}</h2>
          <div style="display:flex; gap:0.5rem; flex-wrap:wrap; font-size:0.8rem;">
            <span class="badge badge-neutral" style="background:var(--clr-surface-2);">&#127970; ${instName}</span>
            <span class="badge badge-neutral" style="background:var(--clr-surface-2);">&#128218; ${progName}</span>
            <span class="badge badge-neutral" style="background:var(--clr-surface-2);">&#11088; ${lvlName}</span>
            ${statusBadge}
          </div>
        </div>
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
           ${isVocab ? `
             <button class="btn btn-primary btn-sm" id="btn-auto-gen-words" style="background:rgba(59,130,246,0.9); color:#fff; border:1px solid rgba(59,130,246,0.4); font-weight:700;">
               &#9889; Sync Words (Vocab Mastery)
             </button>
             <button class="btn btn-primary btn-sm" id="btn-auto-gen-phrases" style="background:rgba(59,130,246,0.9); color:#fff; border:1px solid rgba(59,130,246,0.4); font-weight:700;">
               &#9889; Sync Phrases (Dropdown 10)
             </button>
           ` : ''}
           <button class="btn btn-primary btn-sm" onclick="window.handleAddTask('${cls.id}', '${(cls.name || '').replace(/'/g, "\\'")}')"
             style="background:rgba(245,158,11,0.9); color:#1a1a1a; border:1px solid rgba(245,158,11,0.4); font-weight:700;">
             &#128203; Add Task
           </button>
           <button class="btn btn-secondary btn-sm" onclick="window.handleAddTest('${cls.id}', '${(cls.name || '').replace(/'/g, "\\'")}')"
             style="background:rgba(239,68,68,0.9); color:#fff; border:1px solid rgba(239,68,68,0.4); font-weight:700;">
             &#127942; Add Test
           </button>
           <button class="btn btn-danger btn-sm" id="btn-del-active-class">Delete</button>
        </div>
      </div>
      
      <!-- 3-TAB NAVIGATION -->
      <div style="display:flex; gap:2rem; margin-top:2rem; border-bottom:1px solid transparent;">
        <div class="workspace-tab active" data-tab="learning-path" style="padding-bottom:0.75rem; cursor:pointer; font-weight:600; color:var(--clr-primary); border-bottom:2px solid var(--clr-primary); font-size:0.95rem;">&#128203; Learning Path & Assessments</div>
        <div class="workspace-tab" data-tab="students" style="padding-bottom:0.75rem; cursor:pointer; font-weight:500; color:var(--clr-text-muted); border-bottom:2px solid transparent; font-size:0.95rem;">&#128101; Students</div>
        <div class="workspace-tab" data-tab="gradebook" style="padding-bottom:0.75rem; cursor:pointer; font-weight:500; color:var(--clr-text-muted); border-bottom:2px solid transparent; font-size:0.95rem;">&#128202; Gradebook</div>
      </div>
    </div>

    <!-- TAB CONTENTS -->
    <div style="padding:2rem;">
      <div id="class-learning-path-container" class="tab-content" style="display:block;">
         <div class="empty-state" style="padding:3rem; text-align:center;">
           <p class="text-muted text-sm">Learning path is empty. This area will display the auto-generated task tree (Tasks 1-7 & Quiz).</p>
         </div>
      </div>
      <div id="class-students-container" class="tab-content" style="display:none;">
         <div class="empty-state" style="padding:3rem; text-align:center;">
            <p class="text-muted text-sm">Student roster and enrollment status will be displayed here.</p>
         </div>
      </div>
      <div id="class-gradebook-container" class="tab-content" style="display:none;">
         <div class="empty-state" style="padding:3rem; text-align:center;">
            <p class="text-muted text-sm">Class grade summaries will be displayed here.</p>
         </div>
      </div>
    </div>
  `;

  // Hook up Delete active class
  document.getElementById('btn-del-active-class')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to delete this class? This may hide it from existing cohorts.')) return;
    try {
      await adminSoftDelete('classes', cls.id);
      showToast('Class deleted', 'success');
      currentSelectedClass = null; // reset selection
      renderClasses(currentArea);
    } catch (e) {
      showToast('Error deleting class', 'error');
    }
  });

  const handleSyncGen = async (type) => {
    let targetLevelId = window._selectedLevelId || (document.querySelector('.level-tab.active') ? document.querySelector('.level-tab.active').dataset.id : null);
    if (!targetLevelId) {
      const levelNumInput = prompt("Enter Level Number to sync (e.g., 1, 2, 3, or 0 for General):");
      if (levelNumInput === null) return;
      const levelNum = parseInt(levelNumInput, 10);
      const level = allLevels.find(l => l.level_number === levelNum);
      if (!level) {
        showToast("Level not found", "error");
        return;
      }
      targetLevelId = level.id;
    }
    
    try {
      showToast(`Generating ${type}...`, 'info');
      const payload = {
        classId: cls.id,
        levelId: targetLevelId,
        programId: cls.program_id,
        institutionId: cls.institutions?.id
      };
      
      let res;
      if (type === 'words') {
        res = await autoGenerateWordsAssessments(payload);
      } else {
        res = await autoGeneratePhrasesAssessments(payload);
      }
      
      showToast(`Success: Created ${res.tasks} Tasks, ${res.tests} Tests. Updated ${res.updated}.`, 'success');
      loadClassLearningPath(cls.id); // Refresh view
    } catch (e) {
      console.error(e);
      showToast(`Error generating ${type}: ${e.message}`, 'error');
    }
  };

  document.getElementById('btn-auto-gen-words')?.addEventListener('click', () => handleSyncGen('words'));
  document.getElementById('btn-auto-gen-phrases')?.addEventListener('click', () => handleSyncGen('phrases'));

  // Tab Switching Logic
  const tabs = container.querySelectorAll('.workspace-tab');
  const contents = container.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // reset tabs
      tabs.forEach(t => {
        t.style.fontWeight = '500';
        t.style.color = 'var(--clr-text-muted)';
        t.style.borderBottom = '2px solid transparent';
        t.classList.remove('active');
      });
      // hide contents
      contents.forEach(c => c.style.display = 'none');
      
      // activate tab
      tab.style.fontWeight = '600';
      tab.style.color = 'var(--clr-primary)';
      tab.style.borderBottom = '2px solid var(--clr-primary)';
      tab.classList.add('active');
      
      const targetId = 'class-' + tab.dataset.tab + '-container';
      document.getElementById(targetId).style.display = 'block';
    });
  });

  // Fetch and render learning path
  loadClassLearningPath(cls.id);
}

export async function loadClassLearningPath(classId) {
  const container = document.getElementById('class-learning-path-container');
  if (!container) return;
  
  container.innerHTML = '<div style="padding:2rem;text-align:center;color:var(--clr-text-muted);">Loading Learning Path...</div>';
  
  try {
    const filters = { class_id: classId };
    if (window._selectedLevelId && window._selectedLevelId !== 'no-level') {
        filters.level_id = window._selectedLevelId;
    }
    const assessmentsRaw = await adminFetchAll('assessments', '*, prerequisite_assessment_id(id, name, title), levels!level_id(id, name)', filters);
    const assessments = assessmentsRaw.sort((a, b) => (a.display_order ?? a.order_index ?? 999) - (b.display_order ?? b.order_index ?? 999));
    
    if (!assessments || assessments.length === 0) {
      container.innerHTML = `
         <div class="empty-state" style="padding:3rem; text-align:center;">
           <div style="font-size:2.5rem; margin-bottom:1rem;">&#128203;</div>
           <h4 style="color:var(--clr-text-1); margin:0 0 0.5rem 0;">No assessments yet</h4>
           <p class="text-muted text-sm">Use the <strong>Add Task</strong> or <strong>Add Test</strong> buttons above to start building the curriculum for this class.</p>
         </div>`;
      return;
    }
    
    let taskCount = 0;
    let testCount = 0;
    let tryoutCount = 0;

    assessments.forEach(asm => {
      const cat = asm.assessment_category
        || (asm.assessment_type && (asm.assessment_type.includes('EXAM') || asm.assessment_type.includes('TEST')) ? 'TEST' : null)
        || (asm.title && (asm.title.toLowerCase().includes('test') || asm.title.toLowerCase().includes('exam')) ? 'TEST' : 'TASK');
      
      const isTryout = asm.assessment_category === 'TRYOUT' || (asm.payload?.shell_code || '').startsWith('TRYOUT');
      
      if (isTryout) {
        tryoutCount++;
      } else if (cat === 'TEST') {
        testCount++;
      } else {
        taskCount++;
      }
    });

    const totalCount = taskCount + testCount + tryoutCount;

    const summaryHtml = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap;">
        <div style="display:flex; gap:1rem;">
        </div>
        <div style="display:flex; gap:0.5rem;">
          <button class="btn btn-sm" id="filter-all" style="background:var(--clr-primary); color:#fff;">All (${totalCount})</button>
          <button class="btn btn-sm btn-secondary" id="filter-tasks">Tasks (${taskCount})</button>
          <button class="btn btn-sm btn-secondary" id="filter-tests">Tests (${testCount})</button>
          <button class="btn btn-sm btn-secondary" id="filter-tryouts">Try-Outs (${tryoutCount})</button>
        </div>
      </div>
      <div id="class-datagrid-container"></div>
    `;
    container.innerHTML = summaryHtml;

    const gridData = assessments.map((r, idx) => {
      const isTest = (r.assessment_category === 'TEST') || (r.title || '').toLowerCase().includes('test');
      const isTryout = r.assessment_category === 'TRYOUT' || (r.payload?.shell_code || '').startsWith('TRYOUT');
      const isTask = !isTest && !isTryout;
      
      const _isDyn = r?.payload?.is_dynamic_shell;
      const _vaultQ = r?.payload?.snapshot_question_count || r?.payload?.total_questions || 0;
      
      return {
        id: r.id,
        title: r.title,
        order: r.display_order ?? r.order_index ?? r.order ?? (idx + 1),
        prereq: r.prerequisite_assessment_id ? (r.prerequisite_assessment_id.title || r.prerequisite_assessment_id.name || 'Yes') : '',
        type: r.assessment_type || 'STANDARD',
        level: r.levels?.name || '—',
        access: r.question_order === 'fixed' ? 'Fixed' : 'Rand',
        answerType: formatAnswerType(r.payload?.answer_type || r.answer_type),
        timeLimit: r.time_limit || 60,
        minScore: r.passing_score || r.min_score || 60,
        qIsVault: _isDyn,
        qCount: _isDyn ? _vaultQ : (r.questions ? r.questions.length : 0),
        status: r.status,
        isTest, isTryout, isTask,
        display_order: r.display_order,
        _raw: r
      };
    });

    const statusColors = { published: 'badge-success', draft: 'badge-neutral', unpublished: 'badge-warning', archived: 'badge-danger' };

    const ClassGrid = new DataGrid({
      container: 'class-datagrid-container',
      data: gridData,
      pageSize: 50,
      searchKeys: ['title', 'status'],
      initialSortKey: 'order',
      initialSortAsc: true,
      bulkActions: true,
      customBulkActions: [
        {
          label: 'Publish Selected',
          onClick: async (ids) => {
            if (!confirm(`Publish ${ids.length} selected assessments?`)) return;
            try {
              for (const id of ids) await adminUpdate('assessments', id, { status: 'PUBLISHED' });
              showToast(`Published ${ids.length} assessments`, 'success');
              loadClassLearningPath(classId);
            } catch (e) {
              showToast('Error publishing: ' + e.message, 'error');
            }
          }
        },
        {
          label: 'Unpublish Selected',
          onClick: async (ids) => {
            if (!confirm(`Unpublish ${ids.length} selected assessments?`)) return;
            try {
              for (const id of ids) await adminUpdate('assessments', id, { status: 'DRAFT' });
              showToast(`Unpublished ${ids.length} assessments`, 'success');
              loadClassLearningPath(classId);
            } catch (e) {
              showToast('Error unpublishing: ' + e.message, 'error');
            }
          }
        }
      ],
      sortComparator: (sortKey, direction, a, b) => {
        if (sortKey === 'title' || sortKey === 'TITLE' || sortKey === 'order') {
          return direction === 'asc' 
            ? (a.display_order ?? a.order ?? 0) - (b.display_order ?? b.order ?? 0)
            : (b.display_order ?? b.order ?? 0) - (a.display_order ?? a.order ?? 0);
        }
      },
      columns: [
        {
          key: 'order', label: 'ORD', sortable: true,
          render: (val, row) => `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">${row.order}</div>`
        },
        { 
          key: 'title', label: 'TITLE', sortable: true,
          render: (val, row) => `<div class="fw-700" style="color:var(--clr-text-1); font-size:0.85rem; white-space:normal; min-width:250px;" title="${escapeHtml(row.title)}">${escapeHtml(row.title)}</div>`
        },
        {
          key: 'level', label: 'LEVEL', sortable: true,
          render: (val, row) => `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">${escapeHtml(row.level)}</div>`
        },
        {
          key: 'prereq', label: 'PREREQUISITE', sortable: true,
          render: (val, row) => {
             if(!row.prereq || row.prereq === '-') return `<span style="color:var(--clr-text-3);">—</span>`;
             return `<div style="font-size:0.75rem; color:var(--clr-text-muted); max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${escapeHtml(row.prereq)}">⚠️ ${escapeHtml(row.prereq)}</div>`;
          }
        },
        {
          key: 'type', label: 'TYPE', sortable: true,
          render: (val, row) => `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">${escapeHtml(row.type)}</div>`
        },
        {
          key: 'answerType', label: 'ANSWER', sortable: true,
          render: (val, row) => `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">${row.answerType}</div>`
        },
        {
          key: 'access', label: 'ACCESS', sortable: true,
          render: (val, row) => `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">${escapeHtml(row.access)}</div>`
        },
        {
          key: 'timeLimit', label: 'DUR. (M)', sortable: true,
          render: (val, row) => `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">⏱ ${row.timeLimit}</div>`
        },
        {
          key: 'minScore', label: 'PASS (%)', sortable: true,
          render: (val, row) => `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap; color:var(--clr-danger);">🎯 ${row.minScore}</div>`
        },
        {
          key: 'qCount', label: 'QS', sortable: true,
          render: (val, row) => {
            if(row.qIsVault) return `<div style="font-size:0.75rem; color:var(--clr-accent-1); white-space:nowrap;" title="Dynamic Vault Source">⚡ ${row.qCount} (Vault)</div>`;
            return `<div style="font-size:0.75rem; color:var(--clr-text-2); white-space:nowrap;">${row.qCount}</div>`;
          }
        },
        {
          key: 'status', label: 'STATUS', sortable: true,
          render: (val, row) => {
            const st = String(row.status || 'draft').toLowerCase();
            return `<span class="badge ${statusColors[st] || 'badge-neutral'}" style="text-transform:uppercase; font-size:0.65rem;">${st}</span>`;
          }
        },
        {
          key: 'actions', label: '', sortable: false,
          render: (val, row) => `
            <div class="d-flex gap-1 justify-end align-center">
              <button class="btn btn-ghost" style="padding: 2px 6px; font-size: 0.75rem;" title="View Results" onclick="window._filterAssessmentResults='${row.id}'; window.loadSection('results');">&#128202;</button>
              <button class="btn ${row.status === 'published' ? 'btn-danger' : 'btn-success'}" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window._toggleClassAssessmentPublish('${row.id}', '${row.status || 'draft'}')">
                ${row.status === 'published' ? 'Unpub' : 'Pub'}
              </button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem;" onclick="window.openAssessmentBuilder('${row.id}')">Edit</button>
              <button class="btn btn-secondary" style="padding: 2px 6px; font-size: 0.75rem; color: var(--clr-accent-1);" onclick="window._deleteRecord('Assessments', '${row.id}', '${escapeHtml(row.title)}')">Del</button>
            </div>
          `
        }
      ]
    });

    const filterAll = document.getElementById('filter-all');
    const filterTasks = document.getElementById('filter-tasks');
    const filterTests = document.getElementById('filter-tests');
    const filterTryouts = document.getElementById('filter-tryouts');

    const updateFilters = (btn, filterFn) => {
      [filterAll, filterTasks, filterTests, filterTryouts].forEach(b => {
        if (!b) return;
        b.style.background = 'transparent';
        b.style.color = 'var(--clr-text)';
        b.classList.add('btn-secondary');
      });
      btn.style.background = 'var(--clr-primary)';
      btn.style.color = '#fff';
      btn.classList.remove('btn-secondary');

      ClassGrid.filteredData = ClassGrid.rawData.filter(filterFn);
      ClassGrid.currentPage = 1;
      ClassGrid.render();
    };

    if (filterAll) filterAll.onclick = () => updateFilters(filterAll, () => true);
    if (filterTasks) filterTasks.onclick = () => updateFilters(filterTasks, r => r.isTask);
    if (filterTests) filterTests.onclick = () => updateFilters(filterTests, r => r.isTest);
    if (filterTryouts) filterTryouts.onclick = () => updateFilters(filterTryouts, r => r.isTryout);

  } catch (err) {
    container.innerHTML = `<div class="text-danger p-3">Error loading learning path: ${err.message}</div>`;
  }
}


function formatAnswerType(type) {
  switch(type) {
    case 'speech_to_text': return '🎙️ Speech';
    case 'dropdown': return '🔽 Drop-down';
    case 'multiple_choice': return '🔘 Mult Choice';
    case 'written': return '✏️ Written';
    default: return String(type || '');
  }
}

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

window._toggleClassAssessmentPublish = async (AssessmentId, currentStatus) => {
  const newStatus = (currentStatus || '').toUpperCase() === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED';
  try {
    await window.adminUpdate('assessments', AssessmentId, { status: newStatus });
    window.showToast(`Assessment ${newStatus}.`, 'success');
    
    // Attempt to reload the current class learning path if possible
    const classSel = document.getElementById('class-select');
    if (classSel && classSel.value) {
      window.loadClassLearningPath(classSel.value);
    }
  } catch(e) { window.showToast(e.message, 'error'); }
};
