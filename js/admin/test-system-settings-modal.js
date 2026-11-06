// TOPS CORE — Test System Settings Modal (Phase 306)
// Centralized configuration for task repetitions, task passing score, and exam passing score.
import { fetchClassTestSettings, saveClassTestSettings, escapeHtml, showToast } from '../api.js?v=20261106_v160';

export async function openTestSystemSettingsModal(options = {}) {
  const {
    classId,
    className = 'Vocabulary Class',
    onComplete = null
  } = options;

  // Remove existing modal if any
  document.getElementById('test-system-settings-modal')?.remove();

  // Load current settings
  let cur = { taskRepetitions: 7, taskMinScore: 70, examMinScore: 60 };
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
    padding: 20px; box-sizing: border-box; animation: fadeIn 0.15s ease-out;
  `;

  overlay.innerHTML = `
    <div class="topscore-modal-card" style="
      background: #0f172a; border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 14px;
      width: 100%; max-width: 580px; display: flex; flex-direction: column;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7); overflow: hidden; color: #f8fafc;
    ">
      <!-- Modal Header -->
      <div style="padding: 16px 20px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); display: flex; justify-content: space-between; align-items: center; background: rgba(30, 41, 59, 0.7);">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 1.25rem;">⚙️</span>
            <h2 style="margin: 0; font-size: 1.1rem; font-weight: 700; color: #f8fafc; letter-spacing: -0.01em;">
              Default Test System &amp; Blueprint Settings
            </h2>
            <span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.3); font-size: 0.68rem; font-weight: 800; padding: 2px 7px; border-radius: 4px; text-transform: uppercase;">
              Curriculum Engine
            </span>
          </div>
          <p style="margin: 3px 0 0 0; font-size: 0.76rem; color: #94a3b8;">
            Atur target repetisi task, nilai minimum kelulusan task &amp; exam untuk kurikulum ${escapeHtml(className)}.
          </p>
        </div>
        <button type="button" id="btn-close-settings-modal" style="background: transparent; border: none; color: #94a3b8; font-size: 1.3rem; cursor: pointer; padding: 4px 8px; line-height: 1; border-radius: 6px;">✕</button>
      </div>

      <!-- Modal Body -->
      <div style="padding: 20px; overflow-y: auto; max-height: calc(85vh - 130px); display: flex; flex-direction: column; gap: 16px;">
        
        <!-- Task Repetitions Block -->
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 14px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-size: 0.78rem; font-weight: 800; color: #eab308; text-transform: uppercase; letter-spacing: 0.03em;">
              📌 Target Repetisi Task (Kelulusan x Kali)
            </label>
            <span style="font-size: 0.72rem; color: #94a3b8;">Default: 7 kali</span>
          </div>
          <p style="margin: 0 0 10px 0; font-size: 0.75rem; color: #94a3b8;">
            Berapa kali siswa harus mencapai nilai kelulusan pada tiap task sebelum ujian tema (Exam) terbuka.
          </p>
          <div style="display: flex; align-items: center; gap: 12px;">
            <input type="number" id="setting-task-repetitions" min="1" max="10" value="${cur.taskRepetitions || 7}" style="
              width: 80px; padding: 6px 10px; font-size: 0.95rem; font-weight: 800; text-align: center;
              background: #1e293b; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff;
            ">
            <span style="font-size: 0.82rem; color: #cbd5e1; font-weight: 600;">Kali Lulus Repetisi per Task</span>
          </div>
        </div>

        <!-- Task Passing Score Block -->
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 14px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-size: 0.78rem; font-weight: 800; color: #eab308; text-transform: uppercase; letter-spacing: 0.03em;">
              🎯 Nilai Minimum Kelulusan Task (%)
            </label>
            <span style="font-size: 0.72rem; color: #94a3b8;">Default: 70%</span>
          </div>
          <p style="margin: 0 0 10px 0; font-size: 0.75rem; color: #94a3b8;">
            Nilai persentase minimum agar satu kali percobaan task dihitung sebagai kelulusan repetisi (misal: 70%, atau turunkan ke 50%).
          </p>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="number" id="setting-task-min-score" min="1" max="100" value="${cur.taskMinScore || 70}" style="
              width: 80px; padding: 6px 10px; font-size: 0.95rem; font-weight: 800; text-align: center;
              background: #1e293b; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff;
            ">
            <span style="font-size: 0.88rem; color: #cbd5e1; font-weight: 700;">%</span>
          </div>
        </div>

        <!-- Exam Passing Score Block -->
        <div style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 10px; padding: 14px 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label style="font-size: 0.78rem; font-weight: 800; color: #f472b6; text-transform: uppercase; letter-spacing: 0.03em;">
              📝 Nilai Minimum Kelulusan Exam (%)
            </label>
            <span style="font-size: 0.72rem; color: #94a3b8;">Default: 60%</span>
          </div>
          <p style="margin: 0 0 10px 0; font-size: 0.75rem; color: #94a3b8;">
            Nilai persentase kelulusan minimum untuk ujian milestone mingguan (Exam) agar dapat lanjut ke tema pekan berikutnya.
          </p>
          <div style="display: flex; align-items: center; gap: 8px;">
            <input type="number" id="setting-exam-min-score" min="1" max="100" value="${cur.examMinScore || 60}" style="
              width: 80px; padding: 6px 10px; font-size: 0.95rem; font-weight: 800; text-align: center;
              background: #1e293b; border: 1px solid rgba(255,255,255,0.2); border-radius: 6px; color: #fff;
            ">
            <span style="font-size: 0.88rem; color: #cbd5e1; font-weight: 700;">%</span>
          </div>
        </div>

        <!-- Scope & Batch Sync -->
        <div style="background: rgba(56, 189, 248, 0.05); border: 1px solid rgba(56, 189, 248, 0.2); border-radius: 10px; padding: 14px 16px;">
          <div style="font-size: 0.78rem; font-weight: 800; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 8px;">
            🌐 Cakupan Penerapan Pengaturan
          </div>
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem;">
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="radio" name="setting_scope" value="class" checked style="accent-color: #38bdf8;">
              <span>Terapkan khusus untuk kelas ini: <strong>${escapeHtml(className)}</strong></span>
            </label>
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
              <input type="radio" name="setting_scope" value="global" style="accent-color: #38bdf8;">
              <span>Terapkan sebagai <strong>Default Global Sistem</strong> untuk seluruh kelas</span>
            </label>
          </div>

          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);">
            <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.8rem; cursor: pointer; color: #f8fafc;">
              <input type="checkbox" id="setting-apply-to-existing" checked style="margin-top: 3px; accent-color: #38bdf8;">
              <span><strong>Terapkan sekarang ke seluruh tes yang ada:</strong> Update otomatis kolom nilai minimum kelulusan pada semua Task dan Exam di kelas ini.</span>
            </label>
          </div>
        </div>

      </div>

      <!-- Modal Footer -->
      <div style="padding: 14px 20px; border-top: 1px solid rgba(255, 255, 255, 0.1); background: rgba(30, 41, 59, 0.5); display: flex; justify-content: flex-end; align-items: center; gap: 10px;">
        <button type="button" id="btn-cancel-settings" style="
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.15); color: #94a3b8;
          padding: 7px 14px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer;
        ">Batal</button>
        <button type="button" id="btn-save-settings" style="
          background: #0ea5e9; border: none; color: #fff;
          padding: 7px 18px; border-radius: 6px; font-size: 0.82rem; font-weight: 700; cursor: pointer;
          display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
        ">💾 Simpan Pengaturan</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Close handlers
  const closeModal = () => overlay.remove();
  overlay.querySelector('#btn-close-settings-modal').addEventListener('click', closeModal);
  overlay.querySelector('#btn-cancel-settings').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal();
  });

  // Save handler
  overlay.querySelector('#btn-save-settings').addEventListener('click', async () => {
    const taskRepetitions = parseInt(overlay.querySelector('#setting-task-repetitions').value, 10) || 7;
    const taskMinScore = parseInt(overlay.querySelector('#setting-task-min-score').value, 10) || 70;
    const examMinScore = parseInt(overlay.querySelector('#setting-exam-min-score').value, 10) || 60;
    const isGlobal = overlay.querySelector('input[name="setting_scope"]:checked').value === 'global';
    const applyToExisting = overlay.querySelector('#setting-apply-to-existing').checked;

    const saveBtn = overlay.querySelector('#btn-save-settings');
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ Menyimpan...';

    try {
      const res = await saveClassTestSettings(classId, {
        taskRepetitions,
        taskMinScore,
        examMinScore,
        isGlobal
      }, applyToExisting);

      showToast(`Pengaturan berhasil disimpan! Target repetisi: ${taskRepetitions}x, Task: ${taskMinScore}%, Exam: ${examMinScore}%`, 'success');
      overlay.remove();
      if (typeof onComplete === 'function') onComplete(res);
    } catch (err) {
      console.error('[openTestSystemSettingsModal] Save error:', err);
      showToast('Gagal menyimpan pengaturan: ' + err.message, 'error');
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Simpan Pengaturan';
    }
  });
}
