// Bannerbear template configurations for ListingLaunch
// Templates should be created in Bannerbear dashboard first

// Template IDs - these need to be set up in Bannerbear
// For now, using placeholder IDs that should be replaced with actual template IDs
export const TEMPLATES = {
  // Single slide template for Instagram carousel (1080x1350)
  carousel_slide: process.env.BANNERBEAR_CAROUSEL_TEMPLATE_ID || 'CAROUSEL_TEMPLATE_ID',

  // Template set for rendering all slides at once
  carousel_set: process.env.BANNERBEAR_CAROUSEL_SET_ID || 'CAROUSEL_SET_ID',

  // Alternative templates for different styles
  minimal_slide: process.env.BANNERBEAR_MINIMAL_TEMPLATE_ID || 'MINIMAL_TEMPLATE_ID',
  bold_slide: process.env.BANNERBEAR_BOLD_TEMPLATE_ID || 'BOLD_TEMPLATE_ID',
}

// Layer names in Bannerbear templates
// These must match the layer names in your Bannerbear templates
export const LAYER_NAMES = {
  background_image: 'background_image',
  headline: 'headline',
  body_text: 'body_text',
  agent_logo: 'agent_logo',
  accent_bar: 'accent_bar',
  slide_number: 'slide_number',
  gradient_overlay: 'gradient_overlay',
}

// Template dimensions
export const DIMENSIONS = {
  instagram_carousel: {
    width: 1080,
    height: 1350,
    aspect_ratio: '4:5',
  },
  instagram_square: {
    width: 1080,
    height: 1080,
    aspect_ratio: '1:1',
  },
  instagram_story: {
    width: 1080,
    height: 1920,
    aspect_ratio: '9:16',
  },
}

// Text position configurations
export const TEXT_POSITIONS = {
  bottom_left: {
    headline_x: 60,
    headline_y: 1050,
    body_x: 60,
    body_y: 1150,
    align: 'left',
  },
  bottom_center: {
    headline_x: 540,
    headline_y: 1050,
    body_x: 540,
    body_y: 1150,
    align: 'center',
  },
  top_left: {
    headline_x: 60,
    headline_y: 200,
    body_x: 60,
    body_y: 280,
    align: 'left',
  },
  center: {
    headline_x: 540,
    headline_y: 600,
    body_x: 540,
    body_y: 700,
    align: 'center',
  },
}

// Color schemes for different carousel types
export const COLOR_SCHEMES = {
  property_highlights: {
    gradient_start: 'rgba(0,0,0,0)',
    gradient_end: 'rgba(0,0,0,0.85)',
    text_color: '#ffffff',
  },
  neighborhood_guide: {
    gradient_start: 'rgba(0,0,0,0)',
    gradient_end: 'rgba(0,0,0,0.8)',
    text_color: '#ffffff',
  },
  local_favorites: {
    gradient_start: 'rgba(0,0,0,0)',
    gradient_end: 'rgba(0,0,0,0.75)',
    text_color: '#ffffff',
  },
  schools_families: {
    gradient_start: 'rgba(0,0,0,0)',
    gradient_end: 'rgba(0,0,0,0.8)',
    text_color: '#ffffff',
  },
  lifestyle: {
    gradient_start: 'rgba(0,0,0,0)',
    gradient_end: 'rgba(0,0,0,0.7)',
    text_color: '#ffffff',
  },
}
