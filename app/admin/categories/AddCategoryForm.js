"use client";

import { useActionState } from "react";
import { addCategory } from "./actions";

export default function AddCategoryForm() {
  const [state, formAction, pending] = useActionState(addCategory, {});

  return (
    <form action={formAction} className="card form-card">
      <h2>Add a category</h2>

      {state.error && <div className="alert alert-error" role="alert">{state.error}</div>}
      {state.success && <div className="alert alert-success" role="status">{state.success}</div>}

      <label htmlFor="name">Category name</label>
      <input id="name" name="name" required />

      <label htmlFor="description">Description (optional)</label>
      <textarea id="description" name="description" rows={3} />

      <button className="btn btn-primary" disabled={pending}>
        {pending ? "Adding…" : "Add category"}
      </button>
    </form>
  );
}