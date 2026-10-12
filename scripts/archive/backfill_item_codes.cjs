const { Client } = require('pg');
const pgClient = new Client('postgres://postgres:postgres@127.0.0.1:54322/postgres');

async function run() {
  await pgClient.connect();
  console.log("Connected to DB.");

  // 1. Add item_code column
  await pgClient.query('ALTER TABLE vocabulary_vault ADD COLUMN IF NOT EXISTS item_code VARCHAR');
  console.log("Added item_code column.");

  // 2. Fetch all rows ordered by created_at (to keep the sequence stable by insertion order)
  const res = await pgClient.query("SELECT id, target_level, theme_code, topic_code, word_type FROM vocabulary_vault ORDER BY created_at ASC");
  
  // 3. Track sequences per grouping. 
  // Grouping key: {target_level}-{theme_code}-{topic_code}-{category}-{word_type.toLowerCase()}
  const seqMap = {};

  let updated = 0;
  for (const row of res.rows) {
    const lvl = row.target_level || 1;
    const theme = (row.theme_code || 'X').replace(/\s+/g, '');
    let topic = (row.topic_code || 'X').replace(/\s+/g, '');
    
    // Strip theme_code from topic_code if it starts with it (e.g., A and A1 -> 1)
    if (topic.startsWith(theme) && topic !== theme) {
      topic = topic.substring(theme.length);
    }
    
    // Determine category
    const wType = (row.word_type || 'Noun').toLowerCase();
    let category = 'word';
    if (['expression', 'idiom', 'proverb', 'phrase', 'sentence'].includes(wType)) {
      category = 'phrase';
    }

    const groupKey = `${lvl}${theme}${topic}-${category}-${wType}`;
    
    if (!seqMap[groupKey]) {
      seqMap[groupKey] = 1;
    }
    
    const seqStr = seqMap[groupKey].toString().padStart(2, '0');
    const itemCode = `${groupKey}-${seqStr}`;
    
    seqMap[groupKey]++;

    // Update row
    await pgClient.query("UPDATE vocabulary_vault SET item_code = $1 WHERE id = $2", [itemCode, row.id]);
    updated++;
  }

  console.log(`Updated ${updated} rows with item_code.`);
  
  // 4. Make item_code unique
  try {
    await pgClient.query('ALTER TABLE vocabulary_vault ADD CONSTRAINT uq_vault_item_code UNIQUE (item_code)');
    console.log("Added unique constraint to item_code.");
  } catch (err) {
    console.log("Unique constraint already exists or failed:", err.message);
  }

  await pgClient.end();
}

run().catch(console.error);
