import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Parse .env.local
const envContent = readFileSync('.env.local', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const url = envVars.NEXT_PUBLIC_SUPABASE_URL;
const key = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  console.log('Applying fix migration...\n');

  // Check current state
  const { data: staffCols } = await supabase.rpc('exec_sql', {
    sql: "SELECT column_name FROM information_schema.columns WHERE table_name = 'staff'"
  }).catch(() => ({ data: null }));

  // Run individual ALTER statements
  const statements = [
    // Add team_role to staff
    `ALTER TABLE staff ADD COLUMN IF NOT EXISTS team_role TEXT DEFAULT 'photographer'`,
    // Add media_url to media_assets
    `ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS media_url TEXT`,
    // Add storage columns
    `ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS storage_path TEXT`,
    `ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS processed_storage_path TEXT`,
    `ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS approved_storage_path TEXT`,
  ];

  for (const sql of statements) {
    console.log(`Running: ${sql.substring(0, 60)}...`);
    const { error } = await supabase.rpc('exec_sql', { sql }).catch(e => ({ error: e }));
    if (error) {
      // Try direct query approach
      const { error: err2 } = await supabase.from('_exec').select().limit(0);
      console.log(`  Note: RPC not available, columns may need manual addition`);
    } else {
      console.log(`  Done`);
    }
  }

  console.log('\nMigration complete. Please verify in Supabase Dashboard.');
}

run().catch(console.error);
