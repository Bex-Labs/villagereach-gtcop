"use client";

import { useActionState } from "react";
import { addCountry } from "./actions";
import { AFRICAN_COUNTRIES } from "@/lib/africa";

export default function AddCountryForm({ existingIsoCodes }) {
  const [state, formAction, pending] = useActionState(addCountry, {});
  const available = AFRICAN_COUNTRIES.filter((c) => !existingIsoCodes.includes(c.iso));

  return (
    <form action={formAction} className="card form-card">
      <h2>Add a country</h2>

      {state.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      {state.success && <div className="alert alert-success" role="status">{state.success}</div>}

      <label htmlFor="iso">Country</label>
      <select id="iso" name="iso" required defaultValue="">
        <option value="" disabled>Choose a country…</option>
        {available.map((c) => (
          <option key={c.iso} value={c.iso}>{c.name}</option>
        ))}
      </select>

      <label htmlFor="summary">Short summary (optional)</label>
      <textarea id="summary" name="summary" rows={3} />

      <label className="checkbox">
        <input type="checkbox" name="is_visible" /> Show this country to the public now
      </label>

      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Adding…" : "Add country"}
      </button>
    </form>
  );
}