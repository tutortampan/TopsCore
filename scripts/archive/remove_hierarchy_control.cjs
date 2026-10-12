const fs = require('fs');
let js = fs.readFileSync('js/admin/program-management.js', 'utf8');

const targetStr = `    <!-- Master Action Ribbon -->
    <div class="card p-3 mb-4 d-flex justify-between align-center" style="background: var(--clr-surface-alt); border: 1px solid var(--clr-border);">
       <div>
          <h3 style="margin: 0; color: var(--clr-text-1);">Hierarchy Control</h3>
          <div class="text-xs text-muted mt-1">Manage global architecture entities</div>
       </div>
       <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-secondary btn-sm" onclick="if (window.openCrudModal) window.openCrudModal('institutions', null); else window._addRecord('institutions');">➕ Add Institution</button>
          <button class="btn btn-secondary btn-sm" onclick="if (window.openCrudModal) window.openCrudModal('programs', null); else window._addRecord('programs');">➕ Add Program</button>
          <button class="btn btn-secondary btn-sm" onclick="if (window.openCrudModal) window.openCrudModal('levels', null); else window._addRecord('levels');">➕ Add Level</button>
          <button class="btn btn-secondary btn-sm" onclick="if (window.openCrudModal) window.openCrudModal('classes', null); else window._addRecord('classes');">➕ Add Class</button>
          <button class="btn btn-primary btn-sm" onclick="if (window.openCrudModal) window.openCrudModal('batches', null); else window._addRecord('batches');">➕ Add Batch</button>
       </div>
    </div>`;

if (js.includes(targetStr)) {
  js = js.replace(targetStr, '');
  fs.writeFileSync('js/admin/program-management.js', js);
  console.log('Successfully removed Hierarchy Control');
} else {
  console.log('Hierarchy Control not found');
}
