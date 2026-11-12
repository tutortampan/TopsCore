import fs from 'fs';

let content = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');

const target = `        <div style="display: flex; gap: 3px; align-items: center; background: rgba(255,255,255,0.04); padding: 2px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
          <button type="button" class="btn-theme-curriculum-tab" data-lvl="ALL" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 10px; border-radius: 4px; cursor: pointer; border: none; \${activeLevel === 'ALL' ? 'background: #3b82f6; color: #ffffff;' : 'background: transparent; color: #94a3b8;'}">🎯 ALL (\${totalTopicsAll})</button>
          \${levels.map(lvl => {
            const isActive = (String(activeLevel) === String(lvl));
            const count = levelStats[lvl]?.topics || 0;
            const shortLbl = typeof toShortLevel === 'function' ? toShortLevel(lvl) : \`\${lvl}\`;
            return \`<button type="button" class="btn-theme-curriculum-tab" data-lvl="\${lvl}" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 10px; border-radius: 4px; cursor: pointer; border: none; \${isActive ? 'background: #3b82f6; color: #ffffff;' : 'background: transparent; color: #94a3b8;'};">\${shortLbl} (\${count})\`;
          }).join('')}
        </div>`;

// Check exact target around line 1792
const idx = content.indexOf('<button type="button" class="btn-theme-curriculum-tab" data-lvl="ALL"');
if (idx === -1) {
  console.error('Could not find btn-theme-curriculum-tab in vocab-vault.js');
  process.exit(1);
}

// Find the closing </div> of that level tabs group
const closeDivIdx = content.indexOf('</div>', idx);
const endIdx = closeDivIdx + 6;

const snippet = content.slice(idx - 130, endIdx);
console.log('Found level div snippet:\n' + snippet);

const progPillsCode = `

        <!-- Program Quick Filter Pills (Phase 432) -->
        <div style="display: flex; gap: 3px; align-items: center; background: rgba(255,255,255,0.04); padding: 2px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.08);">
          <button type="button" class="btn-theme-prog-tab" data-prog="ALL" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 8px; border-radius: 4px; cursor: pointer; border: none; \${(window._vaultActiveProgramFilter || 'ALL') === 'ALL' ? 'background: #00c000ff; color: #ffffff;' : 'background: transparent; color: #94a3b8;'}">PROG: ALL</button>
          \${(() => {
            const seen = new Set();
            const progs = [];
            allOrderedProgs.forEach(p => {
              if (p && p.name && !seen.has(p.name)) {
                seen.add(p.name);
                progs.push(p);
              }
            });
            const curP = window._vaultActiveProgramFilter || 'ALL';
            return progs.map(p => {
              const code = (p.code || p.name).toUpperCase().slice(0, 4);
              const isPActive = (curP === p.id || curP === p.name || curP === code);
              return \`<button type="button" class="btn-theme-prog-tab" data-prog="\${escapeHtml(p.name)}" style="height: 28px; font-size: 11px; font-weight: 800; padding: 0 8px; border-radius: 4px; cursor: pointer; border: none; \${isPActive ? 'background: #00c000ff; color: #ffffff;' : 'background: transparent; color: #94a3b8;'}">\${escapeHtml(code)}</button>\`;
            }).join('');
          })()}
        </div>`;

const updatedContent = content.slice(0, endIdx) + progPillsCode + content.slice(endIdx);
fs.writeFileSync('js/admin/vocab-vault.js', updatedContent, 'utf8');
console.log('Successfully inserted Program Filter Pills into syncThemeManagerBottomBar');
