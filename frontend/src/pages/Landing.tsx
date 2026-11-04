import { useNavigate } from "react-router-dom";
import { Hero, LandingHeader } from "@/components/landing/Hero";
import {
  Boundary, Compare, Facts, Features, FinalCta, Footer, HowItWorks, Roles, Why,
} from "@/components/landing/Sections";

export default function Landing() {
  const nav = useNavigate();
  const openApp = () => nav("/start");
  return (
    <div id="main">
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
    </div>
  );
}