"use client";

import Link from "next/link";
import { useState } from "react";

const links = [
  { href: "/", label: "Home" },
  { href: "/countries", label: "Countries" },
  { href: "/rankings", label: "Rankings" },
  { href: "/study-materials", label: "Study materials" },
];

export default function Header() {
  const [open, setOpen] = useState(false); // is the mobile menu open?
  const close = () => setOpen(false);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" onClick={close}>
          <span className="brand-name">GTCOP Assessment</span>
          <span className="brand-sub">A VillageReach platform</span>
        </Link>

        <button
          className="menu-toggle"
          aria-expanded={open}
          aria-controls="main-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(!open)}
        >
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>

        <div id="main-menu" className={`nav-wrap ${open ? "is-open" : ""}`}>
          <nav className="main-nav" aria-label="Main navigation">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={close}>
                {link.label}
              </Link>
            ))}
          </nav>
          <Link href="/sign-in" className="btn btn-primary" onClick={close}>
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
}