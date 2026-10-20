import Link from "next/link";

export default function RankingsPage() {
  return (
    <>
      <h1>Rankings</h1>
      <p className="muted">Country rankings will be entered here (D-02).</p>
      <Link href="/admin/rankings/framework" className="btn btn-outline">Edit maturity framework</Link>
    </>
  );
}