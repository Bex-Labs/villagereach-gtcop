"use client";

import { useState, useTransition } from "react";
import { inviteUser } from "./actions";

export default function InviteForm({ countries }) {
  const [role, setRole] = useState("contributor");
  const [message, setMessage] = useState(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setMessage(null);

    startTransition(async () => {
      const result = await inviteUser(formData);
      setMessage(result);
      if (result?.success) {
        form.reset();
        setRole("contributor");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="card form-card" noValidate>
      <h2>Invite a user</h2>
      {message?.error && <div className="alert alert-error" role="alert">{message.error}</div>}
      {message?.success && <div className="alert alert-success" role="status">{message.success}</div>}

      <label htmlFor="full_name">Full name *</label>
      <input id="full_name" name="full_name" autoComplete="off" />

      <label htmlFor="email">Email *</label>
      <input id="email" name="email" type="email" autoComplete="off" />

      <label htmlFor="role">Role *</label>
      <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value)}>
        <option value="contributor">Country contributor</option>
        <option value="admin">VillageReach admin</option>
      </select>

      {role === "contributor" && (
        <>
          <label htmlFor="country_id">Country *</label>
          <select id="country_id" name="country_id" defaultValue="">
            <option value="">Choose a country</option>
            {countries.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </>
      )}

      <button className="btn btn-primary btn-block" disabled={pending}>
        {pending ? "Sending…" : "Send invitation"}
      </button>
      <p className="muted small">They&apos;ll get an email with a link to set their password.</p>
    </form>
  );
}