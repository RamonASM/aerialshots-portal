'use client'

interface MobileContactCTAProps {
  agentName?: string
  brandColor?: string
}

export function MobileContactCTA({ agentName, brandColor = '#0077ff' }: MobileContactCTAProps) {
  const handleClick = () => {
    // Find the lead form section and scroll to it
    const leadForm = document.querySelector('[data-lead-form]') ||
                     document.querySelector('form') ||
                     document.querySelector('.sticky')

    if (leadForm) {
      leadForm.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      // Fallback: scroll to top of sidebar area
      window.scrollTo({ top: 600, behavior: 'smooth' })
    }
  }

  const firstName = agentName?.split(' ')[0] || 'Agent'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.08] bg-black/90 backdrop-blur-xl p-4 lg:hidden">
      <button
        onClick={handleClick}
        className="flex h-12 w-full items-center justify-center rounded-xl text-base font-medium text-white transition-all hover:opacity-90 active:scale-[0.98]"
        style={{ backgroundColor: brandColor }}
      >
        Contact {firstName}
      </button>
    </div>
  )
}
