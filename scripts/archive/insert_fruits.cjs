const { Client } = require('pg');
const pgClient = new Client('postgres://postgres:postgres@127.0.0.1:54322/postgres');

const fruits = [
  { en: "Apple", id: "Apel" },
  { en: "Banana", id: "Pisang" },
  { en: "Orange", id: "Jeruk" },
  { en: "Mango", id: "Mangga" },
  { en: "Grape", id: "Anggur" },
  { en: "Pineapple", id: "Nanas" },
  { en: "Watermelon", id: "Semangka" },
  { en: "Melon", id: "Melon" },
  { en: "Papaya", id: "Pepaya" },
  { en: "Strawberry", id: "Stroberi" },
  { en: "Avocado", id: "Alpukat" },
  { en: "Guava", id: "Jambu Biji" },
  { en: "Lemon", id: "Lemon" },
  { en: "Lime", id: "Jeruk Nipis" },
  { en: "Coconut", id: "Kelapa" },
  { en: "Cherry", id: "Ceri" },
  { en: "Peach", id: "Persik" },
  { en: "Pear", id: "Pir" },
  { en: "Plum", id: "Plum" },
  { en: "Kiwi", id: "Kiwi" },
  { en: "Pomegranate", id: "Delima" },
  { en: "Dragon Fruit", id: "Buah Naga" },
  { en: "Starfruit", id: "Belimbing" },
  { en: "Rambutan", id: "Rambutan" },
  { en: "Mangosteen", id: "Manggis" },
  { en: "Durian", id: "Durian" },
  { en: "Jackfruit", id: "Nangka" },
  { en: "Salak", id: "Salak" },
  { en: "Duku", id: "Duku" },
  { en: "Lychee", id: "Leci" },
  { en: "Longan", id: "Kelengkeng" },
  { en: "Passion Fruit", id: "Markisa" },
  { en: "Soursop", id: "Sirsak" },
  { en: "Tamarind", id: "Asam Jawa" },
  { en: "Fig", id: "Ara" },
  { en: "Dates", id: "Kurma" },
  { en: "Blueberry", id: "Beri Biru" },
  { en: "Blackberry", id: "Beri Hitam" },
  { en: "Raspberry", id: "Rasberi" },
  { en: "Cranberry", id: "Kranberi" },
  { en: "Pomelo", id: "Jeruk Bali" },
  { en: "Tangerine", id: "Jeruk Keprok" },
  { en: "Cantaloupe", id: "Blewah" },
  { en: "Persimmon", id: "Kesemek" },
  { en: "Mulberry", id: "Murbei" },
  { en: "Gooseberry", id: "Kismis" },
  { en: "Quince", id: "Kwince" },
  { en: "Nectarine", id: "Nektarin" },
  { en: "Breadfruit", id: "Sukun" },
  { en: "Rose Apple", id: "Jambu Air" }
];

async function run() {
  await pgClient.connect();
  console.log("Connected to DB.");

  // Delete the accidental null inserts
  await pgClient.query("DELETE FROM vocabulary_vault WHERE theme_code IS NULL AND topic = 'Fruits'");

  let themeCode = 'TH1';
  let themeName = 'Theme 1';
  console.log(`Using Theme: ${themeCode} - ${themeName}`);

  // Find the next topic code for this theme
  const topRes = await pgClient.query("SELECT DISTINCT topic_code FROM vocabulary_vault WHERE target_level = 1 AND theme_code = $1 AND deleted_at IS NULL ORDER BY topic_code DESC LIMIT 1", [themeCode]);
  let newTopicCode = `${themeCode}1`;
  if (topRes.rowCount > 0) {
    const lastTopic = topRes.rows[0].topic_code;
    const numMatch = lastTopic.match(/\d+$/);
    if (numMatch) {
      newTopicCode = `${themeCode}_${parseInt(numMatch[0]) + 1}`;
    } else {
      newTopicCode = `${lastTopic}1`;
    }
  }
  const newTopicName = "Fruits";
  console.log(`New Topic: ${newTopicCode} - ${newTopicName}`);

  let inserted = 0;
  for (const fruit of fruits) {
    await pgClient.query(`
      INSERT INTO vocabulary_vault 
      (theme_code, theme, topic_code, topic, target_level, word_type, english, indonesian)
      VALUES ($1, $2, $3, $4, 1, 'Noun', $5, $6)
    `, [themeCode, themeName, newTopicCode, newTopicName, fruit.en, fruit.id]);
    inserted++;
  }

  console.log(`Inserted ${inserted} fruits into vocabulary_vault.`);
  await pgClient.end();
}

run().catch(console.error);
