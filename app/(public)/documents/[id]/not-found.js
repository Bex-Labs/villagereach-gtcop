import Link from "next/link";

// Shown when a document link no longer works, e.g. it was archived (B-05)
export default function DocumentNotFound() {
  return (
    <main className="container page">
      <div className="card section-card">
        <p className="eyebrow">Document</p>
        <h1>This document is no longer available</h1>
        <p className="muted">
          It may have been archived or replaced. You can browse the documents each country has published,
          or search the repository.
        </p>
        <div className="form-actions">
          <Link href="/countries" className="btn btn-primary">Browse countries</Link>
          <Link href="/search" className="btn btn-outline">Search documents</Link>
        </div>
      </div>
    </main>
  );
}