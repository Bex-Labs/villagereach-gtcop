import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer-compact">
      <div className="container footer-compact-inner">
        <p>
          <strong>GTCOP Assessment</strong>
        </p>
        <nav aria-label="Footer">
          <Link href="/countries">Countries</Link>
          <Link href="/maturity">Maturity</Link>
          <Link href="/study-materials">Study materials</Link>
          <Link href="/about">About</Link>
        </nav>
        <p>© {year} GTCOP Assessment</p>
      </div>
    </footer>
  );
}