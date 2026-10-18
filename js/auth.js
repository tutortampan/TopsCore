/**
 * TopsCore — Student Auth & Onboarding Module
 * Extracted from index.html
 */

import { fetchInstitutions, fetchPrograms, fetchBatches, fetchStudentsByProgram, verifyStudentLogin, formatStudentName } from './api.js?v=5.2.2';
    import { setStudentSession, getStudentSession } from './session.js?v=5.2.2';
    import { showToast, showLoading, hideLoading, escapeHtml, escHtml } from './app.js?v=5.2.2';

    // â”€â”€ Redirect if already logged in â”€â”€
    if (getStudentSession()) {
      window.location.href = 'dashboard.html';
    }

    // â”€â”€ State â”€â”€
    const state = {
      institutionId: null, institutionName: null,
      programId: null, programName: null,
      batchId: null, batchName: null,
      studentId: null, studentName: null,
    };

    // â”€â”€ Remember Me â”€â”€
    const REMEMBER_KEY = 'topscore_saved_login_v2';
    let rememberEnabled = localStorage.getItem('topscore_remember_enabled') === 'true';

    const rmbToggleEl = document.getElementById('rmb-toggle');
    const clearLinkEl = document.getElementById('clear-session-link');
    const rmbBanner = document.getElementById('remember-me-banner');

    function updateRememberUI() {
      rmbToggleEl.classList.toggle('on', rememberEnabled);
      rmbToggleEl.setAttribute('aria-checked', String(rememberEnabled));
      const saved = getSavedLogin();
      if (saved && rememberEnabled) {
        clearLinkEl.classList.add('visible');
      } else {
        clearLinkEl.classList.remove('visible');
      }
    }

    function getSavedLogin() {
      try { return JSON.parse(localStorage.getItem(REMEMBER_KEY)) || null; }
      catch { return null; }
    }

    function saveLogin() {
      if (!rememberEnabled) return;
      localStorage.setItem(REMEMBER_KEY, JSON.stringify({
        institutionId: state.institutionId, institutionName: state.institutionName,
        programId: state.programId, programName: state.programName,
        batchId: state.batchId, batchName: state.batchName,
        studentId: state.studentId, studentName: state.studentName,
      }));
      updateRememberUI();
    }

    function clearSavedLogin() {
      localStorage.removeItem(REMEMBER_KEY);
      updateRememberUI();
    }

    rmbBanner.addEventListener('click', () => {
      rememberEnabled = !rememberEnabled;
      localStorage.setItem('topscore_remember_enabled', String(rememberEnabled));
      updateRememberUI();
      if (!rememberEnabled) clearSavedLogin();
    });
    rmbBanner.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') rmbBanner.click(); });

    clearLinkEl.addEventListener('click', () => {
      clearSavedLogin();
      state.institutionId = null; state.institutionName = null;
      resetFrom('program');
      reopenSection('sec-institution');
      showToast('Saved login cleared.', 'info');
    });

    updateRememberUI();

    // â”€â”€ Section helpers â”€â”€
    function unlockSection(id) {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('unlocked');
        el.classList.remove('selected');
        // Smooth scroll into view
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
      }
    }

    function collapseSection(id, label, stepNumId) {
      const el = document.getElementById(id);
      if (el) {
        el.classList.add('selected');
        const selLabel = document.getElementById(`sel-${id.replace('sec-','')}-label`);
        if (selLabel) { selLabel.textContent = label; }
        const changeBtn = el.querySelector('.cascade-change-btn');
        if (changeBtn) changeBtn.classList.remove('hidden');
        const numEl = document.getElementById(stepNumId);
        if (numEl) numEl.classList.add('done');
      }
    }

    function reopenSection(id) {
      const el = document.getElementById(id);
      if (el) {
        el.classList.remove('selected');
        el.classList.add('unlocked');
        const selLabel = document.getElementById(`sel-${id.replace('sec-','')}-label`);
        if (selLabel) { selLabel.textContent = ''; }
        const changeBtn = el.querySelector('.cascade-change-btn');
        if (changeBtn) changeBtn.classList.add('hidden');
        const numEl = el.querySelector('.cascade-step-num');
        if (numEl) numEl.classList.remove('done');
      }
    }

    // â”€â”€ Render options helper â”€â”€
    function renderOptions(containerId, searchInputId, items, onSelect, selectedId = null) {
      const container = document.getElementById(containerId);
      const searchInput = document.getElementById(searchInputId);

      if (!items.length) {
        container.innerHTML = `<div class="opts-empty">&#128269; No options found</div>`;
        return;
      }

      const sorted = [...items].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

      function buildCards(filtered) {
        container.innerHTML = '';
        if (!filtered.length) {
          container.innerHTML = `<div class="opts-empty">No results for your search</div>`;
          return;
        }
        filtered.forEach(item => {
          const btn = document.createElement('button');
          btn.className = 'opt-card' + (item.id === selectedId ? ' active' : '');
          btn.setAttribute('role', 'listitem');
          btn.dataset.id = item.id;
          btn.innerHTML = `
            <span class="opt-card-icon">&#9679;</span>
            <span class="opt-card-name">${escHtml(item.name)}</span>
            <span class="opt-card-check">&#10003;</span>
          `;
          btn.addEventListener('click', () => {
            container.querySelectorAll('.opt-card').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            onSelect(item);
          });
          container.appendChild(btn);
        });
      }

      buildCards(sorted);

      if (searchInput) {
        searchInput.value = '';
        // Remove old listener by cloning
        const newInput = searchInput.cloneNode(true);
        searchInput.parentNode.replaceChild(newInput, searchInput);
        let _inputDebounce = null;
        newInput.addEventListener('input', () => {
          clearTimeout(_inputDebounce);
          _inputDebounce = setTimeout(() => {
            const q = newInput.value.toLowerCase();
            buildCards(sorted.filter(i => (i.name || '').toLowerCase().includes(q)));
          }, 200);
        });
      }
    }

    // escHtml imported from app.js

    // â”€â”€ Step 1: Load Institutions â”€â”€
    async function loadInstitutions(autoSelectId = null) {
      const container = document.getElementById('list-institution');
      container.innerHTML = `<div class="opts-spinner"><div class="spinner"></div></div>`;
      try {
        const institutions = await fetchInstitutions();
        renderOptions('list-institution', 'search-institution', institutions, (p) => {
          state.institutionId = p.id; state.institutionName = p.name;
          collapseSection('sec-institution', p.name, 'step-num-1');
          resetFrom('institution');
          loadPrograms();
        }, autoSelectId);

        // Auto-select if restoring saved login, otherwise auto-advance if only 1 option
        if (autoSelectId) {
          const match = institutions.find(p => p.id === autoSelectId);
          if (match) {
            state.institutionId = match.id; state.institutionName = match.name;
          }
        } else if (institutions.length === 1) {
          setTimeout(() => {
            const card = document.querySelector('#list-institution .opt-card');
            if (card) card.click();
          }, 100);
        }
      } catch (e) {
        container.innerHTML = `<div class="opts-empty" style="color:#f87171;">Failed to load institutions: ${e.message}</div>`;
      }
    }

    // â”€â”€ Step 2: Load Programs â”€â”€
    async function loadPrograms(autoSelectId = null) {
      unlockSection('sec-program');
      const container = document.getElementById('list-program');
      container.innerHTML = `<div class="opts-spinner"><div class="spinner"></div></div>`;
      try {
        const programs = await fetchPrograms(state.institutionId);
        renderOptions('list-program', 'search-program', programs, (c) => {
          state.programId = c.id; state.programName = c.name;
          collapseSection('sec-program', c.name, 'step-num-2');
          resetFrom('batch');
          loadBatches();
        }, autoSelectId);

        if (autoSelectId) {
          const match = programs.find(c => c.id === autoSelectId);
          if (match) { state.programId = match.id; state.programName = match.name; }
        } else if (programs.length === 1) {
          setTimeout(() => {
            const card = document.querySelector('#list-program .opt-card');
            if (card) card.click();
          }, 100);
        }
      } catch (e) {
        container.innerHTML = `<div class="opts-empty" style="color:#f87171;">Failed to load programs.</div>`;
      }
    }

    // â”€â”€ Step 3: Load Batches â”€â”€
    async function loadBatches(autoSelectId = null) {
      unlockSection('sec-batch');
      const container = document.getElementById('list-batch');
      container.innerHTML = `<div class="opts-spinner"><div class="spinner"></div></div>`;
      try {
        const batches = await fetchBatches(state.programId);
        const displayBatches = batches.length > 0
          ? [{ id: '__all__', name: 'All Batches' }, ...batches]
          : [{ id: '__all__', name: 'All Students' }];

        renderOptions('list-batch', 'search-batch', displayBatches, (b) => {
          state.batchId = b.id === '__all__' ? null : b.id;
          state.batchName = b.name;
          collapseSection('sec-batch', b.name, 'step-num-3');
          resetFrom('student');
          loadStudents();
        }, autoSelectId);

        if (autoSelectId) {
          const effId = autoSelectId === null ? '__all__' : autoSelectId;
          const match = displayBatches.find(b => b.id === effId);
          if (match) { state.batchId = match.id === '__all__' ? null : match.id; state.batchName = match.name; }
        } else if (displayBatches.length === 1) {
          setTimeout(() => {
            const card = document.querySelector('#list-batch .opt-card');
            if (card) card.click();
          }, 100);
        }
      } catch (e) {
        container.innerHTML = `<div class="opts-empty" style="color:#f87171;">Failed to load batches.</div>`;
      }
    }

    // â”€â”€ Step 4: Load Students â”€â”€
    async function loadStudents(autoSelectId = null) {
      unlockSection('sec-student');
      const container = document.getElementById('list-student');
      container.innerHTML = `<div class="opts-spinner"><div class="spinner"></div></div>`;
      try {
        const students = await fetchStudentsByProgram(state.programId, state.batchId);
        renderOptions('list-student', 'search-student', students, (s) => {
          state.studentId = s.id; state.studentName = s.name;
          collapseSection('sec-student', s.name, 'step-num-4');
          document.getElementById('pin-welcome-text').innerHTML = `Welcome, <strong>${escHtml(s.name)}</strong>! Enter your 4-digit PIN.`;
          unlockSection('sec-pin');
          setTimeout(() => document.getElementById('pin-0').focus(), 200);
          saveLogin();
        }, autoSelectId);

        if (autoSelectId) {
          const match = students.find(s => s.id === autoSelectId);
          if (match) { state.studentId = match.id; state.studentName = match.name; }
        }
      } catch (e) {
        container.innerHTML = `<div class="opts-empty" style="color:#f87171;">Failed to load students.</div>`;
      }
    }

    // â”€â”€ Reset cascade from a given step downward â”€â”€
    function resetFrom(from) {
      const order = ['institution', 'program', 'batch', 'student', 'pin'];
      const idx = order.indexOf(from);
      if (idx < 0) return;
      for (let i = idx; i < order.length; i++) {
        const key = order[i];
        const el = document.getElementById(`sec-${key}`);
        if (el) {
          el.classList.remove('unlocked', 'selected');
          const selLabel = document.getElementById(`sel-${key}-label`);
          if (selLabel) { selLabel.textContent = ''; }
          const changeBtn = el.querySelector('.cascade-change-btn');
          if (changeBtn) changeBtn.classList.add('hidden');
          const numEl = el.querySelector('.cascade-step-num');
          if (numEl) numEl.classList.remove('done');
        }
        if (key === 'program') { state.programId = null; state.programName = null; }
        if (key === 'batch') { state.batchId = null; state.batchName = null; }
        if (key === 'student') { state.studentId = null; state.studentName = null; }
        if (key === 'pin') { resetPin(); }
      }
    }

    function resetPin() {
      const pins = [0,1,2,3].map(i => document.getElementById(`pin-${i}`));
      pins.forEach(p => { p.value = ''; p.classList.remove('filled'); });
      document.getElementById('login-btn').disabled = true;
      document.getElementById('login-btn-text').textContent = 'Sign In';
    }

    // â”€â”€ Change buttons â”€â”€
    document.getElementById('change-institution-btn').addEventListener('click', () => {
      reopenSection('sec-institution');
      resetFrom('institution');
    });
    document.getElementById('change-program-btn').addEventListener('click', () => {
      reopenSection('sec-program');
      resetFrom('batch');
    });
    document.getElementById('change-batch-btn').addEventListener('click', () => {
      reopenSection('sec-batch');
      resetFrom('student');
    });
    document.getElementById('change-student-btn').addEventListener('click', () => {
      reopenSection('sec-student');
      resetFrom('pin');
    });

    // â”€â”€ PIN Logic â”€â”€
    const pinInputs = [0,1,2,3].map(i => document.getElementById(`pin-${i}`));
    const loginBtn = document.getElementById('login-btn');

    pinInputs.forEach((inp, idx) => {
      inp.addEventListener('input', () => {
        inp.value = inp.value.replace(/\D/g, '').slice(0, 1);
        inp.classList.toggle('filled', inp.value.length > 0);
        if (inp.value && idx < 3) pinInputs[idx + 1].focus();
        checkPinComplete();
      });
      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !inp.value && idx > 0) {
          pinInputs[idx - 1].focus();
          pinInputs[idx - 1].value = '';
          pinInputs[idx - 1].classList.remove('filled');
          checkPinComplete();
        }
        if (e.key === 'Enter' && !loginBtn.disabled) loginBtn.click();
      });
      inp.addEventListener('paste', (e) => {
        const paste = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '');
        if (paste.length >= 4) {
          pinInputs.forEach((p, i) => {
            p.value = paste[i] || '';
            p.classList.toggle('filled', p.value.length > 0);
          });
          pinInputs[3].focus();
          checkPinComplete();
          e.preventDefault();
        }
      });
    });

    function checkPinComplete() {
      loginBtn.disabled = !pinInputs.every(p => p.value.length === 1);
    }

    loginBtn.addEventListener('click', async () => {
      const pin = pinInputs.map(p => p.value).join('');
      if (pin.length !== 4) return;

      loginBtn.disabled = true;
      document.getElementById('login-btn-text').textContent = 'Signing in...';
      showLoading('Verifying credentials...');

      try {
        const result = await verifyStudentLogin({
          institutionId: state.institutionId,
          programId: state.programId,
          batchId: state.batchId,
          studentId: state.studentId,
          pin,
        });

        setStudentSession({
          student_id: state.studentId,
          student_name: result.student?.name || state.studentName,
          gender: result.student?.gender || null,
          institution_id: state.institutionId,
          institution_name: state.institutionName,
          program_id: state.programId,
          program_name: state.programName,
          batch_id: state.batchId,
          batch_name: state.batchName,
        });

        saveLogin();
        hideLoading();
        window.location.href = 'dashboard.html';
      } catch (e) {
        hideLoading();
        showToast(e.message || 'Invalid PIN. Please try again.', 'error');
        pinInputs.forEach(p => { p.value = ''; p.classList.remove('filled'); });
        pinInputs[0].focus();
        loginBtn.disabled = true;
        document.getElementById('login-btn-text').textContent = 'Sign In';
      }
    });

    // --- Restore saved login (Remember Me) ---
    async function restoreSavedLogin() {
      const saved = getSavedLogin();
      if (!saved || !rememberEnabled) {
        await loadInstitutions();
        return;
      }

      showToast('Restoring your saved login...', 'info');

      // Step 1: Load institutions
      await loadInstitutions(saved.institutionId);
      if (!state.institutionId) { await loadInstitutions(); return; }

      // Collapse institution section
      collapseSection('sec-institution', saved.institutionName || state.institutionName, 'step-num-1');

      // Step 2: Load programs
      await loadPrograms(saved.programId);
      if (!state.programId) { unlockSection('sec-program'); return; }

      collapseSection('sec-program', saved.programName || state.programName, 'step-num-2');

      // Step 3: Load batches
      const savedBatchEffId = saved.batchId === null ? null : saved.batchId;
      await loadBatches(savedBatchEffId === null ? '__all__' : savedBatchEffId);
      if (state.batchName) {
        collapseSection('sec-batch', saved.batchName || state.batchName, 'step-num-3');
      } else { unlockSection('sec-batch'); return; }

      // Step 4: Load students
      await loadStudents(saved.studentId);
      if (!state.studentId) { unlockSection('sec-student'); return; }

      collapseSection('sec-student', saved.studentName || state.studentName, 'step-num-4');
      document.getElementById('pin-welcome-text').innerHTML = `Welcome back, <strong>${escHtml(saved.studentName || state.studentName)}</strong>! Enter your PIN.`;
      unlockSection('sec-pin');
      clearLinkEl.classList.add('visible');
      setTimeout(() => document.getElementById('pin-0').focus(), 300);
    }

    // â”€â”€ Init â”€â”€
    restoreSavedLogin();
