// scripts/fix_vault_topic_codes.mjs
// Auto-fix and normalize all topic_code values in vocabulary_vault to unified format (A1, A2, B1...)

global.window = {
  addEventListener: () => {},
  location: { hostname: 'localhost' },
  localStorage: { getItem: () => null, setItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {} }
};

const { getSupabase } = await import('../js/supabase.js');
const sb = await getSupabase();

console.log('--- STARTING TOPIC CODE NORMALIZATION & AUTO-FIX ---');

// Known topic code mapping per theme and topic
const topicCodeMap = {
  // Level 2
  'Introduction & Delivery': 'A1',
  'Structuring a Presentation': 'A2',
  'Persuasive Speaking': 'A3',
  'Daily Office Life': 'A1',
  'Customer Service': 'A2',

  'Podcast Hosting & Introduction': 'B1',
  'Podcast Interviewing & Discussion': 'B2',
  'Podcast Production & Team Discussion': 'B3',
  'Podcast Evaluation & Collaboration': 'B4',
  'Travel & Transport': 'B1',
  'Hospitality & Dining': 'B2',

  'Shopping & Choosing Products': 'C1',
  'Cashier & Payment': 'C2',
  'Restaurant & Dining': 'C3',
  'Budgeting & Trip Planning': 'C4',

  'Kitchen Preparation & Cooking': 'D1',
  'Recipe Demonstration': 'D2',
  'Cooking Presentation & Teamwork': 'D3',
  'Review, Evaluation & Final Rehearsal': 'D4',

  // Level 3
  'Professional Identity': 'A1',
  'Building Your Professional Identity': 'A1',
  'CV & Resume': 'A2',
  'Crafting CV & Resume': 'A2',
  'Job Interview': 'A3',
  'Mastering Job Interview': 'A3',

  'Cultural Differences': 'B1',
  'Understanding Cultural Differences': 'B1',
  'International Customers': 'B2',
  'Handling International Customers': 'B2',
  'Cross-Cultural Problems': 'B3',
  'Solving Cross-Cultural Problems': 'B3',
  'Cross-Cultural Communication': 'B4',
  'Global Cross-Cultural Communication': 'B4',

  'Cultural Identity & Tradition': 'C1',
  'Family, Community & Social Values': 'C2',
  'Folklore, Arts & Traditional Crafts': 'C3',
  'Clothing, Food, Music & Performance': 'C4',
  'Travel & Modern Culture': 'C5',

  'Action & Mindset Foundations': 'D1',
  'Action, Analysis & Progress': 'D2',
  'Interaction, Process & Judgement': 'D3',
  'Strategy, Solutions & Expression': 'D4'
};

// Fetch all rows with pagination to overcome the 1000 row default limit
let allRows = [];
let page = 0;
const PAGE_SIZE = 1000;
while (true) {
  const { data: pageRows, error: fetchErr } = await sb
    .from('vocabulary_vault')
    .select('id, theme_code, theme, topic_code, topic, target_level')
    .is('deleted_at', null)
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (fetchErr) {
    console.error('Error fetching vault rows:', fetchErr);
    process.exit(1);
  }
  if (!pageRows || pageRows.length === 0) break;
  allRows.push(...pageRows);
  if (pageRows.length < PAGE_SIZE) break;
  page++;
}

console.log(`Fetched ${allRows.length} total active vault rows.`);

let updatedCount = 0;
const updates = [];

for (const row of allRows) {
  const currentCode = (row.topic_code || '').trim().toUpperCase();
  const thCode = (row.theme_code || 'A').trim().toUpperCase();
  const topicName = (row.topic || '').trim();

  let targetCode = topicCodeMap[topicName];

  if (!targetCode) {
    // If not in explicit map, synthesize from theme_code and existing topic_code or default
    if (currentCode && currentCode.length === 1 && /^[0-9]$/.test(currentCode)) {
      targetCode = `${thCode}${currentCode}`;
    } else if (currentCode && /^[A-Z][0-9]+$/i.test(currentCode)) {
      targetCode = currentCode;
    } else {
      targetCode = `${thCode}1`;
    }
  }

  // Check if update is needed
  if (currentCode !== targetCode) {
    updates.push({ id: row.id, topic_code: targetCode });
  }
}

console.log(`Identified ${updates.length} rows requiring topic_code normalization.`);

// Perform batch updates in chunks of 50
const CHUNK_SIZE = 50;
for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
  const chunk = updates.slice(i, i + CHUNK_SIZE);
  await Promise.all(
    chunk.map(u => sb.from('vocabulary_vault').update({ topic_code: u.topic_code, updated_at: new Date().toISOString() }).eq('id', u.id))
  );
  updatedCount += chunk.length;
  process.stdout.write(`Updated ${updatedCount}/${updates.length} rows...\r`);
}

console.log(`\nSuccessfully updated ${updatedCount} rows in Supabase PostgreSQL!`);

// Verification
const { data: remainingEmpty } = await sb
  .from('vocabulary_vault')
  .select('id, topic, theme_code')
  .is('deleted_at', null)
  .or('topic_code.eq.,topic_code.is.null');

console.log('Remaining empty topic_codes:', remainingEmpty ? remainingEmpty.length : 0);

const { data: sampleRows } = await sb
  .from('vocabulary_vault')
  .select('target_level, theme_code, topic_code, topic')
  .is('deleted_at', null)
  .limit(20);

console.log('\nSample normalized rows:');
console.table(sampleRows);
