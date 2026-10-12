const fs = require('fs');
let code = fs.readFileSync('d:/TopsCore/js/admin/assessment-management.js', 'utf8');

const targetStr = `    customBulkActions: [
      {
        label: 'Publish Selected',
        onClick: async (ids) => {
          if (!confirm(\`Publish \${ids.length} selected assessments?\`)) return;
          try {
            for (const id of ids) await adminUpdate('assessments', id, { status: 'PUBLISHED' });
            if (window.showToast) window.showToast(\`Published \${ids.length} assessments\`, 'success');
            window.loadSection('assessments');
          } catch (e) {
            if (window.showToast) window.showToast('Error publishing: ' + e.message, 'error');
          }
        }
      },
      {
        label: 'Unpublish Selected',
        onClick: async (ids) => {
          if (!confirm(\`Unpublish \${ids.length} selected assessments?\`)) return;
          try {
            for (const id of ids) await adminUpdate('assessments', id, { status: 'DRAFT' });
            if (window.showToast) window.showToast(\`Unpublished \${ids.length} assessments\`, 'success');
            window.loadSection('assessments');
          } catch (e) {
            if (window.showToast) window.showToast('Error unpublishing: ' + e.message, 'error');
          }
        }
      }
    ],`;

const replaceStr = `    customBulkActions: [
      {
        label: 'Publish Selected',
        onClick: async (ids) => {
          if (!confirm(\`Publish \${ids.length} selected assessments?\`)) return;
          try {
            for (const id of ids) await adminUpdate('assessments', id, { status: 'PUBLISHED' });
            if (window.showToast) window.showToast(\`Published \${ids.length} assessments\`, 'success');
            window.loadSection('assessments');
          } catch (e) {
            if (window.showToast) window.showToast('Error publishing: ' + e.message, 'error');
          }
        }
      },
      {
        label: 'Unpublish Selected',
        onClick: async (ids) => {
          if (!confirm(\`Unpublish \${ids.length} selected assessments?\`)) return;
          try {
            for (const id of ids) await adminUpdate('assessments', id, { status: 'DRAFT' });
            if (window.showToast) window.showToast(\`Unpublished \${ids.length} assessments\`, 'success');
            window.loadSection('assessments');
          } catch (e) {
            if (window.showToast) window.showToast('Error unpublishing: ' + e.message, 'error');
          }
        }
      },
      {
        label: 'Delete Selected',
        onClick: async (ids) => {
          if (!confirm(\`Are you sure you want to PERMANENTLY delete \${ids.length} selected assessments?\`)) return;
          try {
            for (const id of ids) await adminSoftDelete('assessments', id);
            if (window.showToast) window.showToast(\`Deleted \${ids.length} assessments\`, 'success');
            window.loadSection('assessments');
          } catch (e) {
            if (window.showToast) window.showToast('Error deleting: ' + e.message, 'error');
          }
        }
      }
    ],`;

code = code.replace(targetStr, replaceStr);

const oldOnBulkAction = `    onBulkAction: async (selectedIds) => {
      const action = prompt(\`Bulk Action for \${selectedIds.length} Assessments.\\nOptions: delete\`);
      if (action === 'delete') {
        if (confirm(\`Are you sure you want to permanently soft-delete \${selectedIds.length} Assessments?\`)) {
          for (const id of selectedIds) {
            await adminSoftDelete('Assessments', id);
          }
          showToast(\`Deleted \${selectedIds.length} Assessments.\`, 'success');
          renderAssessments(area);
        }
      }
    },`;
code = code.replace(oldOnBulkAction, "");

fs.writeFileSync('d:/TopsCore/js/admin/assessment-management.js', code);
console.log("Patched bulk actions.");
