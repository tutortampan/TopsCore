import fs from 'fs';
import path from 'path';

console.log('=== VERIFYING PLAN REPOSITORY MIGRATION & PROTOCOL ===');

const PLANS_DIR = path.resolve('docs/plans');
if (!fs.existsSync(PLANS_DIR)) {
  console.error('FAIL: docs/plans directory does not exist.');
  process.exit(1);
}

const files = fs.readdirSync(PLANS_DIR).filter(f => f.endsWith('.md'));
console.log(`PASS: Found ${files.length} plan markdown files in docs/plans/.`);

if (files.length === 0) {
  console.error('FAIL: No plan files found in docs/plans/.');
  process.exit(1);
}

// Verify date-prefixed format YYYYMMDD - Title.md
let validFormatCount = 0;
let invalidFormatCount = 0;

for (const file of files) {
  if (/^\d{8}\s*-\s*.+\.md$/i.test(file)) {
    validFormatCount++;
  } else {
    invalidFormatCount++;
    console.warn(`WARN: File does not match strict YYYYMMDD format: ${file}`);
  }
}

console.log(`Format Check: ${validFormatCount} valid YYYYMMDD date-prefixed files, ${invalidFormatCount} exceptions.`);

// Check rule documents
const workflowRules = fs.readFileSync('.agents/rules/agent-workflow.md', 'utf8');
const agentsMd = fs.readFileSync('AGENTS.md', 'utf8');
const antigravityRules = fs.readFileSync('.antigravityrules', 'utf8');

const hasWorkflowDualWrite = /docs\/plans\//i.test(workflowRules) && /dual-write|dual-written/i.test(workflowRules);
const hasAgentsDualWrite = /docs\/plans\//i.test(agentsMd) && /dual-write|dual-written/i.test(agentsMd);
const hasAntigravityRulesDualWrite = /docs\/plans\//i.test(antigravityRules) && /dual-write|dual-written/i.test(antigravityRules);

if (!hasWorkflowDualWrite) {
  console.error('FAIL: .agents/rules/agent-workflow.md missing Dual-Write protocol.');
  process.exit(1);
}
console.log('PASS: .agents/rules/agent-workflow.md contains Dual-Write protocol.');

if (!hasAgentsDualWrite) {
  console.error('FAIL: AGENTS.md missing Rule 2.29 Dual-Write specification.');
  process.exit(1);
}
console.log('PASS: AGENTS.md contains Rule 2.29 Dual-Write specification.');

if (!hasAntigravityRulesDualWrite) {
  console.error('FAIL: .antigravityrules missing Rule 14 Dual-Write specification.');
  process.exit(1);
}
console.log('PASS: .antigravityrules contains Rule 14 Dual-Write specification.');

console.log('\n=== ALL PLAN REPOSITORY CHECKS PASSED SUCCESSFULLY ===');

