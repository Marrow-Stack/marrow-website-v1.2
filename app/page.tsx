import { HeroSection } from "@/components/Hero";
import { ModeToggle } from "@/components/mode-toggle";
import { RefractiveDock } from "@/components/navbar";
import { Background } from "@/components/ui/background";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen w-full relative font-display">
      <Background className="fixed inset-0 z-0" />
      <RefractiveDock />
      <HeroSection />
    </div>
  );
}
