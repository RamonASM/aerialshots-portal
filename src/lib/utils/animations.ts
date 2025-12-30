/**
 * Animation Utilities
 * CSS-only spring curves and timing for performance-first animations
 */

// Spring-based easing curves (approximated for CSS)
export const springs = {
  // Gentle spring - subtle, natural movement
  gentle: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
  // Snappy spring - quick, responsive
  snappy: 'cubic-bezier(0.22, 0.68, 0, 1)',
  // Smooth spring - smooth, Apple-like
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
  // Bounce spring - slight overshoot
  bounce: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  // Out expo - fast start, slow end
  outExpo: 'cubic-bezier(0.19, 1, 0.22, 1)',
  // In out expo - symmetrical acceleration
  inOutExpo: 'cubic-bezier(0.87, 0, 0.13, 1)',
} as const

// Duration constants (in milliseconds)
export const durations = {
  instant: 100,
  fast: 150,
  normal: 200,
  relaxed: 300,
  slow: 400,
  slower: 500,
  slowest: 700,
} as const

// Pre-composed transition strings for common use cases
export const transitions = {
  // Default - most common transition
  default: `all ${durations.normal}ms ${springs.smooth}`,
  // Fast - for micro-interactions
  fast: `all ${durations.fast}ms ${springs.snappy}`,
  // Slow - for page/section reveals
  slow: `all ${durations.slow}ms ${springs.gentle}`,
  // Transform only - for performant animations
  transform: `transform ${durations.normal}ms ${springs.smooth}`,
  // Opacity only - for fades
  opacity: `opacity ${durations.normal}ms ${springs.smooth}`,
  // Colors - for hover states
  colors: `color ${durations.fast}ms ${springs.smooth}, background-color ${durations.fast}ms ${springs.smooth}, border-color ${durations.fast}ms ${springs.smooth}`,
} as const

// Stagger delays for list animations (in milliseconds)
export function getStaggerDelay(index: number, baseDelay = 50, maxDelay = 500): number {
  return Math.min(index * baseDelay, maxDelay)
}

// CSS custom properties for animations (use in style prop)
export function fadeInUpStyle(delay = 0): React.CSSProperties {
  return {
    opacity: 0,
    transform: 'translateY(20px)',
    animation: `fadeInUp 0.6s ${springs.outExpo} ${delay}ms forwards`,
  }
}

// Keyframe animation names (defined in globals.css)
export const keyframes = {
  fadeInUp: 'fadeInUp',
  fadeIn: 'fadeIn',
  slideInRight: 'slideInRight',
  slideInLeft: 'slideInLeft',
  scaleIn: 'scaleIn',
  pulse: 'pulse',
  shimmer: 'shimmer',
  float: 'float',
  glow: 'glow',
} as const

// Prefers reduced motion helper
export function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
