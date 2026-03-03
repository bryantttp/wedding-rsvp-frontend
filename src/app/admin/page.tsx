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

export default function AdminPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
  const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "";

  const [data, setData] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // password gate
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");

  // selection state (RSVP doc IDs)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  async function load() {
    if (!unlocked) return;

    setLoading(true);
    setError("");

    try {
      if (!API_BASE) throw new Error("Missing NEXT_PUBLIC_API_BASE_URL");

      const res = await fetch(`${API_BASE}/admin/rsvps`, { method: "GET" });

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

  const totalGuests = useMemo(() => {
    let sum = 1;
    for (const r of data) {
      const totalGuests = Number.isFinite(r.totalGuests) ? Number(r.totalGuests) : 1;
      sum = Math.max(sum, Math.min(10, totalGuests));
    }
    return sum;
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
          fetch(`${API_BASE}/admin/rsvps/${encodeURIComponent(id)}`, { method: "DELETE" })
        )
      );

      const failed: string[] = [];
      results.forEach((r, idx) => {
        if (r.status === "rejected") failed.push(ids[idx]);
        else if (!r.value.ok) failed.push(ids[idx]);
      });

      const failedSet = new Set(failed);

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
      const total = r.totalGuests ? Math.max(1, Math.min(10, r.totalGuests)) : 1;


      return [r.name ?? "", r.email ?? "", created, String(total)]
        .map(csvEscape)
        .join(",");
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
      {/* Outer panel so content doesn't blend into background */}
      <div className="rounded-3xl border border-[#F6C453]/40 bg-[#FFF8E7]/95 p-6 pooh-shadow md:p-10">
        <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="font-fraunces text-3xl text-[#5A3E2B]">Admin — RSVPs</h1>
            <p className="mt-2 text-sm text-[#5A3E2B]/75">
              Total submissions: <span className="font-semibold">{totalSubmissions}</span> · Estimated total guests:{" "}
              <span className="font-semibold">{totalGuests}</span>
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

        {loading && <p className="mt-6 text-sm text-[#5A3E2B]/80">Loading…</p>}
        {error && <p className="mt-6 text-sm text-[#B83A2D]">❌ {error}</p>}
        {!loading && !error && data.length === 0 && <p className="mt-6 text-sm text-[#5A3E2B]/80">No RSVPs yet.</p>}

        {!loading && !error && data.length > 0 && (
          <section className="mt-8">
            <div className="mb-3 flex items-end justify-between gap-3">
              <h2 className="font-fraunces text-xl text-[#5A3E2B]">RSVP list</h2>
              <p className="text-xs text-[#5A3E2B]/70">Deleting is a hard delete. Additional Count is clamped 0–10.</p>
            </div>

            {/* Table card */}
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
                      <th className="px-4 py-3 font-semibold">Additional</th>
                      <th className="px-4 py-3 font-semibold">Total</th>
                      <th className="px-4 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {rows.map((r) => {
                      const checked = selectedIds.has(r.id);
                      const total = r.totalGuests ? Math.max(1, Math.min(10, r.totalGuests)) : 1;

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