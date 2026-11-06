"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { undoImport } from "./actions";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-danger" disabled={pending}>
      {pending ? "Undoing…" : "Yes, undo"}
    </button>
  );
}

// Undo a whole upload in two clicks
export default function UndoImportButton({ id, count, published }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" className="btn btn-outline btn-danger-outline" onClick={() => setAsking(true)}>
        Undo import
      </button>
    );
  }

  return (
    <form action={undoImport} className="delete-confirm" role="group" aria-label="Undo this import?">
      <input type="hidden" name="id" value={id} />
      <span className="delete-confirm-text">
        Delete the {count} result{count === 1 ? "" : "s"} from this import
        {published ? `, including ${published} published` : ""}? This can&apos;t be undone.
      </span>
      <ConfirmButton />
      <button type="button" className="btn btn-outline" onClick={() => setAsking(false)} autoFocus>
        Cancel
      </button>
    </form>
  );
}