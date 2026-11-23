// scripts/ingest_final_exams.mjs
import xlsx from 'xlsx';
import fs from 'fs';

// Read .env
const envText = fs.readFileSync('.env', 'utf8');
const url = envText.match(/SUPABASE_URL=([^\r\n]+)/)[1].trim();
const key = envText.match(/SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)[1].trim();

const dir = 'C:/Users/Top/.gemini/antigravity/brain/c7a3744e-ba0b-4209-8fd5-ace9e964861f/.user_uploaded';
const files = {
  '130': 'media_1795454104143_ab1df567.xlsx',
  '132': 'media_1795454104162_9081e156.xlsx',
  '133': 'media_1795454104166_4390e00c.xlsx',
  '134': 'media_1795454104143_ae0a8c66.xlsx'
};

function cleanName(n) {
  if (!n) return '';
  return String(n).trim().replace(/\s+/g, ' ').toUpperCase();
}

function cleanNum(v) {
  if (v == null || v === '' || v === '-' || v === '#N/A') return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function cleanStr(v) {
  if (v == null || v === '' || v === '-' || v === '#N/A') return null;
  return String(v).trim();
}

async function apiReq(endpoint, method = 'GET', body = null, headers = {}) {
  const opts = {
    method,
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...headers
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

async function main() {
  console.log('🚀 Ingesting Authentic Final Examinations & Certificate Records into Supabase...');

  // 1. Fetch active batches
  const batches = await apiReq('batches?deleted_at=is.null&select=id,name');
  const batchMap = new Map(batches.map(b => [String(b.name).trim(), b.id]));

  // 2. Fetch all students
  const students = await apiReq('students?select=id,name,nis,batch_id');
  const studentByNameAndBatch = new Map();
  const studentByNis = new Map();
  const studentByName = new Map();

  students.forEach(s => {
    const cName = cleanName(s.name);
    studentByNameAndBatch.set(`${s.batch_id}::${cName}`, s);
    if (s.nis) studentByNis.set(String(s.nis).trim(), s);
    studentByName.set(cName, s);
  });

  const recordsToUpsert = [];

  for (const [batchNum, fname] of Object.entries(files)) {
    const batchId = batchMap.get(batchNum);
    if (!batchId) continue;

    const wb = xlsx.readFile(`${dir}/${fname}`);
    const ws = wb.Sheets['LEMBAR NILAI EXAM'];
    if (!ws) continue;

    const rows = xlsx.utils.sheet_to_json(ws, { header: 1 });
    console.log(`Processing Batch ${batchNum} Final Exam rows (${rows.length} total rows)...`);

    for (let r = 4; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row[1] || row[1] === '#N/A') continue;
      const rawName = String(row[1]).trim();
      if (rawName === 'NAMA' || rawName.length < 3 || rawName.includes('low') || rawName.includes('peningkatan')) continue;

      const cName = cleanName(rawName);
      const student = studentByNameAndBatch.get(`${batchId}::${cName}`) ||
                      (row[0] ? studentByNis.get(String(row[0]).trim()) : null) ||
                      studentByName.get(cName);

      if (!student) {
        console.warn(`[Batch ${batchNum}] Student not found in DB: "${rawName}" (Row ${r})`);
        continue;
      }

      const examinerName = cleanStr(row[2]);
      const exFluency = cleanNum(row[4]);
      const exPron = cleanNum(row[5]);
      const exIdea = cleanNum(row[6]);
      const exGrammar = cleanNum(row[7]);

      const tutorFluency = cleanNum(row[9]);
      const tutorPron = cleanNum(row[10]);
      const tutorGrammar = cleanNum(row[11]);
      const tutorComp = cleanNum(row[12]);

      const practiceScore = cleanNum(row[14]);
      const practicePred = cleanStr(row[15]);

      const spkScore = cleanNum(row[16]);
      const spkPred = cleanStr(row[17]);
      const vcbScore = cleanNum(row[18]);
      const vcbPred = cleanStr(row[19]);
      const prnScore = cleanNum(row[20]);
      const prnPred = cleanStr(row[21]);
      const grmScore = cleanNum(row[22]);
      const grmPred = cleanStr(row[23]);

      const certMonth = cleanStr(row[24]);
      const certYear = cleanNum(row[25]) || 2026;
      let certNis = cleanStr(row[26]);
      if (certNis && certNis.includes('.000/')) {
        // Incomplete placeholder in Excel, retain if has real format or fallback
      }

      // Check if any subject is LESS
      const predicates = [practicePred, spkPred, vcbPred, prnPred, grmPred].filter(Boolean);
      const hasLess = predicates.some(p => p.toUpperCase() === 'LESS');
      const hasCompleted = predicates.length >= 4 && !hasLess && practiceScore != null;

      const status = hasCompleted ? 'VERIFIED' : (hasLess ? 'DRAFT' : 'DRAFT');

      recordsToUpsert.push({
        student_id: student.id,
        batch_id: batchId,
        exam_date: '2026-11-20',
        examiner_name: examinerName || null,
        examiner_fluency: exFluency != null ? exFluency : null,
        examiner_pronunciation: exPron != null ? exPron : null,
        examiner_idea: exIdea != null ? exIdea : null,
        examiner_grammar: exGrammar != null ? exGrammar : null,
        tutor_name: 'MR ADAM',
        tutor_fluency: tutorFluency != null ? tutorFluency : null,
        tutor_pronunciation: tutorPron != null ? tutorPron : null,
        tutor_grammar: tutorGrammar != null ? tutorGrammar : null,
        tutor_comprehension: tutorComp != null ? tutorComp : null,
        practice_score: practiceScore != null ? practiceScore : null,
        practice_predicate: practicePred || null,
        speaking_score: spkScore != null ? spkScore : null,
        speaking_predicate: spkPred || null,
        vocab_score: vcbScore != null ? vcbScore : null,
        vocab_predicate: vcbPred || null,
        pronunciation_score: prnScore != null ? prnScore : null,
        pronunciation_predicate: prnPred || null,
        grammar_score: grmScore != null ? grmScore : null,
        grammar_predicate: grmPred || null,
        certificate_month: certMonth || null,
        certificate_year: certYear || 2026,
        certificate_nis: certNis || null,
        status,
        updated_at: new Date().toISOString()
      });
    }
  }

  // Deduplicate by student_id
  const recMap = new Map();
  for (const r of recordsToUpsert) {
    recMap.set(r.student_id, r);
  }
  const deduped = Array.from(recMap.values());

  console.log(`Upserting ${deduped.length} authentic student final exam records into Supabase...`);
  for (let i = 0; i < deduped.length; i += 50) {
    const chunk = deduped.slice(i, i + 50);
    await apiReq('student_final_examinations?on_conflict=student_id', 'POST', chunk, {
      'Prefer': 'resolution=merge-duplicates'
    });
  }

  console.log(`✅ Successfully upserted ${deduped.length} Final Examination & Certificate records!`);
}

main().catch(err => {
  console.error('Ingestion error:', err);
  process.exit(1);
});
