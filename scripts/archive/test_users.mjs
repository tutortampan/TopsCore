
import { createClient } from '@supabase/supabase-js';
const url = 'http://127.0.0.1:54321';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const sb = createClient(url, key);
async function run() {
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({
    email: 'admin@topscore.com',
    password: 'admin_password123'
  });
  console.log('Auth:', authErr ? authErr.message : auth.user.email);
}
run();

