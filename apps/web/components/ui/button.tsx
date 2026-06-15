import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-paper) focus-visible:ring-(--color-honey) disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-(--color-ink) text-(--color-paper) hover:bg-(--color-ink-2)",
        destructive:
          "bg-(--color-rose) text-(--color-paper) hover:opacity-90",
        outline:
          "border border-line-strong bg-transparent text-(--color-ink) hover:bg-(--color-cream-2)",
        secondary:
          "bg-(--color-cream-2) text-(--color-ink) hover:bg-(--color-cream)",
        accent:
          "bg-(--color-honey) text-(--color-ink) hover:bg-(--color-honey-deep) hover:text-(--color-paper)",
        ghost:
          "text-(--color-ink) hover:bg-(--color-cream-2)",
        link:
          "text-(--color-honey-deep) underline-offset-4 hover:underline",
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
