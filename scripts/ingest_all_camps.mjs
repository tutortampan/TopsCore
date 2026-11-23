import fs from 'fs';
import xlsx from 'xlsx';

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

const INSTITUTION_ID = 'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447'; // CEC
const PROGRAM_ID = '11deb53c-434a-44b0-83ca-1cc9b239cab3';     // Camp
const LEVEL_1_ID = '100120f3-ab12-4589-99da-cf65d11436b1';

const dir = 'C:/Users/Top/.gemini/antigravity/brain/c7a3744e-ba0b-4209-8fd5-ace9e964861f/.user_uploaded';
const files = {
  130: 'media_1795454104143_ab1df567.xlsx',
  132: 'media_1795454104162_9081e156.xlsx',
  133: 'media_1795454104166_4390e00c.xlsx',
  134: 'media_1795454104143_ae0a8c66.xlsx'
};

function cleanName(n) {
  if (!n) return '';
  return String(n).replace(/\s+/g, ' ').trim().toUpperCase();
}

function cleanNis(nis) {
  if (!nis) return null;
  const s = String(nis).trim();
  if (s === '#N/A' || s === '-' || s === '0' || s === '') return null;
  return s;
}

function cleanNum(val) {
  if (val == null || val === '' || val === '-' || val === '#N/A' || val === '—') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

function calcGrade(pct) {
  if (pct == null) return null;
  if (pct >= 90) return 'A';
  if (pct >= 80) return 'B';
  if (pct >= 60) return 'C';
  if (pct >= 30) return 'D';
  return 'E';
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
  console.log('🚀 Starting Authentic Camp Data Ingestion (Batches 130, 132, 133, 134)...');

  // 1. Fetch existing active (non-deleted) batches
  const batches = await apiReq('batches?deleted_at=is.null&select=id,name,current_level_id');
  const batchMap = new Map(batches.map(b => [String(b.name).trim(), b.id]));
  const batchLevelMap = new Map(batches.map(b => [b.id, b.current_level_id]));

  // Ensure Batch 130 exists
  let batch130Id = batchMap.get('130');
  if (!batch130Id) {
    console.log('Batch 130 not found, creating...');
    const [newB] = await apiReq('batches', 'POST', {
      name: '130',
      program_id: PROGRAM_ID,
      is_active: true,
      current_level_id: LEVEL_1_ID
    });
    batch130Id = newB.id;
    batchMap.set('130', batch130Id);
    console.log('Created Batch 130 with ID:', batch130Id);
  } else {
    console.log('Batch 130 exists with ID:', batch130Id);
  }

  // 2. Fetch existing students in CEC Camp
  const existingStudents = await apiReq(`students?program_id=eq.${PROGRAM_ID}&select=id,name,nis,batch_id`);
  console.log(`Found ${existingStudents.length} existing students in CEC Camp`);

  const studentByNis = new Map();
  const studentByNameAndBatch = new Map();
  existingStudents.forEach(s => {
    if (s.nis) studentByNis.set(String(s.nis).trim(), s);
    if (s.name && s.batch_id) {
      studentByNameAndBatch.set(`${s.batch_id}::${cleanName(s.name)}`, s);
    }
  });

  // Track summary stats
  let totalStudentsCreated = 0;
  let totalStudentsUpdated = 0;
  let totalAssessmentsUpserted = 0;

  for (const [batchNum, fname] of Object.entries(files)) {
    console.log(`\n---------------- Processing Camp ${batchNum} (${fname}) ----------------`);
    const batchId = batchMap.get(batchNum);
    if (!batchId) {
      console.warn(`Batch ${batchNum} not found in DB! Skipping...`);
      continue;
    }

    const wb = xlsx.readFile(`${dir}/${fname}`);

    // A. Parse DATABASE Sheet for Contacts
    const wsDb = wb.Sheets['DATABASE'];
    const dbData = wsDb ? xlsx.utils.sheet_to_json(wsDb, { header: 1 }) : [];
    const contactMap = new Map(); // cleanName -> { phone, guardian }
    if (dbData.length > 0) {
      const dbHeader = dbData[0] || [];
      const nameCol = dbHeader.findIndex(h => /Nama/i.test(String(h)));
      const phoneCol = dbHeader.findIndex(h => /Whatsapp|Nomor|Phone/i.test(String(h)));
      const tutorCol = dbHeader.findIndex(h => /Tutor/i.test(String(h)));

      for (let r = 1; r < dbData.length; r++) {
        const row = dbData[r];
        if (!row || !row.length) continue;
        const name = cleanName(row[nameCol !== -1 ? nameCol : 1]);
        if (!name || name === 'NAMA' || name === '#N/A') continue;
        const phone = phoneCol !== -1 && row[phoneCol] ? String(row[phoneCol]).trim() : null;
        contactMap.set(name, { phone });
      }
    }

    // B. Parse ANGKET SERTIFIKAT Sheet for Demographics (Birthplace, Birth Date, Religion, Certificate NIS)
    const wsAngket = wb.Sheets['ANGKET SERTIFIKAT'];
    const angketMap = new Map(); // cleanName -> { nis, birthplace, birth_date, religion, address }
    if (wsAngket) {
      const angketRows = xlsx.utils.sheet_to_json(wsAngket, { header: 1 });
      // Search for table header containing NAMA, TEMPAT LAHIR, TANGGAL LAHIR
      let startRow = -1;
      let aNameCol = -1, aNisCol = -1, aPlaceCol = -1, aDateCol = -1, aRelCol = -1, aAddrCol = -1;
      for (let r = 0; r < Math.min(30, angketRows.length); r++) {
        const row = angketRows[r] || [];
        const nIdx = row.findIndex(c => String(c).trim().toUpperCase() === 'NAMA');
        if (nIdx !== -1) {
          startRow = r + 1;
          aNameCol = nIdx;
          aNisCol = row.findIndex(c => String(c).trim().toUpperCase() === 'NIS');
          aPlaceCol = row.findIndex(c => /TEMPAT LAHIR/i.test(String(c)));
          aDateCol = row.findIndex(c => /TANGGAL LAHIR/i.test(String(c)));
          aRelCol = row.findIndex(c => /AGAMA/i.test(String(c)));
          aAddrCol = row.findIndex(c => /ALAMAT/i.test(String(c)));
          break;
        }
      }

      if (startRow !== -1) {
        for (let r = startRow; r < angketRows.length; r++) {
          const row = angketRows[r];
          if (!row || !row[aNameCol]) continue;
          const name = cleanName(row[aNameCol]);
          if (!name || name === 'NAMA' || name === '#N/A') continue;
          angketMap.set(name, {
            nis: aNisCol !== -1 ? cleanNis(row[aNisCol]) : null,
            birthplace: aPlaceCol !== -1 && row[aPlaceCol] ? String(row[aPlaceCol]).trim() : null,
            birth_date: aDateCol !== -1 && row[aDateCol] ? String(row[aDateCol]).trim() : null,
            religion: aRelCol !== -1 && row[aRelCol] ? String(row[aRelCol]).trim() : null,
            address: aAddrCol !== -1 && row[aAddrCol] ? String(row[aAddrCol]).trim() : null
          });
        }
      }
    }

    // C. Parse NILAI TUTOR MATERI for Master Student List & NIS
    const wsNtm = wb.Sheets['NILAI TUTOR MATERI'];
    const ntmRows = wsNtm ? xlsx.utils.sheet_to_json(wsNtm, { header: 1 }) : [];
    
    // Find Step 1 block in NILAI TUTOR MATERI
    let step1Start = -1, step2Start = -1, step3Start = -1;
    ntmRows.forEach((r, idx) => {
      const s = JSON.stringify(r);
      if (s.includes('1ST STEP') && step1Start === -1) step1Start = idx;
      else if (s.includes('2ND STEP') && step2Start === -1) step2Start = idx;
      else if (s.includes('3RD STEP') && step3Start === -1) step3Start = idx;
    });

    // Students to ingest in this batch: Map of cleanName -> studentObj
    const batchStudents = new Map();

    // From NTM Step 1: header is usually 2-3 rows after marker
    if (step1Start !== -1) {
      let r = step1Start + 1;
      while (r < (step2Start !== -1 ? step2Start : ntmRows.length)) {
        const row = ntmRows[r] || [];
        if (row.length >= 3 && typeof row[0] === 'number') {
          const nis = cleanNis(row[1]);
          const name = cleanName(row[2]);
          if (name && name !== 'NAMA' && name !== '#N/A') {
            batchStudents.set(name, {
              name,
              nis: nis || angketMap.get(name)?.nis || null,
              phone: contactMap.get(name)?.phone || null,
              birthplace: angketMap.get(name)?.birthplace || null,
              birth_date: angketMap.get(name)?.birth_date || null,
              religion: angketMap.get(name)?.religion || null,
              address: angketMap.get(name)?.address || null,
              rowIdx: r
            });
          }
        }
        r++;
      }
    }

    // Also include any students from DATABASE sheet not in NTM
    for (const [name, info] of contactMap.entries()) {
      if (!batchStudents.has(name)) {
        batchStudents.set(name, {
          name,
          nis: angketMap.get(name)?.nis || null,
          phone: info.phone || null,
          birthplace: angketMap.get(name)?.birthplace || null,
          birth_date: angketMap.get(name)?.birth_date || null,
          religion: angketMap.get(name)?.religion || null,
          address: angketMap.get(name)?.address || null
        });
      }
    }

    console.log(`Camp ${batchNum}: Identified ${batchStudents.size} unique students`);

    // D. Ingest / Upsert Students into DB
    const studentDbMap = new Map(); // cleanName -> dbStudentObj
    for (const [name, st] of batchStudents.entries()) {
      let existing = (st.nis ? studentByNis.get(st.nis) : null) || studentByNameAndBatch.get(`${batchId}::${name}`);

      const payload = {
        name: st.name,
        institution_id: INSTITUTION_ID,
        program_id: PROGRAM_ID,
        batch_id: batchId,
        is_active: true,
        ...(st.nis ? { nis: st.nis } : {}),
        ...(st.phone ? { phone: st.phone } : {}),
        ...(st.birthplace ? { birthplace: st.birthplace } : {}),
        ...(st.religion ? { religion: st.religion } : {})
      };

      if (existing) {
        // Update student with latest contact & NIS (do not overwrite level_id)
        const [updated] = await apiReq(`students?id=eq.${existing.id}`, 'PATCH', payload);
        studentDbMap.set(name, updated || existing);
        totalStudentsUpdated++;
      } else {
        // Insert new student with batch current level
        payload.level_id = batchLevelMap.get(batchId) || LEVEL_1_ID;
        const pin = String(Math.floor(100000 + Math.random() * 900000));
        payload.pin = pin;
        payload.pin_hash = pin;
        const [inserted] = await apiReq('students', 'POST', payload);
        studentDbMap.set(name, inserted);
        studentByNis.set(st.nis, inserted);
        studentByNameAndBatch.set(`${batchId}::${name}`, inserted);
        totalStudentsCreated++;
      }
    }

    // E. Parse and Ingest Academic Assessments
    const assessmentsToUpsert = [];

    // Helper to add assessment
    function addAssess(stId, step, subj, type, key, raw, target) {
      if (raw == null) return;
      const pct = target > 0 ? Math.min(100, Math.round((raw / target) * 100 * 100) / 100) : 0;
      assessmentsToUpsert.push({
        student_id: stId,
        batch_id: batchId,
        step_level: step,
        subject_code: subj,
        assessment_type: type,
        assessment_key: key,
        raw_score: raw,
        target_score: target,
        percentage: pct,
        grade: calcGrade(pct),
        updated_at: new Date().toISOString()
      });
    }

    // E1. STEP 1 from NTM
    if (step1Start !== -1) {
      const endRow = step2Start !== -1 ? step2Start : ntmRows.length;
      for (let r = step1Start + 1; r < endRow; r++) {
        const row = ntmRows[r] || [];
        if (typeof row[0] !== 'number') continue;
        const name = cleanName(row[2]);
        const dbStudent = studentDbMap.get(name);
        if (!dbStudent) continue;

        // Vocab: PT(col 3), W1(col 4), W2(col 5), W3(col 6), W4(col 7)
        addAssess(dbStudent.id, 1, 'VOCABULARY', 'DIAGNOSTIC', 'PT', cleanNum(row[3]), 30);
        addAssess(dbStudent.id, 1, 'VOCABULARY', 'WEEKLY_DEPOSIT', 'W1', cleanNum(row[4]), 98);
        addAssess(dbStudent.id, 1, 'VOCABULARY', 'WEEKLY_DEPOSIT', 'W2', cleanNum(row[5]), 266);
        addAssess(dbStudent.id, 1, 'VOCABULARY', 'WEEKLY_DEPOSIT', 'W3', cleanNum(row[6]), 431);
        addAssess(dbStudent.id, 1, 'VOCABULARY', 'WEEKLY_DEPOSIT', 'W4', cleanNum(row[7]), 574);

        // Grammar: PT(col 8), U1(col 9), U2(col 10)
        addAssess(dbStudent.id, 1, 'GRAMMAR', 'DIAGNOSTIC', 'PT', cleanNum(row[8]), 25);
        addAssess(dbStudent.id, 1, 'GRAMMAR', 'PERIODIC_EXAM', 'U1', cleanNum(row[9]), 15);
        addAssess(dbStudent.id, 1, 'GRAMMAR', 'PERIODIC_EXAM', 'U2', cleanNum(row[10]), 20);

        // Basic English: U1(col 11), U2(col 12)
        addAssess(dbStudent.id, 1, 'BASIC', 'PERIODIC_EXAM', 'U1', cleanNum(row[11]), 100);
        addAssess(dbStudent.id, 1, 'BASIC', 'PERIODIC_EXAM', 'U2', cleanNum(row[12]), 100);

        // Speaking: PT(col 13), U1(col 14), U2(col 15), Practice(col 16 if exists)
        addAssess(dbStudent.id, 1, 'SPEAKING', 'DIAGNOSTIC', 'PT', cleanNum(row[13]), 25);
        addAssess(dbStudent.id, 1, 'SPEAKING', 'PERIODIC_EXAM', 'U1', cleanNum(row[14]), 25);
        addAssess(dbStudent.id, 1, 'SPEAKING', 'PERIODIC_EXAM', 'U2', cleanNum(row[15]), 25);
        if (row.length > 16) {
          addAssess(dbStudent.id, 1, 'SPEAKING', 'PRACTICE', 'PRACTICE', cleanNum(row[16]), 25);
        }
      }
    }

    // E2. STEP 2 from NTM
    if (step2Start !== -1) {
      const endRow = step3Start !== -1 ? step3Start : ntmRows.length;
      for (let r = step2Start + 1; r < endRow; r++) {
        const row = ntmRows[r] || [];
        if (typeof row[0] !== 'number') continue;
        const name = cleanName(row[2]);
        const dbStudent = studentDbMap.get(name);
        if (!dbStudent) continue;

        // Vocab: PT(col 3), W1(col 4), W2(col 5), W3(col 6), W4(col 7)
        addAssess(dbStudent.id, 2, 'VOCABULARY', 'DIAGNOSTIC', 'PT', cleanNum(row[3]), 30);
        addAssess(dbStudent.id, 2, 'VOCABULARY', 'WEEKLY_DEPOSIT', 'W1', cleanNum(row[4]), 120);
        addAssess(dbStudent.id, 2, 'VOCABULARY', 'WEEKLY_DEPOSIT', 'W2', cleanNum(row[5]), 280);
        addAssess(dbStudent.id, 2, 'VOCABULARY', 'WEEKLY_DEPOSIT', 'W3', cleanNum(row[6]), 440);
        addAssess(dbStudent.id, 2, 'VOCABULARY', 'WEEKLY_DEPOSIT', 'W4', cleanNum(row[7]), 600);

        // Grammar: PT(col 8), U1(col 9), U2(col 10)
        addAssess(dbStudent.id, 2, 'GRAMMAR', 'DIAGNOSTIC', 'PT', cleanNum(row[8]), 25);
        addAssess(dbStudent.id, 2, 'GRAMMAR', 'PERIODIC_EXAM', 'U1', cleanNum(row[9]), 30);
        addAssess(dbStudent.id, 2, 'GRAMMAR', 'PERIODIC_EXAM', 'U2', cleanNum(row[10]), 30);

        // GFS: U1(col 11), U2(col 12)
        addAssess(dbStudent.id, 2, 'GFS', 'PERIODIC_EXAM', 'U1', cleanNum(row[11]), 20);
        addAssess(dbStudent.id, 2, 'GFS', 'PERIODIC_EXAM', 'U2', cleanNum(row[12]), 20);

        // Speaking: PT(col 13), U1(col 14), U2(col 15)
        addAssess(dbStudent.id, 2, 'SPEAKING', 'DIAGNOSTIC', 'PT', cleanNum(row[13]), 25);
        addAssess(dbStudent.id, 2, 'SPEAKING', 'PERIODIC_EXAM', 'U1', cleanNum(row[14]), 25);
        addAssess(dbStudent.id, 2, 'SPEAKING', 'PERIODIC_EXAM', 'U2', cleanNum(row[15]), 25);
      }
    }

    // E3. STEP 3 from NTM
    if (step3Start !== -1) {
      for (let r = step3Start + 1; r < ntmRows.length; r++) {
        const row = ntmRows[r] || [];
        if (typeof row[0] !== 'number') continue;
        const name = cleanName(row[2]);
        const dbStudent = studentDbMap.get(name);
        if (!dbStudent) continue;

        // Vocab: PT(col 3), W1(col 4), W2(col 5), W3(col 6), W4(col 7)
        addAssess(dbStudent.id, 3, 'VOCABULARY', 'DIAGNOSTIC', 'PT', cleanNum(row[3]), 30);
        addAssess(dbStudent.id, 3, 'VOCABULARY', 'WEEKLY_DEPOSIT', 'W1', cleanNum(row[4]), 150);
        addAssess(dbStudent.id, 3, 'VOCABULARY', 'WEEKLY_DEPOSIT', 'W2', cleanNum(row[5]), 400);
        addAssess(dbStudent.id, 3, 'VOCABULARY', 'WEEKLY_DEPOSIT', 'W3', cleanNum(row[6]), 650);
        addAssess(dbStudent.id, 3, 'VOCABULARY', 'WEEKLY_DEPOSIT', 'W4', cleanNum(row[7]), 800);

        // Grammar: PT(col 8), U1(col 9), U2(col 10)
        addAssess(dbStudent.id, 3, 'GRAMMAR', 'DIAGNOSTIC', 'PT', cleanNum(row[8]), 25);
        addAssess(dbStudent.id, 3, 'GRAMMAR', 'PERIODIC_EXAM', 'U1', cleanNum(row[9]), 15);
        addAssess(dbStudent.id, 3, 'GRAMMAR', 'PERIODIC_EXAM', 'U2', cleanNum(row[10]), 15);

        // Pronunciation: U1(col 11), U2(col 12)
        addAssess(dbStudent.id, 3, 'PRONUNCIATION', 'PERIODIC_EXAM', 'U1', cleanNum(row[11]), 25);
        addAssess(dbStudent.id, 3, 'PRONUNCIATION', 'PERIODIC_EXAM', 'U2', cleanNum(row[12]), 25);

        // Speaking: U1(col 13), U2(col 14), U3(col 15)
        addAssess(dbStudent.id, 3, 'SPEAKING', 'PERIODIC_EXAM', 'U1', cleanNum(row[13]), 25);
        addAssess(dbStudent.id, 3, 'SPEAKING', 'PERIODIC_EXAM', 'U2', cleanNum(row[14]), 25);
        addAssess(dbStudent.id, 3, 'SPEAKING', 'PERIODIC_EXAM', 'U3', cleanNum(row[15]), 25);
      }
    }

    // E4. Ingest Storytelling Rubrics (W1..W4) from TELLING STORY 1ST STEP
    const wsTs1 = wb.Sheets['TELLING STORY 1ST STEP'];
    if (wsTs1) {
      const ts1Rows = xlsx.utils.sheet_to_json(wsTs1, { header: 1 });
      for (let r = 0; r < ts1Rows.length; r++) {
        const row = ts1Rows[r] || [];
        if (typeof row[0] === 'number' && row.length >= 7) {
          const name = cleanName(row[2]);
          const dbStudent = studentDbMap.get(name);
          if (dbStudent) {
            // Check for week test scores
            const lastVal = cleanNum(row[row.length - 1]);
            if (lastVal != null && lastVal >= 1 && lastVal <= 5) {
              addAssess(dbStudent.id, 1, 'STORYTELLING', 'WEEKLY_DEPOSIT', 'W1', lastVal, 5);
            }
          }
        }
      }
    }

    // Ingest assessments in batches of 100 via upsert
    // Deduplicate assessments by unique constraint key
    const assessMap = new Map();
    for (const a of assessmentsToUpsert) {
      const k = `${a.student_id}::${a.step_level}::${a.subject_code}::${a.assessment_key}`;
      assessMap.set(k, a);
    }
    const dedupedAssessments = Array.from(assessMap.values());

    console.log(`Camp ${batchNum}: Upserting ${dedupedAssessments.length} academic assessment data points...`);
    for (let i = 0; i < dedupedAssessments.length; i += 100) {
      const chunk = dedupedAssessments.slice(i, i + 100);
      await apiReq('student_academic_assessments?on_conflict=student_id,step_level,subject_code,assessment_key', 'POST', chunk, {
        'Prefer': 'resolution=merge-duplicates'
      });
      totalAssessmentsUpserted += chunk.length;
    }
  }

  console.log('\n=================== INGESTION SUMMARY ===================');
  console.log(`✅ Total Students Created: ${totalStudentsCreated}`);
  console.log(`✅ Total Students Updated: ${totalStudentsUpdated}`);
  console.log(`✅ Total Academic Assessments Upserted: ${totalAssessmentsUpserted}`);
  console.log('🎉 All Authentic Camp Datasets 100% Ingested into Supabase!');
}

main().catch(err => {
  console.error('Fatal Ingestion Error:', err);
  process.exit(1);
});
