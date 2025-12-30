'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseScrollRevealOptions {
  threshold?: number
  rootMargin?: string
  triggerOnce?: boolean
  delay?: number
}

interface UseScrollRevealReturn {
  ref: React.RefObject<HTMLElement | null>
  isVisible: boolean
  hasAnimated: boolean
}

/**
 * Hook for triggering animations when elements enter the viewport
 * Uses Intersection Observer for performance
 */
export function useScrollReveal(
  options: UseScrollRevealOptions = {}
): UseScrollRevealReturn {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    triggerOnce = true,
    delay = 0,
  } = options

  const ref = useRef<HTMLElement | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [hasAnimated, setHasAnimated] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      setIsVisible(true)
      setHasAnimated(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (delay > 0) {
              setTimeout(() => {
                setIsVisible(true)
                setHasAnimated(true)
              }, delay)
            } else {
              setIsVisible(true)
              setHasAnimated(true)
            }

            if (triggerOnce) {
              observer.unobserve(entry.target)
            }
          } else if (!triggerOnce) {
            setIsVisible(false)
          }
        })
      },
      { threshold, rootMargin }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold, rootMargin, triggerOnce, delay])

  return { ref, isVisible, hasAnimated }
}

/**
 * Hook for staggered list animations
 * Returns an array of refs and visibility states
 */
export function useStaggeredReveal(
  itemCount: number,
  baseDelay = 50,
  options: Omit<UseScrollRevealOptions, 'delay'> = {}
): {
  containerRef: React.RefObject<HTMLElement | null>
  isContainerVisible: boolean
  getItemDelay: (index: number) => number
} {
  const containerRef = useRef<HTMLElement | null>(null)
  const [isContainerVisible, setIsContainerVisible] = useState(false)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches

    if (prefersReducedMotion) {
      setIsContainerVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsContainerVisible(true)
            if (options.triggerOnce !== false) {
              observer.unobserve(entry.target)
            }
          } else if (options.triggerOnce === false) {
            setIsContainerVisible(false)
          }
        })
      },
      {
        threshold: options.threshold ?? 0.1,
        rootMargin: options.rootMargin ?? '0px 0px -50px 0px',
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [options.threshold, options.rootMargin, options.triggerOnce])

  const getItemDelay = useCallback(
    (index: number) => {
      return Math.min(index * baseDelay, 500) // Cap at 500ms
    },
    [baseDelay]
  )

  return { containerRef, isContainerVisible, getItemDelay }
}
