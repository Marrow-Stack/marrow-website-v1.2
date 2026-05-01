"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Using the optimized "Solidly" set to prevent layout shifting
const words = ["to the Core", "for Scale", "Precisely", "Solidly"];

export default function HeroFlip() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative z-10 flex flex-col items-center justify-center text-center">
      <h1 className="flex flex-col items-center justify-center gap-x-4 text-5xl font-bold tracking-tighter text-foreground sm:flex-row md:text-7xl lg:text-8xl leading-[1.1]">
        
        {/* Base text using the --foreground variable */}
        <span className="shrink-0 opacity-90">Engineered</span>

        {/* The Animated Suffix with Metal Lustre */}
        <span 
          className="relative flex h-[1.2em] items-center overflow-hidden justify-center sm:justify-start min-w-[280px] sm:min-w-[450px]"
          style={{ perspective: "1000px" }} // Adds 3D depth to the flip
        >
          <AnimatePresence mode="wait">
            <motion.span
              key={words[index]}
              /* Mechanical 3D Flip transition */
              initial={{ y: "100%", opacity: 0, rotateX: 45 }}
              animate={{ y: "0%", opacity: 1, rotateX: 0 }}
              exit={{ y: "-100%", opacity: 0, rotateX: -45 }}
              transition={{ 
                type: "spring", 
                stiffness: 125, 
                damping: 20,
                mass: 1
              }}
              className="inline-block whitespace-nowrap px-2 italic text-metal-shine shine-effect"
            >
              {words[index]}
            </motion.span>
          </AnimatePresence>
        </span>
        
      </h1>
    </div>
  );
}