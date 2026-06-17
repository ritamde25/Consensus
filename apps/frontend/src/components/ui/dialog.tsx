import * as React from "react"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-300" 
        onClick={() => onOpenChange?.(false)} 
      />
      <div className="relative z-50 animate-in zoom-in-95 duration-300 slide-in-from-bottom-4">{children}</div>
    </div>
  )
}

const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { onClose?: () => void }
>(({ className, children, onClose, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative w-full max-w-lg rounded-2xl border border-border bg-surface/95 p-6 shadow-2xl backdrop-blur-xl",
      className
    )}
    {...props}
  >
    <button
      onClick={onClose}
      className="absolute right-4 top-4 rounded-xl opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-surface-elevated hover:scale-110 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-background p-2"
    >
      <X className="h-5 w-5" />
      <span className="sr-only">Close</span>
    </button>
    {children}
  </div>
))
DialogContent.displayName = "DialogContent"

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-xl font-semibold leading-none tracking-tight", className)}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-secondary-text leading-relaxed", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 mt-6",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
