import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        "h-11 w-full min-w-0 rounded-lg px-4 text-base text-white",
        // Background & Border
        "bg-[#1c1c1e] border border-white/[0.08]",
        // Placeholder
        "placeholder:text-[#636366]",
        // Focus state - Apple blue ring
        "outline-none focus:border-[#0077ff]/50 focus:ring-2 focus:ring-[#0077ff]/20",
        // Transitions
        "transition-all duration-200 ease-out",
        // File input
        "file:text-white file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Selection
        "selection:bg-[#0077ff]/30 selection:text-white",
        // Invalid state
        "aria-invalid:border-[#ff453a]/50 aria-invalid:ring-[#ff453a]/20",
        // Medium screens
        "md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
