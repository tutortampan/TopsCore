const { createClient } = require('@supabase/supabase-js');
const sb = createClient('http://127.0.0.1:54321', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0');

async function adminFetchAll(table, select = '*') {
  let allData = [];
  let from = 0;
  const pageSize = 1000;
  let query = sb.from(table).select(select);
  const noDeletedAtTables = ['attempts', 'attempt_answers', 'progress', 'audit_logs', 'site_settings', 'levels', 'assignments', 'user_professionals', 'modules'];
  if (!noDeletedAtTables.includes(table)) query = query.is('deleted_at', null);
  
  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return allData;
}

function cleanStudentName(name) {
  if (!name) return 'Unknown';
  return name.trim();
}

(async () => {
  console.log('Fetching data...');
  const [rawData, allAttempts, allLevels, allProgress, allPrograms, allBatches] = await Promise.all([
    adminFetchAll('students', '*, programs!program_id(name, is_active), institutions!institution_id(name, is_active), batches!batch_id(name, is_active, current_level_id)'),
    adminFetchAll('attempts', '*, assessments(assessment_type, title, class_id)'),
    adminFetchAll('levels'),
    adminFetchAll('progress'),
    adminFetchAll('programs'),
    adminFetchAll('batches')
  ]);
  
  console.log('Data fetched. Processing students...');
  const levelsMap = new Map();
  (allLevels || []).forEach(l => levelsMap.set(l.id, l));

  const dupMap = new Map();
  (rawData || []).forEach(s => {
    if (s.deleted_at) return;
    const key = `${s.program_id}::${(s.name || '').toLowerCase().trim()}`;
    if (!dupMap.has(key)) dupMap.set(key, []);
    dupMap.get(key).push(s);
  });
  const duplicateGroups = Array.from(dupMap.values()).filter(g => g.length > 1);
  const totalDuplicates = duplicateGroups.reduce((acc, g) => acc + (g.length - 1), 0);
  
  const gridData = (rawData || []).filter(s => {
    if (s.deleted_at) return false;
    if (s.institutions && s.institutions.is_active === false) return false;
    if (s.programs && s.programs.is_active === false) return false;
    if (s.batches && s.batches.is_active === false) return false;
    return true;
  }).map(s => {
    const studentAttempts = (allAttempts || []).filter(a => a.student_id === s.id);
    const completedAssessmentsCount = new Set(studentAttempts.filter(a => a.status === 'SUBMITTED').map(a => a.assessment_id || a.Assessment_id)).size;
    const latestAttempt = studentAttempts.sort((a,b) => new Date(b.created_at) - new Date(a.created_at))[0];
    
    let overallScoreStr = '-';
    let globalGrade = '-';
    let overallColor = 'rgba(255,255,255,0.4)';
    if (completedAssessmentsCount > 0) {
      let totalMaxScore = 0;
      let totalObtained = 0;
      studentAttempts.filter(a => a.status === 'SUBMITTED').forEach(a => {
        totalMaxScore += (a.max_score || 0);
        totalObtained += (a.total_score || 0);
      });
      if (totalMaxScore > 0) {
        const pct = Math.round((totalObtained / totalMaxScore) * 100);
        overallScoreStr = `${pct}%`;
      }
    }

    let ageDisplay = '—';
    if (s.birth_date) {
      const bd = new Date(s.birth_date);
      if (!isNaN(bd.getTime())) {
        const today = new Date();
        let age = today.getFullYear() - bd.getFullYear();
        const m = today.getMonth() - bd.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
        if (age >= 0) ageDisplay = `${age} yrs`;
      }
    }

    const remediationPending = studentAttempts
      .filter(a => a.status === 'SUBMITTED' && a.assessments?.assessment_type === 'EXAM')
      .some(a => {
        if (!a.max_score) return false;
        const pct = Math.round((a.total_score / a.max_score) * 100);
        return pct < 60 && !a.is_remedial_unlocked;
      });

    const studentProgs = (allProgress || []).filter(p => p.student_id === s.id);
    let levelName = '—';
    if (s.level_id) {
      const lvlObj = levelsMap.get(s.level_id);
      levelName = lvlObj ? lvlObj.name : '—';
    } else {
      const batchLevelId = s.batches?.current_level_id;
      const batchLevel = batchLevelId ? levelsMap.get(batchLevelId) : null;
      levelName = batchLevel ? batchLevel.name : '—';
    }

    return {
      ...s,
      displayName: cleanStudentName(s.name),
      sortName: cleanStudentName(s.name).toLowerCase(),
      ageDisplay,
      instName: s.institutions?.name || 'N/A',
      progName: s.programs?.name || 'N/A',
      batchName: s.batches?.name || '-',
      levelName,
      pinDisplay: s.pin || 'NOT SET',
      completedAssessments: completedAssessmentsCount,
      latestActivity: latestAttempt ? new Date(latestAttempt.created_at).toLocaleDateString() : 'Never',
      overallScoreStr,
      globalGrade,
      overallColor,
      remediationPending
    };
  });
  
  console.log('Processed', gridData.length, 'students successfully.');
})().catch(e => {
  console.error('ERROR OCCURRED:', e);
});
