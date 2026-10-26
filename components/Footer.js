import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer-compact">
      <div className="container footer-compact-inner">
        <p>
          <strong>GTCOP Assessment</strong>
          <br />
          <span className="footer-sub">A VillageReach platform</span>
        </p>
        <nav aria-label="Footer">
          <Link href="/countries">Countries</Link>
          <Link href="/rankings">Rankings</Link>
          <Link href="/study-materials">Study materials</Link>
          <Link href="/about">About</Link>
        </nav>
        <p>© {year} VillageReach</p>
      </div>
    </footer>
  );
}