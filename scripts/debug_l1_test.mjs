import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

async function main() {
  const { data: test } = await sb.from('tests').select('*').eq('id', 'b07e9d00-c3f2-4692-a600-ebc0ba33307b').single();
  
  // Step 1: levelNum
  const { data: levelRec } = await sb.from('levels').select('level_number').eq('id', test.level_id).single();
  console.log('levelRec:', levelRec);

  // Step 2: query
  const themeCode = test.payload.theme_code; // 'A'
  const topicCode = test.payload.topic_code; // 'A1'
  const candidateCodes = [
    String(topicCode).toUpperCase(),
    (/^[0-9]+$/.test(String(topicCode)) && themeCode) ? `${String(themeCode).toUpperCase()}${topicCode}` : null,
    String(topicCode).replace(/^[A-Za-z]/, ''),
    (1 && themeCode && /^[0-9]+$/.test(String(topicCode))) ? `1${String(themeCode).toUpperCase()}${topicCode}` : null,
    (1 && themeCode) ? `1${String(themeCode).toUpperCase()}${String(topicCode).replace(/^[A-Za-z]/, '')}` : null
  ].filter(Boolean);
  console.log('candidateCodes:', candidateCodes);

  let query = sb.from('vocabulary_vault')
    .select('id, english, indonesian, word_type, topic, topic_code, theme, theme_code, target_level, category')
    .is('deleted_at', null)
    .eq('target_level', 1)
    .eq('theme_code', themeCode)
    .in('topic_code', candidateCodes);

  const res = await query;
  console.log('res.data length:', res.data?.length);

  // Category filter
  const category = test.payload.category; // 'words'
  const filtered = (res.data || []).filter(w => {
    const wt = (w.word_type || '').toLowerCase();
    const isPhrase = ['expression', 'idiom', 'proverb', 'phrase'].includes(wt);
    return category === 'phrases' ? isPhrase : !isPhrase;
  });
  console.log('filtered words length:', filtered.length);
  console.log('filtered items:', filtered.map(f => `${f.english} (${f.word_type})`));

  // Now check what generateTestQuestions does with this test
  const api = await import('../js/api.js');
  const questions = await api.generateTestQuestions(sb, test);
  console.log('generateTestQuestions returned:', questions.length);
}

main().catch(console.error);
