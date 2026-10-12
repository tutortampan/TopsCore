import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  console.log('Navigating to admin to get a valid session...');
  await page.goto('http://127.0.0.1:8080/admin.html', { waitUntil: 'networkidle0' });

  const attempt = await page.evaluate(async () => {
      const { getSupabase } = await import('./js/supabase.js?v=' + Date.now());
      const sb = await getSupabase();
      
      const { data: attempt } = await sb
        .from('student_submissions')
        .select('id, student_id, students(name)')
        .in('status', ['SUBMITTED', 'AUTO_SUBMITTED'])
        .not('percentage', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();
        
      return attempt;
  });

  if (!attempt) {
    console.log('No attempts found.');
    await browser.close();
    process.exit(1);
  }
  console.log('Found attempt:', attempt.id);

  // Set session for student
  await page.evaluate((attempt) => {
    sessionStorage.setItem('topscore_session', JSON.stringify({
      student_id: attempt.student_id,
      student_name: attempt.students?.name || 'Student',
      role: 'student'
    }));
  }, attempt);

  console.log('Navigating to result.html...');
  await page.setViewport({ width: 390, height: 844 }); // Mobile width
  await page.goto(`http://127.0.0.1:8080/result.html?attempt_id=${attempt.id}`, { waitUntil: 'networkidle0' });

  // wait a bit for animations
  await new Promise(r => setTimeout(r, 2000));
  
  console.log('Taking screenshot...');
  await page.screenshot({ path: 'latest_result.png', fullPage: true });

  await browser.close();
  console.log('Screenshot saved to latest_result.png');
})();
