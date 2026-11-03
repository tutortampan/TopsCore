// scripts/patch_unified_code_and_pagination.mjs
// 1. Adds automated chunked pagination to fetchVaultWords in js/api.js so all 1,410+ rows load completely.
// 2. Removes redundant T.CODE / THEME CODE columns in js/admin/vocab-vault.js.
// 3. Establishes single unified CODE column across table grid and blueprint.
// 4. Updates question generator candidates in js/api.js.

import fs from 'fs';

console.log('--- STARTING UNIFIED CODE & PAGINATION PATCHES ---');

// ============================================================
// 1. PATCH js/api.js: fetchVaultWords with automated chunking
// ============================================================
let apiCode = fs.readFileSync('js/api.js', 'utf8').replace(/\r\n/g, '\n');

const oldFetchVaultWords = `export async function fetchVaultWords({ topic = null, search = null, targetLevel = null, limit = 2500, offset = 0 } = {}) {
  const sb = await getSupabase();
  let query = sb.from('vocabulary_vault')
    .select('id, topic, indonesian, english, word_type, target_level, theme, theme_code, topic_code, category, institution_id, program_id, institutions(id, name, code), programs(id, name, code)')
    .is('deleted_at', null)
    .order('target_level', { ascending: true })
    .order('theme_code', { ascending: true })
    .order('topic_code', { ascending: true })
    .order('word_type', { ascending: true })
    .order('indonesian', { ascending: true })
    .range(offset, offset + limit - 1);

  if (targetLevel !== null) query = query.eq('target_level', targetLevel);
  if (topic) query = query.eq('topic', topic);
  if (search) {
    const term = search.trim();
    query = query.or(\`indonesian.ilike.%\${term}%,english.ilike.%\${term}%,topic.ilike.%\${term}%\`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}`;

const newFetchVaultWords = `export async function fetchVaultWords({ topic = null, search = null, targetLevel = null, limit = 10000, offset = 0 } = {}) {
  const sb = await getSupabase();
  const PAGE_SIZE = 1000;
  let allData = [];
  let curOffset = offset;
  const maxToFetch = limit || 10000;

  while (allData.length < maxToFetch) {
    const chunkLimit = Math.min(PAGE_SIZE, maxToFetch - allData.length);
    let query = sb.from('vocabulary_vault')
      .select('id, topic, indonesian, english, word_type, target_level, theme, theme_code, topic_code, category, institution_id, program_id, institutions(id, name, code), programs(id, name, code)')
      .is('deleted_at', null)
      .order('target_level', { ascending: true })
      .order('theme_code', { ascending: true })
      .order('topic_code', { ascending: true })
      .order('word_type', { ascending: true })
      .order('indonesian', { ascending: true })
      .range(curOffset, curOffset + chunkLimit - 1);

    if (targetLevel !== null) query = query.eq('target_level', targetLevel);
    if (topic) query = query.eq('topic', topic);
    if (search) {
      const term = search.trim();
      query = query.or(\`indonesian.ilike.%\${term}%,english.ilike.%\${term}%,topic.ilike.%\${term}%\`);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData.push(...data);
    if (data.length < chunkLimit) break;
    curOffset += data.length;
  }

  return allData;
}`;

if (apiCode.includes(oldFetchVaultWords)) {
  apiCode = apiCode.replace(oldFetchVaultWords, newFetchVaultWords);
  console.log('✓ Patched fetchVaultWords with automated chunked pagination in js/api.js');
} else {
  console.warn('⚠️ Could not find exact oldFetchVaultWords in js/api.js');
}

// Resilient topicCode candidates in generateTestQuestions
const oldTopicQuery1 = `        if (themeCode) query = query.eq('theme_code', themeCode);
        if (topicCode) query = query.eq('topic_code', topicCode);`;

const newTopicQuery1 = `        if (themeCode) query = query.eq('theme_code', themeCode);
        if (topicCode) {
          const candidateCodes = [
            String(topicCode).toUpperCase(),
            (/^[0-9]+$/.test(String(topicCode)) && themeCode) ? \`\${String(themeCode).toUpperCase()}\${topicCode}\` : null,
            String(topicCode).replace(/^[A-Za-z]/, '')
          ].filter(Boolean);
          query = query.in('topic_code', candidateCodes);
        }`;

if (apiCode.includes(oldTopicQuery1)) {
  apiCode = apiCode.replace(oldTopicQuery1, newTopicQuery1);
  console.log('✓ Patched topic candidate codes in generateTestQuestions (query 1)');
}

const oldTopicQuery2 = `        if (themeCode) queryNoCat = queryNoCat.eq('theme_code', themeCode);
        if (topicCode) queryNoCat = queryNoCat.eq('topic_code', topicCode);`;

const newTopicQuery2 = `        if (themeCode) queryNoCat = queryNoCat.eq('theme_code', themeCode);
        if (topicCode) {
          const candidateCodes = [
            String(topicCode).toUpperCase(),
            (/^[0-9]+$/.test(String(topicCode)) && themeCode) ? \`\${String(themeCode).toUpperCase()}\${topicCode}\` : null,
            String(topicCode).replace(/^[A-Za-z]/, '')
          ].filter(Boolean);
          queryNoCat = queryNoCat.in('topic_code', candidateCodes);
        }`;

if (apiCode.includes(oldTopicQuery2)) {
  apiCode = apiCode.replace(oldTopicQuery2, newTopicQuery2);
  console.log('✓ Patched topic candidate codes in generateTestQuestions (queryNoCat)');
}

fs.writeFileSync('js/api.js', apiCode, 'utf8');

// ============================================================
// 2. PATCH js/admin/vocab-vault.js: Remove T.CODE & THEME CODE
// ============================================================
let vaultCode = fs.readFileSync('js/admin/vocab-vault.js', 'utf8').replace(/\r\n/g, '\n');

// A. Table header in _renderVaultGrid
const oldGridThead = `                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 68px; line-height: 1.2;">Institution</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 68px; line-height: 1.2;">Program</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 75px; line-height: 1.2;">Level</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 55px; line-height: 1.2;">T.Code</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; line-height: 1.2;">Theme</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 70px; line-height: 1.2;">Topic Code</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; line-height: 1.2;">Topic</th>`;

const newGridThead = `                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 68px; line-height: 1.2;">Institution</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 68px; line-height: 1.2;">Program</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 75px; line-height: 1.2;">Level</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; width: 60px; line-height: 1.2;">Code</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; line-height: 1.2;">Theme</th>
                <th style="padding: 4px 8px; font-weight: 700; color: #ffffff; text-transform: uppercase; letter-spacing: 0.5px; font-size: 10px; line-height: 1.2;">Topic</th>`;

if (vaultCode.includes(oldGridThead)) {
  vaultCode = vaultCode.replace(oldGridThead, newGridThead);
  console.log('✓ Patched table header (removed T.Code, set single Code) in js/admin/vocab-vault.js');
}

// B. Table row in _renderVaultGrid
const oldGridRow = `        <td class="cell-institution" style="padding: 6px 8px; font-weight: 600;"><span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; border: 1px solid rgba(56, 189, 248, 0.35); display: inline-block;">\${escapeHtml(w.institutions?.code || w.institution_code || w.institutions?.name || 'CEC')}</span></td>
        <td class="cell-program" style="padding: 6px 8px; font-weight: 600;"><span style="background: rgba(168, 85, 247, 0.15); color: #c084fc; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; border: 1px solid rgba(168, 85, 247, 0.35); display: inline-block;">\${escapeHtml(w.programs?.name || w.program_name || 'Camp')}</span></td>
        <td class="cell-level" style="padding: 6px 8px; font-weight: 600;"><span style="background: #334155; color: #f8fafc; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.15); display: inline-block; white-space: nowrap;">\${escapeHtml(typeof toShortLevel === 'function' ? toShortLevel(w.target_level) : (typeof toOrdinalLevel === 'function' ? toOrdinalLevel(w.target_level, true) : (w.target_level || '1st')))}</span></td>
        <td class="cell-theme-code" style="padding: 6px 12px; font-weight: 500;"><span style="color:#f472b6;font-family:monospace;letter-spacing:0.5px;font-size:11px;font-weight:700;">\${escapeHtml(w.theme_code || '—')}</span></td>
        <td class="cell-theme" style="padding: 6px 12px; color: #ffffff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="\${escapeHtml(w.theme || '—')}">\${escapeHtml(w.theme || '—')}</td>
        <td class="cell-topic-code" style="padding: 6px 12px; font-weight: 500;"><span style="color:#a5b4fc;font-family:monospace;letter-spacing:0.5px;font-size:11px;font-weight:700;">\${escapeHtml(w.topic_code || '—')}</span></td>
        <td class="cell-topic" style="padding: 6px 12px; color: #ffffff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;" title="\${escapeHtml(w.topic)}">\${escapeHtml(w.topic)}</td>`;

const newGridRow = `        <td class="cell-institution" style="padding: 6px 8px; font-weight: 600;"><span style="background: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; border: 1px solid rgba(56, 189, 248, 0.35); display: inline-block;">\${escapeHtml(w.institutions?.code || w.institution_code || w.institutions?.name || 'CEC')}</span></td>
        <td class="cell-program" style="padding: 6px 8px; font-weight: 600;"><span style="background: rgba(168, 85, 247, 0.15); color: #c084fc; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; border: 1px solid rgba(168, 85, 247, 0.35); display: inline-block;">\${escapeHtml(w.programs?.name || w.program_name || 'Camp')}</span></td>
        <td class="cell-level" style="padding: 6px 8px; font-weight: 600;"><span style="background: #334155; color: #f8fafc; font-size: 10px; padding: 2px 6px; border-radius: 4px; font-weight: 700; border: 1px solid rgba(255, 255, 255, 0.15); display: inline-block; white-space: nowrap;">\${escapeHtml(typeof toShortLevel === 'function' ? toShortLevel(w.target_level) : (typeof toOrdinalLevel === 'function' ? toOrdinalLevel(w.target_level, true) : (w.target_level || '1st')))}</span></td>
        <td class="cell-code" style="padding: 6px 12px; font-weight: 500;"><span style="color:#a5b4fc;font-family:monospace;letter-spacing:0.5px;font-size:11px;font-weight:700;">\${escapeHtml(w.topic_code || '—')}</span></td>
        <td class="cell-theme" style="padding: 6px 12px; color: #ffffff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;" title="\${escapeHtml(w.theme || '—')}">\${escapeHtml(w.theme || '—')}</td>
        <td class="cell-topic" style="padding: 6px 12px; color: #ffffff; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;" title="\${escapeHtml(w.topic)}">\${escapeHtml(w.topic)}</td>`;

if (vaultCode.includes(oldGridRow)) {
  vaultCode = vaultCode.replace(oldGridRow, newGridRow);
  console.log('✓ Patched table row (removed cell-theme-code, unified cell-code) in js/admin/vocab-vault.js');
}

// C. Inline edit inputs & save handler
const oldInlineEditLogic = `        if (isEditing) {
          const newLevel = parseInt(tr.querySelector('.edit-level').value, 10) || 1;
          const newThemeCode = tr.querySelector('.edit-theme-code').value.trim();
          const newTheme = tr.querySelector('.edit-theme').value.trim();
          const newTopicCode = tr.querySelector('.edit-topic-code').value.trim();
          const newTopic = tr.querySelector('.edit-topic').value.trim();
          const newIndo = tr.querySelector('.edit-indo').value.trim();
          const newEng = tr.querySelector('.edit-eng').value.trim();
          const newType = tr.querySelector('.edit-type').value;

          if (!newTopic || !newIndo || !newEng) return showToast('Please fill all required fields.', 'error');

          btn.innerHTML = '&#8987;'; // wait
          btn.disabled = true;

          // Normalize topic_code and theme_code on edit save
          let finalTopicCode = (newTopicCode || '').trim().toUpperCase();
          let finalThemeCode = (newThemeCode || '').trim().toUpperCase();
          if (/^[A-Z][0-9]+$/.test(finalTopicCode)) {
            if (!finalThemeCode) finalThemeCode = finalTopicCode[0];
          } else if (/^[0-9]+$/.test(finalTopicCode) && finalThemeCode) {
            finalTopicCode = \`\${finalThemeCode}\${finalTopicCode}\`;
          }

          updateVaultWord(id, {
            theme_code: finalThemeCode || null,
            theme: newTheme || null,
            topic_code: finalTopicCode || null,
            topic: newTopic,
            indonesian: newIndo,
            english: newEng,
            word_type: newType,
            target_level: newLevel
          }).then(() => {
            showToast('Word updated successfully.', 'success');
            word.theme_code = newThemeCode || null;
            word.theme = newTheme || null;
            word.topic_code = finalTopicCode || null; word.theme_code = finalThemeCode || word.theme_code;
            word.topic = newTopic;
            word.indonesian = newIndo;
            word.english = newEng;
            word.word_type = newType; word.target_level = newLevel;
            filterAndRender();
          }).catch(e => {
            showToast('Update failed: ' + e.message, 'error');
            filterAndRender(); // reset
          });
        } else {
          // Enter edit mode
          tr.classList.add('editing');
          tr.querySelector('.cell-level').innerHTML = '<input type="number" class="input edit-level" style="width: 100%; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.target_level || '1') + '">';
          tr.querySelector('.cell-theme-code').innerHTML = '<input type="text" class="input edit-theme-code" style="width: 100%; padding: 2px 4px; font-size: 0.75rem; font-family: monospace; text-transform: uppercase;" value="' + escapeHtml(word.theme_code || '') + '" placeholder="e.g. T1">';
          tr.querySelector('.cell-theme').innerHTML = '<input type="text" class="input edit-theme" style="width: 100%; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.theme || '') + '" placeholder="Theme name">';
          tr.querySelector('.cell-topic-code').innerHTML = '<input type="text" class="input edit-topic-code" style="width: 100%; padding: 2px 4px; font-size: 0.75rem; font-family: monospace; text-transform: uppercase;" value="' + escapeHtml(word.topic_code || '') + '" placeholder="e.g. A1">';
          tr.querySelector('.cell-topic').innerHTML = '<input type="text" class="input edit-topic" style="width: 100%; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.topic) + '" placeholder="Topic name">';`;

const newInlineEditLogic = `        if (isEditing) {
          const newLevel = parseInt(tr.querySelector('.edit-level').value, 10) || 1;
          const newCode = (tr.querySelector('.edit-code')?.value || '').trim().toUpperCase();
          const newTheme = tr.querySelector('.edit-theme').value.trim();
          const newTopic = tr.querySelector('.edit-topic').value.trim();
          const newIndo = tr.querySelector('.edit-indo').value.trim();
          const newEng = tr.querySelector('.edit-eng').value.trim();
          const newType = tr.querySelector('.edit-type').value;

          if (!newTopic || !newIndo || !newEng) return showToast('Please fill all required fields.', 'error');

          btn.innerHTML = '&#8987;'; // wait
          btn.disabled = true;

          // Normalize topic_code and theme_code on edit save
          let finalTopicCode = newCode;
          let finalThemeCode = word.theme_code || 'A';
          if (/^[A-Z][0-9]+$/.test(finalTopicCode)) {
            finalThemeCode = finalTopicCode[0];
          } else if (/^[0-9]+$/.test(finalTopicCode)) {
            finalTopicCode = \`\${finalThemeCode}\${finalTopicCode}\`;
          }

          updateVaultWord(id, {
            theme_code: finalThemeCode || null,
            theme: newTheme || null,
            topic_code: finalTopicCode || null,
            topic: newTopic,
            indonesian: newIndo,
            english: newEng,
            word_type: newType,
            target_level: newLevel
          }).then(() => {
            showToast('Word updated successfully.', 'success');
            word.theme_code = finalThemeCode;
            word.theme = newTheme || null;
            word.topic_code = finalTopicCode || null;
            word.topic = newTopic;
            word.indonesian = newIndo;
            word.english = newEng;
            word.word_type = newType; word.target_level = newLevel;
            filterAndRender();
          }).catch(e => {
            showToast('Update failed: ' + e.message, 'error');
            filterAndRender(); // reset
          });
        } else {
          // Enter edit mode
          tr.classList.add('editing');
          tr.querySelector('.cell-level').innerHTML = '<input type="number" class="input edit-level" style="width: 100%; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.target_level || '1') + '">';
          tr.querySelector('.cell-code').innerHTML = '<input type="text" class="input edit-code" style="width: 100%; padding: 2px 4px; font-size: 0.75rem; font-family: monospace; text-transform: uppercase;" value="' + escapeHtml(word.topic_code || '') + '" placeholder="e.g. A1">';
          tr.querySelector('.cell-theme').innerHTML = '<input type="text" class="input edit-theme" style="width: 100%; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.theme || '') + '" placeholder="Theme name">';
          tr.querySelector('.cell-topic').innerHTML = '<input type="text" class="input edit-topic" style="width: 100%; padding: 2px 4px; font-size: 0.8rem;" value="' + escapeHtml(word.topic) + '" placeholder="Topic name">';`;

if (vaultCode.includes(oldInlineEditLogic)) {
  vaultCode = vaultCode.replace(oldInlineEditLogic, newInlineEditLogic);
  console.log('✓ Patched inline edit inputs & save handler in js/admin/vocab-vault.js');
}

// D. Topic Blueprint Matrix: Remove THEME CODE column and set single CODE column
const oldBlueprintThead = `            <tr>
              <th style="padding: 8px 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10.5px; width: 65px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">LEVEL</th>
              <th style="padding: 8px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10.5px; width: 80px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">THEME CODE</th>
              <th style="padding: 8px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10.5px; min-width: 130px; border-right: 1px solid rgba(255,255,255,0.1);">THEME</th>
              <th style="padding: 8px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10.5px; width: 80px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">TOPIC CODE</th>
              <th style="padding: 8px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10.5px; min-width: 180px; border-right: 1px solid rgba(255,255,255,0.08);">TOPIC</th>`;

const newBlueprintThead = `            <tr>
              <th style="padding: 8px 10px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10.5px; width: 65px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">LEVEL</th>
              <th style="padding: 8px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10.5px; min-width: 140px; border-right: 1px solid rgba(255,255,255,0.1);">THEME</th>
              <th style="padding: 8px 8px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10.5px; width: 65px; text-align: center; border-right: 1px solid rgba(255,255,255,0.08);">CODE</th>
              <th style="padding: 8px 12px; font-weight: 800; color: #ffffff; text-transform: uppercase; font-size: 10.5px; min-width: 180px; border-right: 1px solid rgba(255,255,255,0.08);">TOPIC</th>`;

if (vaultCode.includes(oldBlueprintThead)) {
  vaultCode = vaultCode.replace(oldBlueprintThead, newBlueprintThead);
  console.log('✓ Patched Topic Blueprint table header in js/admin/vocab-vault.js');
}

// E. Topic Blueprint Matrix: Row generation without cell-theme-code
const oldBlueprintRow = `              \${isFirstInTheme ? \`
                <td rowspan="\${themeTotalRows}" class="cell-theme-code" style="text-align: center; vertical-align: middle; font-weight: 800; font-size: 11px; background: rgba(30, 41, 59, 0.5); border-right: 1px solid rgba(255,255,255,0.1); color: #f472b6; font-family: monospace; padding: 6px 4px;">
                  \${escapeHtml(th.code || '—')}
                </td>
                <td rowspan="\${themeTotalRows}" class="cell-theme-name" style="vertical-align: middle; font-weight: 700; font-size: 11px; background: rgba(30, 41, 59, 0.35); border-right: 1px solid rgba(255,255,255,0.1); color: #ffffff; padding: 6px 12px;">
                  \${escapeHtml(th.name || '—')}
                </td>
              \` : ''}

              <td style="text-align: center; color: #a5b4fc; font-family: monospace; font-weight: 700; padding: 6px 6px; border-right: 1px solid rgba(255,255,255,0.06);">\${escapeHtml(tp.topicCode || '—')}</td>`;

const newBlueprintRow = `              \${isFirstInTheme ? \`
                <td rowspan="\${themeTotalRows}" class="cell-theme-name" style="vertical-align: middle; font-weight: 700; font-size: 11px; background: rgba(30, 41, 59, 0.35); border-right: 1px solid rgba(255,255,255,0.1); color: #ffffff; padding: 6px 12px;">
                  \${escapeHtml(th.name || '—')}
                </td>
              \` : ''}

              <td class="cell-code" style="text-align: center; color: #a5b4fc; font-family: monospace; font-weight: 700; padding: 6px 6px; border-right: 1px solid rgba(255,255,255,0.06);">\${escapeHtml(tp.topicCode || '—')}</td>`;

if (vaultCode.includes(oldBlueprintRow)) {
  vaultCode = vaultCode.replace(oldBlueprintRow, newBlueprintRow);
  console.log('✓ Patched Topic Blueprint row rendering (removed cell-theme-code) in js/admin/vocab-vault.js');
}

// F. Topic Blueprint Matrix: empty level row colspan (from 10 to 9)
vaultCode = vaultCode.replace('<td colspan="10" style="text-align: center;', '<td colspan="9" style="text-align: center;');

fs.writeFileSync('js/admin/vocab-vault.js', vaultCode, 'utf8');

console.log('--- ALL PATCHES WRITTEN SUCCESSFULLY ---');

