const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://phwjrazbsmftbuqpmill.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBod2pyYXpic21mdGJ1cXBtaWxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY2MDc0MywiZXhwIjoyMDg3MjM2NzQzfQ.z3tbK3a9t31MsQVh2fuEoFBbSuIsGd2mEwMKGzKLdUM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Users:', users.map(u => ({ id: u.id, email: u.email })));
  }
}

main();
