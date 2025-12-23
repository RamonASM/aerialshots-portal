import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#0077ff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
  {
    variants: {
      variant: {
        // Primary - Blue gradient with glow
        default:
          "bg-[#0077ff] text-white hover:bg-[#0062cc] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#0077ff]/25 active:translate-y-0 active:shadow-md",

        // Destructive - Red with glow
        destructive:
          "bg-[#ff453a] text-white hover:bg-[#ff453a]/90 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#ff453a]/25 active:translate-y-0",

        // Outline - Glass border
        outline:
          "border border-white/10 bg-white/5 text-white backdrop-blur-sm hover:bg-white/10 hover:border-white/20",

        // Secondary - Glass surface
        secondary:
          "bg-white/5 text-white hover:bg-white/10 backdrop-blur-sm",

        // Ghost - Minimal
        ghost:
          "text-[#a1a1a6] hover:text-white hover:bg-white/5",

        // Link - Text only
        link:
          "text-[#0077ff] underline-offset-4 hover:underline hover:text-[#3395ff]",

        // Premium - Gradient with shine
        premium:
          "bg-gradient-to-r from-[#0077ff] to-[#0062cc] text-white hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#0077ff]/30 active:translate-y-0",
      },
      size: {
        default: "h-11 min-h-[44px] px-5 py-2.5",
        sm: "h-9 min-h-[44px] rounded-lg gap-1.5 px-3 text-xs",
        lg: "h-12 min-h-[48px] rounded-xl px-8 text-base",
        xl: "h-14 min-h-[56px] rounded-xl px-10 text-lg",
        icon: "size-11 min-h-[44px] min-w-[44px]",
        "icon-sm": "size-10 min-h-[44px] min-w-[44px]",
        "icon-lg": "size-12 min-h-[48px] min-w-[48px]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
