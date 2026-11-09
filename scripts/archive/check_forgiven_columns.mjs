// Check which forgiven columns exist in attempts table
import { getSupabase } from '../js/supabase.js';

const sb = await getSupabase();

// Try fetching with all expected columns
const { data, error } = await sb
  .from('attempts')
  .select('id, is_forgiven, forgiven_by, forgiven_at, forgiven_reason')
  .limit(1);

if (error) {
  console.log('❌ Column error:', error.message);
  console.log('   Missing columns detected. Migration required.');
} else {
  console.log('✅ All forgiven columns exist in DB!');
  console.log('   Sample row keys:', Object.keys(data?.[0] || { id: null, is_forgiven: null, forgiven_by: null, forgiven_at: null, forgiven_reason: null }));
}

// Check is_manual_override
const { data: d2, error: e2 } = await sb
  .from('attempts')
  .select('id, is_manual_override')
  .limit(1);

if (e2) {
  console.log('❌ is_manual_override column missing:', e2.message);
} else {
  console.log('✅ is_manual_override column exists!');
}

