"use client"

import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const switchVariants = cva(
  "peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "data-[state=checked]:bg-brand-purple-600 data-[state=unchecked]:bg-brand-black-200 hover:data-[state=unchecked]:bg-brand-black-300",
        gradient:
          "data-[state=checked]:bg-brand-gradient data-[state=unchecked]:bg-brand-black-200 hover:data-[state=unchecked]:bg-brand-black-300",
        modern:
          "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-brand-purple-600 data-[state=checked]:to-brand-pink-600 data-[state=unchecked]:bg-brand-black-200 hover:data-[state=unchecked]:bg-brand-black-300",
        outline:
          "border-2 data-[state=checked]:border-brand-purple-600 data-[state=checked]:bg-brand-purple-50 data-[state=unchecked]:border-brand-black-300 data-[state=unchecked]:bg-transparent hover:data-[state=unchecked]:border-brand-black-400",
        glow: "data-[state=checked]:bg-brand-purple-600 data-[state=checked]:shadow-glow data-[state=unchecked]:bg-brand-black-200 hover:data-[state=unchecked]:bg-brand-black-300",
      },
      size: {
        sm: "h-5 w-9",
        default: "h-6 w-11",
        lg: "h-7 w-13",
        xl: "h-8 w-15",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

const switchThumbVariants = cva(
  "pointer-events-none block rounded-full bg-white shadow-lg ring-0 transition-transform",
  {
    variants: {
      variant: {
        default: "data-[state=checked]:shadow-brand-md",
        gradient: "data-[state=checked]:shadow-brand-md",
        modern: "data-[state=checked]:shadow-brand-md",
        outline: "bg-brand-purple-600 data-[state=unchecked]:bg-brand-black-400",
        glow: "data-[state=checked]:shadow-glow",
      },
      size: {
        sm: "h-4 w-4 data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
        default: "h-5 w-5 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
        lg: "h-6 w-6 data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0",
        xl: "h-7 w-7 data-[state=checked]:translate-x-7 data-[state=unchecked]:translate-x-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface SwitchProps
  extends React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>,
    VariantProps<typeof switchVariants> {}

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitive.Root>, SwitchProps>(
  ({ className, variant, size, ...props }, ref) => (
    <SwitchPrimitive.Root className={cn(switchVariants({ variant, size }), className)} {...props} ref={ref}>
      <SwitchPrimitive.Thumb className={cn(switchThumbVariants({ variant, size }))} />
    </SwitchPrimitive.Root>
  ),
)
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch, switchVariants }
