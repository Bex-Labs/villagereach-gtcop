import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LevelPill from "@/components/LevelPill";
import { updateArea, updateLevel } from "./actions";

export const metadata = { title: "Maturity framework | Admin" };

export default async function FrameworkPage({ searchParams }) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();

  const [{ data: areas }, { data: levels }] = await Promise.all([
    supabase.from("thematic_areas").select("*").order("sort_order"),
    supabase.from("maturity_levels").select("*").order("level"),
  ]);

  return (
    <>
      <p className="breadcrumbs">
        <Link href="/admin/rankings">Rankings</Link> / Framework
      </p>
      <h1>Maturity framework</h1>
      <p className="muted">
        These names appear wherever rankings are shown. Use the exact wording from VillageReach&apos;s assessment matrix.
      </p>

      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {saved && <div className="alert alert-success" role="status">Saved.</div>}

      <h2>Five thematic areas</h2>
      <div className="framework-list">
        {(areas ?? []).map((a, i) => (
          <form key={a.id} action={updateArea} className="card framework-item">
            <input type="hidden" name="id" value={a.id} />
            <p className="eyebrow">Area {i + 1}</p>
            <label htmlFor={`area-name-${a.id}`}>Name *</label>
            <input id={`area-name-${a.id}`} name="name" defaultValue={a.name} required />
            <label htmlFor={`area-desc-${a.id}`}>Description (optional)</label>
            <textarea id={`area-desc-${a.id}`} name="description" defaultValue={a.description ?? ""} />
            <button className="btn btn-primary">Save area</button>
          </form>
        ))}
      </div>

      <h2>Maturity levels</h2>
      <div className="framework-list">
        {(levels ?? []).map((l) => (
          <form key={l.level} action={updateLevel} className="card framework-item">
            <input type="hidden" name="level" value={l.level} />
            <p><LevelPill level={l.level} name={l.name} /></p>
            <label htmlFor={`level-name-${l.level}`}>Name *</label>
            <input id={`level-name-${l.level}`} name="name" defaultValue={l.name} required />
            <label htmlFor={`level-desc-${l.level}`}>What this level means (optional)</label>
            <textarea id={`level-desc-${l.level}`} name="description" defaultValue={l.description ?? ""} />
            <button className="btn btn-primary">Save level</button>
          </form>
        ))}
      </div>
    </>
  );
}