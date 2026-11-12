import { createClient } from '@supabase/supabase-js';

const SUPABASE_CLOUD_URL = 'https://oclajpyumehpojepcczg.supabase.co';
const SUPABASE_CLOUD_ANON_KEY = 'sb_publishable_L9T-SJpuAqK5291UEVhKMg_i7lvWFGB';

const sb = createClient(SUPABASE_CLOUD_URL, SUPABASE_CLOUD_ANON_KEY);

async function auditAllTests() {
  const { data: allTests } = await sb.from('tests').select('id, title, test_type, shell_code, payload, class_id, level_id');
  console.log(`Auditing all ${allTests?.length || 0} tests for metadata mismatches:\n`);

  const anomalies = [];
  for (const t of allTests || []) {
    const title = t.title || '';
    const shell = t.shell_code || '';
    const payload = t.payload || {};
    
    // Check if title has Topic name after ' - '
    const parts = title.split(' - ');
    const titleTopic = parts.length > 1 ? parts[1].trim() : null;

    // Check shell prefix vs payload
    const shellTheme = shell.replace(/^[0-9]+/, '').replace(/[-_].*$/, ''); // e.g. 1A1 -> A1 or A
    
    if (titleTopic) {
      // Find what theme/topic in vocabulary_vault matches this titleTopic
      const { data: vMatch } = await sb.from('vocabulary_vault')
        .select('topic, topic_code, theme, theme_code, target_level')
        .ilike('topic', titleTopic)
        .limit(1);
      
      if (vMatch && vMatch.length > 0) {
        const expected = vMatch[0];
        const payloadTheme = payload.theme_code;
        const payloadTopic = payload.topic_code;

        const isMismatch = (payloadTheme && expected.theme_code && payloadTheme.toUpperCase() !== expected.theme_code.toUpperCase());
        if (isMismatch) {
          anomalies.push({
            testId: t.id,
            title: t.title,
            shell: t.shell_code,
            payloadTheme,
            payloadTopic,
            expectedTheme: expected.theme_code,
            expectedTopicCode: expected.topic_code,
            topicName: titleTopic
          });
        }
      }
    }
  }

  console.log(`Found ${anomalies.length} test anomalies:`);
  console.log(JSON.stringify(anomalies, null, 2));
}

auditAllTests().catch(console.error);
