const fs = require('fs');
let c = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');

c = c.replace(/<td style="padding: 6px 12px; font-weight: 600;"><span style="background:#475569;color:#e2e8f0;font-size:10px;padding:2px 6px;border-radius:4px;">\$\{escapeHtml\(String\(w\.target_level \|\| '1'\)\)\}<\/span><\/td>/g,
              '<td class="cell-level" style="padding: 6px 12px; font-weight: 600;"><span style="background:#475569;color:#e2e8f0;font-size:10px;padding:2px 6px;border-radius:4px;">${escapeHtml(String(w.target_level || \'1\'))}</span></td>');

c = c.replace(/<td style="padding: 6px 12px; font-weight: 500;"><span style="color:#f472b6;font-family:monospace;letter-spacing:0\.5px;font-size:11px;font-weight:700;">\$\{escapeHtml\(w\.theme_code \|\| '—'\)\}<\/span><\/td>/g,
              '<td class="cell-theme-code" style="padding: 6px 12px; font-weight: 500;"><span style="color:#f472b6;font-family:monospace;letter-spacing:0.5px;font-size:11px;font-weight:700;">${escapeHtml(w.theme_code || \'—\')}</span></td>');

c = c.replace(/<td style="padding: 6px 12px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="\$\{escapeHtml\(w\.theme \|\| '—'\)\}">\$\{escapeHtml\(w\.theme \|\| '—'\)\}<\/td>/g,
              '<td class="cell-theme" style="padding: 6px 12px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="${escapeHtml(w.theme || \'—\')}">${escapeHtml(w.theme || \'—\')}</td>');

c = c.replace(/<td style="padding: 6px 12px; font-weight: 500;"><span style="color:#a5b4fc;font-family:monospace;letter-spacing:0\.5px;font-size:11px;font-weight:700;">\$\{escapeHtml\(w\.topic_code \|\| '—'\)\}<\/span><\/td>/g,
              '<td class="cell-topic-code" style="padding: 6px 12px; font-weight: 500;"><span style="color:#a5b4fc;font-family:monospace;letter-spacing:0.5px;font-size:11px;font-weight:700;">${escapeHtml(w.topic_code || \'—\')}</span></td>');

c = c.replace(/<td style="padding: 6px 12px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;" title="\$\{escapeHtml\(w\.topic\)\}">\$\{escapeHtml\(w\.topic\)\}<\/td>/g,
              '<td class="cell-topic" style="padding: 6px 12px; color: #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;" title="${escapeHtml(w.topic)}">${escapeHtml(w.topic)}</td>');

c = c.replace(/<td style="padding: 6px 12px;">\s*<span style="font-size:10px; padding: 2px 6px; border-radius: 4px; background: \$\{typeColor\}20; color: \$\{typeColor\}; border: 1px solid \$\{typeColor\}40; display: inline-block; text-transform: capitalize; font-weight: 600;">\$\{escapeHtml\(w\.word_type \|\| 'Vocab'\)\}<\/span>\s*<\/td>/g,
              '<td class="cell-wordtype" style="padding: 6px 12px;">\n          <span style="font-size:10px; padding: 2px 6px; border-radius: 4px; background: ${typeColor}20; color: ${typeColor}; border: 1px solid ${typeColor}40; display: inline-block; text-transform: capitalize; font-weight: 600;">${escapeHtml(w.word_type || \'Vocab\')}</span>\n        </td>');

c = c.replace(/<td style="padding: 6px 12px; font-weight: 700; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="\$\{escapeHtml\(w\.indonesian\)\}">\$\{escapeHtml\(w\.indonesian\)\}<\/td>/g,
              '<td class="cell-indonesian" style="padding: 6px 12px; font-weight: 700; color: #f8fafc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="${escapeHtml(w.indonesian)}">${escapeHtml(w.indonesian)}</td>');

c = c.replace(/<td style="padding: 6px 12px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="\$\{escapeHtml\(w\.english\)\}">\$\{escapeHtml\(w\.english\)\}<\/td>/g,
              '<td class="cell-english" style="padding: 6px 12px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 250px;" title="${escapeHtml(w.english)}">${escapeHtml(w.english)}</td>');

// Wait! When saving, does it pass target_level to updateVaultWord?
// No, the edit handler does not read the level when saving!
c = c.replace(/const newType = tr\.querySelector\('\.edit-type'\)\.value;/,
              "const newType = tr.querySelector('.edit-type').value;\n          const newLevel = parseInt(tr.querySelector('.edit-level')?.value || '1', 10);");

c = c.replace(/updateVaultWord\(id, {([\s\S]*?)word_type: newType([\s\S]*?)\}\)\.then\(\(\) => \{([\s\S]*?)word\.word_type = newType;/g,
              "updateVaultWord(id, {$1word_type: newType,$2 target_level: newLevel}).then(() => {$3word.word_type = newType; word.target_level = newLevel;");

fs.writeFileSync('js/admin/vocab-vault.js', c);
console.log('Fixed vocab vault edit cells');
