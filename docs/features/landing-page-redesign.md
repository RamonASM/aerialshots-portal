# PRD: Landing Page Redesign - Revolut Style

**Project:** Aerial Shots Media Portal
**Feature:** Public Marketing Landing Page Redesign
**Priority:** High
**Status:** Ready for Implementation
**Created:** January 8, 2026

---

## Overview

Complete visual and structural redesign of the public marketing landing page at app.aerialshots.media to transform it from a generic SaaS template into a premium, high-energy design inspired by Revolut's approach. The goal is to create a page that feels alive, modern, and premium - matching the quality of the media services ASM provides.

**Why this matters:** The current page looks like a newspaper. It undermines the premium positioning of a company selling visual media services. If you sell beautiful imagery, your website needs to reflect that.

---

## Success Criteria

- [ ] Page load time under 3 seconds on mobile (test with Lighthouse)
- [ ] Mobile-responsive with no horizontal scroll
- [ ] Passes WCAG 2.1 AA accessibility standards for contrast
- [ ] All CTAs ("Book Now", "View Portfolio") are immediately visible above fold
- [ ] Hero section communicates value proposition in under 5 seconds of viewing
- [ ] Page feels premium and energetic - not like a template

---

## Design Direction

### Aesthetic: "Premium Tech Meets Visual Storytelling"

**Core Principles:**
1. Dark mode as default (not optional) - communicates sophistication
2. Bold, oversized typography that commands attention
3. Gradient accents and glass morphism for depth
4. Subtle motion that rewards attention without distracting
5. Product visuals that prove the quality (show actual drone shots, 3D tours)

### Color Palette

**Primary:**
- Background Dark: #0A0A0B (near-black with slight warmth)
- Background Surface: #141416 (elevated surfaces, cards)
- Background Accent: #1C1C1F (hover states, secondary surfaces)

**Accent Colors:**
- Primary Accent: #00D4FF (electric cyan - energetic, tech-forward)
- Secondary Accent: #FF6B35 (sunset orange - photography/media reference)
- Gradient: linear-gradient(135deg, #00D4FF 0%, #7C3AED 50%, #FF6B35 100%)

**Text:**
- Primary Text: #FFFFFF
- Secondary Text: #A1A1AA (muted)
- Accent Text: #00D4FF (links, emphasis)

**Supporting:**
- Success: #22C55E
- Border/Divider: rgba(255,255,255,0.08)
- Glass Effect: rgba(255,255,255,0.05) with backdrop-blur

### Typography

**Font Stack:**
- Headlines: "General Sans" (Google Fonts alternative: "Plus Jakarta Sans" or "Outfit")
- Body: "Inter" or "DM Sans"
- Accent/Numbers: "Space Mono" for stats and numbers

**Scale:**
- Hero Headline: 72px desktop / 40px mobile, font-weight 700
- Section Headlines: 48px desktop / 32px mobile, font-weight 600
- Subheadlines: 24px desktop / 18px mobile, font-weight 500
- Body: 18px desktop / 16px mobile, font-weight 400
- Small/Caption: 14px, font-weight 400

---

## Page Structure (Top to Bottom)

### Section 1: Navigation Bar
- Transparent initially, solid dark (#0A0A0B) on scroll
- Logo left, nav center, CTA buttons right
- Mobile: hamburger menu with full-screen dark overlay
- Subtle glass effect on scroll (backdrop-blur: 12px)

### Section 2: Hero
**Layout:** Full viewport height, centered content
**Content:**
- Badge: "Central Florida's #1 Zillow Showcase Certified"
- Headline: "Media That Sells Homes"
- Subheadline: One line describing the service
- Two CTAs: "Book Your Shoot" (primary), "View Portfolio" (ghost)
- Stats bar below CTAs: "500+ Agents | 15K+ Properties | 24hr Delivery | 5.0 Rating"

**Visual:**
- Animated gradient mesh background (subtle movement)
- Floating property images or device mockups showing portfolio work
- Subtle particle effect or grain overlay for texture

### Section 3: Trust Bar
- Horizontal scroll of brokerage logos (Keller Williams, RE/MAX, etc.)
- Dark backgrounds, logos in white/gray monochrome
- Subtle hover effect: logo gains color on hover

### Section 4: Services Overview
**Layout:** Asymmetric grid with featured service cards
**Content:**
- Section headline: "Everything You Need to Sell"
- 6 service cards in 2-3 column grid
- Each card: Icon, title, one-line description, subtle hover animation
- Cards have glass effect background with gradient border on hover

**Services to feature:**
1. HDR Photography
2. Drone & Aerial
3. Cinematic Video
4. Zillow 3D Tours
5. Virtual Staging
6. Floor Plans

### Section 5: How It Works
**Layout:** Horizontal timeline/steps
**Content:**
- "From Booking to Going Live in 24 Hours"
- 4 steps with icons and brief descriptions
- Animated connector line between steps
- Each step highlights on scroll

### Section 6: Portfolio Showcase
**Layout:** Masonry or bento grid
**Content:**
- "See Our Work" headline
- 6-8 portfolio items showing actual work
- Mix of stills, video thumbnails, 3D tour previews
- Hover: overlay with property details
- "View Full Portfolio" CTA

### Section 7: Pricing
**Layout:** 3 cards, center card elevated (featured)
**Content:**
- "Simple Pricing, Premium Results"
- Three packages: Essentials ($315), Signature ($449), Premier ($649)
- Feature lists with check icons
- Gradient border on featured card
- "Get Started" CTA on each

### Section 8: Testimonials
**Layout:** Carousel or stacked cards
**Content:**
- Real testimonials from agents
- Include name, title, brokerage
- Star rating visualization
- Photo if available (or stylized avatar)

### Section 9: FAQ
**Layout:** Two-column accordion
**Content:**
- Most common questions
- Smooth expand/collapse animation
- Gradient accent on active question

### Section 10: Final CTA
**Layout:** Full-width section with gradient background
**Content:**
- "Ready to Elevate Your Listings?"
- Subtext about booking
- Large "Book Your Shoot" button
- Contact info for those who prefer to call

### Section 11: Footer
**Layout:** Multi-column dark footer
**Content:**
- Logo and tagline
- Service links
- Company links
- Legal links
- Social media icons
- "Built in Orlando" badge

---

## Technical Requirements

### Framework
- Next.js 14+ with App Router (existing)
- Tailwind CSS for styling (existing)
- Framer Motion for animations

### New Dependencies
```bash
npm install framer-motion
```

### File Structure
```
/app
  /(marketing)
    /page.tsx          # Main landing page
    /layout.tsx        # Marketing layout (different from portal)
    /components
      /hero.tsx
      /navigation.tsx
      /trust-bar.tsx
      /services-grid.tsx
      /how-it-works.tsx
      /portfolio-showcase.tsx
      /pricing-cards.tsx
      /testimonials.tsx
      /faq-accordion.tsx
      /final-cta.tsx
      /footer.tsx
/styles
  /marketing.css       # Marketing-specific styles
```

### Performance Requirements
- Lazy load images below fold
- Use next/image for all images with proper sizing
- Preload hero fonts
- Animations should respect prefers-reduced-motion
- Target Lighthouse performance score > 90

### Core Web Vitals Targets
| Metric | Target | Technique |
|--------|--------|-----------|
| LCP | <2.5s | Preload hero images, font subsetting |
| FID | <100ms | Minimize main thread blocking |
| CLS | <0.1 | Set explicit dimensions on images, stable skeletons |

### Accessibility Requirements
- All interactive elements keyboard accessible
- ARIA labels on icon-only buttons
- Skip-to-content link
- Focus states visible
- Color contrast ratios meet WCAG AA
- Implement `prefers-reduced-motion` support

---

## Out of Scope

Explicitly NOT included in this PRD:
- Authentication pages (login/signup) - separate PRD
- Agent portal dashboard - separate PRD
- Blog pages - separate PRD
- Service detail pages - separate PRD
- Booking flow - separate PRD
- Backend changes - this is frontend only
- CMS integration - static content for now

---

## Dependencies

Before starting this work:
- [ ] Current app.aerialshots.media must be deployable (verify with `npm run build`)
- [ ] Access to portfolio images for showcase section
- [ ] Testimonial content (names, quotes, brokerages)
- [ ] Final pricing confirmation ($315/$449/$649 packages)

---

## Implementation Slices

Each slice is a complete vertical implementation. Build one, verify, commit, then next.

### Slice 1: Design System Foundation
**Files:** `/styles/marketing.css`, `/tailwind.config.js` updates
**Work:**
- Add CSS variables for new color palette
- Configure Tailwind with custom colors
- Add font imports (Plus Jakarta Sans, Inter)
- Create utility classes for glass effects, gradients

**Verification:**
- Create test page with color swatches
- Verify fonts load correctly
- Check gradient renders properly

---

### Slice 2: Navigation Bar
**Files:** `/app/(marketing)/components/navigation.tsx`
**Work:**
- Responsive nav with hamburger mobile menu
- Transparent-to-solid scroll effect
- Logo, nav links, CTA buttons
- Glass morphism effect

**Verification:**
- Scroll behavior works
- Mobile menu opens/closes
- All links work
- Accessible via keyboard

---

### Slice 3: Hero Section
**Files:** `/app/(marketing)/components/hero.tsx`
**Work:**
- Full viewport hero
- Badge, headline, subheadline, CTAs
- Stats bar
- Animated gradient background
- Responsive typography

**Verification:**
- Renders on mobile and desktop
- CTAs are clickable
- Animation doesn't hurt performance
- Text is readable on gradient

---

### Slice 4: Trust Bar
**Files:** `/app/(marketing)/components/trust-bar.tsx`
**Work:**
- Horizontal logo carousel
- Auto-scroll animation
- Monochrome logos
- Hover color effect

**Verification:**
- Smooth scroll animation
- Logos display correctly
- Works on mobile

---

### Slice 5: Services Grid
**Files:** `/app/(marketing)/components/services-grid.tsx`
**Work:**
- 6 service cards
- Glass effect backgrounds
- Hover animations
- Icons for each service
- Responsive grid

**Verification:**
- All 6 cards render
- Hover effects work
- Mobile stacking correct
- Links work

---

### Slice 6: How It Works
**Files:** `/app/(marketing)/components/how-it-works.tsx`
**Work:**
- 4-step timeline
- Animated connectors
- Scroll-triggered animations
- Icons and descriptions

**Verification:**
- Steps display in order
- Animations trigger on scroll
- Mobile layout works

---

### Slice 7: Portfolio Showcase
**Files:** `/app/(marketing)/components/portfolio-showcase.tsx`
**Work:**
- Masonry/bento grid layout
- Image optimization
- Hover overlays
- "View Portfolio" CTA
- Category filters (optional)

**Verification:**
- Images load and display
- Hover effects work
- Grid responsive
- Links work

---

### Slice 8: Pricing Cards
**Files:** `/app/(marketing)/components/pricing-cards.tsx`
**Work:**
- 3 pricing tiers
- Feature lists
- Featured card styling
- CTA buttons
- Responsive layout

**Verification:**
- All prices correct
- Feature lists complete
- CTAs link to booking
- Mobile stacking works

---

### Slice 9: Testimonials
**Files:** `/app/(marketing)/components/testimonials.tsx`
**Work:**
- Testimonial cards
- Star ratings
- Agent info display
- Carousel or grid layout

**Verification:**
- Testimonials display
- Navigation works (if carousel)
- Responsive

---

### Slice 10: FAQ Accordion
**Files:** `/app/(marketing)/components/faq-accordion.tsx`
**Work:**
- Accordion component
- Expand/collapse animation
- Two-column layout on desktop
- Gradient active state

**Verification:**
- Opens/closes smoothly
- Only one open at a time (or configurable)
- Accessible via keyboard
- Mobile single-column

---

### Slice 11: Final CTA Section
**Files:** `/app/(marketing)/components/final-cta.tsx`
**Work:**
- Full-width gradient background
- Headline, subtext, CTA button
- Contact info

**Verification:**
- CTA clickable
- Gradient renders correctly
- Contact info accurate

---

### Slice 12: Footer
**Files:** `/app/(marketing)/components/footer.tsx`
**Work:**
- Multi-column layout
- All link categories
- Social icons
- Legal links
- Responsive

**Verification:**
- All links work
- Responsive columns
- Copyright year correct

---

### Slice 13: Page Assembly
**Files:** `/app/(marketing)/page.tsx`, `/app/(marketing)/layout.tsx`
**Work:**
- Import all components
- Assemble in correct order
- Add layout wrapper
- Meta tags and SEO

**Verification:**
- Full page renders
- No console errors
- Lighthouse audit
- Mobile responsive end-to-end

---

### Slice 14: Animation Polish
**Files:** All component files
**Work:**
- Add Framer Motion scroll animations
- Stagger reveals
- Hover microinteractions
- Respect prefers-reduced-motion

**Verification:**
- Animations work
- No jank or performance issues
- Reduced motion respects preference

---

## Technical Blueprint Reference

### Typography Scale (CSS Variables)
```css
:root {
  --font-family-primary: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-family-mono: 'JetBrains Mono', monospace;

  /* Font sizes (mobile-first, scale up for desktop) */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 2rem;      /* 32px */
  --text-4xl: 3rem;      /* 48px */
  --text-5xl: 4rem;      /* 64px */

  /* Line heights */
  --leading-tight: 1.1;   /* Headlines */
  --leading-snug: 1.3;    /* Subheads */
  --leading-normal: 1.5;  /* Body */
  --leading-relaxed: 1.7; /* Long-form */
}
```

### Dark Mode Surface Hierarchy
```css
:root {
  /* Surface hierarchy (lighter = more elevated) */
  --surface-0: #0a0a0a;     /* Deep background */
  --surface-1: #111111;     /* Card background */
  --surface-2: #171717;     /* Elevated cards */
  --surface-3: #1f1f1f;     /* Hover states */

  /* Borders and dividers */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-default: rgba(255, 255, 255, 0.12);
  --border-strong: rgba(255, 255, 255, 0.2);

  /* Text hierarchy */
  --text-primary: #fafafa;   /* 97% brightness */
  --text-secondary: #a1a1a1; /* 63% brightness */
  --text-tertiary: #6b6b6b;  /* 42% brightness */
}
```

### Spacing System (8px base)
```css
:root {
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --space-12: 3rem;    /* 48px */
  --space-16: 4rem;    /* 64px */
  --space-20: 5rem;    /* 80px */
  --space-24: 6rem;    /* 96px */

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 24px;
  --radius-full: 9999px;
}
```

### Animation Tokens
```css
:root {
  /* Durations */
  --duration-instant: 100ms;   /* Press feedback */
  --duration-fast: 150ms;      /* Button hovers */
  --duration-normal: 300ms;    /* Card transitions */
  --duration-slow: 500ms;      /* Modal opens */
  --duration-slower: 800ms;    /* Hero reveals */

  /* Easings */
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-stripe: cubic-bezier(0.2, 1, 0.2, 1);

  /* Stagger delays */
  --stagger-sm: 50ms;
  --stagger-md: 100ms;
  --stagger-lg: 150ms;
}
```

### Glassmorphism Pattern
```css
.glass-card {
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-xl);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

/* Reduce blur on mobile for performance */
@media (max-width: 768px) {
  .glass-card {
    backdrop-filter: blur(8px);
  }
}

/* Fallback for unsupported browsers */
@supports not (backdrop-filter: blur(10px)) {
  .glass-card {
    background: rgba(30, 30, 30, 0.95);
  }
}
```

### Button Specifications
```css
.btn-primary {
  background: var(--accent-primary);
  color: white;
  padding: var(--space-3) var(--space-6); /* 12px 24px */
  border-radius: var(--radius-lg); /* 12px, or radius-full for pill */
  font-weight: 600;
  font-size: var(--text-base);

  transition:
    background-color 200ms ease,
    transform 150ms ease-out,
    box-shadow 200ms ease;
}

.btn-primary:hover {
  background: var(--accent-hover);
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(88, 101, 242, 0.3);
}

.btn-primary:active {
  transform: scale(0.98);
  transition-duration: 100ms;
}
```

### Reduced Motion Support
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Asset Requirements

### Images Needed
- [ ] ASM logo (light version for dark backgrounds)
- [ ] Portfolio images (6-8 property photos)
- [ ] Brokerage logos (KW, RE/MAX, Coldwell Banker, Century 21, eXp, Compass, Sotheby's, Berkshire Hathaway)
- [ ] Service icons (can use Lucide icons as placeholder)

### Content Needed
- [ ] Final copy for hero headline/subheadline
- [ ] Service descriptions (6 services, one line each)
- [ ] Testimonial quotes with agent names and brokerages
- [ ] FAQ questions and answers
- [ ] Contact information

---

## Risk Mitigation

**Risk:** Animation performance issues on mobile
**Mitigation:** Implement animations last, test on real devices, use CSS transforms only

**Risk:** Portfolio images slow down page
**Mitigation:** Use next/image, lazy load below fold, optimize images before upload

**Risk:** Scope creep into other pages
**Mitigation:** Strict adherence to "Out of Scope" section, redirect requests to new PRDs

**Risk:** Brand disconnect from existing materials
**Mitigation:** Final review with stakeholders before launch

---

## Sign-Off

- [ ] Design direction approved
- [ ] Color palette approved
- [ ] Content finalized
- [ ] Assets gathered
- [ ] Ready for implementation

---

*Document Version: 1.0*
*Last Updated: January 8, 2026*
