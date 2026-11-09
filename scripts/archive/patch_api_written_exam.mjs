import fs from 'fs';

const filePath = 'js/api.js';
let content = fs.readFileSync(filePath, 'utf-8');

const target = `  // Prioritize explicitly passed answerType, otherwise check existing or use defaultAnswerType
  const effectiveAnswerType = answerType || (existing && existing.answer_type) || defaultAnswerType;
  const effectiveMinScore = config.minimumRequiredScore !== undefined
    ? Number(config.minimumRequiredScore)
    : (existing?.minimum_required_score || 60);`;

const replacement = `  // Prioritize explicitly passed answerType; Words Exam is strictly written (Rule 2.13)
  const defaultAnswerType = (isTest && !isPhrase) ? 'written' : 'spoken';
  const effectiveAnswerType = answerType || ((isTest && !isPhrase) ? 'written' : (existing && existing.answer_type)) || defaultAnswerType;
  const effectiveMinScore = config.minimumRequiredScore !== undefined
    ? Number(config.minimumRequiredScore)
    : 70;`;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (!normalizedContent.includes(normalizedTarget)) {
  console.error("Target NOT found in js/api.js!");
  process.exit(1);
}

const newContent = normalizedContent.replace(normalizedTarget, replacement);
fs.writeFileSync(filePath, newContent.replace(/\n/g, '\r\n'), 'utf-8');
console.log("Successfully updated upsertDynamicTestShell in js/api.js!");

