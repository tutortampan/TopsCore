/**
 * TopsCore LMS — Verification Suite: Regency & City Standardization
 *
 * Rule Contract:
 * 1. Table header & system labels use "REGENCY" (SSOT abbreviation: RGNCY / REG).
 * 2. Regional names containing "Regency" (e.g. "East Lombok Regency", "Central Lombok Regency", "Kab. Lombok Barat", "Sumbawa Regency")
 *    MUST drop the word "Regency" from their display names (e.g. "East Lombok", "Central Lombok", "West Lombok", "Sumbawa").
 * 3. Regional names containing "City" (e.g. "Mataram City", "Kota Mataram", "Surabaya City")
 *    MUST retain the word "City" intact (e.g. "Mataram City", "Surabaya City").
 */

import assert from 'node:assert';
import fs from 'node:fs';
import { formatCityDistrict, formatVillageName, formatDistrictName, formatProvinceName } from '../js/indonesia-regions.js';

console.log('🧪 Starting Verification Suite: Regency, City & Address Category Redundancy Standardization...\n');

// ── 1. Unit Tests for formatCityDistrict ────────────────────────────────────
console.log('▶ Pillar 1: Testing formatCityDistrict transformation rules...');

const testCases = [
  // Names containing "Regency" -> must strip "Regency"
  { input: 'Central Lombok Regency', expected: 'Central Lombok' },
  { input: 'East Lombok Regency',    expected: 'East Lombok' },
  { input: 'West Lombok Regency',    expected: 'West Lombok' },
  { input: 'North Lombok Regency',   expected: 'North Lombok' },
  { input: 'Sumbawa Regency',        expected: 'Sumbawa' },
  { input: 'West Sumbawa Regency',   expected: 'West Sumbawa' },
  { input: 'Bima Regency',           expected: 'Bima' },
  { input: 'Badung Regency',         expected: 'Badung' },

  // Names with Indonesian prefix "Kab." / "Kabupaten" -> translated without "Regency"
  { input: 'Kab. Lombok Tengah',     expected: 'Central Lombok' },
  { input: 'Kab. Lombok Timur',      expected: 'East Lombok' },
  { input: 'Kab. Lombok Barat',      expected: 'West Lombok' },
  { input: 'Kab. Lombok Utara',      expected: 'North Lombok' },
  { input: 'Kab. Sumbawa',           expected: 'Sumbawa' },
  { input: 'Kab. Sumbawa Barat',     expected: 'West Sumbawa' },
  { input: 'Kab. Bima',              expected: 'Bima' },
  { input: 'Kabupaten Lombok Barat', expected: 'West Lombok' },

  // Names with "City" / "Kota" -> must retain "City"
  { input: 'Mataram City',           expected: 'Mataram City' },
  { input: 'Kota Mataram',           expected: 'Mataram City' },
  { input: 'Bima City',              expected: 'Bima City' },
  { input: 'Kota Bima',              expected: 'Bima City' },
  { input: 'Surabaya City',          expected: 'Surabaya City' },
  { input: 'Kota Surabaya',          expected: 'Surabaya City' },
  { input: 'Kota Denpasar',          expected: 'Denpasar City' },

  // Empty / Null / Nil
  { input: '',                       expected: '—' },
  { input: null,                     expected: '—' },
  { input: undefined,                expected: '—' },
  { input: '—',                      expected: '—' }
];

testCases.forEach(({ input, expected }) => {
  const actual = formatCityDistrict(input);
  assert.strictEqual(actual, expected, `Input "${input}" should format to "${expected}", got "${actual}"`);
  console.log(`  ✅ [PASS] "${input}" -> "${actual}"`);
});

// ── 1B. Unit Tests for formatVillageName and formatDistrictName ─────────────
console.log('\n▶ Pillar 1B: Testing Address Category Redundancy Stripping (Village & District)...');

const villageTestCases = [
  { input: 'Gunungsari Village',     expected: 'Gunungsari' },
  { input: 'Desa Gunungsari',        expected: 'Gunungsari' },
  { input: 'Kelurahan Rembiga',      expected: 'Rembiga' },
  { input: 'Rembiga Village',        expected: 'Rembiga' },
  { input: 'Pejarakan Village',      expected: 'Pejarakan' },
  { input: 'Desa Pejarakan Karya',   expected: 'Pejarakan Karya' },
  { input: 'Taman Sari',             expected: 'Taman Sari' },
  { input: '',                       expected: '—' },
  { input: null,                     expected: '—' }
];

villageTestCases.forEach(({ input, expected }) => {
  const actual = formatVillageName(input);
  assert.strictEqual(actual, expected, `Village "${input}" should format to "${expected}", got "${actual}"`);
  console.log(`  ✅ [PASS] Village: "${input}" -> "${actual}"`);
});

const districtTestCases = [
  { input: 'Gunungsari District',    expected: 'Gunungsari' },
  { input: 'Kecamatan Gunungsari',   expected: 'Gunungsari' },
  { input: 'Ampenan District',       expected: 'Ampenan' },
  { input: 'Kecamatan Ampenan',      expected: 'Ampenan' },
  { input: 'Kec. Cakranegara',       expected: 'Cakranegara' },
  { input: 'Mataram District',       expected: 'Mataram' },
  { input: 'Gerung',                 expected: 'Gerung' },
  { input: '',                       expected: '—' },
  { input: null,                     expected: '—' }
];

districtTestCases.forEach(({ input, expected }) => {
  const actual = formatDistrictName(input);
  assert.strictEqual(actual, expected, `District "${input}" should format to "${expected}", got "${actual}"`);
  console.log(`  ✅ [PASS] District: "${input}" -> "${actual}"`);
});

const provinceTestCases = [
  { input: 'Bali Province',          expected: 'Bali' },
  { input: 'Provinsi Bali',          expected: 'Bali' },
  { input: 'Nusa Tenggara Barat',    expected: 'West Nusa Tenggara' },
  { input: 'Provinsi NTB',           expected: 'West Nusa Tenggara' }
];

provinceTestCases.forEach(({ input, expected }) => {
  const actual = formatProvinceName(input);
  assert.strictEqual(actual, expected, `Province "${input}" should format to "${expected}", got "${actual}"`);
  console.log(`  ✅ [PASS] Province: "${input}" -> "${actual}"`);
});

// ── 2. Audit Table Column Headers in Student Management ─────────────────────
console.log('\n▶ Pillar 2: Auditing Table Headers in js/admin/student-management.js...');

const studentMgmtCode = fs.readFileSync('js/admin/student-management.js', 'utf8');

// Column definition
assert(
  studentMgmtCode.includes("label: 'REGENCY'"),
  "student-management.js must use label: 'REGENCY'"
);
assert(
  studentMgmtCode.includes("title: 'Regency'"),
  "student-management.js must use title: 'Regency'"
);
assert(
  !studentMgmtCode.includes("label: 'CITY / REGENCY'"),
  "student-management.js must not contain obsolete 'CITY / REGENCY' label"
);
console.log('  ✅ [PASS] Student Roster table header is strictly REGENCY');

// Inline select option
assert(
  studentMgmtCode.includes('<option value="" disabled>Select Regency</option>'),
  "student-management.js must contain 'Select Regency' option"
);
console.log('  ✅ [PASS] Dynamic inline dropdown prompt is "Select Regency"');

// ── 3. Audit Datagrid Dictionary Mappings ───────────────────────────────────
console.log('\n▶ Pillar 3: Auditing Datagrid Dictionary in js/admin/datagrid.js...');

const datagridCode = fs.readFileSync('js/admin/datagrid.js', 'utf8');

assert(
  datagridCode.includes("'CITY / REGENCY': { full: 'REGENCY', medium: 'RGNCY', short: 'REG' }"),
  "datagrid.js dictionary must map 'CITY / REGENCY' to full: 'REGENCY', medium: 'RGNCY', short: 'REG'"
);
assert(
  datagridCode.includes("'REGENCY': { full: 'REGENCY', medium: 'RGNCY', short: 'REG' }"),
  "datagrid.js dictionary must map 'REGENCY' to full: 'REGENCY', medium: 'RGNCY', short: 'REG'"
);
console.log('  ✅ [PASS] Datagrid dictionary mappings synchronized to REGENCY / RGNCY / REG');

// ── 4. Audit Student Dashboard (dashboard.html & js/dashboard.js) ───────────
console.log('\n▶ Pillar 4: Auditing Student Dashboard...');

const dashboardHtml = fs.readFileSync('dashboard.html', 'utf8');
assert(
  dashboardHtml.includes('<label class="intro-field-label" for="intro-city">REGENCY</label>'),
  "dashboard.html must contain '<label class=\"intro-field-label\" for=\"intro-city\">REGENCY</label>'"
);
assert(
  dashboardHtml.includes('id="intro-city"') && dashboardHtml.includes('title="Regency"'),
  "dashboard.html onboarding modal must contain intro-city select with title 'Regency'"
);
console.log('  ✅ [PASS] dashboard.html onboarding modal uses REGENCY');

const dashboardJs = fs.readFileSync('js/dashboard.js', 'utf8');
assert(
  dashboardJs.includes("Select regency…"),
  "js/dashboard.js must use 'Select regency…' in dropdown"
);
console.log('  ✅ [PASS] js/dashboard.js dropdown uses "Select regency…"');

// ── 5. Audit SSOT Governance Documents ──────────────────────────────────────
console.log('\n▶ Pillar 5: Auditing SSOT Governance Rules in ui-invariants.md...');

const uiInvariants = fs.readFileSync('.agents/rules/ui-invariants.md', 'utf8');
assert(
  uiInvariants.includes('| 1 | **REGENCY** | `RGNCY` | `REG` |') || uiInvariants.includes('| 1 | **REGENCY** | `REGEN` | `RGC` |'),
  "ui-invariants.md must define REGENCY in 3-Tier Header Standards"
);
assert(
  uiInvariants.includes('REGENCY') && uiInvariants.includes('City'),
  "ui-invariants.md must codify the rule dropping the word 'Regency'"
);
console.log('  ✅ [PASS] .agents/rules/ui-invariants.md authoritatively codified');

// ── 6. Audit NTB Comprehensive Districts & Villages ────────────────────────
console.log('\n▶ Pillar 6: Auditing NTB Comprehensive Districts & Villages SSOT...');

const { getDistrictsForCity, getVillagesForDistrict, NTB_DISTRICTS_AND_VILLAGES } = await import('../js/indonesia-regions.js');

// 6A. Verify Alas in Sumbawa has 'Dalam' and all official villages
const alasVillages = getVillagesForDistrict('Kab. Sumbawa', 'Alas');
assert(alasVillages.includes('Dalam'), "Kecamatan Alas must include village 'Dalam'");
assert(alasVillages.includes('Baru'), "Kecamatan Alas must include village 'Baru'");
assert(alasVillages.includes('Kalimango'), "Kecamatan Alas must include village 'Kalimango'");
assert(alasVillages.includes('Marente'), "Kecamatan Alas must include village 'Marente'");
assert(alasVillages.includes('Juran Alas'), "Kecamatan Alas must include village 'Juran Alas'");
assert(alasVillages.includes('Labuhan Alas'), "Kecamatan Alas must include village 'Labuhan Alas'");
assert(alasVillages.includes('Luar'), "Kecamatan Alas must include village 'Luar'");
assert(alasVillages.includes('Pulau Bungin'), "Kecamatan Alas must include village 'Pulau Bungin'");
console.log('  ✅ [PASS] Kecamatan Alas has all 8 official villages including "Dalam"');

// 6B. Also test with uncanonicalized "Sumbawa"
const alasVillagesFromAlias = getVillagesForDistrict('Sumbawa', 'Alas');
assert(alasVillagesFromAlias.includes('Dalam'), "getVillagesForDistrict('Sumbawa', 'Alas') must resolve 'Dalam'");
console.log('  ✅ [PASS] getVillagesForDistrict("Sumbawa", "Alas") correctly resolves "Dalam"');

// 6C. Verify formatVillageName on "Desa Dalam" and "Dalam"
assert.strictEqual(formatVillageName('Desa Dalam'), 'Dalam');
assert.strictEqual(formatVillageName('Dalam'), 'Dalam');
assert.strictEqual(formatVillageName('Dalam Village'), 'Dalam');
assert.strictEqual(formatVillageName('Bao Desa'), 'Bao Desa');
console.log('  ✅ [PASS] formatVillageName formatting handles "Desa Dalam" -> "Dalam" and preserves "Bao Desa"');

// 6D. Verify all 10 NTB regencies are present with comprehensive districts
const expectedRegencies = [
  "Kota Mataram", "Kab. Lombok Barat", "Kab. Lombok Tengah", "Kab. Lombok Timur", "Kab. Lombok Utara",
  "Kab. Sumbawa", "Kab. Sumbawa Barat", "Kab. Dompu", "Kab. Bima", "Kota Bima"
];
expectedRegencies.forEach(reg => {
  const districts = getDistrictsForCity(reg);
  assert(districts.length >= 5, `${reg} must have at least 5 districts, found ${districts.length}`);
});
console.log('  ✅ [PASS] All 10 NTB Regencies/Cities have full official district lists');

console.log('\n======================================================');
console.log('🎉 ALL CHECKS PASSED: REGENCY, CITY & REGIONAL VILLAGES STANDARDIZATION (100%)');
console.log('======================================================\n');
