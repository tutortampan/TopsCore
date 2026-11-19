import { getSvgIcon } from '../svg-icons.js?v=20261114_01';

export const OFFICIAL_MODULES = [
  { id: 'm1', key: 'description', name: 'Description (m1)', icon: 'target', desc: 'Visual context, pronouns, and image description.' },
  { id: 'm2', key: 'selection',   name: 'Selection (m2)',   icon: 'check-circle', desc: 'Standardized multiple choice for vocabulary & grammar precision.' },
  { id: 'm3', key: 'written',     name: 'Written (m3)',     icon: 'edit', desc: 'Rigorous target lexicon typing, spelling, and meaning verification.' },
  { id: 'm4', key: 'spoken',      name: 'Spoken (m4)',      icon: 'mic', desc: 'Phonetic analysis & pronunciation accuracy evaluation.' },
  { id: 'm5', key: 'speech',      name: 'Speech (m5)',      icon: 'award', desc: 'Formal 5-pillar speaking performance assessment.' },
  { id: 'm6', key: 'monologue',   name: 'Monologue (m6)',   icon: 'book-open', desc: 'Independent 3–5 minute narrative continuity speech.' },
  { id: 'm7', key: 'dialogue',    name: 'Dialogue (m7)',    icon: 'users', desc: 'Live pair conversation room evaluated via WebRTC interaction.' },
  { id: 'm8', key: 'interview',   name: 'Interview (m8)',   icon: 'activity', desc: 'Guided sequential conversational Q&A responsiveness.' }
];

export const CLASS_DISCIPLINES = [
  { key: 'vocabulary', label: 'Vocabulary', shortLabel: 'Vocab', color: 'var(--quad-c, #95ff00)', bg: 'rgba(149, 255, 0, 0.12)', border: 'rgba(149, 255, 0, 0.35)', desc: 'Words, Phrases & Vocabulary Vault' },
  { key: 'storytelling', label: 'Storytelling', shortLabel: 'Storytelling', color: 'var(--quad-b, #FF8C00)', bg: 'rgba(255, 140, 0, 0.12)', border: 'rgba(255, 140, 0, 0.35)', desc: 'Daily Narrative & Pair Stories' },
  { key: 'speaking', label: 'Speaking', shortLabel: 'Speaking', color: 'var(--primary-tactical, #38bdf8)', bg: 'rgba(56, 189, 248, 0.12)', border: 'rgba(56, 189, 248, 0.35)', desc: 'Public Speaking & Speech Projects' },
  { key: 'grammar', label: 'Basic English', shortLabel: 'Basic / Grammar', color: 'var(--quad-d, #C084FC)', bg: 'rgba(192, 132, 252, 0.12)', border: 'rgba(192, 132, 252, 0.35)', desc: 'Sentence Structures & Fundamentals' }
];

export const DEFAULT_MODULE_CLASS_MAP = {
  m1: ['grammar'],                     // Description -> Basic English
  m2: ['vocabulary', 'grammar'],       // Selection   -> Vocabulary, Basic English
  m3: ['vocabulary', 'grammar'],       // Written     -> Vocabulary, Basic English
  m4: ['vocabulary', 'speaking'],      // Spoken      -> Vocabulary, Speaking
  m5: ['speaking'],                    // Speech      -> Speaking
  m6: ['storytelling'],                // Monologue   -> Storytelling
  m7: ['storytelling', 'speaking'],    // Dialogue    -> Storytelling, Speaking
  m8: ['storytelling', 'speaking']     // Interview   -> Storytelling, Speaking
};

export function getModuleClassAssignments() {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem('topscore_module_class_assignments') : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null) {
        return { ...DEFAULT_MODULE_CLASS_MAP, ...parsed };
      }
    }
  } catch (e) {
    console.warn('Failed to read topscore_module_class_assignments', e);
  }
  return { ...DEFAULT_MODULE_CLASS_MAP };
}

export function saveModuleClassAssignments(assignments) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('topscore_module_class_assignments', JSON.stringify(assignments));
    }
  } catch (e) {
    console.warn('Failed to save topscore_module_class_assignments', e);
  }
}

export function toggleModuleClassAssignment(moduleId, disciplineKey) {
  const current = getModuleClassAssignments();
  const list = current[moduleId] ? [...current[moduleId]] : [...(DEFAULT_MODULE_CLASS_MAP[moduleId] || [])];
  const idx = list.indexOf(disciplineKey);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push(disciplineKey);
  }
  current[moduleId] = list;
  saveModuleClassAssignments(current);
  return current;
}

export function getDisciplineFromClassName(className = '') {
  const norm = String(className || '').toLowerCase();
  if (norm.includes('vocab') || norm.includes('word') || norm.includes('phrase') || norm.includes('lexic')) return 'vocabulary';
  if (norm.includes('story') || norm.includes('telling')) return 'storytelling';
  if (norm.includes('speak') || norm.includes('speech') || norm.includes('oral') || norm.includes('project')) return 'speaking';
  if (norm.includes('grammar') || norm.includes('basic') || norm.includes('structure')) return 'grammar';
  return 'general';
}

export function getAllowedModulesForClass(className = '') {
  const discipline = getDisciplineFromClassName(className);
  const assignments = getModuleClassAssignments();

  const allowedKeys = [];
  OFFICIAL_MODULES.forEach(mod => {
    const assignedDisciplines = assignments[mod.id] || DEFAULT_MODULE_CLASS_MAP[mod.id] || [];
    if (discipline === 'general' || assignedDisciplines.includes(discipline)) {
      allowedKeys.push(mod.key);
    }
  });

  // Safe fallback if none assigned
  if (allowedKeys.length === 0) {
    allowedKeys.push('selection');
  }

  const primaryKey = allowedKeys.includes('spoken') ? 'spoken' : (allowedKeys.includes('monologue') ? 'monologue' : (allowedKeys.includes('speech') ? 'speech' : allowedKeys[0]));

  const discObj = CLASS_DISCIPLINES.find(d => d.key === discipline);
  const disciplineLabel = discObj ? `${discObj.label} Class` : 'General Curriculum';
  const reason = discObj 
    ? `${discObj.label} classes strictly use modules mapped in the Modules Warehouse: ${allowedKeys.map(k => k.toUpperCase()).join(', ')}.`
    : 'All modules available.';

  return {
    discipline,
    disciplineLabel,
    allowedKeys,
    primaryKey,
    reason
  };
}

export async function renderModules(area) {
  // Utility to escape HTML to prevent breaking the template string
  const escapeHtml = (unsafe) => {
    return String(unsafe || '')
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
  };

  const assignments = getModuleClassAssignments();

  const modules = [
    { id: 'm1', name: 'Description', type: 'Visual Context', desc: 'Real-time object, pronoun, and image context description.', status: 'Active', icon: 'target', directive: 'Direct English Only.\nArchitecture: Stateless & Low-Egress.\nMedia (photos) must be processed transiently in the browser, sent directly to the AI API for evaluation via Edge Functions, and discarded.' },
    { id: 'm2', name: 'Selection', type: 'Standardized Choices', desc: 'Classic multi-option evaluation for vocabulary, grammar, and syntax precision.', status: 'Active', icon: 'check-circle', directive: 'Direct English Only.\nArchitecture: Stateless & Low-Egress.\nClassic multi-option evaluation.' },
    { id: 'm3', name: 'Written', type: 'Text & Spelling', desc: 'Rigorous testing of target lexicon spelling, meaning, and written precision.', status: 'Active', icon: 'clipboard', directive: 'Direct English Only.\nFor vocabulary-style written evaluation, normalize at minimum: leading/trailing whitespace, repeated spaces, case, unnecessary punctuation.\nRequired result labels: Correct, Minor Spelling Error, Incorrect.\nDefault tolerance: 0 errors -> 1pt, 1-2 errors -> 0.5pt, 3+ errors -> 0pt.' },
    { id: 'm4', name: 'Spoken', type: 'Phonetic Analysis', desc: 'Speech analysis comparing spoken words and pronunciation against standard targets.', status: 'Active', icon: 'mic', directive: 'Direct English Only.\nArchitecture: Stateless & Low-Egress.\nMedia (audio) must be processed transiently in the browser, sent directly to the AI API for evaluation, and discarded.' },
    { id: 'm5', name: 'Speech', type: '5 Pillars Performance', desc: 'Comprehensive grading on Fluency, Pronunciation, Vocabulary, Grammar, and Comprehension.', status: 'Active', icon: 'award', directive: 'Direct English Only.\nArchitecture: Stateless & Low-Egress.\nEvaluate based on 5 Pillars: Fluency, Pronunciation, Vocabulary, Grammar, Comprehension.' },
    { id: 'm6', name: 'Monologue', type: 'Narrative Speech', desc: 'Evaluates independent 3-5 minute narrative continuity (past, present, and future tense).', status: 'Active', icon: 'book-open', directive: 'Direct English Only.\nArchitecture: Stateless & Low-Egress.\nEvaluate narrative tense (past/present/future continuity).' },
    { id: 'm7', name: 'Dialogue', type: 'Pair Live Conversation', desc: 'Live two-way peer conversation room evaluating real-time interaction.', status: 'Active', icon: 'users', directive: 'Direct English Only.\nArchitecture: Stateless & Low-Egress.\nReal-world dialogue simulation via WebSockets/WebRTC.' },
    { id: 'm8', name: 'Interview', type: 'Guided Q&A', desc: 'Contextual sequential Q&A with the system to test responsive agility.', status: 'Active', icon: 'activity', directive: 'Direct English Only.\nArchitecture: Stateless & Low-Egress.\nGuided sequential Q&A.' }
  ].sort((a, b) => a.id.localeCompare(b.id));

  // Elevate topbar title and subtitle without duplicating inside content view (SSOT)
  const topbarTabsEl = document.getElementById('topbar-tabs-container');
  if (topbarTabsEl) {
    topbarTabsEl.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:16px; font-weight:800; font-family:var(--fm-font-display, 'Inter', sans-serif); color:#f8fafc;">Modules (Core Engines)</span>
        <span style="color:#64748b; font-size:12px;">—</span>
        <span style="font-size:12px; color:#94a3b8; font-weight:500;">Central warehouse for the 8 core AI evaluation engines &amp; class assignment mapping</span>
      </div>
    `;
  }

  // Count modules assigned per discipline for Sub Panel summary pills (Gambar 2)
  const disciplineCounts = {};
  CLASS_DISCIPLINES.forEach(d => {
    disciplineCounts[d.key] = modules.filter(m => (assignments[m.id] || DEFAULT_MODULE_CLASS_MAP[m.id] || []).includes(d.key)).length;
  });

  // Authoritative Lower Panel Sync for Modules (Phase 419 Universal 5-Panel Architecture)
  // Houses the 4 Discipline Allocation Summary Pills and Engine Status strictly within Sub Panel (40px)
  if (window.setBottomInfobar) {
    const leftHtml = `
      <div style="display:inline-flex; align-items:center; gap:8px; font-size:12px; color:#94a3b8; font-weight:600;">
        <span style="color:var(--primary-tactical, #38bdf8);">${getSvgIcon('layers', 14)}</span>
        <span>8 Core AI Evaluation Modules (Stateless &amp; Low-Egress)</span>
      </div>
    `;
    const rightHtml = `
      <div style="display:inline-flex; align-items:center; gap:6px;">
        ${CLASS_DISCIPLINES.map(d => `
          <div style="display:inline-flex; align-items:center; gap:5px; padding:0 8px; height:28px; line-height:26px; border-radius:4px; background:${d.bg}; border:1px solid ${d.border}; box-sizing:border-box;">
            <span style="width:6px; height:6px; border-radius:50%; background:${d.color};"></span>
            <span style="font-size:12px; font-weight:700; color:${d.color};">${d.label}:</span>
            <span style="font-size:12px; font-weight:800; color:#ffffff; font-variant-numeric:tabular-nums;">${disciplineCounts[d.key]}</span>
          </div>
        `).join('')}
        <span class="badge" style="background:rgba(var(--grade-a-rgb),0.15); color:var(--grade-a); border:1px solid rgba(0,192,0,0.3); font-size:12px; font-weight:700; padding:0 8px; height:28px; line-height:26px; border-radius:4px; display:inline-flex; align-items:center;">● ACTIVE</span>
      </div>
    `;
    window.setBottomInfobar(leftHtml, rightHtml);
  }

  area.innerHTML = `
    <div style="display: flex; flex-direction: column; flex: 1 1 0; min-height: 0; height: 100%; padding: 10px; box-sizing: border-box; overflow-y: auto; gap: 10px;">
      
      <!-- 8 Module Cards Grid: Strictly 4 Columns on Top & 4 on Bottom (Universal 10px Gap) -->
      <div style="display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; flex: 1 1 auto;">
        ${modules.map(mod => {
          const assignedList = assignments[mod.id] || DEFAULT_MODULE_CLASS_MAP[mod.id] || [];
          return `
            <div class="module-card card" style="background: rgba(15, 23, 42, 0.85); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; height: 100%; min-height: 290px; transition: border-color 0.2s, box-shadow 0.2s; box-sizing: border-box;" 
                 onmouseover="this.style.borderColor='rgba(56, 189, 248, 0.35)'; this.style.boxShadow='0 4px 16px rgba(0, 0, 0, 0.4)'" 
                 onmouseout="this.style.borderColor='rgba(255, 255, 255, 0.08)'; this.style.boxShadow='none'">
              
              <!-- Standardized Badge Area (Invariant 1.5.0) Above Title Area -->
              <div class="badge-area" style="width: 48px; height: 48px; border-radius: 12px; background: rgba(56, 189, 248, 0.1); border: 1.5px solid rgba(56, 189, 248, 0.3); box-shadow: 0 0 12px rgba(56, 189, 248, 0.15); display: flex; align-items: center; justify-content: center; margin: 4px auto 10px auto; color: var(--primary-tactical, #38bdf8); flex-shrink: 0;">
                ${getSvgIcon(mod.icon, 24)}
              </div>

              <!-- Standardized 40px Title Area (Invariant 1.5.1) -->
              <div class="title-area" style="height: 40px !important; min-height: 40px !important; max-height: 40px !important; border-bottom: 1.5px solid rgba(255, 255, 255, 0.16) !important; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; margin-bottom: 8px; flex-shrink: 0;">
                <h3 style="font-size: 16px; font-family: var(--fm-font-display, 'Inter', sans-serif); font-weight: 700; color: #f8fafc; margin: 0; text-transform: uppercase; letter-spacing: 0.02em; line-height: 1.2;">
                  ${escapeHtml(mod.name)}
                </h3>
                <span style="font-size: 12px; font-weight: 700; color: var(--primary-tactical, #38bdf8); text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.2;">
                  ${mod.id.toUpperCase()} — ${escapeHtml(mod.type)}
                </span>
              </div>
              
              <!-- Description Paragraph -->
              <p style="font-size: 12px; color: #94a3b8; line-height: 1.4; margin: 0 0 8px 0; text-align: center; min-height: 36px; display: flex; align-items: center; justify-content: center;">
                ${escapeHtml(mod.desc)}
              </p>
              
              <!-- Assigned / Applicable Classes Section (Stacked Top-to-Bottom with 10px Gap) -->
              <div style="background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 6px; padding: 10px; margin-bottom: 10px; flex-grow: 1; display: flex; flex-direction: column;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <span style="font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">APPLICABLE CLASSES</span>
                  <span class="edit-mode-only" style="font-size: 12px; color: var(--primary-tactical, #38bdf8); font-weight: 600;">(Toggle)</span>
                </div>

                <div class="module-class-pills" style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                  ${CLASS_DISCIPLINES.map(d => {
                    const isAssigned = assignedList.includes(d.key);
                    return `
                      <button type="button" class="btn-toggle-disc-pill" data-mod="${mod.id}" data-mod-name="${escapeHtml(mod.name)}" data-disc="${d.key}" data-disc-label="${escapeHtml(d.label)}"
                              title="${isAssigned ? `Active for ${d.label} (Click to remove)` : `Inactive for ${d.label} (Click to add)`}"
                              style="display: flex; align-items: center; justify-content: flex-start; gap: 8px; width: 100%; box-sizing: border-box; padding: 4px 10px; height: 28px; line-height: 20px; border-radius: 4px; font-size: 12px; font-weight: ${isAssigned ? '700' : '600'}; color: ${isAssigned ? d.color : '#64748b'}; background: ${isAssigned ? d.bg : 'rgba(255,255,255,0.02)'}; border: 1px ${isAssigned ? 'solid ' + d.border : 'dashed rgba(255,255,255,0.12)'}; cursor: pointer; transition: background 0.15s, border-color 0.15s; user-select: none;">
                        <span style="display: inline-flex; align-items: center; justify-content: center; width: 14px; flex-shrink: 0;">${isAssigned ? getSvgIcon('check', 12) : getSvgIcon('plus', 12)}</span>
                        <span style="flex-grow: 1; text-align: left;">${d.label}</span>
                        ${isAssigned ? `<span style="font-size: 12px; opacity: 0.8; font-weight: 600;">Active</span>` : ''}
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>

              <!-- Action Button: Configure Engine (Rule 3.4 Ghost-to-Solid-Glow) -->
              <button class="btn-configure-engine edit-mode-only" data-id="${mod.id}" data-name="${escapeHtml(mod.name)}" data-directive="${escapeHtml(mod.directive)}"
                      style="background: transparent; border: 1px solid rgba(56, 189, 248, 0.4); color: var(--primary-tactical, #38bdf8); padding: 0 10px; height: 30px; line-height: 28px; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s; width: 100%; display: inline-flex; align-items: center; justify-content: center; gap: 6px; margin-top: auto;"
                      onmouseover="this.style.background='#0284c7'; this.style.borderColor='#0284c7'; this.style.color='#ffffff'; this.style.boxShadow='0 0 10px rgba(56, 189, 248, 0.45)';"
                      onmouseout="this.style.background='transparent'; this.style.borderColor='rgba(56, 189, 248, 0.4)'; this.style.color='var(--primary-tactical, #38bdf8)'; this.style.boxShadow='none';">
                <span>${getSvgIcon('settings', 14)}</span>
                <span>Configure Engine &amp; Classes</span>
              </button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Wire interactive pill toggles directly on the cards
  area.querySelectorAll('.btn-toggle-disc-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const modId = btn.getAttribute('data-mod');
      const modName = btn.getAttribute('data-mod-name');
      const discKey = btn.getAttribute('data-disc');
      const discLabel = btn.getAttribute('data-disc-label');

      const updated = toggleModuleClassAssignment(modId, discKey);
      const isNowActive = (updated[modId] || []).includes(discKey);

      if (window.showToast) {
        window.showToast(
          isNowActive 
            ? `✓ ${modName} is now assigned to ${discLabel} classes.` 
            : `Removed ${modName} from ${discLabel} classes.`,
          isNowActive ? 'success' : 'info'
        );
      }

      // Re-render modules area to update pills and summary counters
      renderModules(area);
    });
  });

  // Wire Configure Drawer
  area.querySelectorAll('.btn-configure-engine').forEach(btn => {
    btn.addEventListener('click', () => {
      const modId = btn.getAttribute('data-id');
      const modName = btn.getAttribute('data-name');
      const modDirective = btn.getAttribute('data-directive');
      const currentAssigned = getModuleClassAssignments()[modId] || DEFAULT_MODULE_CLASS_MAP[modId] || [];
      
      const bodyHTML = `
        <div style="display:flex; flex-direction:column; gap:14px;">
          <!-- Engine Status -->
          <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-weight:700; color:#94a3b8; font-size:12px; margin:0; text-transform:uppercase; letter-spacing:0.05em;">ENGINE STATUS</label>
            <select class="form-control" style="background:#0f172a; border: 1px solid rgba(255,255,255,0.12); color:#f8fafc; padding: 6px 10px; border-radius: 6px; font-size: 12px; height: 32px;">
              <option selected>Active</option>
              <option>Maintenance Mode</option>
              <option>Disabled</option>
            </select>
          </div>

          <!-- Applicable Class Disciplines -->
          <div class="form-group" style="display:flex; flex-direction:column; gap:6px;">
            <label style="font-weight:700; color:#94a3b8; font-size:12px; margin:0; text-transform:uppercase; letter-spacing:0.05em;">ASSIGNED CLASS DISCIPLINES</label>
            <div style="display:flex; flex-direction:column; gap:8px; background:#0f172a; padding:10px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.08);">
              ${CLASS_DISCIPLINES.map(d => {
                const checked = currentAssigned.includes(d.key);
                return `
                  <label style="display:flex; align-items:flex-start; gap:8px; cursor:pointer; margin:0; user-select:none;">
                    <input type="checkbox" class="drawer-disc-chk" data-disc="${d.key}" ${checked ? 'checked' : ''} style="margin-top:2px; accent-color: #38bdf8; width:15px; height:15px; cursor:pointer;">
                    <div style="display:flex; flex-direction:column;">
                      <span style="font-size:12px; font-weight:700; color:${d.color};">${d.label}</span>
                      <span style="font-size:12px; color:#94a3b8; line-height:1.3;">${d.desc}</span>
                    </div>
                  </label>
                `;
              }).join('')}
            </div>
          </div>
          
          <!-- System Prompt Instructions -->
          <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-weight:700; color:#94a3b8; font-size:12px; margin:0; text-transform:uppercase; letter-spacing:0.05em;">SYSTEM PROMPT / INSTRUCTIONS (ENGLISH ONLY)</label>
            <textarea class="form-control" rows="5" style="background:#0f172a; border: 1px solid rgba(255,255,255,0.12); color:#f8fafc; padding: 8px 10px; border-radius: 6px; resize:vertical; font-family: monospace; font-size: 12px;" placeholder="Enter base instructions for the AI...">${modDirective}</textarea>
          </div>
          
          <!-- Teacher Override Checkbox -->
          <div class="form-group" style="display:flex; justify-content:space-between; align-items:center; background:#0f172a; padding: 10px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
            <label style="margin:0; font-weight:600; color:#cbd5e1; font-size: 12px;">ALLOW TEACHER MANUAL OVERRIDE</label>
            <input type="checkbox" checked style="accent-color:#38bdf8; width:16px; height:16px; cursor:pointer;">
          </div>
          
          <!-- Tolerance Engine -->
          <div class="form-group" style="display:flex; flex-direction:column; gap:4px;">
            <label style="font-weight:700; color:#94a3b8; font-size:12px; margin:0; text-transform:uppercase; letter-spacing:0.05em;">TOLERANCE ENGINE (EDIT-DISTANCE)</label>
            <select class="form-control" style="background:#0f172a; border: 1px solid rgba(255,255,255,0.12); color:#f8fafc; padding: 6px 10px; border-radius: 6px; font-size: 12px; height: 32px;">
              <option>Default (0 err = 1pt, 1-2 err = 0.5pt, 3+ = 0)</option>
              <option>Strict (0 err = 1pt, else 0)</option>
              <option>Custom Engine Settings...</option>
            </select>
          </div>
        </div>
      `;
      
      const footerHTML = `
        <div style="display:flex; gap:10px; justify-content:space-between; align-items:center; width:100%;">
          <button type="button" class="btn btn-secondary btn-sm btn-modal-close-left" onclick="closeRecordDrawer()">Cancel</button>
          <button type="button" class="btn btn-primary btn-sm" id="drawer-save-btn">Save Configuration</button>
        </div>
      `;
      
      if (window.openRecordDrawer) {
        window.openRecordDrawer(`${getSvgIcon('settings', 16)} Configure: ${modName}`, bodyHTML, footerHTML);
        
        setTimeout(() => {
          const saveBtn = document.getElementById('drawer-save-btn');
          if (saveBtn) {
            saveBtn.addEventListener('click', () => {
              const chks = document.querySelectorAll('.drawer-disc-chk');
              const newAssigned = [];
              chks.forEach(c => {
                if (c.checked) newAssigned.push(c.getAttribute('data-disc'));
              });
              const allAssigns = getModuleClassAssignments();
              allAssigns[modId] = newAssigned;
              saveModuleClassAssignments(allAssigns);

              if (window.showToast) window.showToast(`Configuration and class mappings saved for ${modName}.`, 'success');
              if (window.closeRecordDrawer) window.closeRecordDrawer();
              renderModules(area);
            });
          }
        }, 50);
      }
    });
  });
}
