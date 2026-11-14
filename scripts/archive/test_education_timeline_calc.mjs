import assert from 'node:assert/strict';

export const EDUCATION_TIERS = [
  { id: 'kindergarten', label: 'Kindergarten (TK)', short: 'TK', offset: 6 },
  { id: 'elementary', label: 'Elementary School (SD)', short: 'SD', offset: 12 },
  { id: 'junior_high', label: 'Junior High School (SMP)', short: 'SMP', offset: 15 },
  { id: 'senior_high', label: 'Senior High School (SMA/SMK)', short: 'SMA/SMK', offset: 18 },
  { id: 'diploma', label: 'Diploma Degree (D1–D3)', short: 'Diploma', offset: 21 },
  { id: 'bachelor', label: "Bachelor's Degree (S1/D4)", short: 'S1/D4', offset: 22 },
  { id: 'master', label: "Master's Degree (S2)", short: 'S2', offset: 24 },
  { id: 'doctorate', label: 'Doctoral Degree (S3)', short: 'S3', offset: 28 }
];

export function calculateEducationTimeline(birthYear, highestLevelId) {
  const by = parseInt(birthYear, 10);
  if (!by || isNaN(by)) return [];

  const baseTiers = ['kindergarten', 'elementary', 'junior_high', 'senior_high'];
  let path = [];

  if (baseTiers.includes(highestLevelId)) {
    const idx = baseTiers.indexOf(highestLevelId);
    path = baseTiers.slice(0, idx + 1);
  } else if (highestLevelId === 'diploma') {
    path = [...baseTiers, 'diploma'];
  } else if (highestLevelId === 'bachelor') {
    path = [...baseTiers, 'bachelor'];
  } else if (highestLevelId === 'master') {
    path = [...baseTiers, 'bachelor', 'master'];
  } else if (highestLevelId === 'doctorate') {
    path = [...baseTiers, 'bachelor', 'master', 'doctorate'];
  } else {
    path = [...baseTiers];
  }

  return path.map(id => {
    const tier = EDUCATION_TIERS.find(t => t.id === id);
    const gradYear = by + tier.offset;
    return {
      id: tier.id,
      level: tier.short,
      name: tier.label,
      institution: tier.label,
      year: gradYear
    };
  });
}

// Tests
console.log('Testing calculateEducationTimeline with birth year 2002...');

// Test 1: Kindergarten
const t1 = calculateEducationTimeline(2002, 'kindergarten');
assert.equal(t1.length, 1);
assert.equal(t1[0].year, 2008);

// Test 2: Senior High
const t2 = calculateEducationTimeline(2002, 'senior_high');
assert.equal(t2.length, 4);
assert.equal(t2[3].year, 2020);

// Test 3: Bachelor
const t3 = calculateEducationTimeline(2002, 'bachelor');
assert.equal(t3.length, 5);
assert.equal(t3[4].id, 'bachelor');
assert.equal(t3[4].year, 2024);

// Test 4: Master
const t4 = calculateEducationTimeline(2002, 'master');
assert.equal(t4.length, 6);
assert.equal(t4[5].id, 'master');
assert.equal(t4[5].year, 2026);

// Test 5: Doctorate
const t5 = calculateEducationTimeline(2002, 'doctorate');
assert.equal(t5.length, 7);
assert.equal(t5[6].id, 'doctorate');
assert.equal(t5[6].year, 2030);

// Test 6: Diploma
const t6 = calculateEducationTimeline(2002, 'diploma');
assert.equal(t6.length, 5);
assert.equal(t6[4].id, 'diploma');
assert.equal(t6[4].year, 2023);

console.log('✓ All 6 timeline calculation unit tests PASSED successfully!');

