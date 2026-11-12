const fs = require('fs');

const checks = [
  { file: 'js/admin/auto-gen-modal.js', sels: ['#wizard-close-btn', '#wizard-cancel-btn', '#wizard-update-only-btn', '#wizard-generate-btn'] },
  { file: 'js/admin/class.js', sels: ['#close-topic-modal', '#cancel-topic-btn', '#save-topic-btn', '#close-q-modal', '#cancel-q-btn', '#save-q-btn'] },
  { file: 'js/admin/classes-management.js', sels: ['.inst-node', '.prog-node', '.cls-node'] },
  { file: 'js/admin/student-management.js', sels: ['#btn-close-prog-details', '#bulk-cancel', '#bulk-save-fields', '#bulk-activate', '#bulk-deactivate', '#bulk-delete', '#c-yes', '#c-no', '#btn-close-promo-req', '#btn-done-promo-req', '#tb-close', '#tb-cancel-btn', '#tb-save-btn', '#rl-close', '#rl-cancel-btn', '#rl-save-btn'] },
  { file: 'js/admin/test-system-settings-modal.js', sels: ['#btn-close-settings-modal', '#btn-cancel-settings', '#btn-save-settings'] },
  { file: 'js/admin/tests-access.js', sels: ['#btn-open-modal-select-all', '#btn-open-modal-deselect-all', '#btn-close-open-modal', '#btn-cancel-open-modal', '#btn-late-modal-select-all', '#btn-late-modal-deselect-all', '#btn-close-late-modal', '#btn-cancel-late-modal', '#btn-close-inspect-answers', '#btn-dismiss-inspect-answers', '#btn-close-live-modal', '#btn-close-live-modal-footer', '#btn-close-alarm-detail', '#btn-dismiss-alarm-detail'] },
  { file: 'js/admin/tests-management.js', sels: ['#tac-modal-close-btn', '#tac-modal-done-btn'] },
  { file: 'js/admin/vocab-vault.js', sels: ['#dup-modal-close', '#dup-modal-done', '#dup-topic-modal-close', '#dup-topic-modal-done'] }
];

const results = [];
for (const item of checks) {
  const content = fs.readFileSync(item.file, 'utf8');
  for (const sel of item.sels) {
    const rawId = sel.replace(/^[.#]/, '');
    const inId = content.includes('id="' + rawId + '"') || content.includes("id='" + rawId + "'") || content.includes('class="' + rawId + '"') || content.includes("class='" + rawId + "'");
    if (!inId) {
      results.push({ file: item.file, sel, status: 'NOT_FOUND_IN_FILE' });
    }
  }
}

console.log('Query selector verification results:');
if (results.length === 0) {
  console.log('ALL 53 querySelectors exist in their respective files!');
} else {
  console.log('Missing querySelectors:', results);
}
