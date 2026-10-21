"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/SignOutButton";

const ADMIN_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/documents/new", label: "Upload document" },
  { href: "/admin/countries", label: "Countries" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/rankings", label: "Rankings" },
  { href: "/admin/study-materials", label: "Study materials" },
  { href: "/admin/review", label: "Pending review" },
  { href: "/admin/content", label: "Site content" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminSidebar({ name, role = "Admin", title = "GTCOP Admin", items = ADMIN_ITEMS }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // phone menu open?
  const close = () => setOpen(false);
  const home = items[0].href;

  // Highlight the closest match (so "Upload document" doesn't also light up "Documents")
  const activeHref = items
    .map((i) => i.href)
    .filter((h) => (h === home ? pathname === home : pathname === h || pathname.startsWith(h + "/")))
    .sort((a, b) => b.length - a.length)[0];

  return (
    <aside className="admin-sidebar">
      <div className="sidebar-top">
        <div className="sidebar-top-row">
          <Link href={home} className="sidebar-brand" onClick={close}>
            {title}
            <span>VillageReach</span>
          </Link>

          {/* Only shows on phones and tablets */}
          <button
            className="menu-toggle sidebar-toggle"
            aria-expanded={open}
            aria-controls="admin-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen(!open)}
          >
            <span aria-hidden="true">{open ? "✕" : "☰"}</span>
          </button>
        </div>
        <Link href="/" className="sidebar-public">View public site</Link>
      </div>

      <div id="admin-menu" className={`sidebar-menu ${open ? "is-open" : ""}`}>
        <nav aria-label="Menu">
          <ul>
            {items.map((item) => {
              const active = item.href === activeHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={active ? "is-active" : undefined}
                    aria-current={active ? "page" : undefined}
                    onClick={close}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-user">
          <p className="sidebar-name">{name}</p>
          <p className="sidebar-role">{role}</p>
          <SignOutButton />
        </div>
      </div>
    </aside>
  );
}