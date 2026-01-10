# Feature: Stripe Webhook Expansion

## Overview
Expand the Stripe webhook handler to process failed payments, disputes, and Connect payout events. Currently only payment_intent.succeeded is handled, leaving the system blind to payment failures and disputes.

## Success Criteria
- [ ] Failed payments update order status to 'payment_failed'
- [ ] Disputes are logged and trigger admin notification
- [ ] Connect payout events are logged for contractor payment tracking
- [ ] All events are verified with Stripe signature validation

## User Story
As a business owner, I want to know when payments fail or are disputed so I can take action and not lose revenue.

## Acceptance Criteria
- [ ] payment_intent.payment_failed updates order status and notifies admin
- [ ] charge.dispute.created logs dispute and sends admin alert
- [ ] charge.dispute.closed updates dispute status
- [ ] payout.paid logs successful contractor payouts (Connect)
- [ ] payout.failed logs failed contractor payouts and alerts admin
- [ ] All handlers use idempotency (don't double-process same event)

## Technical Requirements
- File to modify: /src/app/api/stripe/webhook/route.ts (or similar)
- Database: May need dispute tracking table or status field
- Notifications: Admin email/Slack on failures and disputes

## Out of Scope
- Automatic dispute response (manual for now)
- Retry logic for failed payments (that's a separate feature)
- Refund handling (separate feature)

## Test Cases
1. Happy path: payment_intent.succeeded still works as before
2. Failed payment: Simulate failed payment, verify order status updates
3. Dispute: Simulate dispute event, verify logging and notification
4. Duplicate event: Send same event twice, verify only processed once
5. Invalid signature: Send event with bad signature, verify rejection
