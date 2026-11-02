import { Navigate, Route, Routes } from "react-router-dom";
import Properties from "@/pages/Properties";
import Property from "@/pages/Property";
import Room from "@/pages/Room";
import Guest from "@/pages/Guest";
import Inspection from "@/pages/Inspection";
import Cases from "@/pages/Cases";
import CaseDetail from "@/pages/CaseDetail";
import Readiness from "@/pages/Readiness";
import Audit from "@/pages/Audit";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/properties" replace />} />
      <Route path="/properties" element={<Properties />} />
      <Route path="/properties/:id" element={<Property />} />
      <Route path="/properties/:id/rooms/:roomId" element={<Room />} />
      <Route path="/properties/:id/cases" element={<Cases />} />
      <Route path="/cases/:caseId" element={<CaseDetail />} />
      <Route path="/inspection/:id" element={<Inspection />} />
      <Route path="/inspection/:id/readiness" element={<Readiness />} />
      <Route path="/audit/:auditId" element={<Audit />} />
      <Route path="/g/:token" element={<Guest />} />
      <Route path="*" element={<Navigate to="/properties" replace />} />
    </Routes>
  );
}