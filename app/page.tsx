import { HeroSection } from "@/components/Hero";
import { Background } from "@/components/ui/background";

export default function Home() {
  return (
    <div className="min-h-screen w-full relative font-display">
      <Background className="fixed inset-0 z-0" />
      <HeroSection />
    </div>
  );
}
