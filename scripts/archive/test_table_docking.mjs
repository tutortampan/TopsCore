import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  
  // Test Option A: table { min-height: 100% }
  const htmlA = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { margin: 0; height: 100vh; background: #0b1120; color: #fff; font-family: sans-serif; display: flex; flex-direction: column; }
      .workspace { height: 600px; padding: 10px; box-sizing: border-box; }
      .table-wrap { height: 100%; overflow-y: auto; position: relative; border: 1px solid #334155; }
      table { width: 100%; min-height: 100%; border-collapse: collapse; }
      th { height: 30px; background: #0f172a; }
      td { height: 28px; border-bottom: 1px solid #1e293b; text-align: center; }
      tfoot td { height: 32px; background: #0d1527; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class='workspace'>
      <div class='table-wrap'>
        <table>
          <thead><tr><th>Col 1</th><th>Col 2</th></tr></thead>
          <tbody>
            <tr><td>Row 1</td><td>100</td></tr>
            <tr><td>Row 2</td><td>200</td></tr>
            <tr><td>Row 3</td><td>300</td></tr>
          </tbody>
          <tfoot><tr><td>TOTAL</td><td>600</td></tr></tfoot>
        </table>
      </div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(htmlA);
  const rowsA = await page.locator('tbody tr').all();
  for (let i = 0; i < rowsA.length; i++) {
    const b = await rowsA[i].boundingBox();
    console.log(`Option A Row ${i+1} height:`, b.height);
  }
  const tfootBoxA = await page.locator('tfoot').boundingBox();
  console.log('Option A Tfoot box y:', tfootBoxA.y, 'height:', tfootBoxA.height);

  // Test Option B: spacer row in tbody with height auto or flex spacer
  const htmlB = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { margin: 0; height: 100vh; background: #0b1120; color: #fff; font-family: sans-serif; }
      .workspace { height: 600px; padding: 10px; box-sizing: border-box; }
      .table-wrap { height: 100%; overflow-y: auto; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #334155; }
      table { width: 100%; border-collapse: collapse; display: table; }
      th { height: 30px; background: #0f172a; }
      td { height: 28px; border-bottom: 1px solid #1e293b; text-align: center; }
      .footer-table { width: 100%; border-collapse: collapse; display: table; }
      .footer-table td { height: 32px; background: #0d1527; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class='workspace'>
      <div class='table-wrap'>
        <table>
          <thead><tr><th>Col 1</th><th>Col 2</th></tr></thead>
          <tbody>
            <tr><td>Row 1</td><td>100</td></tr>
            <tr><td>Row 2</td><td>200</td></tr>
            <tr><td>Row 3</td><td>300</td></tr>
          </tbody>
        </table>
        <table class='footer-table'>
          <tr><td>TOTAL</td><td>600</td></tr>
        </table>
      </div>
    </div>
  </body>
  </html>
  `;
  await page.setContent(htmlB);
  const rowsB = await page.locator('tbody tr').all();
  for (let i = 0; i < rowsB.length; i++) {
    const b = await rowsB[i].boundingBox();
    console.log(`Option B Row ${i+1} height:`, b.height);
  }
  const footerBoxB = await page.locator('.footer-table').boundingBox();
  console.log('Option B Footer box y:', footerBoxB.y, 'height:', footerBoxB.height);

  // Test Option C: Single table, tbody with an empty expanding row tr.spacer { height: 100% }
  const htmlC = `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body { margin: 0; height: 100vh; background: #0b1120; color: #fff; font-family: sans-serif; }
      .workspace { height: 600px; padding: 10px; box-sizing: border-box; }
      .table-wrap { height: 100%; overflow-y: auto; border: 1px solid #334155; }
      table { width: 100%; height: 100%; border-collapse: collapse; }
      th { height: 30px; background: #0f172a; }
      tbody tr:not(.spacer-row) td { height: 28px; border-bottom: 1px solid #1e293b; text-align: center; }
      tbody tr.spacer-row td { height: auto; border: none; }
      tfoot td { height: 32px; background: #0d1527; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class='workspace'>
      <div class='table-wrap'>
        <table>
          <thead><tr><th>Col 1</th><th>Col 2</th></tr></thead>
          <tbody>
            <tr><td>Row 1</td><td>100</td></tr>
            <tr><td>Row 2</td><td>200</td></tr>
            <tr><td>Row 3</td><td>300</td></tr>
            <tr class='spacer-row'><td colspan='2'></td></tr>
          </tbody>
          <tfoot><tr><td>TOTAL</td><td>600</td></tr></tfoot>
        </table>
      </div>
    </div>
  </body>
  </html>
  `;
  await page.setContent(htmlC);
  const rowsC = await page.locator('tbody tr:not(.spacer-row)').all();
  for (let i = 0; i < rowsC.length; i++) {
    const b = await rowsC[i].boundingBox();
    console.log(`Option C Row ${i+1} height:`, b.height);
  }
  const tfootBoxC = await page.locator('tfoot').boundingBox();
  console.log('Option C Tfoot box y:', tfootBoxC.y, 'height:', tfootBoxC.height);

  await browser.close();
})();
