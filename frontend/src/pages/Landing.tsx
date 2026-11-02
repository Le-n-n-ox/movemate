import { Hero, LandingHeader } from "@/components/landing/Hero";
import { Boundary, Facts, Features, FinalCta, Footer, HowItWorks, Roles } from "@/components/landing/Sections";

export default function Landing() {
  return (
    <div id="main" className="overflow-x-clip">
      <LandingHeader />
      <main>
        <Hero />
        <Facts />
        <Features />
        <HowItWorks />
        <Roles />
        <Boundary />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}