# Delivery Notifier Agent

**Category:** Operations
**Execution Mode:** Async

## Purpose

Sends personalized delivery notifications to agents when their media is ready. The agent uses AI to generate contextual usage tips for each media category, helping agents maximize the value of their media package.

## How It Works

1. **Input Processing**: Receives listing data including media categories present
2. **AI Tip Generation**: Uses Claude to generate personalized usage tips for each media category
3. **Email Formatting**: Creates both HTML and plain text versions of the notification
4. **Logging/Sending**: Currently logs the notification (email integration pending)

## Input Schema

```typescript
{
  listingId: string           // Listing UUID
  agentEmail: string          // Agent's email address
  agentName: string           // Agent's display name
  address: string             // Property address for personalization
  mediaCategories: string[]   // Array of category keys: ['mls', 'social_feed', 'video', etc.]
  deliveryUrl: string         // URL to the delivery page
}
```

## Supported Media Categories

- `mls` - MLS Ready photos
- `social_feed` - Social Media Feed (square/landscape)
- `social_stories` - Social Stories (9:16 vertical)
- `video` - Property Video
- `print` - Print Ready files
- `floorplan` - Floor Plans
- `matterport` - 3D Virtual Tour
- `interactive` - Interactive Content (Zillow 3D, etc.)

## Output Schema

```typescript
{
  success: true,
  output: {
    listingId: string
    agentEmail: string
    categoriesNotified: string[]
    notification: {
      subject: string
      previewText: string
      tips: Record<string, string>  // category -> personalized tip
    }
    emailSent: boolean
    emailSentAt: string | null
  },
  tokensUsed: number
}
```

## Example Usage

### Via API

```typescript
import { executeAgent } from '@/lib/agents'

const result = await executeAgent({
  agentSlug: 'delivery-notifier',
  triggerSource: 'automated',
  listingId: 'listing-123',
  input: {
    listingId: 'listing-123',
    agentEmail: 'agent@example.com',
    agentName: 'Sarah Johnson',
    address: '123 Oak Street, Beverly Hills',
    mediaCategories: ['mls', 'social_feed', 'video'],
    deliveryUrl: 'https://portal.aerialshotsmedia.com/delivery/listing-123',
  },
})
```

### Via Webhook (Future)

When a listing's `ops_status` changes to `delivered`:

```sql
-- Trigger on listings table
CREATE TRIGGER on_listing_delivered
  AFTER UPDATE ON listings
  FOR EACH ROW
  WHEN (NEW.ops_status = 'delivered' AND OLD.ops_status != 'delivered')
  EXECUTE FUNCTION trigger_delivery_notification();
```

## Configuration

Default config (can be overridden):

```typescript
{
  maxTokens: 1000,
  temperature: 0.7,
  model: 'claude-3-haiku-20240307'
}
```

## AI-Generated Tips Examples

The agent generates contextual tips based on the property and media mix. Examples:

**MLS Photos:**
> "Lead with your stunning exterior shot, then showcase the living spaces and kitchen. These are sized perfectly for MLS upload and will make your listing pop in search results."

**Social Feed:**
> "Post 3-4 of these as a carousel on Instagram for maximum engagement. Start with the exterior, then highlight the best interior features. Your audience will love the visual journey!"

**Video:**
> "Upload this to YouTube first for best quality, then share across all platforms. Consider posting a 30-second teaser to Instagram Reels and Facebook Stories to drive traffic to the full video."

**Social Stories:**
> "Create a 'virtual open house' sequence with these vertical shots. Add text overlays highlighting square footage, beds/baths, and standout features. Pro tip: Use location stickers to boost local discoverability!"

## Integration Status

### Current (v1.0)
- ✅ Agent registration and execution
- ✅ AI-powered tip generation
- ✅ HTML/text email formatting
- ✅ Fallback to base tips if AI fails
- ✅ Console logging for testing

### Pending
- ⏳ Email service integration (SendGrid, Resend, or Twilio)
- ⏳ Database trigger on listing delivery
- ⏳ Email template customization per agent brand
- ⏳ A/B testing of subject lines
- ⏳ Click tracking and analytics

## Testing

Run the test file to verify functionality:

```bash
npx tsx src/lib/agents/definitions/operations/delivery-notifier.test.ts
```

## Email Service Integration

To enable actual email sending, integrate with an email provider:

### Option 1: Resend (Recommended)

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

await resend.emails.send({
  from: 'Aerial Shots Media <delivery@aerialshotsmedia.com>',
  to: notificationInput.agentEmail,
  subject: notification.subject,
  html: notification.bodyHtml,
})
```

### Option 2: SendGrid

```typescript
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

await sgMail.send({
  to: notificationInput.agentEmail,
  from: 'delivery@aerialshotsmedia.com',
  subject: notification.subject,
  html: notification.bodyHtml,
  text: notification.bodyText,
})
```

## Error Handling

The agent includes robust error handling:

- **Invalid Input**: Returns `INVALID_INPUT` error code
- **No Media**: Returns `NO_MEDIA` error code if no categories provided
- **AI Failure**: Falls back to base tips from `getCategoryInfo()`
- **Email Failure**: Logged but doesn't fail execution (notification queued for retry)

## Future Enhancements

1. **Smart Scheduling**: Send notifications at optimal times based on agent timezone
2. **Drip Campaigns**: Follow-up tips 3 days after delivery
3. **Agent Preferences**: Allow agents to customize tip styles
4. **Analytics Dashboard**: Track open rates, click-through rates, download rates
5. **Multi-language Support**: Detect agent language preference
6. **Rich Media**: Embed preview thumbnails in email
