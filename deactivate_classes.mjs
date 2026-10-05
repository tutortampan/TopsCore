import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = 'https://xuiszvwfjccvucqpactf.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function main() {
  const { error } = await sb.from('classes').update({ is_active: false }).neq('name', 'Vocabulary');
  if (error) {
    console.error(error);
  } else {
    console.log("Successfully deactivated all non-Vocabulary classes.");
  }
}

main().catch(console.error);
