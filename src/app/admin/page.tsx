"use client";

import { useEffect, useMemo, useState } from "react";

type FirestoreTimestamp = {
  seconds?: number;
  nanos?: number;
  _seconds?: number;
  _nanoseconds?: number;
};

type Rsvp = {
  id: string;
  name: string;
  email: string;
  totalGuests?: number;
  createdAt?: FirestoreTimestamp;
};

function toMillis(ts?: FirestoreTimestamp): number | null {
  if (!ts) return null;
  const seconds = ts.seconds ?? ts._seconds;
  const nanos = ts.nanos ?? ts._nanoseconds ?? 0;
  if (typeof seconds !== "number") return null;
  return seconds * 1000 + Math.floor(nanos / 1_000_000);
}

function formatDate(ts?: FirestoreTimestamp): string {
  const ms = toMillis(ts);
  if (ms == null) return "";
  return new Date(ms).toLocaleString();
}

function csvEscape(value: string) {
  const v = value ?? "";
  if (/[",\n]/.test(v)) return `"${v.replaceAll('"', '""')}"`;
  return v;
}

const clampGuests = (n: unknown) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return 1;
  return Math.max(1, Math.min(10, Math.trunc(x)));
};

export default function AdminPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
  const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "";

  const [data, setData] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // password gate (client-side only)
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");

  // selection state (RSVP doc IDs)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ========= NEW: Email composer =========
  const [emailSubject, setEmailSubject] = useState("Cindy & Bryant's Wedding 💍");
  const [emailBcc, setEmailBcc] = useState(""); // comma-separated
  const [emailHtml, setEmailHtml] = useState<string>(`<div style="font-family: Arial, sans-serif; background:#f6f6f6; padding:40px 0; text-align:center;">
  <div style="max-width:640px; margin:0 auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(0,0,0,.08);">
    <div style="padding:24px;background:#FFF8E7;">
      <h1 style="margin:0 0 8px; font-size:24px; color:#5A3E2B;">Cindy & Bryant's Wedding 💍</h1>
      <p style="margin:0; color:#5A3E2B;">Saturday, 13 June, 2026 · 6:30 PM</p>
      <p style="margin:6px 0 0; color:#5A3E2B;">442 Orchard Road, Singapore 238879</p>
    </div>
    <img src="https://bryant-and-cindy.vercel.app/hero.jpg" alt="Cindy & Bryant's Wedding" style="width:100%; display:block;">
    <div style="padding:24px;background:#FFF8E7; color:#5A3E2B;">
      <p style="margin:0;">Hi {{name}}, thank you for your RSVP. See you soon ❤️</p>
      <p style="margin:10px 0 0; font-size:13px; opacity:.85;">Total guests: <b>{{totalGuests}}</b></p>
      <p style="margin:16px 0 0;">— Bryant & Cindy</p>
    </div>
  </div>
</div>`);

  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ type: "idle" | "ok" | "err"; text: string }>({
    type: "idle",
    text: "",
  });

  async function load() {
    if (!unlocked) return;

    setLoading(true);
    setError("");

    try {
      if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");

      const res = await fetch(`${API_BASE}/admin/rsvps`, {
        method: "GET",
        // If your backend validates admin password, send it here.
        headers: ADMIN_PASS ? { "x-admin-pass": ADMIN_PASS } : undefined,
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const json = (await res.json()) as unknown;
      if (!Array.isArray(json)) throw new Error("Unexpected response format (expected an array).");

      setData(json as Rsvp[]);
      setSelectedIds(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load RSVPs");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (unlocked) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  const rows = useMemo(() => {
    return [...data].sort((a, b) => {
      const am = toMillis(a.createdAt) ?? 0;
      const bm = toMillis(b.createdAt) ?? 0;
      return am - bm;
    });
  }, [data]);

  const totalSubmissions = data.length;

  const totalGuestsEstimated = useMemo(() => {
    return data.reduce((sum, r) => sum + clampGuests(r.totalGuests), 0);
  }, [data]);

  const allIds = useMemo(() => data.map((d) => d.id), [data]);
  const selectedCount = selectedIds.size;
  const allSelected = allIds.length > 0 && selectedCount === allIds.length;

  function onUnlock(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!ADMIN_PASS) {
      setError("Missing NEXT_PUBLIC_ADMIN_PASSWORD");
      return;
    }

    if (password === ADMIN_PASS) {
      setUnlocked(true);
      setPassword("");
    } else {
      setError("Wrong password.");
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds(() => {
      if (allSelected) return new Set();
      return new Set(allIds);
    });
  }

  async function deleteRsvpById(rsvpId: string) {
    if (!unlocked) return;
    if (!API_BASE) {
      setError("Missing NEXT_PUBLIC_API_BASE_URL");
      return;
    }

    const ok = window.confirm("Hard delete this RSVP? This cannot be undone.");
    if (!ok) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/admin/rsvps/${encodeURIComponent(rsvpId)}`, {
        method: "DELETE",
        headers: ADMIN_PASS ? { "x-admin-pass": ADMIN_PASS } : undefined,
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setData((prev) => prev.filter((r) => r.id !== rsvpId));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(rsvpId);
        return next;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to delete RSVP");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSelected() {
    if (!unlocked) return;
    if (!API_BASE) {
      setError("Missing NEXT_PUBLIC_API_BASE_URL");
      return;
    }
    if (selectedIds.size === 0) return;

    const ok = window.confirm(`Hard delete ${selectedIds.size} RSVP(s)?\n\nThis cannot be undone.`);
    if (!ok) return;

    setLoading(true);
    setError("");

    const ids = Array.from(selectedIds);

    try {
      const results = await Promise.allSettled(
        ids.map((id) =>
          fetch(`${API_BASE}/admin/rsvps/${encodeURIComponent(id)}`, {
            method: "DELETE",
            headers: ADMIN_PASS ? { "x-admin-pass": ADMIN_PASS } : undefined,
          })
        )
      );

      const failed: string[] = [];
      results.forEach((r, idx) => {
        if (r.status === "rejected") failed.push(ids[idx]);
        else if (!r.value.ok) failed.push(ids[idx]);
      });

      const failedSet = new Set(failed);

      // keep only failed ones (everything else was deleted)
      setData((prev) => prev.filter((r) => failedSet.has(r.id)));
      setSelectedIds(new Set(failed));

      if (failed.length > 0) {
        setError(`Deleted some RSVPs, but ${failed.length} failed. Try again or refresh.`);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    const header = ["Name", "Email", "Created", "Total Guests"].join(",");

    const lines = rows.map((r) => {
      const created = formatDate(r.createdAt) || "";
      const total = clampGuests(r.totalGuests);
      return [r.name ?? "", r.email ?? "", created, String(total)].map(csvEscape).join(",");
    });

    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `rsvps-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ========= NEW: send email =========
  async function sendEmailToSelected() {
    if (!API_BASE) {
      setSendMsg({ type: "err", text: "Missing NEXT_PUBLIC_API_BASE_URL" });
      return;
    }
    if (selectedIds.size === 0) {
      setSendMsg({ type: "err", text: "Select at least 1 RSVP to send." });
      return;
    }
    if (!emailSubject.trim()) {
      setSendMsg({ type: "err", text: "Subject cannot be empty." });
      return;
    }
    if (!emailHtml.trim()) {
      setSendMsg({ type: "err", text: "HTML cannot be empty." });
      return;
    }

    const recipients = rows
      .filter((r) => selectedIds.has(r.id))
      .map((r) => ({
        email: r.email,
        name: r.name,
        totalGuests: clampGuests(r.totalGuests),
      }))
      .filter((r) => !!r.email);

    const bccList = emailBcc
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const ok = window.confirm(
      `Send email to ${recipients.length} selected RSVP(s)?` +
        (bccList.length ? `\nBCC: ${bccList.join(", ")}` : "")
    );
    if (!ok) return;

    setSending(true);
    setSendMsg({ type: "idle", text: "" });

    try {
      const res = await fetch(`${API_BASE}/admin/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ADMIN_PASS ? { "x-admin-pass": ADMIN_PASS } : {}),
        },
        body: JSON.stringify({
          subject: emailSubject.trim(),
          bcc: bccList,
          html: emailHtml,
          recipients,
        }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      setSendMsg({ type: "ok", text: `Sent to ${recipients.length} recipient(s).` });
    } catch (e: unknown) {
      setSendMsg({ type: "err", text: e instanceof Error ? e.message : "Failed to send email." });
    } finally {
      setSending(false);
    }
  }

  const PrimaryBtn =
    "rounded-xl bg-[#F6C453] px-4 py-2.5 text-sm font-semibold text-[#5A3E2B] hover:bg-[#EAB543] disabled:opacity-60 disabled:cursor-not-allowed";
  const SoftBtn =
    "rounded-xl border border-[#F6C453]/50 bg-white/70 px-4 py-2.5 text-sm font-semibold text-[#5A3E2B] hover:bg-white disabled:opacity-60 disabled:cursor-not-allowed";
  const DangerBtn =
    "rounded-xl border border-[#d33] bg-white px-4 py-2.5 text-sm font-semibold text-[#d33] hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed";

  // LOCK
  if (!unlocked) {
    return (
      <main className="mx-auto max-w-xl px-5 py-14">
        <div className="rounded-3xl border border-[#F6C453]/40 bg-[#FFF8E7]/95 p-6 pooh-shadow md:p-10">
          <h1 className="font-fraunces text-3xl text-[#5A3E2B]">Admin</h1>
          <p className="mt-2 text-sm text-[#5A3E2B]/75">Enter password to view RSVPs.</p>

          <form onSubmit={onUnlock} className="mt-6 grid gap-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full rounded-xl border border-[#F6C453]/60 bg-white px-4 py-3 text-[#5A3E2B] placeholder:text-[#B08968] focus:outline-none focus:ring-2 focus:ring-[#F6C453]"
            />

            <button type="submit" className={PrimaryBtn}>
              Unlock
            </button>

            {error && <p className="mt-2 text-sm text-[#B83A2D]">❌ {error}</p>}
          </form>
        </div>
      </main>
    );
  }

  // UNLOCKED
  return (
    <main className="mx-auto max-w-6xl px-5 py-12">
      <div className="rounded-3xl border border-[#F6C453]/40 bg-[#FFF8E7]/95 p-6 pooh-shadow md:p-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="font-fraunces text-3xl text-[#5A3E2B]">Admin — RSVPs</h1>
            <p className="mt-2 text-sm text-[#5A3E2B]/75">
              Total submissions: <span className="font-semibold">{totalSubmissions}</span> · Estimated total guests:{" "}
              <span className="font-semibold">{totalGuestsEstimated}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={exportCsv} disabled={loading || rows.length === 0} className={SoftBtn}>
              Export CSV
            </button>

            <button onClick={load} disabled={loading} className={SoftBtn}>
              {loading ? "Refreshing..." : "Refresh"}
            </button>

            <button onClick={deleteSelected} disabled={loading || selectedCount === 0} className={DangerBtn}>
              Delete Selected ({selectedCount})
            </button>
          </div>
        </header>

        {/* ========== NEW: Email Composer (above list) ========== */}
        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="font-fraunces text-xl text-[#5A3E2B]">Email composer</h2>
            <p className="text-xs text-[#5A3E2B]/70">
              Tip: use placeholders like <span className="font-semibold">{"{{name}}"}</span> and{" "}
              <span className="font-semibold">{"{{totalGuests}}"}</span>.
            </p>
          </div>

          <div className="rounded-2xl border border-[#F6C453]/35 bg-white/75 pooh-shadow p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Left: inputs + editor */}
              <div className="min-w-0">
                <label className="block text-xs font-semibold tracking-wide text-[#5A3E2B]/70">
                  Subject
                </label>
                <input
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#F6C453]/60 bg-white px-4 py-3 text-sm text-[#5A3E2B] focus:outline-none focus:ring-2 focus:ring-[#F6C453]"
                  placeholder="Email subject"
                />

                <label className="mt-4 block text-xs font-semibold tracking-wide text-[#5A3E2B]/70">
                  BCC (comma-separated)
                </label>
                <input
                  value={emailBcc}
                  onChange={(e) => setEmailBcc(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#F6C453]/60 bg-white px-4 py-3 text-sm text-[#5A3E2B] focus:outline-none focus:ring-2 focus:ring-[#F6C453]"
                  placeholder="e.g. you@gmail.com, partner@gmail.com"
                />

                <label className="mt-4 block text-xs font-semibold tracking-wide text-[#5A3E2B]/70">
                  HTML (live)
                </label>
                <textarea
                  value={emailHtml}
                  onChange={(e) => setEmailHtml(e.target.value)}
                  spellCheck={false}
                  className="mt-1 h-[360px] w-full resize-y rounded-xl border border-[#F6C453]/60 bg-white px-4 py-3 font-mono text-[12px] leading-5 text-[#5A3E2B] focus:outline-none focus:ring-2 focus:ring-[#F6C453]"
                />

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    onClick={sendEmailToSelected}
                    disabled={sending || selectedIds.size === 0}
                    className={PrimaryBtn}
                  >
                    {sending ? "Sending..." : `Send to selected (${selectedIds.size})`}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSendMsg({ type: "idle", text: "" });
                    }}
                    className={SoftBtn}
                  >
                    Clear message
                  </button>

                  {sendMsg.type === "ok" && (
                    <span className="text-sm font-semibold text-[#2F6F3A]">✅ {sendMsg.text}</span>
                  )}
                  {sendMsg.type === "err" && (
                    <span className="text-sm font-semibold text-[#B83A2D]">❌ {sendMsg.text}</span>
                  )}
                </div>
              </div>

              {/* Right: live preview */}
              <div className="min-w-0">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold tracking-wide text-[#5A3E2B]/70">
                    Preview
                  </label>
                  <span className="text-[11px] text-[#5A3E2B]/60">
                    (Email clients may render differently)
                  </span>
                </div>

                <div className="mt-1 overflow-hidden rounded-xl border border-[#F6C453]/35 bg-white">
                  <iframe
                    title="Email preview"
                    className="h-[460px] w-full"
                    // sandbox blocks scripts; good for safety when rendering arbitrary HTML
                    sandbox=""
                    srcDoc={emailHtml}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Status */}
        {loading && <p className="mt-6 text-sm text-[#5A3E2B]/80">Loading…</p>}
        {error && <p className="mt-6 text-sm text-[#B83A2D]">❌ {error}</p>}
        {!loading && !error && data.length === 0 && <p className="mt-6 text-sm text-[#5A3E2B]/80">No RSVPs yet.</p>}

        {!loading && !error && data.length > 0 && (
          <section className="mt-10">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="font-fraunces text-xl text-[#5A3E2B]">RSVP list</h2>
              <p className="text-xs text-[#5A3E2B]/70">Deleting is a hard delete. Guests are clamped 1–10.</p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#F6C453]/35 bg-white/75 pooh-shadow">
              <div className="overflow-x-auto">
                <table className="min-w-[920px] w-full border-collapse text-left text-sm text-[#5A3E2B]">
                  <thead className="sticky top-0 z-10 bg-[#FFF3D6]">
                    <tr className="border-b border-[#F6C453]/30">
                      <th className="w-12 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={toggleSelectAll}
                          aria-label="Select all RSVPs"
                          className="h-4 w-4 accent-[#F6C453]"
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold">Name</th>
                      <th className="px-4 py-3 font-semibold">Email</th>
                      <th className="px-4 py-3 font-semibold">Created</th>
                      <th className="px-4 py-3 font-semibold">Total Guests</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((r) => {
                      const checked = selectedIds.has(r.id);
                      const total = clampGuests(r.totalGuests);

                      return (
                        <tr key={r.id} className="border-b border-[#F6C453]/15 hover:bg-[#FFF8E7]/60">
                          <td className="px-4 py-3 align-top">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelect(r.id)}
                              aria-label={`Select ${r.name}`}
                              className="h-4 w-4 accent-[#F6C453]"
                            />
                          </td>
                          <td className="px-4 py-3 align-top">{r.name || "-"}</td>
                          <td className="px-4 py-3 align-top">{r.email || "-"}</td>
                          <td className="px-4 py-3 align-top">{formatDate(r.createdAt) || "-"}</td>
                          <td className="px-4 py-3 align-top">{total}</td>
                          <td className="px-4 py-3 align-top">
                            <button
                              type="button"
                              onClick={() => deleteRsvpById(r.id)}
                              disabled={loading}
                              className="rounded-lg border border-[#d33] bg-white px-3 py-1.5 text-xs font-semibold text-[#d33] hover:bg-red-50 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}