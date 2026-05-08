import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-bold ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-surface-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-surface-900 text-surface-100 border-2 border-surface-900 hover:bg-surface-800 shadow-[4px_4px_0_0_var(--shadow-color)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
        destructive: "bg-error text-surface-100 border-2 border-surface-900 hover:bg-error/90 shadow-[4px_4px_0_0_var(--shadow-color)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
        outline: "border-2 border-surface-900 bg-surface-100 text-surface-900 hover:bg-surface-200 shadow-[4px_4px_0_0_var(--shadow-color)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
        secondary: "bg-brand-300 text-surface-900 border-2 border-surface-900 hover:bg-brand-400 shadow-[4px_4px_0_0_var(--shadow-color)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
        ghost: "hover:bg-surface-200 text-surface-900",
        link: "text-surface-900 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        suppressHydrationWarning
        {...props}

      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
