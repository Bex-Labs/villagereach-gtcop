import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear(); // current year, updates automatically

  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        {/* Left: platform name and description */}
        <div>
          <p className="footer-name">GTCOP Telehealth Platform</p>
          <p className="footer-tagline">
            A VillageReach initiative for the Global Telehealth Community of Practice
          </p>
        </div>

        {/* Right: footer links */}
        <nav className="footer-nav" aria-label="Footer navigation">
          <Link href="/countries">Countries</Link>
          <Link href="/rankings">Rankings</Link>
          <Link href="/study-materials">Study materials</Link>
          <Link href="/sign-in">Sign in</Link>
        </nav>
      </div>

      <div className="container footer-bottom">
        <p>© {year} VillageReach. All rights reserved.</p>
      </div>
    </footer>
  );
}