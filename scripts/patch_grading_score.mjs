import fs from 'fs';

const filePath = 'js/grading.js';
let content = fs.readFileSync(filePath, 'utf-8');

const target = `  const parseAttemptPoints = (att, max) => {
    if (!att) return null;
    if (att.points_awarded !== undefined && att.points_awarded !== null) {
      return Number(att.points_awarded);
    }
    if (att.points !== undefined && att.points !== null) {
      return Number(att.points);
    }
    const pct = att.effective_score !== undefined && att.effective_score !== null
      ? Number(att.effective_score)
      : (att.percentage !== undefined && att.percentage !== null ? Number(att.percentage) : null);
    if (pct !== null) {
      return Math.round((pct / 100) * max * 10) / 10;
    }
    return 0;
  };

  const parseAttemptPct = (att) => {
    if (!att) return null;
    if (att.effective_score !== undefined && att.effective_score !== null) return Number(att.effective_score);
    if (att.percentage !== undefined && att.percentage !== null) return Number(att.percentage);
    return null;
  };`;

const replacement = `  const parseAttemptPoints = (att, max) => {
    if (!att) return null;
    if (att.points_awarded !== undefined && att.points_awarded !== null) {
      return Number(att.points_awarded);
    }
    if (att.points !== undefined && att.points !== null) {
      return Number(att.points);
    }
    if (att.score !== undefined && att.score !== null) {
      return Number(att.score);
    }
    const pct = att.effective_score !== undefined && att.effective_score !== null
      ? Number(att.effective_score)
      : (att.percentage !== undefined && att.percentage !== null ? Number(att.percentage) : null);
    if (pct !== null) {
      return Math.round((pct / 100) * max * 10) / 10;
    }
    return 0;
  };

  const parseAttemptPct = (att, max = 0) => {
    if (!att) return null;
    if (att.effective_score !== undefined && att.effective_score !== null) return Number(att.effective_score);
    if (att.percentage !== undefined && att.percentage !== null) return Number(att.percentage);
    if (att.score !== undefined && att.score !== null && max > 0) {
      return Math.round((Number(att.score) / max) * 100);
    }
    return null;
  };`;

const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedTarget = target.replace(/\r\n/g, '\n');

if (!normalizedContent.includes(normalizedTarget)) {
  console.error("Target NOT found in js/grading.js!");
  process.exit(1);
}

const newContent = normalizedContent.replace(normalizedTarget, replacement);
fs.writeFileSync(filePath, newContent.replace(/\n/g, '\r\n'), 'utf-8');
console.log("Successfully patched parseAttemptPoints in js/grading.js!");
