import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xuiszvwfjccvucqpactf.supabase.co';
const supabaseKey = 'sb_publishable_dvMkwNJpPlryF0KNiaJRfQ_-fR1WW_4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRPC() {
    console.log("Testing RPC...");
    const { data, error } = await supabase.rpc('reorder_assessment', {
        p_assessment_id: '00000000-0000-0000-0000-000000000000',
        p_new_order: 1,
        p_class_id: '00000000-0000-0000-0000-000000000000'
    });
    
    console.log("Error:", error);
    console.log("Data:", data);
}

testRPC();
