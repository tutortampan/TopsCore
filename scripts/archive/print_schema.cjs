const { Client } = require('pg');
const pgClient = new Client('postgres://postgres:postgres@127.0.0.1:54322/postgres');
async function run() {
  await pgClient.connect();
  const res = await pgClient.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'vocabulary_vault'");
  console.log(res.rows);
  await pgClient.end();
}
run();
