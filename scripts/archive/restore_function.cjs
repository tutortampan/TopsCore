const fs = require('fs');
let html = fs.readFileSync('dashboard.html', 'utf8');

const missingFunctionCode = `
    function applyStudentGenderUI(g) {
      const parts = session.student_name.trim().split(' ');
      const firstName = parts[0] || '';
      let formattedName = session.student_name;
      if (g === 'male') {
        formattedName = \`Mr. \${firstName}\`;
      } else if (g === 'female') {
        formattedName = \`Miss \${firstName}\`;
      }
`;

if (!html.includes('function applyStudentGenderUI(g)')) {
  html = html.replace(
    /const hdrNameEl = document\.getElementById\('header-student-name'\);/,
    missingFunctionCode + '\n      const hdrNameEl = document.getElementById(\'header-student-name\');'
  );
  fs.writeFileSync('dashboard.html', html);
  console.log('Restored applyStudentGenderUI function declaration');
} else {
  console.log('Function declaration already exists');
}
