// TOPS CORE — Supabase Configuration & Client Init
// Replace SUPABASE_URL and SUPABASE_ANON_KEY with your project credentials.

export const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || 'https://xuiszvwfjccvucqpactf.supabase.co';
export const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY || 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';

// Import Supabase JS from CDN (ES Module compatible)
let _supabase = null;
let _initPromise = null;

export async function getSupabase() {
  if (window.supabaseClient) return window.supabaseClient;
  if (_supabase) return _supabase;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      if (!window.supabaseClient) {
        window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false
          }
        });
      }
      _supabase = window.supabaseClient;
      return _supabase;
    } catch (err) {
      _initPromise = null; // Reset on failure so subsequent attempts can retry
      throw err;
    }
  })();

  return _initPromise;
}

// Add callEdgeFunction to easily invoke Edge Functions
export async function callEdgeFunction(functionName, payload) {
  const sb = await getSupabase();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const { data: sessionData } = await sb.auth.getSession();
    const token = sessionData?.session?.access_token || SUPABASE_ANON_KEY;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { data = { error: text }; }
    
    if (!res.ok) {
      const err = new Error(data.error || `Edge function ${functionName} failed with status ${res.status}`);
      err.status = res.status;
      throw err;
    }
    if (data && data.error) {
      const err = new Error(data.error);
      err.status = 400;
      throw err;
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error("AI Evaluation timed out. Your answer is saved, please refresh and try submitting again.");
    }
    throw err;
  }
}
