// TOPS CORE — Test System Settings Modal (Phase 306)
// Centralized configuration for task repetitions, task passing score, and exam passing score.
// Domain: Pillar D — System Settings & Blueprint Engine (Vibrant Purple / Violet SSOT)
import { fetchClassTestSettings, saveClassTestSettings, escapeHtml, showToast } from '../api.js?v=20261114_v517';
import { getSvgIcon } from '../svg-icons.js?v=20261114_v487';

export async function openTestSystemSettingsModal(options = {}) {
  const {
    classId,
    className = 'Vocabulary Class',
    onComplete = null
  } = options;

  // Remove existing modal if any
  document.getElementById('test-system-settings-modal')?.remove();

  // Load current settings (Default: 7x repetitions, 60% Task Grade C, 60% Exam Grade C)
  let cur = { taskRepetitions: 7, taskMinScore: 60, examMinScore: 60 };
  try {
    cur = await fetchClassTestSettings(classId);
  } catch (err) {
    console.warn('[openTestSystemSettingsModal] Error fetching settings:', err);
  }

  // Create Modal Overlay
  const overlay = document.createElement('div');
  overlay.id = 'test-system-settings-modal';
  overlay.className = 'topscore-modal-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(6px);
    z-index: 10000; display: flex; align-items: center; justify-content: center;
    padding: 10px; box-sizing: border-box; animation: fadeIn 0.15s ease-out;
  `;

  overlay.innerHTML = `
    <style>
      #test-system-settings-modal .modal-card {
        background: #0f172a; border: 1.5px solid rgba(255, 255, 255, 0.16); border-radius: 12px;
        width: 100%; max-width: 560px; display: flex; flex-direction: column;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); overflow: hidden; color: #f8fafc;
      }
      #test-system-settings-modal .title-area {
        height: 60px !important; min-height: 60px !important; max-height: 60px !important;
        border-bottom: 1.5px solid rgba(255, 255, 255, 0.16) !important;
        display: flex; align-items: center; justify-content: center;
        background: #7c3aed !important; box-sizing: border-box; padding: 0 10px;
      }
      #test-system-settings-modal .title-area h2 {
        margin: 0; font-family: var(--fm-font-display, 'Inter', sans-serif);
        font-size: 16px; font-weight: 800; text-transform: uppercase;
        letter-spacing: 0.05em; color: #ffffff; text-align: center;
      }
      #test-system-settings-modal .modal-body {
        padding: 10px; overflow-y: auto; max-height: calc(80vh - 120px);
        display: flex; flex-direction: column; gap: 10px; box-sizing: border-box;
      }
      #test-system-settings-modal .setting-card {
        background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 8px; padding: 10px; display: flex; flex-direction: column; gap: 6px;
        box-sizing: border-box;
      }
      #test-system-settings-modal .setting-label {
        font-size: 12px; font-weight: 700; color: #94a3b8;
        text-transform: uppercase; letter-spacing: 0.05em;
      }
      #test-system-settings-modal .setting-input {
        width: 80px; height: 32px; padding: 0 8px; font-size: 12px;
        font-family: var(--fm-font-sans, 'Inter', sans-serif); font-weight: 700;
        text-align: center; background: #1e293b; border: 1px solid rgba(255,255,255,0.2);
        border-radius: 6px; color: #ffffff; box-sizing: border-box;
      }
      #test-system-settings-modal .cta-area {
        height: 60px !important; min-height: 60px !important; max-height: 60px !important;
        border-top: 1.5px solid rgba(255, 255, 255, 0.16) !important;
        background: rgba(30, 41, 59, 0.5); display: flex !important; justify-content: space-between !important;
        align-items: center !important; gap: 10px; padding: 0 10px !important; box-sizing: border-box;
      }
      #test-system-settings-modal .btn-cta-close {
        height: 40px !important; min-height: 40px !important; max-height: 40px !important;
        line-height: 38px !important; padding: 0 20px !important; border-radius: 6px !important;
        font-family: var(--fm-font-display, 'Inter', sans-serif) !important; font-size: 14px !important;
        font-weight: 800 !important; text-transform: uppercase; letter-spacing: 0.03em;
        background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15);
        color: #94a3b8; cursor: pointer; transition: all 0.15s ease; box-sizing: border-box;
        margin-right: auto !important; margin-left: 0 !important; align-self: center !important;
      }
      #test-system-settings-modal .btn-cta-close:hover {
        background: rgba(255,255,255,0.12) !important; color: #ffffff !important;
        border-color: rgba(255,255,255,0.3) !important;
      }
      #test-system-settings-modal .btn-cta-save {
        height: 40px !important; min-height: 40px !important; max-height: 40px !important;
        line-height: 38px !important; padding: 0 20px !important; border-radius: 6px !important;
        font-family: var(--fm-font-display, 'Inter', sans-serif) !important; font-size: 14px !important;
        font-weight: 800 !important; text-transform: uppercase; letter-spacing: 0.03em;
        background: #7c3aed !important; color: #ffffff !important; border: none; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center; gap: 8px;
        box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4); transition: all 0.15s ease; box-sizing: border-box;
      }
      #test-system-settings-modal .btn-cta-save:hover {
        background: #8b5cf6 !important; box-shadow: 0 0 16px rgba(139, 92, 246, 0.6) !important;
      }
      #test-system-settings-modal .btn-cta-save:active {
        transform: translateY(1px);
      }
    </style>

    <div class="modal-card">
      <!-- Title Area (Strict 60px Height, Centered Title & Pillar D Violet Background) -->
      <div class="title-area">
        <h2>DEFAULT TEST SYSTEM &amp; BLUEPRINT SETTINGS</h2>
      </div>

      <!-- Modal Body (Strict 10px Gap & 10px Padding) -->
      <div class="modal-body">
        
        <!-- Task Repetitions Block -->
        <div class="setting-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="setting-label">Task Repetition Target</label>
            <span style="font-size: 12px; color: #64748b; font-weight: 600;">Default: 7x</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="number" id="setting-task-repetitions" class="setting-input" min="7" max="10" value="${Math.max(7, cur.taskRepetitions || 7)}">
            <span style="font-size: 12px; color: #cbd5e1; font-weight: 500;">Passing repetitions required per Task</span>
          </div>
        </div>

        <!-- Task Passing Score Block -->
        <div class="setting-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="setting-label">Minimum Task Passing Score (%)</label>
            <span style="font-size: 12px; color: #64748b; font-weight: 600;">Default: 60% (Grade C)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="number" id="setting-task-min-score" class="setting-input" min="1" max="100" value="${cur.taskMinScore || 60}">
            <span style="font-size: 12px; color: #cbd5e1; font-weight: 500;">% passing threshold for Task repetition</span>
          </div>
        </div>

        <!-- Exam Passing Score Block -->
        <div class="setting-card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <label class="setting-label">Minimum Exam Passing Score (%)</label>
            <span style="font-size: 12px; color: #64748b; font-weight: 600;">Default: 60% (Grade C)</span>
          </div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <input type="number" id="setting-exam-min-score" class="setting-input" min="1" max="100" value="${cur.examMinScore || 60}">
            <span style="font-size: 12px; color: #cbd5e1; font-weight: 500;">% passing threshold for Milestone Exam</span>
          </div>
        </div>

        <!-- Scope & Batch Sync (Pillar D Violet Accent) -->
        <div class="setting-card" style="background: rgba(124, 58, 237, 0.05); border-color: rgba(124, 58, 237, 0.25); gap: 10px;">
          <div style="font-size: 12px; font-weight: 700; color: #c084fc; text-transform: uppercase; letter-spacing: 0.05em;">
            Settings Application Scope
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #f8fafc;">
              <input type="radio" name="setting_scope" value="class" checked style="accent-color: #8b5cf6;">
              <span>Apply specifically to class: <strong>${escapeHtml(className)}</strong></span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; color: #f8fafc;">
              <input type="radio" name="setting_scope" value="global" style="accent-color: #8b5cf6;">
              <span>Apply as <strong>Global System Default</strong> across all classes</span>
            </label>
          </div>

          <div style="padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08);">
            <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 12px; cursor: pointer; color: #f8fafc;">
              <input type="checkbox" id="setting-apply-to-existing" checked style="margin-top: 2px; accent-color: #8b5cf6;">
              <span><strong>Apply now to existing tests:</strong> Automatically update minimum passing score on all Tasks and Exams in this class.</span>
            </label>
          </div>
        </div>

      </div>

      <!-- CTA Area (Strict 60px Height, 40px Buttons: CLOSE on left & SAVE SETTINGS in Pillar D Violet on right) -->
      <div class="cta-area">
        <button type="button" class="btn-cta-close" id="btn-close-settings">CLOSE</button>
        <button type="button" class="btn-cta-save" id="btn-save-settings">
          ${getSvgIcon('save', 16)} SAVE SETTINGS
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  const closeModal = () => overlay.remove();
  overlay.querySelector('#btn-close-settings')?.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Save handler
  overlay.querySelector('#btn-save-settings').addEventListener('click', async () => {
    const taskRepetitions = Math.max(7, parseInt(overlay.querySelector('#setting-task-repetitions').value, 10) || 7);
    const taskMinScore = parseInt(overlay.querySelector('#setting-task-min-score').value, 10) || 60;
    const examMinScore = parseInt(overlay.querySelector('#setting-exam-min-score').value, 10) || 60;
    const isGlobal = overlay.querySelector('input[name="setting_scope"]:checked').value === 'global';
    const applyToExisting = overlay.querySelector('#setting-apply-to-existing').checked;

    const saveBtn = overlay.querySelector('#btn-save-settings');
    saveBtn.disabled = true;
    saveBtn.innerHTML = `${getSvgIcon('clock', 16)} SAVING...`;

    try {
      const res = await saveClassTestSettings(classId, {
        taskRepetitions,
        taskMinScore,
        examMinScore,
        isGlobal
      }, applyToExisting);

      showToast(`Settings saved successfully! Repetition target: ${taskRepetitions}x, Task: ${taskMinScore}%, Exam: ${examMinScore}%`, 'success');
      overlay.remove();
      if (typeof onComplete === 'function') onComplete(res);
    } catch (err) {
      console.error('[openTestSystemSettingsModal] Save error:', err);
      showToast('Failed to save settings: ' + err.message, 'error');
      saveBtn.disabled = false;
      saveBtn.innerHTML = `${getSvgIcon('save', 16)} SAVE SETTINGS`;
    }
  });
}
