import puppeteer from 'puppeteer';
import http from 'http';
import fs from 'fs';
import path from 'path';

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/admin.html';
  const filePath = path.join(process.cwd(), reqPath.replace(/^\//, ''));
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const mimes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
    res.writeHead(200, { 'Content-Type': mimes[ext] || 'text/plain' });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(0, async () => {
  const port = server.address().port;
  console.log('Testing server running on port', port);

  try {
    const browser = await puppeteer.launch({
      headless: 'new',
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    page.on('console', msg => {
      if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text());
    });

    await page.goto(`http://127.0.0.1:${port}/admin.html?status=active#students`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 4500));

    const examCells = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#student-grid-container table tbody tr'));
      return rows.slice(0, 8).map(tr => {
        const nameEl = tr.querySelector('td:nth-child(3)') || tr.querySelector('.student-name');
        const name = nameEl?.innerText?.trim() || 'unknown';
        const divs = Array.from(tr.querySelectorAll('td div[title*="Total Exam Points"]'));
        return {
          name,
          cells: divs.map(d => ({
            title: d.getAttribute('title'),
            text: d.innerText?.trim(),
            styleColor: d.style.color,
            computedColor: window.getComputedStyle(d).color
          }))
        };
      });
    });

    console.log('Exam Cells Result:');
    console.log(JSON.stringify(examCells, null, 2));

    await browser.close();
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    server.close();
  }
});
