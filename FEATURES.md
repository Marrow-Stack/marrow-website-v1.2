# Marrow Features & Components

This document provides a detailed overview of the core features and components available in Marrow.

## 1. Refractive Dock (`components/navbar.tsx`)

A sophisticated, glassmorphic navigation bar designed for modern web applications.

- **Glassmorphism**: Uses `glass-capsule-solid` utility with backdrop blur and custom reflections for a high-end feel.
- **Adaptive Logo**: Automatically switches between light and dark versions based on the current theme.
- **Interactive Search**:
    - Dedicated search input with focus states.
    - Keyboard shortcut support (⌘K or Ctrl+K) for quick access.
- **Theme Toggle**: Seamless switching between Light and Dark modes with animated Sun/Moon icons.
- **Framer Motion Animations**: Smooth entry animations and hover states for dock icons.

## 2. Hero Section (`components/Hero.tsx`)

The centerpiece of the Marrow aesthetic, designed to capture attention immediately.

- **3D Word Flip**: A "Mechanical" word-flipping animation that cycle through project values ("to the Core", "for Scale", "Precisely", "Solidly") with 3D depth.
- **Mouse Parallax**: Subtle background and foreground movement synchronized with mouse position for an immersive experience.
- **Typography**: Large, bold "Engineered" heading with custom letter spacing and gradient "text-reveal" effects.
- **Integrated Components**: Incorporates `Badge`, `BorderBeam`, and `AnimatedButton`.

## 3. Metallic Theme System (`app/globals.css`)

A comprehensive styling system that defines the Marrow "Engineered" look.

- **CSS Variables**: Defined HSL values for `metal-foreground`, `metal-lustre`, `metal-border`, and `metal-shine`.
- **Titanium Look**: Specialized gradients and text utilities (`text-reveal-light`, `shine-effect`) that mimic metallic surfaces.
- **Glass Utilities**: Custom `glass-capsule-solid` effect with radial gradient reflections to simulate glass surfaces.
- **Theme-Aware**: Fully optimized for both Light (Slate & Silver) and Dark (Zinc & Titanium) modes.

## 4. Specialized UI Components (`components/ui/`)

### `BorderBeam.tsx`
An animated border effect that "sweeps" around a container, perfect for highlighting active elements or adding a premium touch to cards.

### `AnimatedButton.tsx`
A high-performance button component with custom hover interactions and smooth transitions.

### `Background.tsx`
A versatile background component that provides a consistent canvas for the application's metallic theme.

### `Badge.tsx`
A clean, informative badge component often used for announcements or status updates within the Hero section.

### `WordFlip.tsx`
A standalone version of the 3D word flipping animation used in the Hero section, optimized to prevent layout shifts.

## Technical Details

- **Tailwind CSS 4**: Utilizes the latest Tailwind features, including `@theme inline` and custom variants.
- **Framer Motion**: Leveraged for complex 3D transitions and spring-based physics.
- **Next.js 15 App Router**: Optimized for the latest React patterns and performance.
