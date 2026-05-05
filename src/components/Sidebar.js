"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navSections = [
  {
    label: "Overview",
    items: [{ href: "/", label: "Dashboard", icon: "⊞" }],
  },
  {
    label: "Business",
    items: [
      { href: "/clients", label: "Clients", icon: "👤" },
      { href: "/quotations", label: "Quotations", icon: "📋" },
      { href: "/policies", label: "Policies", icon: "📄" },
      { href: "/revivals", label: "Revivals", icon: "🔄" },
    ],
  },
  {
    label: "Daily Work",
    items: [
      { href: "/activity", label: "Activity Log", icon: "📝" },
      { href: "/followups", label: "Follow-ups", icon: "🔔" },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/reports/weekly", label: "Weekly Report", icon: "📊" },
      { href: "/reports/monthly", label: "Monthly Report", icon: "📈" },
      { href: "/targets", label: "Targets", icon: "🎯" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-badge">UNION ASSURANCE</div>
        <h1>Advisor CRM</h1>
        <p>AG026029</p>
      </div>

      {/* Nav sections */}
      {navSections.map((section) => (
        <div className="sidebar-section" key={section.label}>
          <div className="sidebar-section-label">{section.label}</div>
          {section.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${pathname === item.href ? "active" : ""}`}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      ))}

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="advisor-chip">
          <div className="advisor-avatar">UA</div>
          <div className="advisor-info">
            <p>My CRM</p>
            <span>AG026029</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
