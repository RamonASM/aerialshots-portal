import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Load .env.local manually
const envFile = readFileSync('.env.local', 'utf8')
const envVars = {}
envFile.split('\n').forEach(line => {
  // Skip comments and empty lines
  if (line.startsWith('#') || !line.trim()) return
  const idx = line.indexOf('=')
  if (idx > 0) {
    const key = line.substring(0, idx).trim()
    let value = line.substring(idx + 1).trim()
    // Remove surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || 
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    envVars[key] = value
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY

console.log('Supabase URL:', supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING')
console.log('Service Key:', supabaseServiceKey ? 'Present' : 'MISSING')

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTestSeller() {
  // First get the test agent
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, name, email')
    .eq('email', 'ramon+agent@aerialshots.media')
    .maybeSingle()

  if (agentError) {
    console.error('Error finding agent:', agentError)
    return
  }

  if (!agent) {
    console.error('No agent found with email ramon+agent@aerialshots.media')
    return
  }

  console.log('Found agent:', agent)

  // Check if seller already exists
  const { data: existingSeller } = await supabase
    .from('sellers')
    .select('id, email')
    .eq('email', 'ramon+seller@aerialshots.media')
    .maybeSingle()

  if (existingSeller) {
    console.log('Seller already exists:', existingSeller)
    return
  }

  // Create the seller
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .insert({
      agent_id: agent.id,
      email: 'ramon+seller@aerialshots.media',
      name: 'Test Homeowner',
      phone: '555-0003',
      access_level: 'delivery',
      is_active: true
    })
    .select()
    .single()

  if (sellerError) {
    console.error('Error creating seller:', sellerError)
    return
  }

  console.log('Created seller:', seller)
}

createTestSeller()
