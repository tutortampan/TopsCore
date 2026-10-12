const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const config = fs.readFileSync('d:/TopsCore/js/supabase.js', 'utf8');
const url = config.match(/supabaseUrl\s*=\s*['"]([^'"]+)['"]/)[1];
const key = config.match(/supabaseAnonKey\s*=\s*['"]([^'"]+)['"]/)[1];
const sb = createClient(url, key);
sb.from('assessment_questions').select('*').eq('assessment_id', '031ce0e1-d369-4960-9bce-8bcbf3689fb7').then(res => {
  console.log('Questions count:', res.data.length);
  if (res.data.length > 0) {
    console.log(res.data[0]);
  }
});
