import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-border/60 bg-surface/90 text-primary-text shadow-sm",
        outline: "border-border/60 bg-transparent text-secondary-text",
        success: "border-green-900/60 bg-green-950/70 text-green-400 shadow-sm",
        warning: "border-orange-900/60 bg-orange-950/70 text-orange-400 shadow-sm",
        destructive: "border-red-900/60 bg-red-950/70 text-red-400 shadow-sm",
        yes: "border-green-900/60 bg-green-950/70 text-green-400 shadow-sm",
        no: "border-red-900/60 bg-red-950/70 text-red-400 shadow-sm",
        subtle: "border-border/60 bg-surface-2/90 text-secondary-text shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
)

Badge.displayName = "Badge"

export { Badge }