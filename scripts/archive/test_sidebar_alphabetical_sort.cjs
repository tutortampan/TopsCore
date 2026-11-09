const assert = require('assert');

function extractNavText(elMock) {
  if (elMock.dataset && elMock.dataset.sidebarLabel) return elMock.dataset.sidebarLabel.trim();
  if (elMock.dataset && elMock.dataset.className) return elMock.dataset.className.trim();
  // Strip out text inside .nav-icon or emoji/leading whitespace
  const raw = elMock.text || '';
  return raw.replace(/^[^\w\d]+/gu, '').trim();
}

function sortItems(items) {
  return items.slice().sort((a, b) => {
    const textA = extractNavText(a);
    const textB = extractNavText(b);
    return textA.localeCompare(textB, undefined, { numeric: true, sensitivity: 'base' });
  });
}

// Domain A:
const domainA = [
  { text: 'Dashboard', dataset: { sub: 'dashboard' } },
  { text: 'Organization', dataset: { sub: 'organization' } },
  { text: 'Curriculum', dataset: { sub: 'classes-hub' } }
];
const sortedA = sortItems(domainA);
console.log('Domain A Sorted:', sortedA.map(i => i.text));
assert.deepStrictEqual(sortedA.map(i => i.text), ['Curriculum', 'Dashboard', 'Organization']);

// Domain B:
const domainB = [
  { text: 'Students Registration', dataset: { sub: 'student-registration' } },
  { text: 'Camp 134', dataset: { sidebarLabel: 'Camp 134', batchName: '134' } },
  { text: 'Camp 133', dataset: { sidebarLabel: 'Camp 133', batchName: '133' } },
  { text: 'Camp 132', dataset: { sidebarLabel: 'Camp 132', batchName: '132' } }
];
const sortedB = sortItems(domainB);
console.log('Domain B Sorted:', sortedB.map(i => i.text));
assert.deepStrictEqual(sortedB.map(i => i.text), ['Camp 132', 'Camp 133', 'Camp 134', 'Students Registration']);

// Domain C:
const domainC = [
  { text: 'Test Analytics', dataset: { sub: 'tests' } },
  { text: 'Vocabulary Vault', dataset: { sub: 'vocab_vault' } },
  { text: '3rd Vocabulary', dataset: { className: '3rd Vocabulary' } },
  { text: '2nd Vocabulary', dataset: { className: '2nd Vocabulary' } }
];
const sortedC = sortItems(domainC);
console.log('Domain C Sorted:', sortedC.map(i => i.text));
assert.deepStrictEqual(sortedC.map(i => i.text), ['2nd Vocabulary', '3rd Vocabulary', 'Test Analytics', 'Vocabulary Vault']);

// Domain D:
const domainD = [
  { text: 'System Settings', dataset: { sub: 'settings' } },
  { text: 'Modules (Core Blocks)', dataset: { sub: 'modules' } }
];
const sortedD = sortItems(domainD);
console.log('Domain D Sorted:', sortedD.map(i => i.text));
assert.deepStrictEqual(sortedD.map(i => i.text), ['Modules (Core Blocks)', 'System Settings']);

console.log('\nAll 4 domains sorted strictly alphabetical A-Z with 100% precision!');
