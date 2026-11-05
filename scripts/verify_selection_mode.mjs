import puppeteer from 'puppeteer';
import path from 'path';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: 'new',
    args: ['--no-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 400, height: 800 });

  await page.evaluateOnNewDocument(() => {
    sessionStorage.setItem('topscore_session', JSON.stringify({
      student_id: 'dummy', student_name: 'Test', batch_id: 'b1'
    }));
  });

  const testPath = 'file:///' + path.resolve('test.html').replace(/\\/g, '/');
  await page.goto(testPath, { waitUntil: 'domcontentloaded' });

  const data = await page.evaluate(() => {
    const main = document.getElementById('test-main');
    main.innerHTML = '';
    main.style.cssText = 'flex:1; display:flex; flex-direction:column; justify-content:flex-start; align-items:center; min-height:100%; height:100%; max-height:100%; overflow:hidden; width:100% !important; max-width:440px !important; margin:0 auto !important; padding:0; box-sizing:border-box; gap:6px;';

    // Panel 1: Soal
    const qBox = document.createElement('div');
    qBox.style.cssText = 'width:100% !important; max-width:440px !important; height:calc(30% - 3px); min-height:80px; max-height:120px; flex:0 0 auto; margin:0 auto !important; display:flex; align-items:center; justify-content:center; text-align:center; background:#1a294a; border-radius:14px; box-sizing:border-box; flex-shrink:0; padding:6px 14px;';
    qBox.textContent = 'Berguna';
    main.appendChild(qBox);

    // Panel 2: Metadata (populated)
    const meta = document.createElement('div');
    meta.style.cssText = 'width:100% !important; max-width:440px !important; height:calc(10% - 2px); min-height:calc(10% - 2px); max-height:calc(10% - 2px); margin:0 auto !important; display:grid; grid-template-columns:1fr 1fr; grid-template-rows:1fr 1fr; gap:3px; box-sizing:border-box; flex-shrink:0;';
    meta.innerHTML = `
      <div style="height:100%; display:flex; align-items:center; justify-content:center; background:rgba(15,23,42,0.75); border-radius:6px; font-size:10px; color:#38bdf8; font-weight:700;">SHOPPING ESSENTIALS</div>
      <div style="height:100%; display:flex; align-items:center; justify-content:center; background:rgba(15,23,42,0.75); border-radius:6px; font-size:10px; color:#34d399; font-weight:700;">Words</div>
      <div style="height:100%; display:flex; align-items:center; justify-content:center; background:rgba(15,23,42,0.75); border-radius:6px; font-size:10px; color:#f8fafc; font-weight:700;">Shopping & Choosing Products</div>
      <div style="height:100%; display:flex; align-items:center; justify-content:center; background:rgba(15,23,42,0.75); border-radius:6px; font-size:10px; color:#cbd5e1; font-weight:700;">Adjective</div>
    `;
    main.appendChild(meta);

    // Panel 3: Selection Container (60% - 7px)
    const inter = document.createElement('div');
    inter.style.cssText = 'height:calc(60% - 7px); min-height:calc(60% - 7px); max-height:calc(60% - 7px); width:100% !important; max-width:440px !important; margin:0 auto !important; display:flex; flex-direction:column; overflow:hidden; gap:5px; box-sizing:border-box; flex-shrink:0;';

    const ans = document.createElement('div');
    ans.style.cssText = 'height:100%; min-height:100%; max-height:100%; overflow-y:auto; width:100% !important; max-width:440px !important; margin:0 auto !important; display:flex; flex-direction:column; justify-content:space-between; gap:6px; padding:8px; background:linear-gradient(180deg, rgba(20, 32, 58, 0.75) 0%, rgba(13, 20, 36, 0.9) 100%); border:1px solid rgba(255, 255, 255, 0.12); border-radius:14px; box-sizing:border-box;';

    const options = ['Useful', 'Helpful', 'Careful', 'Meaningful'];
    const letters = ['A', 'B', 'C', 'D'];
    options.forEach((opt, i) => {
      const btn = document.createElement('div');
      btn.style.cssText = 'min-height:38px; height:clamp(38px, 5.5vh, 50px); display:flex; align-items:center; gap:10px; padding:4px 10px; border-radius:10px; border:1px solid rgba(255,255,255,0.08); background:rgba(255,255,255,0.04); color:#e2e8f0; font-size:14px; font-weight:600; box-sizing:border-box; flex-shrink:0;';
      const letEl = document.createElement('div');
      letEl.style.cssText = 'background:rgba(255,255,255,0.08); color:#94a3b8; border-radius:8px; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:11.5px; font-weight:800; flex-shrink:0;';
      letEl.textContent = letters[i];
      const textEl = document.createElement('div');
      textEl.textContent = opt;
      btn.appendChild(letEl);
      btn.appendChild(textEl);
      ans.appendChild(btn);
    });

    inter.appendChild(ans);
    main.appendChild(inter);

    const r = (el) => {
      const b = el.getBoundingClientRect();
      return { top: Math.round(b.top), bottom: Math.round(b.bottom), height: Math.round(b.height) };
    };

    return {
      main: r(main),
      qBox: r(qBox),
      meta: r(meta),
      inter: r(inter),
      ans: r(ans)
    };
  });

  console.log(JSON.stringify(data, null, 2));
  await page.screenshot({ path: 'selection_mode_verification.png' });
  await browser.close();
}

run().catch(console.error);
