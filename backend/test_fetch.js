const supabase = require('./supabase');
async function test() {
  await supabase.from('incidents').insert([{
    incident_id: 'TEST_123',
    emergency_id: 'EM_123',
    sender_safehelp_id: 'SH_123',
    status: 'active',
    sender_location: 'POINT(-122.4194 37.7749)',
    trigger_source: 'web'
  }]);
  const { data, error } = await supabase.from('incidents').select('*').limit(1);
  console.log(JSON.stringify(data, null, 2));
}
test();
