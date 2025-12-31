/**
 * Integration Health Endpoint
 *
 * Returns status of all external integrations.
 * Used to diagnose which services are active, degraded, or disabled.
 */

import { NextResponse } from 'next/server'

type IntegrationStatus = 'active' | 'degraded' | 'disabled' | 'not_configured'

interface IntegrationHealth {
  name: string
  status: IntegrationStatus
  description: string
  requiredEnvVars: string[]
  missingEnvVars: string[]
  lastChecked: string
}

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  integrations: IntegrationHealth[]
  summary: {
    active: number
    degraded: number
    disabled: number
    notConfigured: number
    total: number
  }
}

function checkEnvVar(name: string): boolean {
  const value = process.env[name]
  return !!value && value.length > 0 && value !== 'undefined'
}

function getMissingVars(vars: string[]): string[] {
  return vars.filter((v) => !checkEnvVar(v))
}

function getIntegrationStatus(requiredVars: string[], optionalVars: string[] = []): IntegrationStatus {
  const missingRequired = getMissingVars(requiredVars)
  const missingOptional = getMissingVars(optionalVars)

  if (missingRequired.length === 0 && missingOptional.length === 0) {
    return 'active'
  }
  if (missingRequired.length === 0 && missingOptional.length > 0) {
    return 'degraded'
  }
  if (missingRequired.length > 0) {
    return 'not_configured'
  }
  return 'disabled'
}

export async function GET() {
  const timestamp = new Date().toISOString()

  // Define all integrations and their required env vars
  const integrations: IntegrationHealth[] = [
    // Core Infrastructure
    {
      name: 'Supabase',
      description: 'Database, Auth, and Storage',
      requiredEnvVars: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
      missingEnvVars: getMissingVars(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']),
      status: getIntegrationStatus(
        ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
        ['SUPABASE_SERVICE_ROLE_KEY']
      ),
      lastChecked: timestamp,
    },
    {
      name: 'Stripe',
      description: 'Payment processing',
      requiredEnvVars: ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
      missingEnvVars: getMissingVars(['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET']),
      status: getIntegrationStatus(
        ['STRIPE_SECRET_KEY', 'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'],
        ['STRIPE_WEBHOOK_SECRET']
      ),
      lastChecked: timestamp,
    },

    // Email & Communication
    {
      name: 'Resend',
      description: 'Email delivery',
      requiredEnvVars: ['RESEND_API_KEY'],
      missingEnvVars: getMissingVars(['RESEND_API_KEY']),
      status: getIntegrationStatus(['RESEND_API_KEY']),
      lastChecked: timestamp,
    },
    {
      name: 'Twilio',
      description: 'SMS notifications',
      requiredEnvVars: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'],
      missingEnvVars: getMissingVars(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']),
      status: getIntegrationStatus(['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER']),
      lastChecked: timestamp,
    },

    // AI Services
    {
      name: 'Anthropic Claude',
      description: 'AI content generation',
      requiredEnvVars: ['ANTHROPIC_API_KEY'],
      missingEnvVars: getMissingVars(['ANTHROPIC_API_KEY']),
      status: getIntegrationStatus(['ANTHROPIC_API_KEY']),
      lastChecked: timestamp,
    },
    {
      name: 'Google Gemini',
      description: 'AI vision and staging',
      requiredEnvVars: ['GOOGLE_AI_API_KEY'],
      missingEnvVars: getMissingVars(['GOOGLE_AI_API_KEY']),
      status: getIntegrationStatus(['GOOGLE_AI_API_KEY']),
      lastChecked: timestamp,
    },

    // Data Services
    {
      name: 'Google Places',
      description: 'Location autocomplete and nearby places',
      requiredEnvVars: ['GOOGLE_PLACES_API_KEY'],
      missingEnvVars: getMissingVars(['GOOGLE_PLACES_API_KEY']),
      status: getIntegrationStatus(['GOOGLE_PLACES_API_KEY']),
      lastChecked: timestamp,
    },
    {
      name: 'Ticketmaster',
      description: 'Local events for community pages',
      requiredEnvVars: ['TICKETMASTER_API_KEY'],
      missingEnvVars: getMissingVars(['TICKETMASTER_API_KEY']),
      status: getIntegrationStatus(['TICKETMASTER_API_KEY']),
      lastChecked: timestamp,
    },

    // Media Processing
    {
      name: 'FoundDR',
      description: 'HDR photo processing',
      requiredEnvVars: ['FOUNDDR_API_URL', 'FOUNDDR_API_SECRET'],
      missingEnvVars: getMissingVars(['FOUNDDR_API_URL', 'FOUNDDR_API_SECRET', 'FOUNDDR_WEBHOOK_SECRET']),
      status: getIntegrationStatus(
        ['FOUNDDR_API_URL', 'FOUNDDR_API_SECRET'],
        ['FOUNDDR_WEBHOOK_SECRET']
      ),
      lastChecked: timestamp,
    },
    {
      name: 'Cubicasa',
      description: 'Floor plan generation',
      requiredEnvVars: ['CUBICASA_API_KEY'],
      missingEnvVars: getMissingVars(['CUBICASA_API_KEY', 'CUBICASA_WEBHOOK_SECRET']),
      status: getIntegrationStatus(['CUBICASA_API_KEY'], ['CUBICASA_WEBHOOK_SECRET']),
      lastChecked: timestamp,
    },
    {
      name: 'Fotello',
      description: 'AI photo editing',
      requiredEnvVars: ['FOTELLO_WEBHOOK_SECRET'],
      missingEnvVars: getMissingVars(['FOTELLO_WEBHOOK_SECRET']),
      status: getIntegrationStatus(['FOTELLO_WEBHOOK_SECRET']),
      lastChecked: timestamp,
    },

    // Drone & Airspace
    {
      name: 'Aloft',
      description: 'Drone airspace authorization',
      requiredEnvVars: ['ALOFT_API_KEY'],
      missingEnvVars: getMissingVars(['ALOFT_API_KEY']),
      status: getIntegrationStatus(['ALOFT_API_KEY']),
      lastChecked: timestamp,
    },

    // Marketing
    {
      name: 'Bannerbear',
      description: 'Automated marketing asset generation',
      requiredEnvVars: ['BANNERBEAR_API_KEY'],
      missingEnvVars: getMissingVars(['BANNERBEAR_API_KEY']),
      status: getIntegrationStatus(['BANNERBEAR_API_KEY']),
      lastChecked: timestamp,
    },
    {
      name: 'Canva',
      description: 'Design integration',
      requiredEnvVars: ['CANVA_CLIENT_ID', 'CANVA_CLIENT_SECRET'],
      missingEnvVars: getMissingVars(['CANVA_CLIENT_ID', 'CANVA_CLIENT_SECRET']),
      status: getIntegrationStatus(['CANVA_CLIENT_ID', 'CANVA_CLIENT_SECRET']),
      lastChecked: timestamp,
    },

    // Accounting
    {
      name: 'QuickBooks',
      description: 'Invoice sync',
      requiredEnvVars: ['QUICKBOOKS_CLIENT_ID', 'QUICKBOOKS_CLIENT_SECRET'],
      missingEnvVars: getMissingVars(['QUICKBOOKS_CLIENT_ID', 'QUICKBOOKS_CLIENT_SECRET']),
      status: getIntegrationStatus(['QUICKBOOKS_CLIENT_ID', 'QUICKBOOKS_CLIENT_SECRET']),
      lastChecked: timestamp,
    },

    // CMS
    {
      name: 'Sanity',
      description: 'Blog content management',
      requiredEnvVars: ['NEXT_PUBLIC_SANITY_PROJECT_ID', 'NEXT_PUBLIC_SANITY_DATASET'],
      missingEnvVars: getMissingVars(['NEXT_PUBLIC_SANITY_PROJECT_ID', 'NEXT_PUBLIC_SANITY_DATASET']),
      status: getIntegrationStatus(['NEXT_PUBLIC_SANITY_PROJECT_ID', 'NEXT_PUBLIC_SANITY_DATASET']),
      lastChecked: timestamp,
    },
  ]

  // Calculate summary
  const summary = {
    active: integrations.filter((i) => i.status === 'active').length,
    degraded: integrations.filter((i) => i.status === 'degraded').length,
    disabled: integrations.filter((i) => i.status === 'disabled').length,
    notConfigured: integrations.filter((i) => i.status === 'not_configured').length,
    total: integrations.length,
  }

  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy'
  const criticalIntegrations = ['Supabase', 'Stripe', 'Resend']
  const criticalHealthy = integrations
    .filter((i) => criticalIntegrations.includes(i.name))
    .every((i) => i.status === 'active' || i.status === 'degraded')

  if (criticalHealthy && summary.active >= summary.total * 0.7) {
    overallStatus = 'healthy'
  } else if (criticalHealthy) {
    overallStatus = 'degraded'
  } else {
    overallStatus = 'unhealthy'
  }

  const response: HealthResponse = {
    status: overallStatus,
    timestamp,
    integrations,
    summary,
  }

  return NextResponse.json(response)
}
