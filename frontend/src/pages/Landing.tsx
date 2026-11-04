import { useNavigate } from "react-router-dom";
import { Hero, LandingHeader } from "@/components/landing/Hero";
import {
  Boundary, Compare, Facts, Roles, Why,
} from "@/components/landing/Sections";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Sections";

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
        <FinalCTA onOpenApp={openApp} />
      </main>
      <Footer />
    </div>
  );
}