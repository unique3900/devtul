"use client"

import * as React from "react"
import * as TogglePrimitive from "@radix-ui/react-toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const toggleVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 gap-2",
  {
    variants: {
      variant: {
        default:
          "bg-transparent hover:bg-brand-purple-50 hover:text-brand-purple-700 data-[state=on]:bg-brand-purple-100 data-[state=on]:text-brand-purple-800 data-[state=on]:shadow-brand-sm",
        outline:
          "border border-brand-purple-200 bg-transparent hover:bg-brand-purple-50 hover:text-brand-purple-700 hover:border-brand-purple-300 data-[state=on]:bg-brand-purple-600 data-[state=on]:text-white data-[state=on]:border-brand-purple-600 data-[state=on]:shadow-brand-md",
        solid:
          "bg-brand-purple-100 text-brand-purple-700 hover:bg-brand-purple-200 data-[state=on]:bg-brand-gradient data-[state=on]:text-white data-[state=on]:shadow-brand-lg data-[state=on]:shadow-glow",
        ghost:
          "hover:bg-brand-purple-50 hover:text-brand-purple-700 data-[state=on]:bg-brand-purple-600 data-[state=on]:text-white",
        gradient:
          "bg-brand-gradient-purple text-white hover:bg-brand-gradient-r-hover data-[state=on]:shadow-glow data-[state=on]:scale-105 transform transition-all duration-200",
        modern:
          "bg-gradient-to-r from-brand-purple-50 to-brand-pink-50 border border-brand-purple-200 hover:from-brand-purple-100 hover:to-brand-pink-100 hover:border-brand-purple-300 data-[state=on]:from-brand-purple-600 data-[state=on]:to-brand-pink-600 data-[state=on]:text-white data-[state=on]:border-transparent data-[state=on]:shadow-brand-lg",
      },
      size: {
        default: "h-10 px-3 min-w-10",
        sm: "h-8 px-2.5 min-w-8 text-xs",
        lg: "h-12 px-5 min-w-12 text-base",
        xl: "h-14 px-6 min-w-14 text-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

const Toggle = React.forwardRef<
  React.ElementRef<typeof TogglePrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>
>(({ className, variant, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ variant, size, className }))} {...props} />
))

Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }
