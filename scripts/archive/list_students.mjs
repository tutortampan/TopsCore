import fs from 'fs';
import { pathToFileURL } from 'url';

global.window = {};
global.document = {};
global.window.__ENV__ = {
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: ''
};

const sbCode = fs.readFileSync('js/supabase.js', 'utf8');
const keyMatch = sbCode.match(/SUPABASE_ANON_KEY\s*=\s*window\.__ENV__\?\.SUPABASE_ANON_KEY\s*\|\|\s*['"]([^'"]+)['"]/);
if (keyMatch) {
  global.window.__ENV__.SUPABASE_ANON_KEY = keyMatch[1];
}

const url = window.__ENV__.SUPABASE_URL;
const key = window.__ENV__.SUPABASE_ANON_KEY;
const headers = { 'apikey': key, 'Authorization': 'Bearer ' + key };

fetch(url + '/rest/v1/students?name=eq.ABC Tester', { headers }).then(r=>r.json()).then(d=>console.log(d));
