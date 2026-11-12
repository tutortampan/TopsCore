import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Top/.gemini/antigravity/brain/27d21bc9-3c91-40ba-b028-78a991797ece';

const files = [
  { name: '01_table_theme_manager.png', label: 'Theme Manager (Vocabulary Vault)' },
  { name: '02_table_test_blueprint.png', label: 'Test Blueprint (Vocabulary Vault)' },
  { name: '03_table_vocabulary_words.png', label: 'Vocabulary Words (Vocabulary Vault)' },
  { name: '04_table_phrases_idioms.png', label: 'Phrases & Idioms (Vocabulary Vault)' },
  { name: '05_table_batch_camp134.png', label: 'Batch Camp 134 Student Roster (Board)' },
  { name: '06_table_batch_evnikom.png', label: 'Batch Evnikom EV-07 Student Roster (Board)' },
  { name: '07_table_class_tests_camp2nd.png', label: 'Class Tests Tab (Class: Camp 2nd Vocab)' },
  { name: 'table_audit_4_attendance_matrix.png', label: 'Attendance Matrix Tab (Class: Camp 2nd Vocab)' },
  { name: '10_table_organization.png', label: 'Organization (Batches & Programs Table)' },
  { name: '11_table_batches.png', label: 'Unified Blueprint Control (Legacy #batches)' },
  { name: 'table_audit_curriculum.png', label: 'Curriculum (#classes-hub)' }
];

console.log('=== VERIFYING SCREENSHOT EXISTENCE ===');
for (const f of files) {
  const p = path.join(ARTIFACT_DIR, f.name);
  const exists = fs.existsSync(p);
  const size = exists ? fs.statSync(p).size : 0;
  console.log(`${f.name} | Exists: ${exists} | Size: ${(size/1024).toFixed(1)} KB | Label: ${f.label}`);
}

