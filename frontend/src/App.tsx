import { Navigate, Route, Routes } from "react-router-dom";
import Landing from "@/pages/Landing";
import Properties from "@/pages/Properties";
import Property from "@/pages/Property";
import Room from "@/pages/Room";
import Cases from "@/pages/Cases";
import CaseDetail from "@/pages/CaseDetail";
import Inspection from "@/pages/Inspection";
import Readiness from "@/pages/Readiness";
import Audit from "@/pages/Audit";
import Guest from "@/pages/Guest";
import Stay from "@/pages/Stay";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/properties" element={<Properties />} />
      <Route path="/properties/:id" element={<Property />} />
      <Route path="/properties/:id/rooms/:roomId" element={<Room />} />
      <Route path="/properties/:id/cases" element={<Cases />} />
      <Route path="/cases/:caseId" element={<CaseDetail />} />
      <Route path="/inspection/:id" element={<Inspection />} />
      <Route path="/inspection/:id/readiness" element={<Readiness />} />
      <Route path="/audit/:auditId" element={<Audit />} />
      <Route path="/g/:token" element={<Guest />} />
      <Route path="/s/:stayToken" element={<Stay />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}