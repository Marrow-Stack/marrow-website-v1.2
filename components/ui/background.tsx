"use client";
import React, { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export const Background = ({ className }: { className?: string }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle[] = [];
        const dpr = window.devicePixelRatio || 1;

        class Particle {
            x: number = 0; y: number = 0;
            speed: number = 0; size: number = 0;
            baseOpacity: number = 0;
            
            constructor() { this.reset(); }

            reset() {
                this.x = Math.random() * window.innerWidth;
                this.y = window.innerHeight + Math.random() * 200;
                this.speed = Math.random() * 0.4 + 0.15;
                this.size = Math.random() * 1.4 + 0.6; 
                this.baseOpacity = Math.random() * 0.15 + 0.05;
            }

            update() {
                this.y -= this.speed;
                if (this.y < -50) this.reset();
            }

            draw(isDark: boolean) {
                if (!ctx) return;
                
                const beamX = (window.innerWidth * 0.45) + (this.y * 0.25); 
                const distanceToBeam = Math.abs(this.x - beamX);
                
                let finalOpacity = this.baseOpacity;
                let glowIntensity = 0;

                if (distanceToBeam < 180) {
                    glowIntensity = (1 - distanceToBeam / 180);
                    finalOpacity += glowIntensity * 0.4;
                }

                ctx.beginPath();
                
                if (glowIntensity > 0.3) {
                    ctx.shadowBlur = isDark ? 10 : 6;
                    // Light mode: uses a soft slate-blue glow to suggest refraction
                    // Dark mode: uses pure white/zinc glow
                    ctx.shadowColor = isDark 
                        ? `rgba(255, 255, 255, ${glowIntensity * 0.8})` 
                        : `rgba(148, 163, 184, ${glowIntensity * 0.5})`; 
                }

                ctx.fillStyle = isDark 
                    ? `rgba(255, 255, 255, ${finalOpacity})` 
                    : `rgba(15, 23, 42, ${finalOpacity + 0.1})`; // Darker slate for light mode grains
                
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0; // Reset
            }
        }

        const init = () => {
            const { innerWidth: width, innerHeight: height } = window;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.scale(dpr, dpr);
            particles = Array.from({ length: 180 }, () => new Particle());
        };

        const animate = () => {
            const isDark = document.documentElement.classList.contains("dark");
            ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

            // Mist pass
            const gradient = ctx.createLinearGradient(0, 0, window.innerWidth, window.innerHeight);
            const beamColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(148,163,184,0.06)';
            
            gradient.addColorStop(0.3, 'transparent');
            gradient.addColorStop(0.5, beamColor);
            gradient.addColorStop(0.7, 'transparent');
            
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

            particles.forEach(p => {
                p.update();
                p.draw(isDark);
            });
            
            animationFrameId = requestAnimationFrame(animate);
        };

        window.addEventListener("resize", init);
        init();
        animate();

        return () => {
            window.removeEventListener("resize", init);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className={cn("absolute inset-0 overflow-hidden pointer-events-none bg-background transition-colors duration-500", className)}>
            
            <div 
                className="absolute inset-0 opacity-[0.22] dark:opacity-[0.1] z-0"
                style={{
                    backgroundImage: `linear-gradient(to right, currentColor 1.5px, transparent 1.5px), linear-gradient(to bottom, currentColor 1.5px, transparent 1.5px)`,
                    backgroundSize: '90px 90px',
                    maskImage: 'radial-gradient(circle at center, black 20%, transparent 90%)',
                    WebkitMaskImage: 'radial-gradient(circle at center, black 20%, transparent 90%)',
                    transform: 'perspective(1200px) rotateX(68deg) scale(1.6) translateY(-10%)',
                    transformOrigin: 'center center',
                    color: 'var(--metal-border, #64748b)'
                }}
            />

            {/* 2. The Canvas (Glow Grains) */}
            <canvas 
                ref={canvasRef} 
                className="absolute inset-0 z-20 h-full w-full opacity-90" 
            />

            {/* 3. Global Atmospheric Blend */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,var(--background)_100%)] z-10" />
        </div>
    );
};