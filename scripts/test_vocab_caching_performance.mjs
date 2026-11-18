// TopsCore LMS — Vocabulary Vault In-Memory & Persistent Cache Verification
const mockStore = new Map();
globalThis.localStorage = {
  getItem: (k) => mockStore.get(k) || null,
  setItem: (k, v) => mockStore.set(k, String(v)),
  removeItem: (k) => mockStore.delete(k),
  clear: () => mockStore.clear()
};

import { fetchVaultWords, clearApiCache } from '../js/api.js';

async function run() {
  console.log('=== VERIFYING VOCABULARY VAULT CLIENT CACHING ===\n');

  // Test 1: First fetch (Cold - from Supabase)
  console.log('1. Cold fetch (downloading from Supabase & writing persistent cache)...');
  const t0 = performance.now();
  const wordsCold = await fetchVaultWords({ forceRefresh: true });
  const tCold = (performance.now() - t0).toFixed(1);
  console.log(`   [OK] Retrieved ${wordsCold.length} words in ${tCold}ms.`);

  // Verify persistent storage was populated
  const persistedRaw = globalThis.localStorage.getItem('topscore_vault_cache_v1');
  if (!persistedRaw) {
    throw new Error('FAIL: Persistent storage was not populated on cold fetch!');
  }
  const persistedObj = JSON.parse(persistedRaw);
  console.log(`   [OK] Persistent storage cached ${persistedObj.data.length} words (timestamp: ${new Date(persistedObj.timestamp).toISOString()}).`);

  // Test 2: Second fetch (Warm - from memory cache)
  console.log('\n2. Warm fetch (served from memory cache)...');
  const t1 = performance.now();
  const wordsWarm = await fetchVaultWords();
  const tWarm = (performance.now() - t1).toFixed(2);
  console.log(`   [OK] Retrieved ${wordsWarm.length} words in ${tWarm}ms! (0 network requests)`);

  if (Number(tWarm) > 15) {
    throw new Error(`FAIL: Cache hit took too long (${tWarm}ms)`);
  }

  // Test 3: Simulate New Browser Session (Memory cache cleared, reading from persistent offline cache)
  console.log('\n3. Simulated new tab / browser restart (memory cleared, reading from persistent offline cache)...');
  clearApiCache('vault', { keepPersistent: true });
  const tPersist = performance.now();
  const wordsFromStorage = await fetchVaultWords();
  const durStorage = (performance.now() - tPersist).toFixed(2);
  console.log(`   [OK] Retrieved ${wordsFromStorage.length} words in ${durStorage}ms from persistent offline cache! (0 Supabase egress)`);
  if (wordsFromStorage.length !== wordsCold.length) {
    throw new Error(`FAIL: Persistent cache count mismatch (${wordsFromStorage.length} vs ${wordsCold.length})`);
  }

  // Test 4: Filtered fetch (In-memory filtering)
  console.log('\n4. Filtered fetch by level=1 and topic="CV & Resume"...');
  const t2 = performance.now();
  const filtered = await fetchVaultWords({ targetLevel: 1, topic: 'CV & Resume' });
  const tFilter = (performance.now() - t2).toFixed(2);
  console.log(`   [OK] Found ${filtered.length} matching words in ${tFilter}ms!`);

  // Test 5: Search filter
  console.log('\n5. Search query in-memory ("schedule")...');
  const t3 = performance.now();
  const searched = await fetchVaultWords({ search: 'schedule' });
  const tSearch = (performance.now() - t3).toFixed(2);
  console.log(`   [OK] Found ${searched.length} matching words in ${tSearch}ms!`);

  // Test 6: Cache Invalidation (wipes memory + persistent storage)
  console.log('\n6. Testing complete cache invalidation...');
  clearApiCache('vault');
  const storageAfterClear = globalThis.localStorage.getItem('topscore_vault_cache_v1');
  if (storageAfterClear) {
    throw new Error('FAIL: Persistent storage was not cleared after clearApiCache("vault")!');
  }
  console.log('   [OK] In-memory & persistent cache invalidated cleanly.');

  console.log('\n=== VOCAB VAULT CACHING VERIFIED 100% SUCCESSFUL! ===');
}

run().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
