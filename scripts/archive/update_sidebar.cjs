const fs = require('fs');

let html = fs.readFileSync('admin.html', 'utf8');

html = html.replace(
  '<div class="admin-nav-item" data-sub="institutions"><span class="nav-icon">&#127970;</span>Students & Batches</div>',
  '<div class="admin-nav-item" data-sub="institutions"><span class="nav-icon">&#127970;</span>Batches</div>\n          <div class="admin-nav-item" data-sub="students"><span class="nav-icon">&#128101;</span>Students</div>'
);

html = html.replace(
  '<div id="sidebar-classes-list" style="display:flex; flex-direction:column; gap:0;"></div>',
  ''
);

fs.writeFileSync('admin.html', html);

let app = fs.readFileSync('js/admin/app.js', 'utf8');
app = app.replace(
  "institutions: 'Batches', students: 'Students Roster'",
  "institutions: 'Batches', students: 'Students'"
);

const searchStr = `        case 'institutions':
            area.innerHTML = \`
              <div class="cpanel-tabs" style="display:flex; gap:1.5rem; border-bottom:1px solid var(--clr-border); margin-bottom:1.5rem; padding:0 1.5rem;">
                <button class="btn btn-sm btn-ghost" id="tab-batches">Batches Hierarchy</button>
                <button class="btn btn-sm btn-ghost" id="tab-students">All Students Roster</button>
                <button class="btn btn-sm btn-ghost" id="tab-import-students">Import Students</button>
              </div>
              <div id="tab-content-area"></div>
            \`;
            const btnBatches = area.querySelector('#tab-batches');
            const btnStudents = area.querySelector('#tab-students');
            const btnImportStudents = area.querySelector('#tab-import-students');
            const contentArea = area.querySelector('#tab-content-area');
            
            const activateTab = async (btn, renderFn) => {
               [btnBatches, btnStudents, btnImportStudents].forEach(b => {
                 if (b) {
                   b.style.borderBottom = 'none';
                   b.style.color = 'var(--clr-text-muted)';
                   b.style.fontWeight = '500';
                 }
               });
               if (btn) {
                 btn.style.borderBottom = '2px solid var(--clr-primary)';
                 btn.style.color = 'var(--clr-text-1)';
                 btn.style.fontWeight = '700';
               }
               contentArea.innerHTML = '<div class="spinner" style="margin:2rem auto;"></div>';
               await renderFn(contentArea);
            };
            
            btnBatches.addEventListener('click', () => activateTab(btnBatches, async (a) => {
                const mod = await import('./program-management.js');
                await mod.renderInstitutions(a);
            }));
            btnStudents.addEventListener('click', () => activateTab(btnStudents, async (a) => {
                await window._renderStudentsModule(a);
            }));
            btnImportStudents.addEventListener('click', () => activateTab(btnImportStudents, async (a) => {
                const mod = await import('./student-management.js');
                await mod.renderImportStudents(a);
            }));
            
            activateTab(btnBatches, async (a) => {
                const mod = await import('./program-management.js');
                await mod.renderInstitutions(a);
            });
            break;`;

const replaceStr = `        case 'institutions':
            const modProg = await import('./program-management.js');
            await modProg.renderInstitutions(area);
            break;`;

app = app.replace(searchStr, replaceStr);

const searchStr2 = `        case 'students':            await _renderStudentsModule(area); break;`;

const replaceStr2 = `        case 'students':
            area.innerHTML = \`
              <div class="cpanel-tabs" style="display:flex; gap:1.5rem; border-bottom:1px solid var(--clr-border); margin-bottom:1.5rem; padding:0 1.5rem;">
                <button class="btn btn-sm btn-ghost" id="tab-students">All Students Roster</button>
                <button class="btn btn-sm btn-ghost" id="tab-import-students">Import Students</button>
              </div>
              <div id="tab-content-area"></div>
            \`;
            const btnStudentsNew = area.querySelector('#tab-students');
            const btnImportStudentsNew = area.querySelector('#tab-import-students');
            const contentAreaNew = area.querySelector('#tab-content-area');
            
            const activateTabNew = async (btn, renderFn) => {
               [btnStudentsNew, btnImportStudentsNew].forEach(b => {
                 if (b) {
                   b.style.borderBottom = 'none';
                   b.style.color = 'var(--clr-text-muted)';
                   b.style.fontWeight = '500';
                 }
               });
               if (btn) {
                 btn.style.borderBottom = '2px solid var(--clr-primary)';
                 btn.style.color = 'var(--clr-text-1)';
                 btn.style.fontWeight = '700';
               }
               contentAreaNew.innerHTML = '<div class="spinner" style="margin:2rem auto;"></div>';
               await renderFn(contentAreaNew);
            };
            
            btnStudentsNew.addEventListener('click', () => activateTabNew(btnStudentsNew, async (a) => {
                await window._renderStudentsModule(a);
            }));
            btnImportStudentsNew.addEventListener('click', () => activateTabNew(btnImportStudentsNew, async (a) => {
                const mod = await import('./student-management.js');
                await mod.renderImportStudents(a);
            }));
            
            activateTabNew(btnStudentsNew, async (a) => {
                await window._renderStudentsModule(a);
            });
            break;`;

app = app.replace(searchStr2, replaceStr2);

fs.writeFileSync('js/admin/app.js', app);
console.log('Fixed app.js and admin.html successfully!');
