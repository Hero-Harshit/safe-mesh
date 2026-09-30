const supabase = require('./supabase');
async function clean() {
  await supabase.from('incidents').delete().eq('incident_id', 'TEST_123');
  console.log('Deleted fake incident');
}
clean();
