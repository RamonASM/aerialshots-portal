# ASM Portal Production Deployment Checklist

Last Updated: December 31, 2024

---

## Pre-Deployment Verification

### Code Quality
- [ ] `npm run build` passes with no errors
- [ ] `npm run lint` passes with no errors
- [ ] All 2,473+ tests passing (`npm test`)
- [ ] No critical `as any` type assertions in payment/auth code
- [ ] Console.log statements replaced with structured logger in API routes

### Security
- [ ] RLS policies enabled on all database tables
- [ ] Stripe webhook idempotency keys in place
- [ ] Token encryption for QuickBooks and Instagram
- [ ] CRON_SECRET required for scheduled tasks
- [ ] Webhook signature verification for Cubicasa, Zillow 3D, Bannerbear

---

## Environment Variables (Vercel Dashboard)

### Core Infrastructure (Required)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=https://app.aerialshots.media
NEXT_PUBLIC_BASE_URL=https://app.aerialshots.media
```

### AI Services (Required)
```bash
ANTHROPIC_API_KEY=sk-ant-...           # Claude AI agents
GOOGLE_AI_API_KEY=AIza...              # Gemini for staging/inpainting
OPENAI_API_KEY=sk-...                  # Whisper voice transcription (optional)
```

### HDR Processing (Required)
```bash
RUNPOD_ENDPOINT_ID=9nc4zhtpwlulud
RUNPOD_API_KEY=rpa_HHKUM0GO...
```

### Payments (Required)
```bash
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Communications (Required)
```bash
RESEND_API_KEY=re_...
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
```

### Render API / Storywork (Required)
```bash
RENDER_API_SECRET=l08r/ae0+PHpZkZHMTnZ0Bxm44QO0qe8UL2Wr6Uztk4=
UPSTASH_REDIS_REST_URL=https://apt-seahorse-6133.upstash.io
UPSTASH_REDIS_REST_TOKEN=ARf1AAImc...
```

### Location Services
```bash
GOOGLE_PLACES_API_KEY=AIza...
GOOGLE_MAPS_API_KEY=AIza...
TICKETMASTER_API_KEY=...
WALKSCORE_API_KEY=...
```

### Integrations
```bash
# Cubicasa (manual upload for now)
CUBICASA_API_KEY=...
CUBICASA_WEBHOOK_SECRET=...
CUBICASA_ENVIRONMENT=production

# Zillow 3D
ZILLOW_3D_WEBHOOK_SECRET=...

# Aloft - NOT REQUIRED (uses free FAA fallback)
# ALOFT_API_KEY=...  # Only for full LAANC auth
```

### Token Encryption (Required for Production)
```bash
QUICKBOOKS_TOKEN_ENCRYPTION_KEY=aD/yFdH1CQr1ryEd8Ictcvzxx1SFScqobwT5dgEIzJU=
INSTAGRAM_TOKEN_ENCRYPTION_KEY=CaNNhUl2mkalk8s522ZvgQ0E/u5PKFFF7ESn8fY3bEU=
```

### PWA / Push Notifications
```bash
VAPID_PUBLIC_KEY=BMNRSK5ajpX...
VAPID_PRIVATE_KEY=BEtnPBy3nBpjasShGFYWyVrILDbBsT...
```

### CMS / Blog
```bash
NEXT_PUBLIC_SANITY_PROJECT_ID=dqyvtgh9
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_BLOG_URL=https://blog.aerialshots.media
```

### Security / Admin
```bash
ADMIN_SECRET=...
CRON_SECRET=...                        # REQUIRED - cron jobs fail without this
```

---

## Database Setup

### Required Tables
- [ ] `ai_agents` - AI agent definitions
- [ ] `ai_agent_workflows` - Workflow configurations
- [ ] `ai_agent_executions` - Execution logs
- [ ] `api_keys` - Developer API keys (with key_prefix, requests_this_month)
- [ ] `invoices` - Direct agent billing

### Pending Migrations
Check if these are applied:
```bash
npx supabase db push --dry-run
```

Key migrations to verify:
- `20241221_004_ai_agents.sql` - AI agent system
- `20250102_004_render_api_keys.sql` - Render API keys
- `20250102_002_schema_gaps.sql` - agent_activity_summary, api_keys columns

### RLS Policies
Verify all tables have RLS enabled:
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false;
```

---

## Vercel Configuration

### Build Settings
```
Framework Preset: Next.js
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

### Domains
- Primary: `app.aerialshots.media`
- Marketing: `aerialshots.media` (same deployment)
- API: `app.aerialshots.media/api/*`

### Vercel Cron Jobs
Configure in `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/storage-cleanup",
      "schedule": "0 3 * * *"
    },
    {
      "path": "/api/cron/drip-campaigns",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/review-requests",
      "schedule": "0 10 * * *"
    }
  ]
}
```

---

## Post-Deployment Verification

### Smoke Tests
- [ ] Homepage loads at `aerialshots.media`
- [ ] Login works at `app.aerialshots.media/login`
- [ ] Admin dashboard accessible for staff
- [ ] Booking flow completes with test payment
- [ ] Media delivery page renders correctly

### Integration Tests
- [ ] HDR processing submits to RunPod and returns result
- [ ] Email sends via Resend (test booking confirmation)
- [ ] Stripe webhook receives and processes events
- [ ] Life Here API returns scores for FL addresses

### Monitoring
- [ ] Vercel Analytics enabled
- [ ] Error tracking configured (if using Sentry)
- [ ] Webhook event logging in `webhook_events` table

---

## Rollback Plan

If deployment fails:

1. **Immediate Rollback**
   - Vercel: Click "Promote to Production" on previous deployment

2. **Database Rollback**
   - Do NOT roll back migrations unless absolutely necessary
   - Use Supabase point-in-time recovery if data corruption

3. **Environment Variables**
   - Keep backup of working env vars in secure location

---

## Feature Flags / Gradual Rollout

Features that can be toggled:
- [ ] Carousel generation (needs Bannerbear or Satori templates)
- [ ] QuickBooks sync (not in use)
- [ ] Cubicasa API (use manual upload until configured)

---

## Support Contacts

- **Supabase Issues**: support@supabase.io
- **Stripe Issues**: support@stripe.com
- **RunPod Issues**: support@runpod.io
- **Vercel Issues**: support@vercel.com

---

## Version Information

- Next.js: 16
- Node.js: 20.x
- Supabase: Latest
- Last Audit: December 31, 2024
- Test Count: 2,473+ passing
