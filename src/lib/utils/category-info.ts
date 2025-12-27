// Category display helpers - can be used in client components

export interface CuratedItem {
  id: string
  title: string
  description: string | null
  source_url: string | null
  category: string
  lat: number
  lng: number
  radius_miles: number
  expires_at: string | null
  created_at: string
}

// Curated category display info
export function getCuratedCategoryInfo(category: string): {
  title: string
  icon: string
  color: string
} {
  const categories: Record<string, { title: string; icon: string; color: string }> = {
    development: {
      title: 'New Development',
      icon: '🏗️',
      color: '#3b82f6',
    },
    infrastructure: {
      title: 'Infrastructure',
      icon: '🛤️',
      color: '#8b5cf6',
    },
    business: {
      title: 'New Business',
      icon: '🏪',
      color: '#10b981',
    },
    event: {
      title: 'Community Event',
      icon: '🎉',
      color: '#f59e0b',
    },
    school: {
      title: 'Education',
      icon: '🎓',
      color: '#ef4444',
    },
    park: {
      title: 'Parks & Recreation',
      icon: '🌳',
      color: '#22c55e',
    },
  }

  return (
    categories[category] ?? {
      title: category,
      icon: '📍',
      color: '#6b7280',
    }
  )
}

// Google Places category display info (Places API New types)
export const PLACE_CATEGORIES = {
  dining: ['restaurant', 'cafe', 'bakery'],
  shopping: ['shopping_mall', 'supermarket', 'store'],
  fitness: ['gym', 'park', 'spa'],
  entertainment: ['movie_theater', 'night_club', 'bar'],
  services: ['bank', 'hospital', 'pharmacy'],
  education: ['school', 'university', 'library'],
} as const

export type PlaceCategory = keyof typeof PLACE_CATEGORIES

export interface NearbyPlace {
  id: string
  name: string
  address: string
  rating: number | null
  reviewCount: number
  category: PlaceCategory
  type: string
  distance?: number
  isOpen?: boolean
  priceLevel?: number
  photoUrl?: string
}

export function getPlaceCategoryDisplayInfo(category: PlaceCategory): {
  title: string
  icon: string
  description: string
} {
  const info: Record<PlaceCategory, { title: string; icon: string; description: string }> = {
    dining: {
      title: 'Dining',
      icon: '🍽️',
      description: 'Restaurants, cafes, and bakeries nearby',
    },
    shopping: {
      title: 'Shopping',
      icon: '🛍️',
      description: 'Malls, grocery stores, and retail',
    },
    fitness: {
      title: 'Fitness & Recreation',
      icon: '🏃',
      description: 'Gyms, parks, and wellness centers',
    },
    entertainment: {
      title: 'Entertainment',
      icon: '🎬',
      description: 'Movies, nightlife, and fun',
    },
    services: {
      title: 'Services',
      icon: '🏥',
      description: 'Banks, hospitals, and pharmacies',
    },
    education: {
      title: 'Education',
      icon: '📚',
      description: 'Schools, universities, and libraries',
    },
  }

  return info[category]
}
