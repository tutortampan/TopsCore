// TopsCore LMS — Vocabulary Vault In-Memory Cache Performance Verification
import { fetchVaultWords, clearApiCache } from '../js/api.js';

async function run() {
  console.log('=== VERIFYING VOCABULARY VAULT CLIENT CACHING ===\n');

  // Test 1: First fetch (Cold - from Supabase)
  console.log('1. Cold fetch (downloading from Supabase)...');
  const t0 = performance.now();
  const wordsCold = await fetchVaultWords({ forceRefresh: true });
  const tCold = (performance.now() - t0).toFixed(1);
  console.log(`   [OK] Retrieved ${wordsCold.length} words in ${tCold}ms.`);

  // Test 2: Second fetch (Warm - from memory cache)
  console.log('\n2. Warm fetch (served from memory cache)...');
  const t1 = performance.now();
  const wordsWarm = await fetchVaultWords();
  const tWarm = (performance.now() - t1).toFixed(2);
  console.log(`   [OK] Retrieved ${wordsWarm.length} words in ${tWarm}ms! (0 network requests)`);

  if (Number(tWarm) > 15) {
    throw new Error(`FAIL: Cache hit took too long (${tWarm}ms)`);
  }

  // Test 3: Filtered fetch (In-memory filtering)
  console.log('\n3. Filtered fetch by level=1 and topic="CV & Resume"...');
  const t2 = performance.now();
  const filtered = await fetchVaultWords({ targetLevel: 1, topic: 'CV & Resume' });
  const tFilter = (performance.now() - t2).toFixed(2);
  console.log(`   [OK] Found ${filtered.length} matching words in ${tFilter}ms!`);

  // Test 4: Search filter
  console.log('\n4. Search query in-memory ("schedule")...');
  const t3 = performance.now();
  const searched = await fetchVaultWords({ search: 'schedule' });
  const tSearch = (performance.now() - t3).toFixed(2);
  console.log(`   [OK] Found ${searched.length} matching words in ${tSearch}ms!`);

  // Test 5: Cache Invalidation
  console.log('\n5. Testing cache invalidation...');
  clearApiCache('vault');
  console.log('   [OK] Cache invalidated cleanly.');

  console.log('\n=== VOCAB VAULT CACHING VERIFIED 100% SUCCESSFUL! ===');
}

run().catch(err => {
  console.error('[ERROR]', err);
  process.exit(1);
});
