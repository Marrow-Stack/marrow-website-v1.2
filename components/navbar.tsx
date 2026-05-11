"use client";
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Boxes, BookOpen, Search, Sun, Moon, type LucideIcon } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import Image from "next/image";

// Navigation configuration
type DockItem = {
  name: string;
  icon: LucideIcon;
  href: string;
};

const LEFT_ITEMS: DockItem[] = [
  { name: "Blocks", icon: Boxes, href: "/" },
  { name: "Docs", icon: BookOpen, href: "/" },
];

export const RefractiveDock = () => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-10 inset-x-0 mx-auto z-50 flex h-16 max-w-5xl items-center justify-between glass-capsule-solid px-8 border border-black/10 dark:border-white/10 shadow-2xl transition-all duration-300 rounded-2xl backdrop-blur-sm"
    >
      {/* Left Section: Nav Buttons */}
      <div className="flex items-center gap-6">
        {LEFT_ITEMS.map((item) => (
          <DockIcon key={item.name} item={item} />
        ))}
      </div>

      {/* Center Section: Adaptive Logo */}
      <div className="flex items-center justify-center flex-1 px-4">
        <Logo theme={resolvedTheme ?? theme} />
      </div>

      {/* Right Section: Search & Theme Toggle */}
      <div className="flex items-center gap-4">
        <div className="relative group hidden sm:flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-zinc-500 dark:text-zinc-400 pointer-events-none group-focus-within:text-black dark:group-focus-within:text-white transition-colors" />
          
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-48 md:w-64 h-10 pl-10 pr-12 rounded-full bg-zinc-200/50 dark:bg-zinc-900/40 border border-black/5 dark:border-white/5 outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/20 transition-all text-xs text-zinc-800 dark:text-zinc-200 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
          />

          {!searchQuery && (
            <div className="absolute right-3 flex items-center gap-1 px-1.5 py-0.5 rounded border border-black/10 dark:border-white/10 bg-white/50 dark:bg-zinc-800/50 text-[10px] font-medium text-zinc-400 pointer-events-none">
              <span className="text-[8px]">⌘</span>K
            </div>
          )}
        </div>

        <div className="h-6 w-[1px] bg-black/10 dark:bg-white/10 mx-1" />

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-zinc-200/50 dark:bg-zinc-800/50 border border-black/5 dark:border-white/5 transition-all hover:bg-zinc-300/50 dark:hover:bg-zinc-700/50 active:scale-95"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-zinc-600 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-zinc-600 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white" />
        </button>
      </div>
    </motion.nav>
  );
};

// Internal Sub-component: Logo
const Logo = ({ theme }: { theme?: string }) => {
  const src = theme === "dark" ? "/white.svg" : "/black.svg";

  return (
    <Link href="/" className="hover:opacity-80 transition-all duration-300 transform hover:scale-105 active:scale-95">
      <Image 
        src={src} 
        alt="Logo" 
        width={32} 
        height={32} 
        priority 
        className="object-contain"
      />
    </Link>
  );
};

// Internal Sub-component: DockIcon
function DockIcon({ item }: { item: DockItem }) {
  return (
    <Link href={item.href}>
      <motion.div
        className="group relative flex aspect-square h-10 w-10 items-center justify-center rounded-full bg-zinc-200/50 dark:bg-zinc-900/40 border border-black/5 dark:border-white/5 transition-colors hover:bg-zinc-300/50 dark:hover:bg-zinc-800/80 cursor-pointer"
      >
        <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 rounded-md border border-black/10 dark:border-white/10 bg-white/90 dark:bg-black/80 backdrop-blur-md px-2 py-1 text-[10px] font-medium text-black dark:text-white opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap pointer-events-none">
          {item.name}
        </span>
        <item.icon className="h-full w-full p-2.5 text-zinc-600 dark:text-zinc-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
      </motion.div>
    </Link>
  );
}
