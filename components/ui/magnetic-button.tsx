"use client"

import * as React from "react"
import { motion, useMotionValue, useSpring, useTransform, type HTMLMotionProps } from "framer-motion"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"
import { marrowButtonVariants, type ButtonProps as VariantProps } from "./refined-button"

interface MarrowButtonProps 
  extends Omit<HTMLMotionProps<"button">, "children" | "style">,
    Omit<VariantProps, "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"> {
  children?: React.ReactNode;
  style?: React.CSSProperties;
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, MarrowButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const x = useMotionValue(0)
    const y = useMotionValue(0)

    const springConfig = { damping: 15, stiffness: 500, mass: 0.1 }
    const mouseX = useSpring(x, springConfig)
    const mouseY = useSpring(y, springConfig)
    const shineX = useTransform(mouseX, [-20, 20], ["-100%", "100%"])

    const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
      const rect = e.currentTarget.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      x.set((e.clientX - centerX) * 0.3)
      y.set((e.clientY - centerY) * 0.3)
    }

    const handleMouseLeave = () => {
      x.set(0)
      y.set(0)
    }

    if (asChild) {
      const { 
        whileHover, whileTap, transition, onAnimationStart, 
        layout, initial, animate, exit, variants: _v, ...slotProps 
      } = props as any

      return (
        <Slot 
          ref={ref}
          className={cn(marrowButtonVariants({ variant, size, className }))} 
          {...slotProps}
        >
          {children}
        </Slot>
      )
    }

    return (
      <motion.button
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ x: mouseX, y: mouseY } as any}
        // Tactile switch travel (3px)
        whileTap={{ y: 3, scale: 0.98 }} 
        transition={{ type: "spring", stiffness: 600, damping: 20 }}
        className={cn(
          "group/button relative isolate overflow-hidden preserve-3d",
          marrowButtonVariants({ variant, size, className })
        )}
        {...props}
      >
        <motion.span
          style={{ x: shineX }}
          className="absolute inset-0 z-0 pointer-events-none opacity-0 group-hover/button:opacity-100 transition-opacity duration-300"
        >
          <span className="absolute inset-0 bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] w-[200%] -translate-x-1/2" />
        </motion.span>
        <span className="relative z-10 flex items-center justify-center gap-2 pointer-events-none">
          {children}
        </span>
        <span 
          className="absolute inset-0 z-[-1] translate-y-[3px] rounded-lg bg-black/40 blur-[1px] opacity-0 group-hover/button:opacity-100 group-active/button:opacity-0 transition-all duration-200" 
        />
      </motion.button>
    )
  }
)

Button.displayName = "MarrowButton"

export { Button }