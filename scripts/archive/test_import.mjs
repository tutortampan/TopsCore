import { chromium } from 'playwright';
import fs from 'fs';

(async () => {
  const csvContent = "Institution,Program,Batch,Name,Gender,Birthdate,PIN\nInstitution A,Program B,Batch 1,John Doe,M,2010-01-01,1234\n";
  fs.writeFileSync('test_students_import.csv', csvContent);

  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err));

  await page.goto('http://localhost:8080/admin.html');
  await page.waitForTimeout(2000);
  
  await page.evaluate(() => {
    import('./js/admin/imports-exports.js?v=4.7.11').then(module => {
      const area = document.createElement('div');
      area.id = 'test-import-area';
      document.body.appendChild(area);
      module.renderImportStudents(area);
    });
  });

  await page.waitForTimeout(2000);

  // 1. Target Institution
  await page.selectOption('#import-student-program', { index: 1 });
  await page.waitForTimeout(500);

  // 2. Target Program
  await page.selectOption('#import-student-class', { index: 1 });
  await page.waitForTimeout(500);

  // 4. Select File
  await page.setInputFiles('#import-students-file', 'test_students_import.csv');
  
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'import_preview.png' });

  // Click confirm save
  const confirmBtn = await page.$('#btn-confirm-students-import');
  if (confirmBtn) {
    await confirmBtn.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'import_result.png' });
  } else {
    console.log('No confirm button found');
  }

  await browser.close();
})();
