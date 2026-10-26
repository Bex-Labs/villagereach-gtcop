"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";

const links = [
  { href: "/", label: "Home" },
  { href: "/countries", label: "Countries" },
  { href: "/rankings", label: "Rankings" },
  { href: "/study-materials", label: "Study materials" },
  { href: "/about", label: "About" },
];

export default function Header({ signedIn }) {
  const [open, setOpen] = useState(false); // is the mobile menu open?
  const close = () => setOpen(false);
  const pathname = usePathname();

  // Home only when exactly "/", the others also on their sub-pages (e.g. /countries/ng)
  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link href="/" className="brand" onClick={close}>
          <Image
            src="/villagereach-logo.svg"
            alt="VillageReach"
            width={160}
            height={48}
            className="brand-logo"
            unoptimized
            priority
          />
          <span className="brand-text">
            <span className="brand-name">GTCOP Assessment</span>
            <span className="brand-sub">A VillageReach platform</span>
          </span>
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
              <Link
                key={link.href}
                href={link.href}
                onClick={close}
                className={isActive(link.href) ? "is-active" : undefined}
                aria-current={isActive(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Signed in: Dashboard + Sign out. Visitors: Sign in */}
          {signedIn ? (
            <div className="header-actions">
              <Link href="/admin" className="btn btn-primary" onClick={close}>
                Dashboard
              </Link>
              <SignOutButton />
            </div>
          ) : (
            <Link href="/sign-in" className="btn btn-primary" onClick={close}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}