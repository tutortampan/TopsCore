// scripts/patch_unified_topic_pipeline.mjs
// Applies the approved unified topic code pipeline across js/api.js, js/admin/vocab-vault.js, and js/admin/app.js

import fs from 'fs';

console.log('--- APPLYING UNIFIED TOPIC CODE PIPELINE PATCHES ---');

// ==========================================
// 1. PATCH js/api.js
// ==========================================
let apiCode = fs.readFileSync('js/api.js', 'utf8');

// A. sanitizeVaultRow
const oldSanitizeTarget = `  return {
    institution_id: row.institution_id || row.institutionId || null,
    program_id: row.program_id || row.programId || null,
    theme_code: String(row.theme_code || '').trim().replace(/\\s+/g, ' ').toUpperCase(),
    theme:      String(row.theme || '').trim().replace(/\\s+/g, ' '),
    topic_code: String(row.topic_code || '').trim().replace(/\\s+/g, ' ').toUpperCase(),
    topic:      String(row.topic || '').trim().replace(/\\s+/g, ' '),
    indonesian: String(row.indonesian || '').trim().replace(/\\s+/g, ' '),
    english:    canonicalEng,
    word_type:  wType,
    target_level: parseInt(row.level || row.target_level || 1, 10) || 1
  };`;

const newSanitizeCode = `  const thCode = String(row.theme_code || '').trim().replace(/\\s+/g, ' ').toUpperCase();
  let topCode = String(row.topic_code || '').trim().replace(/\\s+/g, ' ').toUpperCase();

  // If topCode is missing or just numeric, normalize it with themeCode
  if (!topCode && thCode) {
    topCode = \`\${thCode}1\`;
  } else if (/^[0-9]+$/.test(topCode) && thCode) {
    topCode = \`\${thCode}\${topCode}\`;
  }

  return {
    institution_id: row.institution_id || row.institutionId || null,
    program_id: row.program_id || row.programId || null,
    theme_code: thCode || (topCode ? topCode[0] : 'A'),
    theme:      String(row.theme || '').trim().replace(/\\s+/g, ' '),
    topic_code: topCode || 'A1',
    topic:      String(row.topic || '').trim().replace(/\\s+/g, ' '),
    indonesian: String(row.indonesian || '').trim().replace(/\\s+/g, ' '),
    english:    canonicalEng,
    word_type:  wType,
    target_level: parseInt(row.level || row.target_level || 1, 10) || 1
  };`;

// Handle possible CRLF in file
const normalizeNewlines = (str) => str.replace(/\r\n/g, '\n');

if (normalizeNewlines(apiCode).includes(normalizeNewlines(oldSanitizeTarget))) {
  apiCode = apiCode.replace(/\r\n/g, '\n');
  apiCode = apiCode.replace(normalizeNewlines(oldSanitizeTarget), normalizeNewlines(newSanitizeCode));
  console.log('✓ Patched sanitizeVaultRow in js/api.js');
} else {
  console.warn('⚠️ Could not find exact oldSanitizeTarget in js/api.js, checking if already patched...');
}

// B. exportVaultWords
const oldExportTarget = `  // Format data for Excel - 11 Column Standard
  const exportData = filteredWords.map(w => {
    const wt = (w.word_type || '').toLowerCase();
    const isPhrase = ['expression', 'idiom', 'proverb'].includes(wt);
    return {
      Institution: w.institutions?.name || 'CEC',
      Program: w.programs?.name || 'Camp',
      Level: w.target_level || '1',
      Category: isPhrase ? 'Phrases' : 'Words',
      'Theme Code': w.theme_code || '',
      Theme: w.theme || '',
      'Topic Code': w.topic_code || '',
      Topic: w.topic || '',
      Type: w.word_type || 'Vocab',
      Indonesian: w.indonesian || '',
      English: w.english || ''
    };
  });`;

const newExportCode = `  // Format data for Excel - 10 Column Unified Standard
  const exportData = filteredWords.map(w => {
    const wt = (w.word_type || '').toLowerCase();
    const isPhrase = ['expression', 'idiom', 'proverb'].includes(wt);
    const code = (w.topic_code && w.topic_code.trim()) ? w.topic_code.trim() : ((w.theme_code || 'A') + '1');
    return {
      Institution: w.institutions?.name || 'CEC',
      Program: w.programs?.name || 'Camp',
      Level: w.target_level || '1',
      Category: isPhrase ? 'Phrases' : 'Words',
      Code: code,
      Theme: w.theme || '',
      Topic: w.topic || '',
      Type: w.word_type || 'Vocab',
      Indonesian: w.indonesian || '',
      English: w.english || ''
    };
  });`;

if (normalizeNewlines(apiCode).includes(normalizeNewlines(oldExportTarget))) {
  apiCode = apiCode.replace(/\r\n/g, '\n');
  apiCode = apiCode.replace(normalizeNewlines(oldExportTarget), normalizeNewlines(newExportCode));
  console.log('✓ Patched exportVaultWords exportData in js/api.js');
} else {
  console.warn('⚠️ Could not find exact oldExportTarget in js/api.js');
}

// Also ensure export query has .range(0, 99999) to export all rows beyond 1000 limit
const oldExportQuery = `  let query = sb.from('vocabulary_vault')
    .select('institution_id, program_id, target_level, theme_code, theme, topic_code, topic, indonesian, english, word_type, created_at, institutions!institution_id(name), programs!program_id(name)')
    .is('deleted_at', null)`;

const newExportQuery = `  let query = sb.from('vocabulary_vault')
    .select('institution_id, program_id, target_level, theme_code, theme, topic_code, topic, indonesian, english, word_type, created_at, institutions!institution_id(name), programs!program_id(name)')
    .is('deleted_at', null)
    .range(0, 99999)`;

if (normalizeNewlines(apiCode).includes(normalizeNewlines(oldExportQuery))) {
  apiCode = apiCode.replace(normalizeNewlines(oldExportQuery), normalizeNewlines(newExportQuery));
  console.log('✓ Added .range(0, 99999) to exportVaultWords query in js/api.js');
}

// C. upsertDynamicTestShell cleanTopCode
const oldShellCodeLine = `  // Standardized Shell Code: e.g. 3A1-WORDS-TASK, 3A1-PHRASES-TASK, 3A-WORDS-EXAM, 3A-PHRASES-EXAM
  const code = isPhrase
    ? (isTest ? \`\${levelNum}\${themeCode}-PHRASES-EXAM\` : \`\${levelNum}\${themeCode}\${topicCode || '1'}-PHRASES-TASK\`)
    : (isTest ? \`\${levelNum}\${themeCode}-WORDS-EXAM\` : \`\${levelNum}\${themeCode}\${topicCode || '1'}-WORDS-TASK\`);

  // Standardized Title: e.g. "3rd Vocabulary A1 Words Task - Professional Identity"
  const ordinal = toOrdinal(levelNum);
  const cleanTitle = (topicName || themeName || '').replace(/["']/g, '').trim();
  const generatedTitle = isPhrase
    ? (isTest
        ? \`\${ordinal} Vocabulary \${themeCode} Phrases Exam\${cleanTitle ? ' - ' + cleanTitle : ''}\`
        : \`\${ordinal} Vocabulary \${themeCode}\${topicCode || '1'} Phrases Task\${cleanTitle ? ' - ' + cleanTitle : ''}\`)
    : (isTest
        ? \`\${ordinal} Vocabulary \${themeCode} Words Exam\${cleanTitle ? ' - ' + cleanTitle : ''}\`
        : \`\${ordinal} Vocabulary \${themeCode}\${topicCode || '1'} Words Task\${cleanTitle ? ' - ' + cleanTitle : ''}\`);`;

const newShellCodeLine = `  // Standardized Shell Code: e.g. 3A1-WORDS-TASK, 3A1-PHRASES-TASK, 3A-WORDS-EXAM, 3A-PHRASES-EXAM
  const cleanTopCode = topicCode ? String(topicCode).replace(/^[A-Za-z]/, '') : '1';
  const code = isPhrase
    ? (isTest ? \`\${levelNum}\${themeCode}-PHRASES-EXAM\` : \`\${levelNum}\${themeCode}\${cleanTopCode}-PHRASES-TASK\`)
    : (isTest ? \`\${levelNum}\${themeCode}-WORDS-EXAM\` : \`\${levelNum}\${themeCode}\${cleanTopCode}-WORDS-TASK\`);

  // Standardized Title: e.g. "3rd Vocabulary A1 Words Task - Professional Identity"
  const ordinal = toOrdinal(levelNum);
  const cleanTitle = (topicName || themeName || '').replace(/["']/g, '').trim();
  const generatedTitle = isPhrase
    ? (isTest
        ? \`\${ordinal} Vocabulary \${themeCode} Phrases Exam\${cleanTitle ? ' - ' + cleanTitle : ''}\`
        : \`\${ordinal} Vocabulary \${themeCode}\${cleanTopCode} Phrases Task\${cleanTitle ? ' - ' + cleanTitle : ''}\`)
    : (isTest
        ? \`\${ordinal} Vocabulary \${themeCode} Words Exam\${cleanTitle ? ' - ' + cleanTitle : ''}\`
        : \`\${ordinal} Vocabulary \${themeCode}\${cleanTopCode} Words Task\${cleanTitle ? ' - ' + cleanTitle : ''}\`);`;

if (normalizeNewlines(apiCode).includes(normalizeNewlines(oldShellCodeLine))) {
  apiCode = apiCode.replace(normalizeNewlines(oldShellCodeLine), normalizeNewlines(newShellCodeLine));
  console.log('✓ Patched cleanTopCode in upsertDynamicTestShell in js/api.js');
}

fs.writeFileSync('js/api.js', apiCode, 'utf8');

// ==========================================
// 2. PATCH js/admin/app.js (vaultCountFor)
// ==========================================
let appCode = fs.readFileSync('js/admin/app.js', 'utf8');
const oldVaultCountLine = `            if (pl.topic_code && v.topic_code !== pl.topic_code) return false;`;
const newVaultCountLine = `            if (pl.topic_code) {
              const normPlCode = (/^[A-Za-z]/.test(String(pl.topic_code))) ? String(pl.topic_code).toUpperCase() : \`\${String(pl.theme_code || '').toUpperCase()}\${pl.topic_code}\`;
              const normVCode = (/^[A-Za-z]/.test(String(v.topic_code))) ? String(v.topic_code).toUpperCase() : \`\${String(v.theme_code || '').toUpperCase()}\${v.topic_code}\`;
              if (normVCode !== normPlCode && String(v.topic_code).toUpperCase() !== String(pl.topic_code).toUpperCase()) return false;
            }`;

if (normalizeNewlines(appCode).includes(normalizeNewlines(oldVaultCountLine))) {
  appCode = appCode.replace(/\r\n/g, '\n');
  appCode = appCode.replace(normalizeNewlines(oldVaultCountLine), normalizeNewlines(newVaultCountLine));
  fs.writeFileSync('js/admin/app.js', appCode, 'utf8');
  console.log('✓ Patched vaultCountFor in js/admin/app.js');
} else {
  console.warn('⚠️ Could not find exact oldVaultCountLine in js/admin/app.js');
}

// ==========================================
// 3. PATCH js/admin/vocab-vault.js
// ==========================================
let vaultCode = fs.readFileSync('js/admin/vocab-vault.js', 'utf8');
vaultCode = vaultCode.replace(/\r\n/g, '\n');

// A. Insert TOPIC_CODE_MAP near top
const mapInsertMarker = `const _AUDIO_CACHE = new Map();`;
const topicCodeMapDeclaration = `// Known authoritative curriculum mapping for topics to codes
const TOPIC_CODE_MAP = {
  // Level 2
  'Introduction & Delivery': 'A1',
  'Structuring a Presentation': 'A2',
  'Persuasive Speaking': 'A3',
  'Daily Office Life': 'A1',
  'Customer Service': 'A2',

  'Podcast Hosting & Introduction': 'B1',
  'Podcast Interviewing & Discussion': 'B2',
  'Podcast Production & Team Discussion': 'B3',
  'Podcast Evaluation & Collaboration': 'B4',
  'Travel & Transport': 'B1',
  'Hospitality & Dining': 'B2',

  'Shopping & Choosing Products': 'C1',
  'Cashier & Payment': 'C2',
  'Restaurant & Dining': 'C3',
  'Budgeting & Trip Planning': 'C4',

  'Kitchen Preparation & Cooking': 'D1',
  'Recipe Demonstration': 'D2',
  'Cooking Presentation & Teamwork': 'D3',
  'Review, Evaluation & Final Rehearsal': 'D4',

  // Level 3
  'Professional Identity': 'A1',
  'Building Your Professional Identity': 'A1',
  'CV & Resume': 'A2',
  'Crafting CV & Resume': 'A2',
  'Job Interview': 'A3',
  'Mastering Job Interview': 'A3',

  'Cultural Differences': 'B1',
  'Understanding Cultural Differences': 'B1',
  'International Customers': 'B2',
  'Handling International Customers': 'B2',
  'Cross-Cultural Problems': 'B3',
  'Solving Cross-Cultural Problems': 'B3',
  'Cross-Cultural Communication': 'B4',
  'Global Cross-Cultural Communication': 'B4',

  'Cultural Identity & Tradition': 'C1',
  'Family, Community & Social Values': 'C2',
  'Folklore, Arts & Traditional Crafts': 'C3',
  'Clothing, Food, Music & Performance': 'C4',
  'Travel & Modern Culture': 'C5',

  'Action & Mindset Foundations': 'D1',
  'Action, Analysis & Progress': 'D2',
  'Interaction, Process & Judgement': 'D3',
  'Strategy, Solutions & Expression': 'D4'
};

const _AUDIO_CACHE = new Map();`;

if (vaultCode.includes(mapInsertMarker) && !vaultCode.includes('const TOPIC_CODE_MAP = {')) {
  vaultCode = vaultCode.replace(mapInsertMarker, topicCodeMapDeclaration);
  console.log('✓ Added TOPIC_CODE_MAP to js/admin/vocab-vault.js');
}

// B. Update Import Modal HTML description
const oldImportModalText = `<h3 class="fw-700" style="margin:0;">&#128229; Import Vocabulary &amp; Phrases from Excel (11-Column Standard)</h3>
        <button class="btn btn-ghost btn-sm" id="close-import-modal">&#10005;</button>
      </div>
      <p class="text-muted text-sm mb-3">
        Upload an <strong>.xlsx</strong> file conforming to the official 11-column standard:<br>
        <code>1. Institution</code> &bull; <code>2. Program</code> &bull; <code>3. Level</code> &bull; <code>4. Category</code> &bull; <code>5. Theme Code</code> &bull; <code>6. Theme</code> &bull; <code>7. Topic Code</code> &bull; <code>8. Topic</code> &bull; <code>9. Type</code> &bull; <code>10. Indonesian</code> &bull; <code>11. English</code><br>
        <span class="text-xs" style="color: #6366f1;">All word types accepted: \${allowedTypesStr}. Rows are auto-classified &mdash; phrases (Expression/Idiom/Proverb) and words are split automatically, or forced by the <strong>Category</strong> column.</span>
      </p>`;

const newImportModalText = `<h3 class="fw-700" style="margin:0;">&#128229; Import Vocabulary &amp; Phrases from Excel (10-Column Standard)</h3>
        <button class="btn btn-ghost btn-sm" id="close-import-modal">&#10005;</button>
      </div>
      <p class="text-muted text-sm mb-3">
        Upload an <strong>.xlsx</strong> file conforming to the official 10-column standard:<br>
        <code>1. Institution</code> &bull; <code>2. Program</code> &bull; <code>3. Level</code> &bull; <code>4. Category</code> &bull; <code>5. Code (A1, A2..)</code> &bull; <code>6. Theme</code> &bull; <code>7. Topic</code> &bull; <code>8. Type</code> &bull; <code>9. Indonesian</code> &bull; <code>10. English</code><br>
        <span class="text-xs" style="color: #6366f1;">Unified Code: Enter <code>A1</code>, <code>A2</code>, <code>B1</code> directly. (Legacy 11-column files with separate Theme Code &amp; Topic Code are also automatically supported).</span>
      </p>`;

if (vaultCode.includes(oldImportModalText)) {
  vaultCode = vaultCode.replace(oldImportModalText, newImportModalText);
  console.log('✓ Updated Import Modal description in js/admin/vocab-vault.js');
}

// C. Smart Excel row parser in openImportModal
const oldRowParser = `      // Normalize column names (supports 11-column standard with smart fallback)
      _parsedRows = raw.map(row => {
        const normalized = {};
        for (const [k, v] of Object.entries(row)) {
          normalized[k.trim().toUpperCase().replace(/\\s+/g, ' ')] = String(v).trim();
        }
        return {
          institution_id: fallbackInstId,
          program_id: fallbackProgId,
          level: normalized.LEVEL || normalized.TARGET_LEVEL || '1',
          category: normalized.CATEGORY || '',
          theme_code: (normalized['THEME CODE'] || normalized.THEME_CODE || '').toUpperCase(),
          theme: normalized['THEME NAME'] || normalized.THEME || '',
          topic_code: (normalized['TOPIC CODE'] || normalized.TOPIC_CODE || '').toUpperCase(),
          topic: normalized['TOPIC NAME'] || normalized.TOPIC || '',
          word_type: normalized.TYPE || normalized['WORD TYPE'] || normalized.WORD_TYPE || 'Vocab',
          indonesian: normalized.INDONESIAN || '',
          english: normalized.ENGLISH || ''
        };
      }).filter(r => r.topic && r.indonesian && r.english);`;

const newRowParser = `      // Normalize column names (supports 10-column unified standard and legacy 11-column standard with smart fallback)
      _parsedRows = raw.map(row => {
        const normalized = {};
        for (const [k, v] of Object.entries(row)) {
          // Normalize header: strip invisible carriage returns and collapse whitespace
          const cleanKey = String(k || '').trim().toUpperCase().replace(/[\\r\\n\\t]+/g, ' ').replace(/\\s+/g, ' ');
          normalized[cleanKey] = String(v ?? '').trim();
        }

        // Smart Code / Theme Code / Topic Code parsing
        let rawCode = normalized['CODE'] || normalized['TOPIC CODE'] || normalized['TOPIC_CODE'] || normalized['T.CODE'] || normalized['TOPIC NO'] || normalized['TOPIC ID'] || '';
        let rawThemeCode = normalized['THEME CODE'] || normalized['THEME_CODE'] || '';
        let rawTheme = normalized['THEME NAME'] || normalized['THEME'] || '';
        let rawTopic = normalized['TOPIC NAME'] || normalized['TOPIC'] || '';

        // Case 1: rawCode is unified format "A1", "A2", "B1"
        if (/^[A-Za-z][0-9]+$/.test(rawCode)) {
          rawCode = rawCode.toUpperCase();
          if (!rawThemeCode) rawThemeCode = rawCode[0];
        } else if (/^[0-9]+$/.test(rawCode)) {
          // Case 2: rawCode is numeric "1", "2" and we have themeCode "A"
          if (rawThemeCode && /^[A-Za-z]$/.test(rawThemeCode)) {
            rawCode = \`\${rawThemeCode.toUpperCase()}\${rawCode}\`;
          }
        }

        // Case 3: Code is still missing or pure numeric -> Check curriculum dictionary or synthesize
        if (!rawCode || /^[0-9]+$/.test(rawCode)) {
          if (TOPIC_CODE_MAP[rawTopic]) {
            rawCode = TOPIC_CODE_MAP[rawTopic];
            if (!rawThemeCode) rawThemeCode = rawCode[0];
          } else if (rawThemeCode && /^[A-Za-z]$/.test(rawThemeCode)) {
            rawCode = \`\${rawThemeCode.toUpperCase()}\${rawCode || '1'}\`;
          } else {
            rawCode = 'A1';
            rawThemeCode = rawThemeCode || 'A';
          }
        }

        if (!rawThemeCode && rawCode && /^[A-Za-z]/.test(rawCode)) {
          rawThemeCode = rawCode[0].toUpperCase();
        }

        return {
          institution_id: fallbackInstId,
          program_id: fallbackProgId,
          level: normalized.LEVEL || normalized.TARGET_LEVEL || '1',
          category: normalized.CATEGORY || '',
          theme_code: rawThemeCode.toUpperCase(),
          theme: rawTheme,
          topic_code: rawCode.toUpperCase(),
          topic: rawTopic,
          word_type: normalized.TYPE || normalized['WORD TYPE'] || normalized.WORD_TYPE || 'Vocab',
          indonesian: normalized.INDONESIAN || '',
          english: normalized.ENGLISH || ''
        };
      }).filter(r => r.topic && r.indonesian && r.english);`;

if (vaultCode.includes(oldRowParser)) {
  vaultCode = vaultCode.replace(oldRowParser, newRowParser);
  console.log('✓ Patched smart row parser in js/admin/vocab-vault.js');
} else {
  console.warn('⚠️ Could not find exact oldRowParser in js/admin/vocab-vault.js');
}

// D. Topic Blueprint fallback & natural sorting
const oldTpCodeFallback = `    const tpCode = (w.topic_code || '1').trim();`;
const newTpCodeFallback = `    const tpCode = (w.topic_code && w.topic_code.trim()) ? w.topic_code.trim() : \`\${thCode}1\`;`;
if (vaultCode.includes(oldTpCodeFallback)) {
  vaultCode = vaultCode.replace(oldTpCodeFallback, newTpCodeFallback);
  console.log('✓ Patched tpCode fallback in _renderTopicBlueprintTab');
}

const oldTopicSort = `          .sort((a, b) => {
            const numA = parseInt(a.topicCode, 10);
            const numB = parseInt(b.topicCode, 10);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.topicCode.localeCompare(b.topicCode);
          });`;

const newTopicSort = `          .sort((a, b) => (a.topicCode || '').localeCompare(b.topicCode || '', undefined, { numeric: true, sensitivity: 'base' }));`;

if (vaultCode.includes(oldTopicSort)) {
  vaultCode = vaultCode.replace(oldTopicSort, newTopicSort);
  console.log('✓ Patched natural alphanumeric sort in _renderTopicBlueprintTab');
}

// E. Edit row placeholder
vaultCode = vaultCode.replace(`placeholder="e.g. T1A"`, `placeholder="e.g. A1"`);

// F. Save inline edit smart logic
const oldSaveEdit = `          updateVaultWord(id, {
            theme_code: newThemeCode || null,
            theme: newTheme || null,
            topic_code: newTopicCode || null,`;

const newSaveEdit = `          // Normalize topic_code and theme_code on edit save
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
            topic_code: finalTopicCode || null,`;

if (vaultCode.includes(oldSaveEdit)) {
  vaultCode = vaultCode.replace(oldSaveEdit, newSaveEdit);
  // Also update local object mutation
  vaultCode = vaultCode.replace(`word.topic_code = newTopicCode || null;`, `word.topic_code = finalTopicCode || null; word.theme_code = finalThemeCode || word.theme_code;`);
  console.log('✓ Patched inline edit save normalization in js/admin/vocab-vault.js');
}

fs.writeFileSync('js/admin/vocab-vault.js', vaultCode, 'utf8');

console.log('--- ALL PATCHES APPLIED SUCCESSFULLY ---');

