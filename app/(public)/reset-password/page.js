"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password.length < 10) {
      setError("Your password must be at least 10 characters.");
      return;
    }
    if (password !== confirm) {
      setError("The two passwords don't match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      setError("This reset link has expired or was already used. Please request a new one.");
      return;
    }

    await supabase.auth.signOut(); // sign in again with the new password
    setLoading(false);
    setDone(true);
  }

  return (
    <main className="container auth-page">
      <div className="card auth-card">
        <p className="eyebrow">Account help</p>
        <h1>Set a new password</h1>

        {done ? (
          <>
            <div className="alert alert-success" role="status">
              Your password has been updated.
            </div>
            <p style={{ marginTop: 20 }}>
              <Link href="/sign-in" className="btn btn-primary btn-block">
                Sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            {error && (
              <div className="alert alert-error" role="alert">
                {error}{" "}
                {error.includes("expired") && <Link href="/forgot-password">Request a new link</Link>}
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <label htmlFor="password">New password (at least 10 characters)</label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label htmlFor="confirm">Confirm new password</label>
              <input
                id="confirm"
                type="password"
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary btn-block"
                style={{ marginTop: 20 }}
                disabled={loading}
              >
                {loading ? "Saving…" : "Save new password"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}