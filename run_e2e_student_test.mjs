// Mock window and localStorage
global.window = {
  __ENV__: {
    SUPABASE_URL: 'https://xuiszvwfjccvucqpactf.supabase.co',
    SUPABASE_ANON_KEY: 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4'
  }
};

global.localStorage = {
  getItem: (key) => global.localStorage[key] || null,
  setItem: (key, val) => { global.localStorage[key] = val; },
  removeItem: (key) => { delete global.localStorage[key]; }
};

async function runTest() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, getSupabase } = await import('./js/supabase.js');
  const { startAssessment, verifyStudentLogin } = await import('./js/api.js');
  
  console.log("1. Simulating Student Login...");
  try {
    const loginData = await verifyStudentLogin(
      'f51d4c2c-7c24-42ef-8d8f-b0f3e524a447', 
      '11deb53c-434a-44b0-83ca-1cc9b239cab3', 
      '4363c0a9-5aaf-43fb-819e-807c6ee9cbeb', 
      '1234'
    );
    
    console.log("Logged in successfully:", loginData.student.name);
    
    const sb = await getSupabase();
    if (loginData.token) {
      sb.auth.session = () => ({ access_token: loginData.token });
      sb.realtime.accessToken = loginData.token;
      sb.rest.headers['Authorization'] = `Bearer ${loginData.token}`;
    }

    console.log("2. Fetching dynamic shell assessment...");
    const { data: assessments } = await sb.from('assessments').select('*').limit(50);
    const vocabAssessment = assessments.find(a => a.payload && a.payload.is_dynamic_shell);

    if (!vocabAssessment) {
      console.log("No dynamic shell assessment found. E2E Test Aborted.");
      return;
    }
    
    console.log(`Found Assessment: ${vocabAssessment.title}`);
    
    console.log("3. Starting Assessment...");
    const attempt = await startAssessment(vocabAssessment.id, loginData.student.id, loginData.student.batch_id);
    console.log("Attempt created:", attempt.id);
    
    console.log("4. Fetching loaded questions...");
    const { data: questions, error } = await sb.from('attempt_answers').select('*').eq('attempt_id', attempt.id);
    if (error) throw error;
    
    console.log(`Loaded ${questions.length} questions from Vault!`);
    
    if (questions.length > 0) {
      console.log("Sample question:");
      console.log("- Expected:", questions[0].question_snapshot?.expected_text || questions[0].question_snapshot?.indonesian);
      console.log("- Type:", questions[0].question_snapshot?.word_type);
      console.log("✅ End-to-End Test Passed!");
    } else {
      console.error("❌ No questions were loaded into the attempt!");
    }
    
  } catch (err) {
    console.error("Error during assessment start:", err);
  }
}

runTest();
