"use client";
import React from "react";
import { motion } from "framer-motion";
import { ComputerIcon } from "lucide-react"; 

export const Badge = () => {
    return (
        <motion.a
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            href="https://github.com/Marrow-Stack"
            target="_blank"
            rel="noopener noreferrer"
            className="
                group relative z-20 flex h-9 items-center gap-2.5 rounded-full 
                border border-black/5 dark:border-white/10 
                bg-zinc-50 dark:bg-white/5 
                px-4 text-sm font-medium transition-all
                hover:bg-zinc-100 dark:hover:bg-white/10
                hover:shadow-sm
            "
        >
            <span className="text-muted-foreground transition-colors group-hover:text-foreground">
                Star on
            </span>
            <span className="flex items-center gap-1.5 text-foreground">
                <ComputerIcon
                    size={14} 
                    strokeWidth={2} 
                    className="transition-transform group-hover:scale-110" 
                />
                GitHub
            </span>
        </motion.a>
    );
};