import * as React from "react"
import { Slot } from "@radix-ui/react-slot" // Ensure @radix-ui/react-slot is used
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const marrowButtonVariants = cva(
  // Base: Industrial, high-density, sharp tracking
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 overflow-hidden rounded-md text-xs font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-metal-shine/50 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Variant 1: The "Hard-Inertia" (Solid Titanium)
        // Uses your foreground and mineral tokens
        default: 
          "bg-foreground text-background hover:opacity-90 active:scale-[0.98] shadow-sm",
        
        // Variant 2: The "Chassis" (Metallic Border & Glass)
        // Uses your .border-metallic logic
        outline: 
          "border border-metal-border bg-metal-lustre/10 text-metal-foreground backdrop-blur-md hover:bg-metal-lustre/20 hover:border-metal-shine active:bg-metal-lustre/30",
        
        // Variant 3: The "Ghost-Terminal"
        // Raw text with mineral color
        ghost: 
          "text-accent-mineral hover:text-foreground hover:bg-metal-lustre/10",
      },
      size: {
        default: "h-9 px-5",
        sm: "h-7 px-3 text-[10px]",
        lg: "h-11 px-8 text-sm",
        icon: "size-9",
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
    VariantProps<typeof marrowButtonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
      <Comp
        ref={ref}
        className={cn(marrowButtonVariants({ variant, size, className }))}
        {...props}
      >
        {/* The "Marrow" Glow: Only visible on the outline variant via CSS masking */}
        {variant === "outline" && (
          <span className="absolute inset-0 z-0 bg-gradient-to-tr from-metal-shine/0 via-white/5 to-metal-shine/0 opacity-0 transition-opacity group-hover/button:opacity-100" />
        )}
        <span className="relative z-10 flex items-center gap-2">
          {props.children}
        </span>
      </Comp>
    )
  }
)

Button.displayName = "MarrowButton"

export { Button, marrowButtonVariants }