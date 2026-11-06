"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteAssessment } from "@/app/admin/rankings/actions";

// Delete a result in two clicks: "Delete" first, then "Yes, delete" to confirm.
function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-danger" disabled={pending}>
      {pending ? "Deleting…" : "Yes, delete"}
    </button>
  );
}

export default function DeleteResultButton({ id, label }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" className="btn btn-outline btn-danger-outline" onClick={() => setAsking(true)}>
        Delete<span className="visually-hidden"> {label}</span>
      </button>
    );
  }

  return (
    <form action={deleteAssessment} className="delete-confirm" role="group" aria-label={`Delete ${label}?`}>
      <input type="hidden" name="id" value={id} />
      <span className="delete-confirm-text">Delete {label}? This can&apos;t be undone.</span>
      <ConfirmButton />
      <button type="button" className="btn btn-outline" onClick={() => setAsking(false)} autoFocus>
        Cancel
      </button>
    </form>
  );
}