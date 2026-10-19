import Link from "next/link";

export default function Header() {
  return (
    <header className="site-header">
      <div className="container header-inner">
        {/* Logo / site name */}
        <Link href="/" className="brand">
          <span className="brand-name">GTCOP Assessment</span>
          <span className="brand-sub">A VillageReach platform</span>
        </Link>

        {/* Main menu */}
        <nav className="main-nav" aria-label="Main navigation">
          <Link href="/">Home</Link>
          <Link href="/countries">Countries</Link>
          <Link href="/rankings">Rankings</Link>
          <Link href="/study-materials">Study materials</Link>
        </nav>

        {/* Sign in button */}
        <Link href="/sign-in" className="btn btn-primary">
          Sign in
        </Link>
      </div>
    </header>
  );
}