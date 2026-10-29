"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorNote, Pill, Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useActor } from "@/lib/useRole";
import type { InspectionKind, InspectionOut, PropertyDetail, PropertyType, RoomType } from "@/lib/types";

const ROOM_TYPES: RoomType[] = ["bedroom", "bathroom", "kitchen", "living", "balcony", "garage", "laundry", "storage", "other"];
const PTYPES: PropertyType[] = ["apartment", "house", "studio", "villa", "cabin", "other"];
const KINDS: { kind: InspectionKind; label: string }[] = [
  { kind: "after_checkout", label: "After checkout" }, { kind: "after_cleaning", label: "After cleaning" }, { kind: "before_checkin", label: "Before check-in" },
];
const KIND_NAME: Record<InspectionKind, string> = { after_checkout: "After checkout", after_cleaning: "After cleaning", before_checkin: "Before check-in" };

/** Host view of one property: details, rooms, inspections, cases, guest link. */
export default function PropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [actor, setActor] = useActor();
  const [p, setP] = useState<PropertyDetail | null>(null);
  const [inspections, setInspections] = useState<InspectionOut[]>([]);
  const [roomName, setRoomName] = useState("");
  const [roomType, setRoomType] = useState<RoomType>("bedroom");
  const [reservation, setReservation] = useState("");
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ address: "", details: "", rules: "", capacity: "", property_type: "" });
  const [err, setErr] = useState<string | null>(null);

  const load = () => {
    api.getProperty(id).then((x) => {
      setP(x);
      setF({ address: x.address ?? "", details: x.details ?? "", rules: x.rules ?? "", capacity: x.capacity ? String(x.capacity) : "", property_type: x.property_type ?? "" });
    }).catch((e) => setErr(e.message));
    api.listInspections(id).then(setInspections).catch(() => {});
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const guestUrl = p && typeof window !== "undefined" ? `${window.location.origin}/g/${p.guest_token}` : "";
  const startInspection = async (kind: InspectionKind) => {
    if (!actor.trim()) { setErr("Enter your name first (top of this page)."); return; }
    try {
      const i = await api.createInspection(id, { kind, inspector: actor.trim(), reservation_ref: reservation.trim() || undefined });
      router.push(`/inspection/${i.id}?role=host`);
    } catch (x) { setErr((x as Error).message); }
  };

  return (
    <Shell title={p?.name ?? "Property"} back={{ href: "/properties", label: "Properties" }}>
      <ErrorNote message={err} />
      <input className="input" placeholder="Your name (used in inspection records)" value={actor} onChange={(e) => setActor(e.target.value)} />

      <section className="card space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Details</h2>
          <button className="text-sm text-brand" onClick={() => setEdit(!edit)}>{edit ? "Cancel" : "Edit"}</button>
        </div>
        {!edit ? (
          <div className="space-y-1 text-sm text-stone-700">
            <p>{[p?.property_type, p?.capacity ? `sleeps ${p.capacity}` : null, p?.address].filter(Boolean).join(" · ") || "No details yet."}</p>
            {p?.details && <p>{p.details}</p>}
            {p?.rules && <p><b>House rules and procedures:</b> {p.rules}</p>}
          </div>
        ) : (
          <form className="space-y-2" onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.patchProperty(id, { address: f.address, details: f.details, rules: f.rules,
                capacity: f.capacity ? Number(f.capacity) : undefined, property_type: (f.property_type || undefined) as PropertyType | undefined });
              setEdit(false); load();
            } catch (x) { setErr((x as Error).message); }
          }}>
            <input className="input" placeholder="Address" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} />
            <div className="flex gap-2">
              <select className="input" value={f.property_type} onChange={(e) => setF({ ...f, property_type: e.target.value })}>
                <option value="">Type</option>{PTYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input className="input" type="number" min={1} placeholder="Guests" value={f.capacity} onChange={(e) => setF({ ...f, capacity: e.target.value })} />
            </div>
            <textarea className="input" rows={2} placeholder="Basic details (floor, access, Wi-Fi...)" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} />
            <textarea className="input" rows={3} placeholder="House rules and operating procedures" value={f.rules} onChange={(e) => setF({ ...f, rules: e.target.value })} />
            <button className="btn w-full">Save</button>
          </form>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">Rooms</h2>
        {p?.rooms.map((r) => (
          <Link key={r.id} href={`/properties/${id}/rooms/${r.id}`} className="card block">
            <div className="flex items-center gap-2"><span className="font-medium">{r.name}</span><Pill>{r.room_type}</Pill></div>
            <div className="text-sm text-stone-500">{r.confirmed_items} confirmed, {r.suggested_items} to review</div>
          </Link>
        ))}
        <form className="flex gap-2" onSubmit={async (e) => {
          e.preventDefault();
          if (!roomName.trim()) return;
          try { await api.createRoom(id, { name: roomName.trim(), room_type: roomType }); setRoomName(""); load(); } catch (x) { setErr((x as Error).message); }
        }}>
          <input className="input" placeholder="Add a room" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
          <select className="input !w-32" value={roomType} onChange={(e) => setRoomType(e.target.value as RoomType)}>
            {ROOM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <button className="btn-ghost">Add</button>
        </form>
      </section>

      <section className="card space-y-2">
        <h2 className="font-medium">Start an inspection</h2>
        <input className="input" placeholder="Reservation reference (optional)" value={reservation} onChange={(e) => setReservation(e.target.value)} />
        <div className="grid grid-cols-3 gap-2">
          {KINDS.map((k) => <button key={k.kind} className="btn !px-2 text-sm" onClick={() => startInspection(k.kind)}>{k.label}</button>)}
        </div>
        {inspections.slice(0, 5).map((i) => (
          <Link key={i.id} href={`/inspection/${i.id}?role=host`} className="flex items-center justify-between rounded-lg bg-stone-50 p-2 text-sm">
            <span>{KIND_NAME[i.kind]}{i.reservation_ref ? ` · ${i.reservation_ref}` : ""} · {new Date(i.created_at).toLocaleDateString()}</span>
            <Pill tone={i.status === "in_progress" ? "amber" : i.status === "completed" ? "green" : "blue"}>{i.status.replace(/_/g, " ")}</Pill>
          </Link>
        ))}
      </section>

      <section className="space-y-2">
        <Link href={`/properties/${id}/cases?role=host`} className="btn-ghost w-full">
          Cases to resolve{p ? ` (${p.open_discrepancies} open)` : ""}
        </Link>
        <button className="btn-ghost w-full" onClick={async () => {
          try { const a = await api.createAudit(id); router.push(`/audit/${a.id}?role=host`); } catch (x) { setErr((x as Error).message); }
        }}>Start AI video check (suggestions only)</button>
        {p?.latest_audit_id && <Link href={`/audit/${p.latest_audit_id}?role=host`} className="btn-ghost w-full">View latest AI video check</Link>}
      </section>

      <section className="card space-y-2">
        <h2 className="font-medium">Guest guide link</h2>
        <p className="break-all text-sm text-stone-600">{guestUrl}</p>
        <button className="btn-ghost w-full" onClick={() => navigator.clipboard.writeText(guestUrl)}>Copy link</button>
      </section>
    </Shell>
  );
}
