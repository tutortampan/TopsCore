import fs from 'fs';

let content = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');

// 1. Update thead of _renderVaultGrid
const oldGridThead = `          <thead style="background: #1e293b; position: sticky; top: 0; z-index: 20; border-bottom: 2px solid rgba(255, 255, 255, 0.12);">
            <tr>
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 68px; border-right: 1px solid rgba(255,255,255,0.08);" title="Institution">INST</th>
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 75px; border-right: 1px solid rgba(255,255,255,0.08);" title="Program">PROG</th>
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 55px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Level">LVL</th>
              <th style="padding: 6px 8px; font-weight: 800; color: #a5b4fc; text-transform: uppercase; font-size: 12px; width: 65px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Composite Code (Level + ThemeCode + TopicCode)">CODE</th>
              <th style="padding: 6px 8px; font-weight: 800; color: #38bdf8; text-transform: uppercase; font-size: 12px; width: 80px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Lexicon Coordinate Code (TopicCode-W01..Wnn / P01..Pnn)">LEX-CD</th>
              <th style="padding: 6px 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; min-width: 140px; border-right: 1px solid rgba(255,255,255,0.08);" title="Theme Name">THEME</th>
              <th style="padding: 6px 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; min-width: 160px; border-right: 1px solid rgba(255,255,255,0.08);" title="Topic Name">TOPIC</th>
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 85px; border-right: 1px solid rgba(255,255,255,0.08);" title="Word Type">TYPE</th>
              <th style="padding: 6px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 26%; min-width: 200px; border-right: 1px solid rgba(255,255,255,0.08);" title="Indonesian Meaning">INDONESIAN</th>
              <th style="padding: 6px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 26%; min-width: 200px; border-right: 1px solid rgba(255,255,255,0.08);" title="English Word / Phrase">ENGLISH</th>
              <th class="edit-mode-only" style="padding: 6px 8px; font-weight: 800; color: #f87171; text-transform: uppercase; font-size: 12px; text-align: center; width: 55px; position: sticky; right: 0; background: #1e293b; border-left: 1px solid rgba(255, 255, 255, 0.1); z-index: 25;" title="Actions">ACT</th>
            </tr>
          </thead>`;

const newGridThead = `          <thead style="background: #1e293b; position: sticky; top: 0; z-index: 20; border-bottom: 2px solid rgba(255, 255, 255, 0.12);">
            <tr>
              <th style="padding: 6px 8px; font-weight: 800; color: #38bdf8; text-transform: uppercase; font-size: 12px; width: 85px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Lexicon Coordinate Code (TopicCode-W01..Wnn / P01..Pnn)">LEX-CD</th>
              <th style="padding: 6px 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; min-width: 150px; border-right: 1px solid rgba(255,255,255,0.08);" title="Theme Name">THEME</th>
              <th style="padding: 6px 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; min-width: 180px; border-right: 1px solid rgba(255,255,255,0.08);" title="Topic Name">TOPIC</th>
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 80px; border-right: 1px solid rgba(255,255,255,0.08);" title="Word Type">TYPE</th>
              <th style="padding: 6px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 30%; min-width: 280px; border-right: 1px solid rgba(255,255,255,0.08);" title="Indonesian Meaning">INDONESIAN</th>
              <th style="padding: 6px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; width: 35%; min-width: 360px; border-right: 1px solid rgba(255,255,255,0.08);" title="English Word / Phrase">ENGLISH</th>
              <th class="edit-mode-only" style="padding: 6px 8px; font-weight: 800; color: #f87171; text-transform: uppercase; font-size: 12px; text-align: center; width: 55px; position: sticky; right: 0; background: #1e293b; border-left: 1px solid rgba(255, 255, 255, 0.1); z-index: 25;" title="Actions">ACT</th>
            </tr>
          </thead>`;

if (content.includes(oldGridThead)) {
  content = content.replace(oldGridThead, newGridThead);
  console.log('Successfully updated thead in _renderVaultGrid');
} else {
  console.error('Target oldGridThead not found!');
}

// 2. Update empty state colspan
content = content.replace(
  '<td colspan="11" style="text-align: center; padding: 30px; color: #64748b; font-size: 12px;">',
  '<td colspan="7" style="text-align: center; padding: 30px; color: #64748b; font-size: 12px;">'
);

// 3. Update tbody row template in _renderVaultGrid
const oldRowStart = `        <tr data-word-id="\${escapeHtml(w.id)}" style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <td style="padding: 6px 8px; font-weight: 600; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);"><span style="color: #38bdf8; font-weight: 700;">\${escapeHtml(w.institutions?.code || w.institution_code || 'CEC')}</span></td>
          <td style="padding: 6px 8px; font-weight: 600; font-size: 12px; border-right: 1px solid rgba(255,255,255,0.08);"><span style="color: #c084fc; font-weight: 700;">\${escapeHtml(w.programs?.name || w.program_name || 'Camp')}</span></td>
          <td class="editable-cell col-vault-lvl" style="padding: 6px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" style="color: #f8fafc; font-size: 12px; font-weight: 800; font-variant-numeric: tabular-nums;">\${escapeHtml(typeof toShortLevel === 'function' ? toShortLevel(cleanLvl) : cleanLvl)}</span>
            <input type="number" min="1" max="6" class="vault-edit-input" data-id="\${escapeHtml(w.id)}" data-field="target_level" value="\${cleanLvl}" style="text-align:center;">
          </td>
          <td class="editable-cell col-vault-composite-code" style="padding: 6px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">
            <span class="vault-cell-view" style="color:#a5b4fc;font-family:monospace;font-size:12px;font-weight:800;">\${escapeHtml(compositeCode)}</span>
            <input type="text" maxlength="8" class="vault-edit-input" data-id="\${escapeHtml(w.id)}" data-field="composite_code" value="\${escapeHtml(compositeCode)}" style="text-align:center;font-family:monospace;font-weight:700;text-transform:uppercase;">
          </td>
          <td class="col-vault-lexicon-code" style="padding: 6px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">`;

const newRowStart = `        <tr data-word-id="\${escapeHtml(w.id)}" style="border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
          <td class="col-vault-lexicon-code" style="padding: 6px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">`;

if (content.includes(oldRowStart)) {
  content = content.replace(oldRowStart, newRowStart);
  console.log('Successfully updated tbody row template in _renderVaultGrid');
} else {
  console.error('Target oldRowStart not found!');
}

// 4. Update Theme Manager Sub-Headers
const oldThemeHeaders = `              <!-- 3. THEME -->
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; max-width: 120px; border-right: 1px solid rgba(255,255,255,0.1);" title="Theme Name">THEME</th>
              <!-- 4. TP-CD -->
              <th style="padding: 6px 4px; font-weight: 800; color: #a5b4fc; text-transform: uppercase; font-size: 12px; width: 48px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Topic Number Code (e.g. 1, 2)">TP-CD</th>
              <!-- 5. TOPIC NAME -->
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; max-width: 130px; border-right: 1px solid rgba(255,255,255,0.08);" title="Topic Name">TOPIC NAME</th>
              <!-- 6. CODE -->
              <th style="padding: 6px 4px; font-weight: 800; color: #38bdf8; text-transform: uppercase; font-size: 12px; width: 50px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Composite Code (e.g. 1G1)">CODE</th>

              <!-- 7. VERB -->
              <th style="padding: 6px 2px; font-weight: 800; color: #93c5fd; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Verb Count">VERB</th>
              <!-- 8. NOUN -->
              <th style="padding: 6px 2px; font-weight: 800; color: #93c5fd; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Noun Count">NOUN</th>
              <!-- 9. ADJ -->
              <th style="padding: 6px 2px; font-weight: 800; color: #93c5fd; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Adjective Count">ADJ</th>
              <!-- 10. OTH -->
              <th style="padding: 6px 2px; font-weight: 800; color: #93c5fd; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Words Other (Adverbs, etc.)">OTH</th>

              <!-- 11. EXP -->
              <th style="padding: 6px 2px; font-weight: 800; color: #d8b4fe; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Expression Count">EXP</th>
              <!-- 12. PRV -->
              <th style="padding: 6px 2px; font-weight: 800; color: #d8b4fe; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Proverb Count">PRV</th>
              <!-- 13. IDM -->
              <th style="padding: 6px 2px; font-weight: 800; color: #d8b4fe; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Idiom Count">IDM</th>
              <!-- 14. OTH -->
              <th style="padding: 6px 2px; font-weight: 800; color: #d8b4fe; text-transform: uppercase; font-size: 12px; width: 40px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Phrases Other (Phrasal verbs, etc.)">OTH</th>`;

const newThemeHeaders = `              <!-- 3. THEME -->
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; min-width: 140px; border-right: 1px solid rgba(255,255,255,0.1);" title="Theme Name">THEME</th>
              <!-- 4. TP-CD -->
              <th style="padding: 6px 4px; font-weight: 800; color: #a5b4fc; text-transform: uppercase; font-size: 12px; width: 48px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Topic Number Code (e.g. 1, 2)">TP-CD</th>
              <!-- 5. TOPIC NAME -->
              <th style="padding: 6px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 12px; min-width: 240px; border-right: 1px solid rgba(255,255,255,0.08);" title="Topic Name">TOPIC NAME</th>
              <!-- 6. CODE -->
              <th style="padding: 6px 4px; font-weight: 800; color: #38bdf8; text-transform: uppercase; font-size: 12px; width: 50px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Composite Code (e.g. 1G1)">CODE</th>

              <!-- 7. VERB -->
              <th style="padding: 6px 2px; font-weight: 800; color: #93c5fd; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Verb Count">VERB</th>
              <!-- 8. NOUN -->
              <th style="padding: 6px 2px; font-weight: 800; color: #93c5fd; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Noun Count">NOUN</th>
              <!-- 9. ADJ -->
              <th style="padding: 6px 2px; font-weight: 800; color: #93c5fd; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Adjective Count">ADJ</th>
              <!-- 10. OTH -->
              <th style="padding: 6px 2px; font-weight: 800; color: #93c5fd; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Words Other (Adverbs, etc.)">OTH</th>

              <!-- 11. EXP -->
              <th style="padding: 6px 2px; font-weight: 800; color: #d8b4fe; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Expression Count">EXP</th>
              <!-- 12. PRV -->
              <th style="padding: 6px 2px; font-weight: 800; color: #d8b4fe; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Proverb Count">PRV</th>
              <!-- 13. IDM -->
              <th style="padding: 6px 2px; font-weight: 800; color: #d8b4fe; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Idiom Count">IDM</th>
              <!-- 14. OTH -->
              <th style="padding: 6px 2px; font-weight: 800; color: #d8b4fe; text-transform: uppercase; font-size: 12px; width: 30px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);" title="Phrases Other (Phrasal verbs, etc.)">OTH</th>`;

if (content.includes(oldThemeHeaders)) {
  content = content.replace(oldThemeHeaders, newThemeHeaders);
  console.log('Successfully updated sub-headers in _renderThemeManagerTab');
} else {
  console.error('Target oldThemeHeaders not found!');
}

fs.writeFileSync('js/admin/vocab-vault.js', content, 'utf8');
console.log('Saved all changes to js/admin/vocab-vault.js');

