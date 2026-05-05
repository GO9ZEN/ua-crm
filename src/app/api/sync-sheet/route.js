import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY, // uses service role for write access
);

export async function POST(request) {
  const { secret, rows } = await request.json();

  // Security check — only your Sheet can call this
  if (secret !== process.env.SYNC_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = [];

  for (const row of rows) {
    // Parse name and nickname from e.g. "B M U I B BALASURIYA (Udith)"
    const nameMatch = row.assured_name?.match(/^(.+?)\s*\((.+?)\)$/);
    const fullName = nameMatch ? nameMatch[1].trim() : row.assured_name;
    const preferredName = nameMatch ? nameMatch[2].trim() : null;

    // 1. Upsert client
    const { data: client, error: clientErr } = await supabase
      .from("clients")
      .upsert(
        {
          full_name: fullName,
          preferred_name: preferredName,
          phone: row.mobile_no?.toString(),
          dob: parseDate(row.birth_date),
          type: "Policyholder",
        },
        { onConflict: "full_name" },
      )
      .select("id")
      .single();

    if (clientErr) {
      results.push({ error: clientErr.message, row });
      continue;
    }

    // 2. Upsert policy
    const { error: policyErr } = await supabase.from("policies").upsert(
      {
        client_id: client.id,
        policy_number: row.policy_no?.toString(),
        plan_name: row.plan,
        premium_amount: parseFloat(
          row.total_premium?.toString().replace(/,/g, "") || 0,
        ),
        payment_frequency: row.mode || "Monthly",
        next_premium_date: parseDate(row.payment_due_date),
        maturity_date: parseDate(row.maturity_date),
        status: "Active",
      },
      { onConflict: "policy_number" },
    );

    results.push({ policy: row.policy_no, error: policyErr?.message || null });
  }

  return Response.json({ synced: results.length, results });
}

// Converts "March 27 2026" → "2026-03-27"
function parseDate(str) {
  if (!str) return null;
  try {
    const d = new Date(str);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  } catch {
    return null;
  }
}
