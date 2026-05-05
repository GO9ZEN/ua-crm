"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Topbar from "@/components/Topbar";
import Link from "next/link";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [targets, setTargets] = useState(null);
  const [production, setProduction] = useState(null);
  const [premiumsDue, setPremiumsDue] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  useEffect(() => {
    async function load() {
      // Counts
      const [
        { count: totalClients },
        { count: activePolicies },
        { count: openQuotations },
        { count: pendingFollowups },
      ] = await Promise.all([
        supabase.from("clients").select("*", { count: "exact", head: true }),
        supabase
          .from("policies")
          .select("*", { count: "exact", head: true })
          .eq("status", "Active"),
        supabase
          .from("quotations")
          .select("*", { count: "exact", head: true })
          .in("status", ["Draft", "Presented", "Followed Up"]),
        supabase
          .from("follow_ups")
          .select("*", { count: "exact", head: true })
          .eq("status", "Pending")
          .lte("due_date", new Date().toISOString().slice(0, 10)),
      ]);
      setStats({
        totalClients,
        activePolicies,
        openQuotations,
        pendingFollowups,
      });

      // Monthly targets
      const { data: tgt } = await supabase
        .from("monthly_targets")
        .select("*")
        .eq("year", year)
        .eq("month", month)
        .single();
      setTargets(tgt);

      // Monthly production
      const { data: prod } = await supabase
        .from("monthly_production")
        .select("*")
        .eq("year", year)
        .eq("month", month)
        .single();
      setProduction(prod);

      // Premiums due in next 7 days
      const today = new Date().toISOString().slice(0, 10);
      const in7 = new Date(Date.now() + 7 * 86400000)
        .toISOString()
        .slice(0, 10);
      const { data: prem } = await supabase
        .from("policies")
        .select(
          "policy_number, plan_name, premium_amount, next_premium_date, clients(full_name, preferred_name, phone)",
        )
        .eq("status", "Active")
        .gte("next_premium_date", today)
        .lte("next_premium_date", in7)
        .order("next_premium_date")
        .limit(5);
      setPremiumsDue(prem || []);

      // Open pipeline
      const { data: pip } = await supabase
        .from("quotations")
        .select(
          "id, plan_name, fyp, status, follow_up_date, clients(full_name)",
        )
        .in("status", ["Presented", "Followed Up"])
        .order("follow_up_date", { ascending: true })
        .limit(5);
      setPipeline(pip || []);

      // Recent activity (last 5)
      const { data: act } = await supabase
        .from("activity_log")
        .select("activity_date, activity_type, outcome, clients(full_name)")
        .order("created_at", { ascending: false })
        .limit(5);
      setRecentActivity(act || []);

      setLoading(false);
    }
    load();
  }, []);

  const pct = (actual, target) => {
    if (!target || !actual) return 0;
    return Math.min(Math.round((actual / target) * 100), 100);
  };

  const fmt = (n) => (n ? `Rs. ${Number(n).toLocaleString("en-LK")}` : "Rs. 0");

  const monthName = now.toLocaleString("default", { month: "long" });

  if (loading)
    return (
      <>
        <Topbar title="Dashboard" />
        <div
          className="page-body"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "60vh",
          }}
        >
          <div style={{ textAlign: "center", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⟳</div>
            <p>Loading dashboard…</p>
          </div>
        </div>
      </>
    );

  return (
    <>
      <Topbar title="Dashboard">
        <Link
          href="/activity/new"
          className="btn btn-primary"
          style={{ fontSize: 13 }}
        >
          + Log Activity
        </Link>
      </Topbar>

      <div className="page-body">
        {/* ── KPI cards ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div className="stat-card">
            <div
              className="stat-accent"
              style={{ background: "var(--blue)" }}
            />
            <div
              className="stat-icon"
              style={{ background: "var(--blue-pale)" }}
            >
              👤
            </div>
            <div className="stat-label">Total Clients</div>
            <div className="stat-value">{stats?.totalClients ?? 0}</div>
            <div className="stat-sub">All clients & prospects</div>
          </div>

          <div className="stat-card">
            <div
              className="stat-accent"
              style={{ background: "var(--success)" }}
            />
            <div className="stat-icon" style={{ background: "#d1fae5" }}>
              📄
            </div>
            <div className="stat-label">Active Policies</div>
            <div className="stat-value">{stats?.activePolicies ?? 0}</div>
            <div className="stat-sub">Inforced policies</div>
          </div>

          <div className="stat-card">
            <div
              className="stat-accent"
              style={{ background: "var(--accent)" }}
            />
            <div className="stat-icon" style={{ background: "#fef3c7" }}>
              📋
            </div>
            <div className="stat-label">Open Quotations</div>
            <div className="stat-value">{stats?.openQuotations ?? 0}</div>
            <div className="stat-sub">In pipeline</div>
          </div>

          <div className="stat-card">
            <div
              className="stat-accent"
              style={{ background: "var(--danger)" }}
            />
            <div className="stat-icon" style={{ background: "#fee2e2" }}>
              🔔
            </div>
            <div className="stat-label">Overdue Tasks</div>
            <div className="stat-value">{stats?.pendingFollowups ?? 0}</div>
            <div className="stat-sub">Follow-ups due today</div>
          </div>
        </div>

        {/* ── Monthly targets progress ── */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 20,
            }}
          >
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700 }}>
                {monthName} {year} — Target Progress
              </h2>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginTop: 2,
                }}
              >
                Actual vs target for this month
              </p>
            </div>
            <Link
              href="/targets"
              className="btn btn-outline"
              style={{ fontSize: 12, padding: "6px 14px" }}
            >
              Edit Targets
            </Link>
          </div>

          {targets ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3,1fr)",
                gap: 24,
              }}
            >
              {[
                {
                  label: "NOP (Policies)",
                  actual: production?.actual_nop,
                  target: targets?.target_nop,
                  unit: "",
                  color: "var(--blue)",
                },
                {
                  label: "ANBP",
                  actual: production?.actual_anbp,
                  target: targets?.target_anbp,
                  unit: "Rs.",
                  color: "var(--success)",
                },
                {
                  label: "FYP",
                  actual: production?.actual_fyp,
                  target: targets?.target_fyp,
                  unit: "Rs.",
                  color: "var(--accent)",
                },
                {
                  label: "FYPN",
                  actual: production?.actual_fypn,
                  target: targets?.target_fypn,
                  unit: "Rs.",
                  color: "#8b5cf6",
                },
                {
                  label: "GWP",
                  actual: production?.actual_gwp,
                  target: targets?.target_gwp,
                  unit: "Rs.",
                  color: "#06b6d4",
                },
                {
                  label: "Target Income",
                  actual: production?.actual_income,
                  target: targets?.target_income,
                  unit: "Rs.",
                  color: "#f97316",
                },
              ].map((row) => (
                <div key={row.label}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 5,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: row.color,
                      }}
                    >
                      {pct(row.actual, row.target)}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${pct(row.actual, row.target)}%`,
                        background: row.color,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 4,
                    }}
                  >
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {row.unit === "Rs." ? fmt(row.actual) : (row.actual ?? 0)}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      /{" "}
                      {row.unit === "Rs." ? fmt(row.target) : (row.target ?? 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "24px 0",
                color: "var(--text-muted)",
              }}
            >
              <p style={{ marginBottom: 12 }}>No targets set for this month.</p>
              <Link
                href="/targets"
                className="btn btn-primary"
                style={{ fontSize: 13 }}
              >
                Set Monthly Targets
              </Link>
            </div>
          )}
        </div>

        {/* ── Bottom 3-column grid ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 16,
          }}
        >
          {/* Premiums due */}
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>
                💰 Premiums Due (7 days)
              </h3>
              <Link
                href="/policies"
                style={{
                  fontSize: 11,
                  color: "var(--blue)",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                View all
              </Link>
            </div>
            {premiumsDue.length === 0 ? (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                None due this week
              </p>
            ) : (
              premiumsDue.map((p, i) => (
                <div key={i} className="alert-row alert-premium">
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>
                      {p.clients?.preferred_name || p.clients?.full_name}
                    </p>
                    <p
                      style={{
                        fontSize: 11.5,
                        color: "var(--text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {p.plan_name} · {fmt(p.premium_amount)}
                    </p>
                  </div>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--blue)",
                      fontWeight: 600,
                      fontFamily: "DM Mono",
                      flexShrink: 0,
                    }}
                  >
                    {new Date(p.next_premium_date).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Pipeline */}
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>
                📋 Open Pipeline
              </h3>
              <Link
                href="/quotations"
                style={{
                  fontSize: 11,
                  color: "var(--blue)",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                View all
              </Link>
            </div>
            {pipeline.length === 0 ? (
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-muted)",
                  textAlign: "center",
                  padding: "16px 0",
                }}
              >
                No open quotations
              </p>
            ) : (
              pipeline.map((q, i) => (
                <div key={i} className="alert-row alert-followup">
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>
                      {q.clients?.full_name}
                    </p>
                    <p
                      style={{
                        fontSize: 11.5,
                        color: "var(--text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      {q.plan_name} · {fmt(q.fyp)}
                    </p>
                  </div>
                  <span
                    className={`badge ${q.status === "Presented" ? "badge-pending" : "badge-active"}`}
                    style={{ fontSize: 10 }}
                  >
                    {q.status}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Recent activity */}
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 14, fontWeight: 700 }}>
                📝 Recent Activity
              </h3>
              <Link
                href="/activity"
                style={{
                  fontSize: 11,
                  color: "var(--blue)",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                View all
              </Link>
            </div>
            {recentActivity.length === 0 ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <p
                  style={{
                    fontSize: 13,
                    color: "var(--text-muted)",
                    marginBottom: 10,
                  }}
                >
                  No activity logged yet
                </p>
                <Link
                  href="/activity/new"
                  className="btn btn-primary"
                  style={{ fontSize: 12 }}
                >
                  Log first activity
                </Link>
              </div>
            ) : (
              recentActivity.map((a, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 10,
                    paddingBottom: 12,
                    marginBottom: 12,
                    borderBottom:
                      i < recentActivity.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: "var(--blue)",
                      marginTop: 5,
                      flexShrink: 0,
                    }}
                  />
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>
                      {a.activity_type}
                    </p>
                    <p
                      style={{ fontSize: 11.5, color: "var(--text-secondary)" }}
                    >
                      {a.clients?.full_name || "General"}
                    </p>
                    <p
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginTop: 2,
                      }}
                    >
                      {new Date(a.activity_date).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })}
                      {a.outcome ? ` · ${a.outcome}` : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
