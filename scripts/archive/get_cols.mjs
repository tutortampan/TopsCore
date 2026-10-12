import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://xuiszvwfjccvucqpactf.supabase.co', 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4');

async function getCols() {
  const { data, error } = await supabase.from('questions').insert([{ nonexistent_column_123: 1 }]);
  console.log("Error details:", error);
}
getCols();
