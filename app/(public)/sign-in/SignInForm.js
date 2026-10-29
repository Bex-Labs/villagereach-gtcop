"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { signIn } from "./actions";

export default function SignInForm({ expired }) {
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await signIn(formData); // on success, the server sends them on
      if (result?.error) setError(result.error);
    });
  }

  return (
    <main className="container auth-page">
      <div className="card auth-card">
        <p className="eyebrow">GTCOP Assessment</p>
        <h1>Sign in</h1>
        <p className="muted">For VillageReach staff and country contributors.</p>

        {expired && !error && (
          <div className="alert alert-info" role="status">
            You were signed out after 60 minutes of inactivity. Please sign in again.
          </div>
        )}
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <label htmlFor="email">Email or username</label>
          <input id="email" name="email" type="text" autoComplete="username" aria-invalid={error ? true : undefined} />

          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={error ? true : undefined}
            />
            <button
              type="button"
              className="link-button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <p className="form-row-right"><Link href="/forgot-password">Forgot password?</Link></p>

          <button className="btn btn-primary btn-block" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}