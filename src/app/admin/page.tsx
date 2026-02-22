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
  additionalCount?: number; // ✅ NEW
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

  // ✅ selection state (RSVP doc IDs)
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
      setSelectedIds(new Set()); // clear selection on reload
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
    // sort by createdAt asc
    return [...data].sort((a, b) => {
      const am = toMillis(a.createdAt) ?? 0;
      const bm = toMillis(b.createdAt) ?? 0;
      return am - bm;
    });
  }, [data]);

  const totalSubmissions = data.length;

  const totalGuests = useMemo(() => {
    // total people = 1 main + additionalCount (clamped)
    let sum = 0;
    for (const r of data) {
      const add = Number.isFinite(r.additionalCount) ? Number(r.additionalCount) : 0;
      sum += 1 + Math.max(0, Math.min(10, add));
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

      // keep failed in UI, remove successes
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
    // ✅ one row per RSVP doc
    const header = ["Name", "Email", "Created", "Additional Count", "Total Guests"].join(",");

    const lines = rows.map((r) => {
      const created = formatDate(r.createdAt) || "";
      const addRaw = Number.isFinite(r.additionalCount) ? Number(r.additionalCount) : 0;
      const add = Math.max(0, Math.min(10, addRaw));
      const total = 1 + add;

      return [
        r.name ?? "",
        r.email ?? "",
        created,
        String(add),
        String(total),
      ]
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

  // LOCK
  if (!unlocked) {
    return (
      <main style={{ maxWidth: 420, margin: "48px auto", padding: 16, fontFamily: "Arial, sans-serif" }}>
        <h1 style={{ fontSize: 28, margin: 0 }}>Admin</h1>
        <p style={{ marginTop: 8, opacity: 0.75 }}>Enter password to view RSVPs.</p>

        <form onSubmit={onUnlock} style={{ marginTop: 16 }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={{
              width: "100%",
              padding: "12px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              outline: "none",
            }}
          />

          <button type="submit" style={{ marginTop: 12, width: "100%", padding: "12px 14px", cursor: "pointer" }}>
            Unlock
          </button>

          {error && <p style={{ color: "crimson", marginTop: 12 }}>Error: {error}</p>}
        </form>
      </main>
    );
  }

  const th = { textAlign: "left" as const, padding: 10, borderBottom: "1px solid #ddd" };
  const td = { padding: 10, borderBottom: "1px solid #eee", verticalAlign: "top" as const };

  // UNLOCKED
  return (
    <main style={{ maxWidth: 1200, margin: "48px auto", padding: 16, fontFamily: "Arial, sans-serif" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>Admin — RSVPs</h1>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            Total submissions: <strong>{totalSubmissions}</strong> · Estimated total guests:{" "}
            <strong>{totalGuests}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={exportCsv}
            disabled={loading || rows.length === 0}
            style={{ padding: "10px 14px", cursor: loading || rows.length === 0 ? "not-allowed" : "pointer" }}
          >
            Export CSV
          </button>

          <button
            onClick={load}
            disabled={loading}
            style={{ padding: "10px 14px", cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={deleteSelected}
            disabled={loading || selectedCount === 0}
            style={{
              padding: "10px 14px",
              cursor: loading || selectedCount === 0 ? "not-allowed" : "pointer",
              border: "1px solid #d33",
              background: "white",
              color: "#d33",
              borderRadius: 10,
            }}
          >
            Delete Selected ({selectedCount})
          </button>
        </div>
      </header>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}
      {!loading && !error && data.length === 0 && <p>No RSVPs yet.</p>}

      {!loading && !error && data.length > 0 && (
        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>RSVP list</h2>

          <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f6f6f6" }}>
                  <th style={th}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all RSVPs"
                    />
                  </th>
                  <th style={th}>Name</th>
                  <th style={th}>Email</th>
                  <th style={th}>Created</th>
                  <th style={th}>Additional Count</th>
                  <th style={th}>Total Guests</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const checked = selectedIds.has(r.id);
                  const addRaw = Number.isFinite(r.additionalCount) ? Number(r.additionalCount) : 0;
                  const add = Math.max(0, Math.min(10, addRaw));
                  const total = 1 + add;

                  return (
                    <tr key={r.id}>
                      <td style={td}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelect(r.id)}
                          aria-label={`Select ${r.name}`}
                        />
                      </td>
                      <td style={td}>{r.name || "-"}</td>
                      <td style={td}>{r.email || "-"}</td>
                      <td style={td}>{formatDate(r.createdAt) || "-"}</td>
                      <td style={td}>{add}</td>
                      <td style={td}>{total}</td>
                      <td style={td}>
                        <button
                          type="button"
                          onClick={() => deleteRsvpById(r.id)}
                          disabled={loading}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #d33",
                            background: "white",
                            color: "#d33",
                            cursor: loading ? "not-allowed" : "pointer",
                          }}
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

          <p style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
            Deleting is a hard delete. “Additional Count” is clamped to 0–10.
          </p>
        </section>
      )}
    </main>
  );
}