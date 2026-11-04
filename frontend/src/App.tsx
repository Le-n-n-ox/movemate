import { Navigate, Route, Routes } from "react-router-dom";
import { Suspense } from "react";
import Landing from "@/pages/Landing";
import Start from "@/pages/Start";
import Cleaner from "@/pages/Cleaner";
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
import { BBoxOverlay } from "@/components/BBoxOverlay";
const BBoxTest = () => (<div style={{padding:20}}><BBoxOverlay src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAwMCAO+ip1sAAAAASUVORK5CYII=" alt="test" boxes={[{id:"1",label:"test",bbox:{x:0.1,y:0.1,w:0.2,h:0.2}}]} /></div>);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/start" element={<Start />} />
      <Route path="/cleaner" element={<Cleaner />} />
      <Route path="/properties" element={<Suspense fallback={null}><Properties /></Suspense>} />
      <Route path="/properties/:id" element={<Suspense fallback={null}><Property /></Suspense>} />
      <Route path="/properties/:id/rooms/:roomId" element={<Room />} />
      <Route path="/properties/:id/cases" element={<Cases />} />
      <Route path="/cases/:caseId" element={<CaseDetail />} />
      <Route path="/inspection/:id" element={<Inspection />} />
      <Route path="/inspection/:id/readiness" element={<Readiness />} />
      <Route path="/audit/:auditId" element={<Audit />} />
      <Route path="/g/:token" element={<Guest />} />
      <Route path="/s/:stayToken" element={<Stay />} />
      <Route path="/bbox-test" element={<BBoxTest />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}