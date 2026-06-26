// Thin Supabase REST/RPC wrapper (no SDK, just fetch).
// - getResults()       -> [{name, emoji, x, y}]            (for the chart + legend)
// - getDistributions() -> [[sd,d,n,a,sa], ...] per question (for the breakdown)
// - submit(...)         -> records a result; aggregates answers server-side.
(function () {
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.CONFIG || {};
  const configured =
    !!SUPABASE_URL && !SUPABASE_URL.includes("YOUR-PROJECT") &&
    !!SUPABASE_ANON_KEY && !SUPABASE_ANON_KEY.includes("YOUR-ANON");

  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
  };

  async function getResults() {
    if (!configured) return [];
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/results?select=name,emoji,x,y`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`results ${res.status}`);
    return await res.json();
  }

  async function getDistributions() {
    if (!configured) return null;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/distributions?select=question_index,sd,d,n,a,sa&order=question_index`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) throw new Error(`distributions ${res.status}`);
    const rows = await res.json();
    const arr = [];
    rows.forEach((r) => { arr[r.question_index] = [r.sd, r.d, r.n, r.a, r.sa]; });
    for (let i = 0; i < arr.length; i++) if (!arr[i]) arr[i] = [0, 0, 0, 0, 0];
    return arr;
  }

  async function submit({ name, emoji, x, y, answers }) {
    if (!configured) throw new Error("Supabase is not configured yet.");
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/submit_result`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_name: name, p_emoji: emoji, p_x: x, p_y: y, p_answers: answers,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`submit ${res.status} ${t}`);
    }
    return true;
  }

  window.API = { configured, getResults, getDistributions, submit };
})();
