import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const sbFile = fs.readFileSync('js/supabase.js', 'utf8');
const urlMatch = sbFile.match(/const SUPABASE_URL = '(.*?)'/);
const keyMatch = sbFile.match(/const SUPABASE_KEY = '(.*?)'/);

if (!urlMatch || !keyMatch) {
  console.log('Could not find Supabase credentials');
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function checkDb() {
  const { data: levels } = await supabase.from('levels').select('*');
  console.log('LEVELS:', levels);

  const { data: classes } = await supabase.from('classes').select('*, levels(name)').order('level_id');
  console.log('CLASSES:', classes);
}

checkDb();
