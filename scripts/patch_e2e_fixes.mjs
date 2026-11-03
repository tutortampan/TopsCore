// scripts/patch_e2e_fixes.mjs
// Fixes test question generator filtering priority and vaultCountFor logic

import fs from 'fs';

console.log('--- APPLYING E2E PARITY FIXES ---');

// 1. PATCH js/api.js: generateTestQuestions
let apiCode = fs.readFileSync('js/api.js', 'utf8').replace(/\r\n/g, '\n');

const oldGenLogic1 = `      if (themes && Array.isArray(themes) && themes.length > 0) {
        query = query.in('theme_code', themes);
      } else if (isThemeTest && themeCode) {
        const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const idx = allThemes.indexOf(String(themeCode).toUpperCase());
        if (idx !== -1) {
          const targetThemes = allThemes.slice(0, idx + 1);
          query = query.in('theme_code', targetThemes);
        } else {
          query = query.eq('theme_code', themeCode);
        }
      } else {
        if (themeCode) query = query.eq('theme_code', themeCode);
        if (topicCode) {
          const candidateCodes = [
            String(topicCode).toUpperCase(),
            (/^[0-9]+$/.test(String(topicCode)) && themeCode) ? \`\${String(themeCode).toUpperCase()}\${topicCode}\` : null,
            String(topicCode).replace(/^[A-Za-z]/, '')
          ].filter(Boolean);
          query = query.in('topic_code', candidateCodes);
        }
      }`;

const newGenLogic1 = `      if (topicCode) {
        if (themeCode) query = query.eq('theme_code', themeCode);
        const candidateCodes = [
          String(topicCode).toUpperCase(),
          (/^[0-9]+$/.test(String(topicCode)) && themeCode) ? \`\${String(themeCode).toUpperCase()}\${topicCode}\` : null,
          String(topicCode).replace(/^[A-Za-z]/, '')
        ].filter(Boolean);
        query = query.in('topic_code', candidateCodes);
      } else if (themes && Array.isArray(themes) && themes.length > 0) {
        query = query.in('theme_code', themes);
      } else if (isThemeTest && themeCode) {
        const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const idx = allThemes.indexOf(String(themeCode).toUpperCase());
        if (idx !== -1) {
          const targetThemes = allThemes.slice(0, idx + 1);
          query = query.in('theme_code', targetThemes);
        } else {
          query = query.eq('theme_code', themeCode);
        }
      } else if (themeCode) {
        query = query.eq('theme_code', themeCode);
      }`;

if (apiCode.includes(oldGenLogic1)) {
  apiCode = apiCode.replace(oldGenLogic1, newGenLogic1);
  console.log('✓ Fixed question generator filter priority in query 1 (js/api.js)');
}

const oldGenLogic2 = `      if (themes && Array.isArray(themes) && themes.length > 0) {
        queryNoCat = queryNoCat.in('theme_code', themes);
      } else if (isThemeTest && themeCode) {
        const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const idx = allThemes.indexOf(String(themeCode).toUpperCase());
        if (idx !== -1) {
          queryNoCat = queryNoCat.in('theme_code', allThemes.slice(0, idx + 1));
        } else {
          queryNoCat = queryNoCat.eq('theme_code', themeCode);
        }
      } else {
        if (themeCode) queryNoCat = queryNoCat.eq('theme_code', themeCode);
        if (topicCode) {
          const candidateCodes = [
            String(topicCode).toUpperCase(),
            (/^[0-9]+$/.test(String(topicCode)) && themeCode) ? \`\${String(themeCode).toUpperCase()}\${topicCode}\` : null,
            String(topicCode).replace(/^[A-Za-z]/, '')
          ].filter(Boolean);
          queryNoCat = queryNoCat.in('topic_code', candidateCodes);
        }
      }`;

const newGenLogic2 = `      if (topicCode) {
        if (themeCode) queryNoCat = queryNoCat.eq('theme_code', themeCode);
        const candidateCodes = [
          String(topicCode).toUpperCase(),
          (/^[0-9]+$/.test(String(topicCode)) && themeCode) ? \`\${String(themeCode).toUpperCase()}\${topicCode}\` : null,
          String(topicCode).replace(/^[A-Za-z]/, '')
        ].filter(Boolean);
        queryNoCat = queryNoCat.in('topic_code', candidateCodes);
      } else if (themes && Array.isArray(themes) && themes.length > 0) {
        queryNoCat = queryNoCat.in('theme_code', themes);
      } else if (isThemeTest && themeCode) {
        const allThemes = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
        const idx = allThemes.indexOf(String(themeCode).toUpperCase());
        if (idx !== -1) {
          queryNoCat = queryNoCat.in('theme_code', allThemes.slice(0, idx + 1));
        } else {
          queryNoCat = queryNoCat.eq('theme_code', themeCode);
        }
      } else if (themeCode) {
        queryNoCat = queryNoCat.eq('theme_code', themeCode);
      }`;

if (apiCode.includes(oldGenLogic2)) {
  apiCode = apiCode.replace(oldGenLogic2, newGenLogic2);
  console.log('✓ Fixed question generator filter priority in query 2 (js/api.js)');
}

fs.writeFileSync('js/api.js', apiCode, 'utf8');

// 2. PATCH js/admin/app.js: vaultCountFor
let appCode = fs.readFileSync('js/admin/app.js', 'utf8').replace(/\r\n/g, '\n');

const oldVaultCountLogic = `            if (themes) return themes.includes(v.theme_code);
            if (pl.theme_code && v.theme_code !== pl.theme_code) return false;
            if (pl.topic_code) {
              const normPlCode = (/^[A-Za-z]/.test(String(pl.topic_code))) ? String(pl.topic_code).toUpperCase() : \`\${String(pl.theme_code || '').toUpperCase()}\${pl.topic_code}\`;
              const normVCode = (/^[A-Za-z]/.test(String(v.topic_code))) ? String(v.topic_code).toUpperCase() : \`\${String(v.theme_code || '').toUpperCase()}\${v.topic_code}\`;
              if (normVCode !== normPlCode && String(v.topic_code).toUpperCase() !== String(pl.topic_code).toUpperCase()) return false;
            }
            return true;`;

const newVaultCountLogic = `            if (themes && !themes.includes(v.theme_code)) return false;
            if (pl.theme_code && v.theme_code !== pl.theme_code) return false;
            if (pl.topic_code) {
              const normPlCode = (/^[A-Za-z]/.test(String(pl.topic_code))) ? String(pl.topic_code).toUpperCase() : \`\${String(pl.theme_code || '').toUpperCase()}\${pl.topic_code}\`;
              const normVCode = (/^[A-Za-z]/.test(String(v.topic_code))) ? String(v.topic_code).toUpperCase() : \`\${String(v.theme_code || '').toUpperCase()}\${v.topic_code}\`;
              if (normVCode !== normPlCode && String(v.topic_code).toUpperCase() !== String(pl.topic_code).toUpperCase()) return false;
            }
            return true;`;

if (appCode.includes(oldVaultCountLogic)) {
  appCode = appCode.replace(oldVaultCountLogic, newVaultCountLogic);
  fs.writeFileSync('js/admin/app.js', appCode, 'utf8');
  console.log('✓ Fixed vaultCountFor logic (prevent premature return on themes) in js/admin/app.js');
}

console.log('--- ALL FIXES APPLIED SUCCESSFULLY ---');

