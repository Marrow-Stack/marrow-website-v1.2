"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { BorderBeam } from "@/components/ui/border-beam";
import AnimatedButton from "@/components/ui/animated-button";
import { Badge } from "@/components/ui/badge";

const WORDS = ["to the Core", "for Scale", "Precisely", "Solidly"];

export const HeroSection = () => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % WORDS.length);
        }, 3000);
        return () => clearInterval(timer);
    }, []);

    return (
        <section className="relative min-h-screen w-full overflow-hidden bg-background transition-colors duration-500">
            <div className="relative z-10 container mx-auto px-4 min-h-screen flex items-center justify-center">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, ease: [0.23, 1, 0.32, 1] }}
                    className="text-center z-40 relative max-w-7xl w-full"
                >

                    <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.3, ease: [0.23, 1, 0.32, 1] }}
                        className="relative inline-flex items-center gap-2 px-2 py-1.5 rounded-full bg-zinc-100/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-600 dark:text-zinc-100 mb-8 backdrop-blur-sm shadow-sm overflow-hidden z-10"
                    >
                        <Badge />
                        <BorderBeam
                            size={40}
                            duration={3}
                            delay={0}
                            borderWidth={1.5}
                            colorFrom="rgba(0, 0, 0, 0.5)"
                            colorTo="transparent"
                            className="dark:hidden"
                        />
                        <BorderBeam
                            size={40}
                            duration={3}
                            delay={0}
                            borderWidth={1.5}
                            colorFrom="rgba(255, 255, 255, 0.5)"
                            colorTo="transparent"
                            className="hidden dark:block"
                        />
                    </motion.div>
                    <h1 className="relative flex flex-col items-center justify-center text-center text-6xl font-black md:text-7xl lg:text-9xl leading-[0.8] mb-8 w-full tracking-engineered select-none">

                        {/* Static Lead-in */}
                        <span className="shrink-0 sm:pr-8 text-reveal-light pb-8 -mb-8 pt-2 dark:drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                            Engineered
                        </span>

                        {/* Animated Suffix Container */}
                        <span
                            className="relative flex items-center overflow-hidden justify-center sm:justify-start pb-4 -mb-8 pt-2 px-12 -mx-12"
                            style={{
                                perspective: "1000px",
                                minWidth: "min-content"
                            }}
                        >
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={WORDS[index]}
                                    initial={{ y: "60%", opacity: 0, rotateX: 70 }}
                                    animate={{ y: "0%", opacity: 1, rotateX: 0 }}
                                    exit={{ y: "-60%", opacity: 0, rotateX: -70 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 200,
                                        damping: 20,
                                        mass: 0.6
                                    }}
                                    className="inline-block whitespace-nowrap text-reveal-light leading-none pb-4 px-4 text-center sm:text-left"
                                >
                                    {WORDS[index]}
                                </motion.span>
                            </AnimatePresence>
                        </span>
                    </h1>

                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.6, ease: [0.23, 1, 0.32, 1] }}
                        className="flex justify-center w-full mb-1"
                    >
                        <div className="px-10 py-5 min-w-[300px] max-w-fit">
                            <p className="relative z-10 text-base md:text-lg text-foreground/90 font-medium tracking-tight text-center whitespace-nowrap">
                                A curated collection of high-performance & beautifully engineered blocks.
                            </p>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 15, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.7, ease: [0.23, 1, 0.32, 1] }}
                        className="flex justify-center mt-2"
                    >
                        <Link href="/">
                            <AnimatedButton className="text-sm px-8 py-4 cursor-pointer">
                                Browse Components
                            </AnimatedButton>
                        </Link>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};
