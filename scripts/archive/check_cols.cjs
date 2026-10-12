const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@127.0.0.1:54322/postgres');
client.connect().then(() => {
  return client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'vocabulary_vault'
  `);
}).then(res => {
  console.log(res.rows);
  return client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'questions'
  `);
}).then(res => {
  console.log("Questions Table:", res.rows);
  client.end();
}).catch(console.error);
