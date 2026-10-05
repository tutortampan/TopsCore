export async function openAutoGenerateModal(options = {}) {
  const { fetchInstitutions, fetchPrograms, autoGenerateAssessmentsHierarchy } = await import('../api.js?v=4.7.6');
  const { availableLevels = [], preSelectedLevels = [], explicitClassId = null, onComplete = null } = options;

  // Show loading while fetching programs
  const loading = document.createElement('div');
  loading.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;color:white;';
  
  // Inject keyframes for spinner if not exists
  if (!document.getElementById('spinner-style')) {
     const style = document.createElement('style');
     style.id = 'spinner-style';
     style.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
     document.head.appendChild(style);
  }
  
  loading.innerHTML = '<div class="spinner" style="width:24px;height:24px;border:3px solid rgba(255,255,255,0.3);border-radius:50%;border-top-color:#fff;animation:spin 1s ease-in-out infinite;"></div>';
  document.body.appendChild(loading);

  try {
    const institutions = await fetchInstitutions();
    if (!institutions.length) throw new Error('No institutions found.');
    const instId = institutions[0].id; 
    const programs = await fetchPrograms(instId);
    if (!programs.length) throw new Error('No programs found.');

    loading.remove();

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;';
    
    // Fallback to basic levels if none provided
    const displayLevels = availableLevels.length ? availableLevels : [0, 1, 2, 3];
    
    overlay.innerHTML = `
      <div style="background:var(--clr-bg-2, #1e293b);padding:2rem;border-radius:12px;width:400px;max-width:90%;color:#f8fafc;border:1px solid #334155;box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <h3 style="margin-top:0;font-size:18px;font-weight:700;color:#f8fafc;margin-bottom:8px;">Auto-Generate Assessments</h3>
        <p style="color:#94a3b8;font-size:13px;margin-bottom:16px;line-height:1.4;">Re-build Assessment Hierarchy (Tasks &rarr; Tests) using words currently in the Vault.</p>
        
        <label style="display:block;margin-bottom:0.5rem;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Select Levels to Generate:</label>
        <div style="max-height:150px;overflow-y:auto;border:1px solid #334155;padding:0.5rem;margin-bottom:1rem;border-radius:6px;background:#0f172a;">
          ${displayLevels.map(lvl => `
            <label style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem;font-size:14px;cursor:pointer;color:#e2e8f0;">
              <input type="checkbox" class="autogen-level-chk" value="${lvl}" ${preSelectedLevels.includes(lvl) || preSelectedLevels.length === 0 ? 'checked' : ''}> Level ${lvl}
            </label>
          `).join('')}
        </div>
        
        <label style="display:block;margin-bottom:0.5rem;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#94a3b8;">Select Program (Target for Gating):</label>
        <select id="auto-gen-prog-select" style="width:100%;padding:0.6rem;margin-bottom:1.5rem;background:#0f172a;color:#f8fafc;border:1px solid #334155;border-radius:6px;font-size:14px;outline:none;">
          ${programs.map(p => `<option value="${p.id}" ${window.currentProgId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
        </select>
        
        <div style="display:flex;justify-content:flex-end;gap:12px;">
          <button id="auto-gen-cancel" style="background:transparent;color:#94a3b8;border:1px solid #475569;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;" onmouseover="this.style.background='#334155'" onmouseout="this.style.background='transparent'">Cancel</button>
          <button id="auto-gen-confirm" style="background:#4f46e5;color:white;border:none;padding:6px 16px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;transition:all 0.2s;" onmouseover="this.style.background='#4338ca'" onmouseout="this.style.background='#4f46e5'">Generate</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    const cancelBtn = overlay.querySelector('#auto-gen-cancel');
    const confirmBtn = overlay.querySelector('#auto-gen-confirm');
    
    cancelBtn.onclick = () => overlay.remove();
    confirmBtn.onclick = async () => {
      const progId = overlay.querySelector('#auto-gen-prog-select').value;
      const selectedLevels = Array.from(overlay.querySelectorAll('.autogen-level-chk:checked')).map(cb => parseInt(cb.value, 10));
      
      if (selectedLevels.length === 0) {
        if (window.showToast) window.showToast('Please select at least one level.', 'error');
        else alert('Please select at least one level.');
        return;
      }
      
      overlay.innerHTML = `<div style="color:white;text-align:center;font-family:Inter,sans-serif;"><div class="spinner" style="margin:0 auto 1rem;width:32px;height:32px;border:3px solid rgba(255,255,255,0.3);border-radius:50%;border-top-color:#fff;animation:spin 1s ease-in-out infinite;"></div><h3 style="margin-top:0;">Generating Assessments</h3><p style="color:#94a3b8;font-size:14px;">Please wait while the hierarchy for Level(s) ${selectedLevels.join(', ')} is generated...</p></div>`;
      
      try {
         const res = await autoGenerateAssessmentsHierarchy(selectedLevels, { programId: progId, explicitClassId, category: options.category });
         overlay.remove();
         if (window.showToast) window.showToast(`Auto-Gen Success: ${res.tasks} Tasks, ${res.tests} Tests created (${res.updated} updated)!`, 'success');
         else alert(`Auto-Gen Success: ${res.tasks} Tasks, ${res.tests} Tests created (${res.updated} updated)!`);
         
         if (onComplete) onComplete(res);
      } catch(err) {
         overlay.remove();
         console.error(err);
         if (window.showToast) window.showToast('Auto-Generate Failed: ' + err.message, 'error');
         else alert('Auto-Generate Failed: ' + err.message);
      }
    };
    
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  } catch (err) {
    if (loading.parentNode) loading.remove();
    console.error(err);
    if (window.showToast) window.showToast(err.message, 'error');
    else alert(err.message);
  }
}
