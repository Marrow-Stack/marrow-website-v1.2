import { HeroSection } from "@/components/Hero";
import { RefractiveDock } from "@/components/navbar";

export default function Home() {
  return (
    <div className="min-h-screen w-full relative font-display">
      <RefractiveDock />
      <HeroSection />
    </div>
  );
}
