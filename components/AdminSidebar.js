"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "./SignOutButton";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/documents", label: "Documents" },
  { href: "/admin/documents/new", label: "Upload document" },
  { href: "/admin/countries", label: "Countries" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/rankings", label: "Rankings" },
  { href: "/admin/study-materials", label: "Study materials" },
  { href: "/admin/review", label: "Pending review" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminSidebar({ name }) {
  const pathname = usePathname(); // which page are we on?

  return (
    <aside className="admin-sidebar">
      <Link href="/admin" className="admin-brand">
        GTCOP Admin
      </Link>

      <nav aria-label="Admin navigation">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={active ? "active" : ""}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="admin-user">
        <p>
          {name}
          <br />
          <span>Admin</span>
        </p>
        <Link href="/">View public site</Link>
        <SignOutButton />
      </div>
    </aside>
  );
}