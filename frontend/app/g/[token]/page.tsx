"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { FilePicker } from "@/components/FilePicker";
import { ErrorNote } from "@/components/Shell";
import { api } from "@/lib/api";
import type { GuestAnswer, GuestProperty } from "@/lib/types";

export default function GuestPage() {
  const { token } = useParams<{ token: string }>();
  const [prop, setProp] = useState<GuestProperty | null>(null);
  const [ans, setAns] = useState<GuestAnswer | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => { api.guestProperty(token).then(setProp).catch((e) => setErr(e.message)); }, [token]);

  return (
    <main className="mx-auto max-w-md px-4 pb-24 pt-8">
      <h1 className="text-2xl font-semibold">{prop?.property_name ?? "Welcome"}</h1>
      <p className="mb-5 mt-1 text-stone-600">Not sure how something works? Take a photo of it.</p>
      {prop?.house_rules && <p className="mb-4 whitespace-pre-line rounded-xl bg-stone-100 p-3 text-sm text-stone-700"><b>House rules:</b> {prop.house_rules}</p>}
      <ErrorNote message={err} />
      <FilePicker kind="image" label="Snap a photo" onFile={async (f) => {
        setErr(null); setAns(null); setPreview(URL.createObjectURL(f));
        setAns(await api.guestAsk(token, f));
      }} />
      {preview && /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="" className="mt-4 rounded-xl" />}
      {ans && (
        <div className="card mt-4 space-y-3">
          {ans.matched && ans.guide ? (
            <>
              <h2 className="text-lg font-semibold">{ans.guide.title}</h2>
              <ol className="list-decimal space-y-2 pl-5">{ans.guide.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
              {ans.guide.warnings.length > 0 && <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{ans.guide.warnings.join(" ")}</div>}
              {ans.guide.unsure.length > 0 && <p className="text-sm text-stone-500">Not sure about: {ans.guide.unsure.join(", ")}</p>}
            </>
          ) : <p>{ans.message}</p>}
        </div>
      )}
    </main>
  );
}
