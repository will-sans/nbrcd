// scripts/test-supabase.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testConnection() {
  const { data, error } = await supabase
    .from('action_logs')
    .select('*')
    .limit(1);
  console.log('Data:', data, 'Error:', error);
}

testConnection().catch(console.error);
