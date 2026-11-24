/**
 * scripts/normalize_capitalization.mjs
 *
 * Normalizes capitalization across database rows:
 * 1. students.name -> Title Case (via cleanStudentName)
 * 2. vocabulary_vault -> Theme (Title Case), Topic (Title Case), Word Type (Title Case),
 *                       Theme Code (UPPERCASE), Topic Code (UPPERCASE),
 *                       English & Indonesian (Vocab lowercase / Phrase sentence case).
 */

import fs from 'fs';
import { cleanStudentName, toTitleCase, formatVaultTerm } from '../js/api.js';

const env = fs.readFileSync('.env', 'utf8');
const envVars = {};
for (const line of env.split('\n')) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (m) {
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    envVars[m[1]] = v;
  }
}

const url = envVars.SUPABASE_URL || envVars.VITE_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.SUPABASE_ANON_KEY || envVars.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌ Supabase credentials missing from .env');
  process.exit(1);
}

async function apiReq(endpoint, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${url}/rest/v1/${endpoint}`, opts);
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`[${method} ${endpoint}] ${res.status}: ${errText}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function run() {
  console.log('====================================================');
  console.log(' TOPSCORE LMS — DATABASE CAPITALIZATION NORMALIZER');
  console.log('====================================================\n');

  // 1. Normalize Students
  console.log('▶ [Step 1] Auditing Students Table...');
  const students = await apiReq('students?select=id,name&deleted_at=is.null');
  console.log(`Found ${students.length} active students.`);

  let studentUpdateCount = 0;
  for (const s of students) {
    const rawName = s.name || '';
    const clean = cleanStudentName(rawName);
    if (rawName !== clean && clean) {
      console.log(`  Updating student [${s.id}]: "${rawName}" -> "${clean}"`);
      await apiReq(`students?id=eq.${s.id}`, 'PATCH', {
        name: clean,
        updated_at: new Date().toISOString()
      });
      studentUpdateCount++;
    }
  }
  console.log(`✅ Normalized ${studentUpdateCount} student names to proper Title Case.\n`);

  // 2. Normalize Vocabulary Vault
  console.log('▶ [Step 2] Auditing Vocabulary Vault Table...');
  const vaultWords = await apiReq('vocabulary_vault?select=id,theme,topic,theme_code,topic_code,word_type,category,english,indonesian&deleted_at=is.null');
  console.log(`Found ${vaultWords.length} vault entries.`);

  let vaultUpdateCount = 0;
  for (const w of vaultWords) {
    const patch = {};
    const cat = w.category || '';
    const wt = w.word_type || '';
    const isPhrase = (cat.toLowerCase().includes('phrase')) || ['expression', 'idiom', 'proverb'].includes(wt.toLowerCase());

    if (w.theme) {
      const cleanTheme = toTitleCase(w.theme);
      if (cleanTheme !== w.theme) patch.theme = cleanTheme;
    }
    if (w.topic) {
      const cleanTopic = toTitleCase(w.topic);
      if (cleanTopic !== w.topic) patch.topic = cleanTopic;
    }
    if (w.theme_code) {
      const cleanThCode = w.theme_code.trim().toUpperCase();
      if (cleanThCode !== w.theme_code) patch.theme_code = cleanThCode;
    }
    if (w.topic_code) {
      const cleanTpCode = w.topic_code.trim().toUpperCase();
      if (cleanTpCode !== w.topic_code) patch.topic_code = cleanTpCode;
    }
    if (w.word_type) {
      const cleanWt = toTitleCase(w.word_type);
      if (cleanWt !== w.word_type) patch.word_type = cleanWt;
    }
    if (w.english) {
      const cleanEng = formatVaultTerm(w.english, isPhrase);
      if (cleanEng !== w.english) patch.english = cleanEng;
    }
    if (w.indonesian) {
      const cleanIndo = formatVaultTerm(w.indonesian, isPhrase);
      if (cleanIndo !== w.indonesian) patch.indonesian = cleanIndo;
    }

    if (Object.keys(patch).length > 0) {
      patch.updated_at = new Date().toISOString();
      await apiReq(`vocabulary_vault?id=eq.${w.id}`, 'PATCH', patch);
      vaultUpdateCount++;
    }
  }
  console.log(`✅ Normalized ${vaultUpdateCount} Vocabulary Vault entries.\n`);

  console.log('🎉 Database normalization complete with 100% compliance!');
}

run().catch(err => {
  console.error('❌ Error during normalization:', err);
  process.exit(1);
});
