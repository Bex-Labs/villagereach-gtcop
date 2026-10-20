"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    const supabase = createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    // Always show the same message, whether or not the email exists (A-02)
    setLoading(false);
    setSent(true);
  }

  return (
    <main className="container auth-page">
      <div className="card auth-card">
        <p className="eyebrow">Account help</p>
        <h1>Reset your password</h1>

        {sent ? (
          <div className="alert alert-success" role="status">
            If an account exists for that email, we&apos;ve sent a link to reset your
            password. The link expires in 1 hour.
          </div>
        ) : (
          <>
            <p className="muted">
              Enter your email address and we&apos;ll send you a link to set a new password.
            </p>
            <form onSubmit={handleSubmit}>
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary btn-block"
                style={{ marginTop: 20 }}
                disabled={loading}
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <p className="muted small" style={{ marginTop: 20 }}>
          <Link href="/sign-in">Back to sign in</Link>
        </p>
      </div>
    </main>
  );
}