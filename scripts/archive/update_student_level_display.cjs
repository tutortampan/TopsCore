const fs = require('fs');
let content = fs.readFileSync('d:/TopsCore/js/admin/student-management.js', 'utf8');

// 1. Update Promise.all in renderStudents
const target1 = `  const [rawData, allAttempts, allLevels] = await Promise.all([
    adminFetchAll('students', '*, programs!program_id(name, is_active), institutions!institution_id(name, is_active), batches!batch_id(name, is_active, current_level_id)'),
    adminFetchAll('attempts', '*, assessments(assessment_type, title, class_id)'),
    adminFetchAll('levels')
  ]);`;
  
const replacement1 = `  const [rawData, allAttempts, allLevels, allProgress] = await Promise.all([
    adminFetchAll('students', '*, programs!program_id(name, is_active), institutions!institution_id(name, is_active), batches!batch_id(name, is_active, current_level_id)'),
    adminFetchAll('attempts', '*, assessments(assessment_type, title, class_id)'),
    adminFetchAll('levels'),
    adminFetchAll('progress')
  ]);`;

// 2. Update levelName calculation inside gridData map
const target2 = `    const batchLevelId = s.batches?.current_level_id;
    const batchLevel = batchLevelId ? levelsMap.get(batchLevelId) : null;
    const levelName = batchLevel ? batchLevel.name : '—';`;

const replacement2 = `    const studentProgs = (allProgress || []).filter(p => p.student_id === s.id);
    let levelName = '—';
    if (studentProgs.length > 0) {
      const maxLevelIdx = Math.max(...studentProgs.map(p => p.unlocked_level || 1));
      const lvlObj = (allLevels || [])[maxLevelIdx - 1];
      levelName = lvlObj ? lvlObj.name : \`Level \${maxLevelIdx}\`;
      const distinctLevels = new Set(studentProgs.map(p => p.unlocked_level || 1));
      if (distinctLevels.size > 1) {
        levelName += '*'; // indicate mixed levels
      }
    } else {
      const batchLevelId = s.batches?.current_level_id;
      const batchLevel = batchLevelId ? levelsMap.get(batchLevelId) : null;
      levelName = batchLevel ? batchLevel.name : '—';
    }`;

// Do replacements using regex to avoid whitespace issues
let success1 = false;
let success2 = false;

// Regex for target1
const regex1 = /const\s+\[rawData,\s*allAttempts,\s*allLevels\]\s*=\s*await\s*Promise\.all\(\[\s*adminFetchAll\('students',\s*'[^']+'\),\s*adminFetchAll\('attempts',\s*'[^']+'\),\s*adminFetchAll\('levels'\)\s*\]\);/;
if (regex1.test(content)) {
  content = content.replace(regex1, replacement1);
  success1 = true;
} else if (content.includes('const [rawData, allAttempts, allLevels] = await Promise.all')) {
    // fallback
    content = content.replace('const [rawData, allAttempts, allLevels] = await Promise.all([', 'const [rawData, allAttempts, allLevels, allProgress] = await Promise.all([');
    content = content.replace("adminFetchAll('levels')\n  ]);", "adminFetchAll('levels'),\n    adminFetchAll('progress')\n  ]);");
    success1 = true;
}

const regex2 = /const\s+batchLevelId\s*=\s*s\.batches\?\.current_level_id;\s*const\s+batchLevel\s*=\s*batchLevelId\s*\?\s*levelsMap\.get\(batchLevelId\)\s*:\s*null;\s*const\s+levelName\s*=\s*batchLevel\s*\?\s*batchLevel\.name\s*:\s*'—';/;
if (regex2.test(content)) {
  content = content.replace(regex2, replacement2);
  success2 = true;
}

if (!success1 || !success2) {
    console.error("Replacement failed:", {success1, success2});
} else {
    fs.writeFileSync('d:/TopsCore/js/admin/student-management.js', content, 'utf8');
    console.log("Successfully updated student level display logic.");
}
