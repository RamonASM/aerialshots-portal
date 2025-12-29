import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles
        "h-11 w-full min-w-0 rounded-lg px-4 text-base text-foreground",
        // Background & Border - using CSS variable surfaces
        "bg-muted border border-border",
        // Placeholder
        "placeholder:text-muted-foreground",
        // Focus state - Apple blue ring (using primary color)
        "outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
        // Transitions
        "transition-all duration-200 ease-out",
        // File input
        "file:text-foreground file:inline-flex file:h-8 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        // Disabled
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        // Selection (using primary color)
        "selection:bg-primary/30 selection:text-foreground",
        // Invalid state (using destructive color)
        "aria-invalid:border-destructive/50 aria-invalid:ring-destructive/20",
        // Medium screens
        "md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
