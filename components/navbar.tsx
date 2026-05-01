"use client";
import React, { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Boxes, BookOpen, LayoutGrid, Cpu, Layers, Sun, Moon } from "lucide-react";
import { useTheme } from "next-themes";
import Link from "next/link";
import Image from "next/image";

const LEFT_ITEMS = [
  { name: "Blocks", icon: Boxes, href: "/blocks" },
  { name: "Docs", icon: BookOpen, href: "/docs" },
];

const RIGHT_ITEMS = [
  { name: "Systems", icon: Cpu, href: "/systems" },
  { name: "Layers", icon: Layers, href: "/layers" },
];

export const RefractiveDock = () => {
  const mouseX = useMotionValue(Infinity);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <motion.nav
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
      /* 
         'fixed' ensures it stays in the screen regardless of scroll.
         'top-10' provides that clean floating margin.
         'z-50' keeps it above the AETHER/Cosmos Engine and other components.
      */
      className="fixed top-10 inset-x-0 mx-auto z-50 flex h-16 max-w-4xl items-center justify-between glass-capsule-solid px-8 border border-white/10 shadow-2xl transition-all duration-300"
    >
      <div className="flex items-center gap-6">
        {LEFT_ITEMS.map((item) => (
          <DockIcon key={item.name} mouseX={mouseX} item={item} />
        ))}
      </div>

      <div className="flex items-center justify-center flex-1 px-4">
         {mounted && <Logo theme={theme} />}
      </div>

      <div className="flex items-center gap-6">
        {RIGHT_ITEMS.map((item) => (
          <DockIcon key={item.name} mouseX={mouseX} item={item} />
        ))}
        
        <div className="h-6 w-[1px] bg-white/10 mx-2" />

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="group relative flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800/50 border border-white/5 transition-all hover:bg-zinc-700/50 active:scale-95"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-zinc-400 group-hover:text-white" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-zinc-400 group-hover:text-white" />
        </button>
      </div>
    </motion.nav>
  );
};

const Logo = ({ theme }: { theme?: string }) => {
  const src = theme === "dark" ? "/white.svg" : "/black.svg";

  return (
    <Link href="/" className="hover:opacity-80 transition-all duration-300 transform hover:scale-105 active:scale-95">
      <Image 
        src={src} 
        alt="MarrowStack Logo" 
        width={32} 
        height={32} 
        priority
      />
    </Link>
  );
};

function DockIcon({ mouseX, item }: { mouseX: any; item: any }) {
  const ref = useRef<HTMLDivElement>(null);
  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
    return val - bounds.x - bounds.width / 2;
  });

  const widthSync = useTransform(distance, [-150, 0, 150], [42, 62, 42]);
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 180, damping: 15 });

  return (
    <motion.div
      ref={ref}
      style={{ width }}
      className="group relative aspect-square rounded-full bg-zinc-900/40 flex items-center justify-center border border-white/5 transition-colors hover:bg-zinc-800/80 cursor-pointer"
    >
      <span className="absolute -bottom-10 left-1/2 -translate-x-1/2 rounded-md border border-white/10 bg-black/80 backdrop-blur-md px-2 py-1 text-[10px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap pointer-events-none">
        {item.name}
      </span>
      <item.icon className="h-full w-full p-2.5 text-zinc-400 group-hover:text-white transition-colors" />
    </motion.div>
  );
}