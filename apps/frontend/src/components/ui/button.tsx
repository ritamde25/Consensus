import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed",
  {
    variants: {
      variant: {
        default: "bg-accent text-white hover:bg-accent-hover",
        destructive: "bg-red-600 text-white hover:bg-red-700",
        outline: "border border-border/70 bg-surface/50 hover:bg-surface/80 hover:border-border",
        secondary: "bg-surface-2/90 text-primary-text hover:bg-surface-3/90 border border-border/50 shadow-sm",
        ghost: "hover:bg-surface/80",
        link: "text-accent underline-offset-4 hover:underline",
        success: "bg-green-600 text-white hover:bg-green-700",
        yes: "bg-green-600 text-white hover:bg-green-700",
        no: "bg-red-600 text-white hover:bg-red-700",
      },

      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6",
        icon: "h-10 w-10",
      },
    },

    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"

export { Button }