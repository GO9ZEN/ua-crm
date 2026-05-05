"use client";

export default function Topbar({ title, children }) {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="topbar">
      <span className="topbar-title">{title}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {children}
        <span className="topbar-date">{today}</span>
      </div>
    </div>
  );
}
