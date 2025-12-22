# Aerial Shots Media Dashboard - Project Specification

## Executive Summary

Build a media operations dashboard for Aerial Shots Media, a real estate photography company. The system automates the workflow from photo shoot scheduling through final delivery, solving critical bottlenecks in the current manual process. The primary win is creating a staging layer that bypasses Fotello's mobile upload limitations while maintaining same-day delivery capability.

---

## Business Context

**Company:** Aerial Shots Media (aerialshots.media)

**Team:**
- 2 Photographers
- 2 Videographers  
- 3 Virtual Assistants (Zillow outreach)
- 1 QC Staff (Media Delivery Specialist)
- 3 External Video Editors (contractors)

**Current Pain Points:**
1. Fotello mobile app cannot multi-select from different folders
2. Once Fotello enhancement starts on a listing, you cannot add more photos
3. Photographers have photos scattered across camera roll, SD cards, drone footage
4. No centralized visibility into job status for QC staff
5. Manual tracking of turnaround times and deadlines
6. No automated follow-up for reviews or referral tracking

**Competitive Advantage to Protect:** Same-day delivery capability

---

## Technical Architecture

### Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | Next.js 14 (App Router) | Single language (TypeScript), SSR, API routes built-in |
| Database | Supabase (PostgreSQL) | Real-time subscriptions, Row Level Security, generous free tier |
| File Storage | Supabase Storage | Photo staging before Fotello submission |
| Hosting | Vercel | Zero-config Next.js deployment, auto-scaling |
| Authentication | Supabase Auth | Role-based access (photographer, QC, admin) |

### Why This Stack
- Single language (TypeScript) for frontend, backend, and database queries
- Real-time updates out of the box - QC sees status changes instantly
- PWA capability for photographers (installable, works offline for photo selection)
- Economic at current scale (~35 shoots/month), predictable scaling costs
- Fast iteration - can deploy changes in minutes

---

## External Integrations

### Fotello API (Primary - Photo Editing)

**Base URL:** `https://us-central1-real-estate-firebase-4109e.cloudfunctions.net`

**Authentication:** Bearer token (API key to be requested from dev@fotello.co)

**Endpoints:**

```
POST /createListing
  Request: { name: string }
  Response: { id: string }
  Purpose: Create container for property photos

POST /createUpload  
  Request: { filename: string }
  Response: { id: string, presigned_url: string }
  Purpose: Get presigned S3 URL for each image
  Then: PUT file to presigned_url with Content-Type: application/octet-stream

POST /createEnhance
  Request: { upload_ids: string[], listing_id: string, shot_type: "interior" | "exterior" }
  Response: { id: string }
  Purpose: Submit uploads for AI HDR processing

GET /getEnhance?id={enhance_id}
  Response: { status: "pending" | "in_progress" | "completed" | "failed", enhanced_image_url?: string, enhanced_image_url_expires?: string }
  Purpose: Poll for completion status
```

**Integration Pattern:**
1. Photographer stages photos in our system (solves multi-folder problem)
2. Photographer reviews all photos are present
3. Photographer taps "Submit to Fotello"
4. Backend orchestrates: createListing → createUpload for each → PUT files → createEnhance
5. Backend polls getEnhance every 30 seconds until complete
6. Download enhanced images, notify QC

### Aryeo API (Delivery Platform)

**Documentation:** https://docs.aryeo.com/api/aryeo

**Webhooks Available:**
- appointment.scheduled
- appointment.assigned
- appointment.rescheduled
- appointment.canceled
- order.created
- order.paid
- order.fulfilled

**Key Data to Sync:**
- Order ID, property address, agent info
- Scheduled appointment time
- Photographer assignment
- Service package details (photo, video, floor plan, etc.)
- Rush order flag

**Integration Pattern:**
- Webhook fires on appointment.scheduled → Create job record in our database
- Pull order details for deliverables checklist
- Trigger delivery via API when QC marks complete (or manual)

### Dropbox API (Fallback Upload Path)

**Use Case:** Substitute photographers who don't have Fotello credentials linked

**Folder Structure:** `/Incoming/[Date]/[Property Address]/`

**Integration Pattern:**
- Register webhook for folder change notifications
- When new folder detected, create "Unassigned Upload" in dashboard
- QC assigns to correct job, triggers Fotello submission from dashboard

### HubSpot API (VA Outreach Tracking)

**Purpose:** Track Zillow outreach activity and VA incentive program

**Data to Pull:**
- Emails sent by each VA
- New bookings attributed to VA outreach
- Contact/deal creation timestamps

**Incentive Calculation:**
- $10-20 per first booking from new client
- Track which VA sourced which client
- Monthly/weekly reporting

### Slack API (Notifications)

**Use Case:** Real-time alerts to QC staff

**Triggers:**
- Photos ready for QC review
- Job approaching deadline
- Enhancement failed
- Unassigned upload needs attention

---

## Database Schema

```sql
-- Core job tracking (synced from Aryeo)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aryeo_order_id TEXT UNIQUE,
  property_address TEXT NOT NULL,
  agent_name TEXT,
  agent_email TEXT,
  agent_phone TEXT,
  photographer_id UUID REFERENCES users(id),
  videographer_id UUID REFERENCES users(id),
  scheduled_time TIMESTAMPTZ,
  
  -- Status tracking
  status TEXT DEFAULT 'scheduled', 
  -- Values: scheduled, photographer_checked_in, photos_uploading, photos_staged, 
  --         processing_fotello, ready_for_qc, in_qc, delivered
  
  -- Fotello references
  fotello_listing_id TEXT,
  fotello_enhance_id TEXT,
  
  -- Service details
  package_type TEXT, -- e.g., "Photo Only", "Photo + Video", "Full Package"
  includes_video BOOLEAN DEFAULT false,
  includes_floor_plan BOOLEAN DEFAULT false,
  includes_3d_tour BOOLEAN DEFAULT false,
  is_rush_order BOOLEAN DEFAULT false,
  
  -- Tracking
  coupon_code TEXT,
  referral_source TEXT,
  
  -- Timestamps for metrics
  photographer_checked_in_at TIMESTAMPTZ,
  photos_uploaded_at TIMESTAMPTZ,
  fotello_submitted_at TIMESTAMPTZ,
  fotello_completed_at TIMESTAMPTZ,
  qc_started_at TIMESTAMPTZ,
  qc_completed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Photo staging before Fotello submission
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Supabase storage path
  original_filename TEXT,
  file_size_bytes INTEGER,
  shot_type TEXT DEFAULT 'interior', -- interior, exterior, drone
  
  -- Fotello tracking
  fotello_upload_id TEXT,
  enhanced_url TEXT,
  enhanced_url_expires TIMESTAMPTZ,
  
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event log for timeline and metrics
CREATE TABLE job_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  -- Values: status_change, photo_uploaded, fotello_submitted, fotello_completed,
  --         qc_note_added, delivery_attempted, slack_notification_sent
  old_value TEXT,
  new_value TEXT,
  details JSONB,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (photographers, QC, admin)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL, -- photographer, videographer, qc, admin, va
  phone TEXT,
  fotello_linked BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Video production tracking
CREATE TABLE video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  videographer_id UUID REFERENCES users(id),
  editor_id UUID REFERENCES users(id),
  
  -- Tracking
  raw_footage_uploaded_at TIMESTAMPTZ,
  dropbox_folder_path TEXT,
  editing_started_at TIMESTAMPTZ,
  editing_completed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  
  status TEXT DEFAULT 'pending',
  -- Values: pending, footage_uploaded, assigned_to_editor, editing, review, delivered
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VA outreach tracking (synced from HubSpot)
CREATE TABLE outreach_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  va_id UUID REFERENCES users(id),
  contact_email TEXT,
  hubspot_contact_id TEXT,
  activity_type TEXT, -- email_sent, call_made, booking_created
  booking_value DECIMAL(10,2),
  attributed_job_id UUID REFERENCES jobs(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Coupon/referral tracking
CREATE TABLE coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  description TEXT,
  discount_type TEXT, -- percentage, fixed
  discount_value DECIMAL(10,2),
  referrer_name TEXT,
  referrer_email TEXT,
  times_used INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_scheduled_time ON jobs(scheduled_time);
CREATE INDEX idx_jobs_photographer ON jobs(photographer_id);
CREATE INDEX idx_photos_job ON photos(job_id);
CREATE INDEX idx_job_events_job ON job_events(job_id);
CREATE INDEX idx_job_events_created ON job_events(created_at);
```

---

## User Interfaces

### 1. Photographer PWA (Mobile-First)

**Access:** Progressive Web App, add to home screen

**Features:**
- View today's assigned jobs (pulled from Aryeo)
- Tap to check in when arriving at property
- Upload photos from any source (camera roll, Files app, multiple selections)
- Tag photos as interior/exterior/drone (or auto-detect from EXIF)
- Review staged photos before submission
- "Submit to Fotello" button (triggers backend automation)
- See job status updates

**Key UX Requirement:** Must handle multi-select from different folders. This is the core problem we're solving.

### 2. QC Dashboard (Desktop-First)

**Access:** Web app at aerialshots.media/dashboard

**Views:**

**Status Board**
- Kanban-style columns: Scheduled → In Progress → Staged → Processing → Ready for QC → In QC → Delivered
- Real-time updates via Supabase subscriptions
- Click job to see full details

**Priority Queue**
- Rush orders highlighted
- Time since photos ready (color coding: green < 30min, yellow 30-60min, red > 60min)
- Hours until deadline
- Priority score calculation

**Job Detail Panel**
- Property address, agent info
- Photographer who shot it
- All photos with thumbnails
- Download enhanced photos from Fotello
- Checklist: Photo QC done, Video sent to editor, Floor plan uploaded, etc.
- Mark job as delivered

**Metrics Dashboard**
- Average turnaround time (by photographer, overall)
- Same-day vs next-day delivery rate
- Jobs in each status
- Photographer performance

### 3. Admin Panel

**Features:**
- User management (add/remove photographers, QC staff)
- VA outreach reports (emails sent, bookings attributed)
- Incentive calculations
- Coupon code management
- Referral tracking

---

## Workflows

### Happy Path: Assigned Photographer

```
1. Aryeo webhook → appointment.scheduled
   └── Create job record, status: "scheduled"
   └── Assign to photographer

2. Photographer opens PWA
   └── Sees today's jobs

3. Photographer arrives, taps "Check In"
   └── Status: "photographer_checked_in"
   └── Timestamp: photographer_checked_in_at

4. Photographer shoots property

5. Photographer opens PWA, taps "Upload Photos"
   └── Multi-select from camera roll, Files, SD card
   └── Tags interior/exterior/drone
   └── Photos upload to Supabase Storage (staging)
   └── Status: "photos_uploading" → "photos_staged"

6. Photographer reviews all photos are present
   └── Can add more photos
   └── Can remove photos
   └── Can re-tag shot type

7. Photographer taps "Submit to Fotello"
   └── Status: "processing_fotello"
   └── Backend: createListing → createUpload (each) → PUT files → createEnhance

8. Backend polls getEnhance every 30 seconds
   └── When status = "completed":
       └── Download enhanced images
       └── Store enhanced URLs in photos table
       └── Status: "ready_for_qc"
       └── Slack notification to QC channel

9. QC opens dashboard, sees job in "Ready for QC"
   └── Downloads enhanced photos
   └── Opens in Lightroom/Photoshop
   └── Removes wires, cables, touch-ups
   └── Status: "in_qc"

10. QC uploads final photos to Aryeo
    └── Marks job as delivered
    └── Status: "delivered"
    └── Timestamp: delivered_at
```

### Fallback Path: Substitute Photographer (No Fotello Link)

```
1. Sub photographer doesn't have Fotello credentials

2. In PWA, they select "Upload to Dropbox" option

3. Photos upload to Dropbox: /Incoming/[Date]/[Address]/

4. Dropbox webhook fires → Backend detects new folder

5. Dashboard shows "Unassigned Upload" with folder contents
   └── Preview thumbnails
   └── Folder path shown

6. QC assigns upload to correct job
   └── Matches to existing job from Aryeo
   └── Or creates manual job if not in system

7. QC triggers Fotello submission from dashboard
   └── Backend downloads from Dropbox
   └── Uploads to Fotello via API
   └── Rest of flow continues normally
```

### Video Production Flow

```
1. Job includes video (includes_video = true)

2. Videographer shoots, uploads raw footage to Dropbox
   └── Folder: /Video/[Date]/[Address]/

3. System detects upload, creates video_job record
   └── Status: "footage_uploaded"

4. QC assigns to editor (or editor self-assigns)
   └── Status: "assigned_to_editor"

5. Editor downloads footage, edits

6. Editor uploads final video
   └── Status: "review"

7. QC reviews, approves
   └── Status: "delivered"
```

---

## API Routes

```
/api/auth/*              - Supabase Auth handlers

/api/jobs
  GET    /               - List jobs with filters (status, date range, photographer)
  GET    /:id            - Get single job with photos, events
  POST   /               - Create job (manual or from webhook)
  PATCH  /:id            - Update job status, details
  
/api/jobs/:id/photos
  GET    /               - List photos for job
  POST   /               - Upload photos to staging
  DELETE /:photoId       - Remove staged photo
  
/api/jobs/:id/submit-fotello
  POST   /               - Trigger Fotello submission
  
/api/jobs/:id/events
  GET    /               - Get event timeline for job

/api/fotello
  POST   /poll           - Called by cron to poll pending enhances
  
/api/webhooks
  POST   /aryeo          - Receive Aryeo webhooks
  POST   /dropbox        - Receive Dropbox webhooks
  
/api/users
  GET    /               - List users
  POST   /               - Create user
  PATCH  /:id            - Update user
  
/api/metrics
  GET    /turnaround     - Turnaround time stats
  GET    /photographer-performance  - Per-photographer metrics
  GET    /va-outreach    - VA activity stats
  
/api/coupons
  GET    /               - List coupons
  POST   /               - Create coupon
  GET    /:code/validate - Validate coupon code
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Fotello
FOTELLO_API_KEY=
FOTELLO_BASE_URL=https://us-central1-real-estate-firebase-4109e.cloudfunctions.net

# Aryeo
ARYEO_API_KEY=
ARYEO_WEBHOOK_SECRET=

# Dropbox
DROPBOX_ACCESS_TOKEN=
DROPBOX_WEBHOOK_SECRET=

# HubSpot
HUBSPOT_ACCESS_TOKEN=

# Slack
SLACK_BOT_TOKEN=
SLACK_QC_CHANNEL_ID=

# App
NEXT_PUBLIC_APP_URL=https://aerialshots.media
```

---

## Development Phases

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Supabase project setup
- [ ] Database schema migration
- [ ] Next.js project scaffold
- [ ] Authentication (Supabase Auth)
- [ ] Basic role-based routing

### Phase 2: Job Tracking (Week 2-3)
- [ ] Aryeo webhook integration
- [ ] Job list view with filters
- [ ] Job detail view
- [ ] Manual job creation
- [ ] Status board (Kanban view)

### Phase 3: Photographer PWA (Week 3-4)
- [ ] Mobile-responsive job list
- [ ] Check-in functionality
- [ ] Photo upload to Supabase Storage
- [ ] Multi-select from any folder (key feature)
- [ ] Shot type tagging
- [ ] Photo review before submission
- [ ] PWA manifest and service worker

### Phase 4: Fotello Integration (Week 4-5)
- [ ] API client for Fotello endpoints
- [ ] "Submit to Fotello" flow
- [ ] Polling for enhancement completion
- [ ] Download and store enhanced URLs
- [ ] Error handling and retry logic

### Phase 5: QC Dashboard (Week 5-6)
- [ ] Priority queue view
- [ ] Real-time status updates
- [ ] Download enhanced photos
- [ ] Checklist functionality
- [ ] Mark as delivered

### Phase 6: Dropbox Fallback (Week 6-7)
- [ ] Dropbox webhook setup
- [ ] Unassigned upload detection
- [ ] Assignment to job flow
- [ ] Trigger Fotello from dashboard

### Phase 7: Notifications & Metrics (Week 7-8)
- [ ] Slack integration
- [ ] Turnaround time calculations
- [ ] Metrics dashboard
- [ ] VA outreach sync from HubSpot

### Phase 8: Polish & Deploy (Week 8)
- [ ] Error monitoring (Sentry)
- [ ] Production deployment
- [ ] Team onboarding
- [ ] Documentation

---

## Success Metrics

| Metric | Current State | Target |
|--------|--------------|--------|
| QC visibility into job status | Manual checking | Real-time dashboard |
| Time to upload photos (photographer) | Multiple apps, folder management | Single PWA, any folder |
| Same-day delivery rate | Unknown | Tracked, maintained |
| Average turnaround time | Unknown | Tracked, reduced |
| Photographer time on admin tasks | High | Minimized |

---

## Dependencies / Blockers

1. **Fotello API Key** - Requested from dev@fotello.co. Cannot test integration without it.
2. **Aryeo API Access** - Need to confirm API key is available and webhook endpoints can be configured.
3. **Dropbox App** - Need to create Dropbox app for OAuth and webhook registration.

---

## Questions to Resolve

1. How should interior vs exterior be determined? Auto-detect from EXIF (flash usage, focal length) or manual tagging?
2. Should Fotello submission be automatic after photo review, or require explicit "Submit" tap?
3. What's the SLA for rush orders vs standard? (e.g., rush = 4 hours, standard = next day)
4. Video editor assignment - self-assign or QC assigns?
5. Email follow-up sequence for reviews - timing and content?

---

## File Structure

```
aerial-shots-dashboard/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── jobs/
│   │   │   ├── page.tsx           # Job list
│   │   │   └── [id]/
│   │   │       └── page.tsx       # Job detail
│   │   ├── board/
│   │   │   └── page.tsx           # Kanban status board
│   │   ├── metrics/
│   │   │   └── page.tsx           # Metrics dashboard
│   │   ├── admin/
│   │   │   └── page.tsx           # Admin panel
│   │   └── layout.tsx
│   ├── (photographer)/
│   │   ├── jobs/
│   │   │   ├── page.tsx           # Today's jobs
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # Job detail
│   │   │       └── upload/
│   │   │           └── page.tsx   # Photo upload
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/
│   │   ├── jobs/
│   │   ├── fotello/
│   │   ├── webhooks/
│   │   └── metrics/
│   └── layout.tsx
├── components/
│   ├── ui/                        # Shadcn components
│   ├── jobs/
│   │   ├── JobCard.tsx
│   │   ├── JobDetail.tsx
│   │   ├── StatusBoard.tsx
│   │   └── PriorityQueue.tsx
│   ├── photos/
│   │   ├── PhotoUploader.tsx
│   │   ├── PhotoGrid.tsx
│   │   └── PhotoTagging.tsx
│   └── layout/
│       ├── Sidebar.tsx
│       └── Header.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── fotello/
│   │   └── client.ts
│   ├── aryeo/
│   │   └── client.ts
│   ├── dropbox/
│   │   └── client.ts
│   └── utils/
├── hooks/
│   ├── useJobs.ts
│   ├── useRealtime.ts
│   └── useAuth.ts
├── types/
│   └── index.ts
├── public/
│   └── manifest.json              # PWA manifest
├── supabase/
│   └── migrations/
└── package.json
```

---

## Notes for Development

1. **Real-time is critical** - Use Supabase Realtime subscriptions for job status updates. QC should never have to refresh.

2. **Mobile upload UX** - The photo uploader must work seamlessly on iOS. Test with actual iPhone + card reader setup. Use `<input type="file" multiple accept="image/*">` with proper handling.

3. **Offline capability** - Photographer PWA should work offline for viewing jobs. Photo upload queues locally if offline, syncs when connected.

4. **Error resilience** - Fotello API calls should have retry logic. If enhancement fails, notify and allow manual retry.

5. **Audit trail** - Every status change, upload, and action should be logged to job_events for debugging and metrics.
