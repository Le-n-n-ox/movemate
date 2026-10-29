"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ErrorNote, Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import type { PropertyOut, PropertyType } from "@/lib/types";

const TYPES: PropertyType[] = ["apartment", "house", "studio", "villa", "cabin", "other"];

export default function Properties() {
  const [list, setList] = useState<PropertyOut[] | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [ptype, setPtype] = useState<PropertyType | "">("");
  const [capacity, setCapacity] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const load = () => api.listProperties().then(setList).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);

  return (
    <Shell title="Your properties">
      <ErrorNote message={err} />
      <form className="card space-y-2" onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        try {
          await api.createProperty({
            name: name.trim(), address: address.trim() || undefined, property_type: ptype || undefined,
            capacity: capacity ? Number(capacity) : undefined,
          });
          setName(""); setAddress(""); setPtype(""); setCapacity(""); load();
        } catch (x) { setErr((x as Error).message); }
      }}>
        <h2 className="font-medium">Add a property</h2>
        <input className="input" placeholder="Name (Beach flat)" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <div className="flex gap-2">
          <select className="input" value={ptype} onChange={(e) => setPtype(e.target.value as PropertyType | "")}>
            <option value="">Type</option>
            {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="input" type="number" min={1} placeholder="Guests" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
        </div>
        <button className="btn w-full">Add property</button>
      </form>
      <button className="btn-ghost w-full" onClick={async () => { try { await api.seed(); load(); } catch (x) { setErr((x as Error).message); } }}>
        Load demo data (dev)
      </button>
      {list === null && !err && <p className="text-stone-500">Loading...</p>}
      {list?.map((p) => (
        <Link key={p.id} href={`/properties/${p.id}`} className="card block">
          <div className="font-medium">{p.name}</div>
          <div className="text-sm text-stone-500">{[p.property_type, p.capacity ? `sleeps ${p.capacity}` : null, p.address].filter(Boolean).join(" · ") || "Open property"}</div>
        </Link>
      ))}
      {list?.length === 0 && <p className="text-stone-500">No properties yet. Add one or load the demo.</p>}
    </Shell>
  );
}
