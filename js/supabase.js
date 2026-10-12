// TOPS CORE — Supabase Configuration & Client Init
export const SUPABASE_CLOUD_URL = 'https://oclajpyumehpojepcczg.supabase.co';
export const SUPABASE_CLOUD_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';

// Auto-detect environment: localhost / 127.0.0.1 defaults to Docker Local (Full Offline)
const isLocalHostname = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === ''
);

export const USE_LOCAL = (typeof window !== 'undefined' && typeof window.__ENV__?.USE_LOCAL === 'boolean')
  ? window.__ENV__.USE_LOCAL
  : isLocalHostname;

export const SUPABASE_URL = (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_URL)
  || (USE_LOCAL ? 'http://127.0.0.1:54321' : SUPABASE_CLOUD_URL);

export const SUPABASE_ANON_KEY = (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_ANON_KEY)
  || (USE_LOCAL
    ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
    : SUPABASE_CLOUD_ANON_KEY);

// Import Supabase JS from CDN (ES Module compatible)
let _supabase = null;
let _initPromise = null;

export async function getSupabase() {
  if (typeof window !== 'undefined' && window.supabaseClient) return window.supabaseClient;
  if (_supabase) return _supabase;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      let createClient;
      if (typeof process !== 'undefined' && process.versions?.node) {
        const mod = await import('@supabase/supabase-js');
        createClient = mod.createClient;
      } else {
        const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.3/+esm');
        createClient = mod.createClient;
      }
      _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      });
      if (typeof window !== 'undefined') {
        window.supabaseClient = _supabase;
      }
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
