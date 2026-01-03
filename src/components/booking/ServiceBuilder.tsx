'use client'

import { ServiceCard } from './ServiceCard'
import { type SelectedService } from '@/stores/useBookingStore'
import { formatCurrency, SQFT_TIERS, type SqftTierId } from '@/lib/pricing/config'
import { cn } from '@/lib/utils'

// A la carte services available for individual selection
const ALACARTE_SERVICES = [
  // Core Photography
  {
    id: 'photography',
    name: 'Professional Photography',
    description: 'HDR interior and exterior photos with professional editing',
    category: 'photography',
    pricing: {
      lt2000: 175,
      '2001_3500': 225,
      '3501_5000': 275,
      '5001_6500': 350,
      over6500: 450,
    },
    duration: 60,
    priceType: 'tiered' as const,
    popular: true,
  },
  {
    id: 'drone',
    name: 'Aerial Drone Photography',
    description: '5-10 aerial photos of property and surroundings',
    category: 'photography',
    price: 100,
    duration: 20,
    priceType: 'flat' as const,
  },
  {
    id: 'twilight',
    name: 'Real Twilight Shoot',
    description: 'On-site twilight photography at golden hour',
    category: 'photography',
    price: 150,
    duration: 45,
    priceType: 'flat' as const,
  },
  {
    id: 'virtual-twilight',
    name: 'Virtual Twilight',
    description: 'AI-enhanced twilight conversion of daytime photos',
    category: 'photography',
    price: 25,
    priceType: 'per_unit' as const,
    unit: 'photo',
  },

  // 3D & Floor Plans
  {
    id: 'zillow-3d',
    name: 'Zillow 3D Home Tour',
    description: 'Interactive walkthrough optimized for Zillow',
    category: '3d',
    price: 150,
    duration: 30,
    priceType: 'flat' as const,
    popular: true,
  },
  {
    id: 'matterport',
    name: 'Matterport 3D Tour',
    description: 'Full Matterport capture with dollhouse view',
    category: '3d',
    price: 250,
    duration: 45,
    priceType: 'flat' as const,
  },
  {
    id: 'floor-plan-2d',
    name: '2D Floor Plan',
    description: 'Professional schematic floor plan with dimensions',
    category: 'floor-plans',
    price: 75,
    priceType: 'flat' as const,
  },
  {
    id: 'floor-plan-3d',
    name: '3D Floor Plan',
    description: 'Rendered 3D floor plan with furniture',
    category: 'floor-plans',
    price: 125,
    priceType: 'flat' as const,
  },

  // Video
  {
    id: 'listing-video',
    name: 'Listing Video',
    description: '60-90 second cinematic property walkthrough',
    category: 'video',
    price: 250,
    duration: 45,
    priceType: 'flat' as const,
  },
  {
    id: 'signature-video',
    name: 'Signature Video',
    description: '2-3 minute premium video with drone and slow motion',
    category: 'video',
    price: 450,
    duration: 90,
    priceType: 'flat' as const,
  },
  {
    id: 'social-reel',
    name: 'Social Media Reel',
    description: 'Vertical video for Instagram/TikTok',
    category: 'video',
    price: 100,
    priceType: 'flat' as const,
    popular: true,
  },
  {
    id: 'aerial-video',
    name: 'Aerial Video',
    description: '60-second cinematic drone video',
    category: 'video',
    price: 150,
    duration: 30,
    priceType: 'flat' as const,
  },

  // Virtual Staging
  {
    id: 'virtual-staging',
    name: 'Virtual Staging',
    description: 'AI-powered furniture staging per room',
    category: 'staging',
    price: 25,
    priceType: 'per_unit' as const,
    unit: 'room',
  },
  {
    id: 'item-removal',
    name: 'Virtual Item Removal',
    description: 'Remove clutter and unwanted items from photos',
    category: 'staging',
    price: 15,
    priceType: 'per_unit' as const,
    unit: 'photo',
  },
]

// Group services by category
const SERVICE_CATEGORIES = [
  { id: 'photography', name: 'Photography', description: 'Professional real estate photography' },
  { id: '3d', name: '3D Tours', description: 'Interactive virtual tours' },
  { id: 'floor-plans', name: 'Floor Plans', description: 'Property layouts' },
  { id: 'video', name: 'Video', description: 'Cinematic property videos' },
  { id: 'staging', name: 'Virtual Staging', description: 'AI-powered enhancements' },
]

interface ServiceBuilderProps {
  sqftTier: SqftTierId
  onSqftChange: (tier: SqftTierId) => void
  selectedServices: SelectedService[]
  onAddService: (service: SelectedService) => void
  onRemoveService: (serviceId: string) => void
  onUpdateQuantity: (serviceId: string, quantity: number) => void
}

export function ServiceBuilder({
  sqftTier,
  onSqftChange,
  selectedServices,
  onAddService,
  onRemoveService,
  onUpdateQuantity,
}: ServiceBuilderProps) {
  const getServicePrice = (service: typeof ALACARTE_SERVICES[number]) => {
    if (service.priceType === 'tiered' && 'pricing' in service) {
      return service.pricing[sqftTier]
    }
    return service.price || 0
  }

  const isSelected = (serviceId: string) => {
    return selectedServices.some(s => s.serviceId === serviceId)
  }

  const getQuantity = (serviceId: string) => {
    const service = selectedServices.find(s => s.serviceId === serviceId)
    return service?.quantity || 1
  }

  const handleToggle = (service: typeof ALACARTE_SERVICES[number]) => {
    if (isSelected(service.id)) {
      onRemoveService(service.id)
    } else {
      onAddService({
        serviceId: service.id,
        serviceName: service.name,
        price: getServicePrice(service),
        duration: service.duration || 0,
        quantity: 1,
      })
    }
  }

  const handleQuantityChange = (service: typeof ALACARTE_SERVICES[number], quantity: number) => {
    onUpdateQuantity(service.id, quantity)
  }

  return (
    <div className="space-y-12">
      {/* Property Size Selection */}
      <div>
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-4">
          Property Size
        </p>
        <p className="text-[14px] text-[#8A847F] mb-6">
          Select your property size for accurate pricing.
        </p>
        <div className="flex flex-wrap gap-2">
          {SQFT_TIERS.map((tier) => (
            <button
              key={tier.id}
              onClick={() => onSqftChange(tier.id)}
              className={cn(
                'px-5 py-3 text-[14px] font-medium transition-all border',
                sqftTier === tier.id
                  ? 'bg-[#A29991] border-[#A29991] text-black'
                  : 'bg-transparent border-white/[0.12] text-white hover:border-white/[0.24]'
              )}
            >
              {tier.label} sqft
            </button>
          ))}
        </div>
      </div>

      {/* Service Categories */}
      {SERVICE_CATEGORIES.map((category) => {
        const categoryServices = ALACARTE_SERVICES.filter(s => s.category === category.id)
        if (categoryServices.length === 0) return null

        return (
          <div key={category.id} className="space-y-6">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#A29991] mb-2">
                {category.name}
              </p>
              <p className="text-[14px] text-[#8A847F]">{category.description}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {categoryServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  id={service.id}
                  name={service.name}
                  description={service.description}
                  price={getServicePrice(service)}
                  priceType={service.priceType === 'tiered' ? 'flat' : service.priceType}
                  unit={'unit' in service ? service.unit : undefined}
                  duration={service.duration}
                  popular={service.popular}
                  isSelected={isSelected(service.id)}
                  quantity={getQuantity(service.id)}
                  onToggle={() => handleToggle(service)}
                  onQuantityChange={(qty) => handleQuantityChange(service, qty)}
                />
              ))}
            </div>
          </div>
        )
      })}

      {/* Empty State */}
      {selectedServices.length === 0 && (
        <div className="text-center py-8 border border-dashed border-white/[0.12]">
          <p className="text-[15px] text-[#8A847F]">
            Select services above to build your custom package.
          </p>
        </div>
      )}
    </div>
  )
}
