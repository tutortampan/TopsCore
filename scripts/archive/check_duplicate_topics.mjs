import { getSupabase } from '../js/supabase.js';

async function run() {
  const sb = await getSupabase();
  const PAGE_SIZE = 1000;
  let allRows = [];
  let cur = 0;

  while (true) {
    const { data, error } = await sb.from('vocabulary_vault')
      .select('id, target_level, theme, theme_code, topic, topic_code')
      .is('deleted_at', null)
      .range(cur, cur + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    cur += PAGE_SIZE;
  }

  console.log('Total active rows fetched:', allRows.length);

  const topicCodeVariants = {};
  allRows.forEach(r => {
    const lvl = r.target_level;
    const thCode = (r.theme_code || '').trim().toUpperCase();
    const tp = (r.topic || '').trim();
    const tpCode = (r.topic_code || '').trim();

    const key = `${lvl}::${thCode}::${tp}`;
    if (!topicCodeVariants[key]) topicCodeVariants[key] = new Set();
    topicCodeVariants[key].add(tpCode);
  });

  const duplicates = Object.entries(topicCodeVariants).filter(([k, s]) => s.size > 1);
  console.log('Topics with multiple raw topic_codes in same theme/level:', duplicates.length);
  duplicates.forEach(([k, s]) => {
    console.log(' -', k, '-> variants:', Array.from(s));
  });

  // Also check same topic name across different theme codes in same level
  const topicAcrossThemes = {};
  allRows.forEach(r => {
    const lvl = r.target_level;
    const tp = (r.topic || '').trim().toLowerCase();
    const th = (r.theme || '').trim();
    const thCode = (r.theme_code || '').trim().toUpperCase();
    const key = `${lvl}::${tp}`;
    if (!topicAcrossThemes[key]) topicAcrossThemes[key] = [];
    topicAcrossThemes[key].push({ theme: th, themeCode: thCode });
  });

  const splitThemes = Object.entries(topicAcrossThemes).filter(([k, list]) => {
    const uniqueThemes = new Set(list.map(x => `${x.themeCode}::${x.theme}`));
    return uniqueThemes.size > 1;
  });
  console.log('Topics split across different themes in same level:', splitThemes.length);
  splitThemes.forEach(([k, list]) => {
    const u = Array.from(new Set(list.map(x => `${x.themeCode}::${x.theme}`)));
    console.log(' - Topic', k, 'is in themes:', u);
  });
}

run().catch(console.error);
