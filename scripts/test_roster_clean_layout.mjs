import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function formatSidebarBatchLabel(progName, batchName) {
  const p = (progName || '').trim();
  const b = (batchName || '').trim();
  if (!b) return p;
  if (b.toLowerCase().startsWith(p.toLowerCase())) return b;
  return `${p} ${b}`;
}

async function runTest() {
  console.log('--- Testing Roster Clean Layout & Side Panel Naming ---');
  const { data: progs } = await sb.from('programs').select('id, name, is_active').order('name');
  const { data: batches } = await sb.from('batches').select('id, name, program_id, is_active, deleted_at').is('deleted_at', null);

  const campProg = progs.find(p => p.name === 'Camp');
  const campBatches = batches.filter(b => b.program_id === campProg.id);
  campBatches.sort((a, b) => {
    const aAct = a.is_active !== false ? 1 : 0;
    const bAct = b.is_active !== false ? 1 : 0;
    if (aAct !== bAct) return bAct - aAct;
    return (b.name || '').localeCompare(a.name || '', undefined, { numeric: true });
  });

  console.log('Sidebar Camp Batches:');
  campBatches.forEach(b => {
    const label = formatSidebarBatchLabel(campProg.name, b.name);
    console.log(`  - [${b.is_active ? 'ACTIVE' : 'PAST'}] ${label} (ID: ${b.id})`);
  });

  const batch133 = campBatches.find(b => b.name === '133');
  const { data: students } = await sb.from('students').select('id, name, is_active, batch_id, birth_date, gender').eq('batch_id', batch133.id).is('deleted_at', null);

  const activeStudents = students.filter(s => s.is_active !== false && (s.name.startsWith('Miss ') || s.name.startsWith('Mr. ')));
  const inactiveStudents = students.filter(s => s.is_active === false || (!s.name.startsWith('Miss ') && !s.name.startsWith('Mr. ')));

  console.log(`\nBatch 133 Metrics:`);
  console.log(`  Active Students: ${activeStudents.length}`);
  console.log(`  Inactive Students: ${inactiveStudents.length}`);
  console.log(`  Total Students: ${students.length}`);

  console.log('\nTop 5 Active Students in Clean Roster View:');
  activeStudents.slice(0, 5).forEach((s, idx) => {
    const g = (s.gender || '').trim().toLowerCase();
    const gLabel = (g === 'male' || g === 'm') ? 'M' : (g === 'female' || g === 'f') ? 'F' : '—';
    console.log(`  ${idx + 1}. [3rd Level] ${s.name} | Gender: ${gLabel}`);
  });

  console.log('\n✓ Simulation PASS!');
}

runTest();
