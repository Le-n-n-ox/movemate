import { useState } from "react";
import { Hero, LandingHeader } from "@/components/landing/Hero";
import {
  Boundary, Compare, Facts, Features, FinalCta, Footer, HowItWorks, Roles, Why,
} from "@/components/landing/Sections";
import { RolePicker } from "@/components/RolePicker";

export default function Landing() {
  const [picker, setPicker] = useState(false);
  const openApp = () => setPicker(true);
  return (
    <div id="main" className="overflow-x-clip">
      <LandingHeader onOpenApp={openApp} />
      <main>
        <Hero onOpenApp={openApp} />
        <Facts />
        <Why />
        <Features />
        <HowItWorks />
        <Compare />
        <Roles />
        <Boundary />
        <FinalCta onOpenApp={openApp} />
      </main>
      <Footer />
      <RolePicker open={picker} onClose={() => setPicker(false)} />
    </div>
  );
}