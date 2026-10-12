const { Client } = require('pg');
const client = new Client('postgresql://postgres:postgres@127.0.0.1:54322/postgres');
client.connect().then(() => {
  return client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
}).then(res => {
  console.log(res.rows.map(r => r.table_name).join(', '));
  client.end();
}).catch(console.error);
