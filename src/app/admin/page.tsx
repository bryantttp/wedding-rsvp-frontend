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
  listOfAttendees?: string[];
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

type FlatRow = {
  groupIndex: number;
  rsvpId: string;
  email: string;
  createdAt?: FirestoreTimestamp;
  attendeeIndex: number;
  attendeeName: string;
};

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

  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");

  // ✅ selection state: RSVP doc IDs
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
      setSelectedIds(new Set()); // clear selection after refresh
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

  const grouped = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      const am = toMillis(a.createdAt) ?? 0;
      const bm = toMillis(b.createdAt) ?? 0;
      return am - bm;
    });

    return sorted.map((rsvp, idx) => ({
      groupIndex: idx + 1,
      rsvp,
      attendees: (rsvp.listOfAttendees ?? []).map((s) => s.trim()).filter(Boolean),
    }));
  }, [data]);

  const flatRows = useMemo<FlatRow[]>(() => {
    const rows: FlatRow[] = [];

    for (const g of grouped) {
      const attendees = g.attendees;

      if (attendees.length === 0) {
        rows.push({
          groupIndex: g.groupIndex,
          rsvpId: g.rsvp.id,
          email: g.rsvp.email,
          createdAt: g.rsvp.createdAt,
          attendeeIndex: 0,
          attendeeName: "(No attendees added)",
        });
        continue;
      }

      attendees.forEach((name, i) => {
        rows.push({
          groupIndex: g.groupIndex,
          rsvpId: g.rsvp.id,
          email: g.rsvp.email,
          createdAt: g.rsvp.createdAt,
          attendeeIndex: i + 1,
          attendeeName: name,
        });
      });
    }

    return rows;
  }, [grouped]);

  const totalSubmissions = data.length;
  const totalAttendees = useMemo(() => {
    let n = 0;
    for (const r of data) n += (r.listOfAttendees ?? []).filter((x) => x?.trim()).length;
    return n;
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

  // ✅ BULK DELETE: send DELETE with JSON body { ids: [...] }
  async function deleteSelected() {
    if (!unlocked) return;
    if (!API_BASE) {
      setError("Missing NEXT_PUBLIC_API_BASE_URL");
      return;
    }
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);

    const ok = window.confirm(
      `Hard delete ${ids.length} RSVP(s)?\n\nThis cannot be undone.`
    );
    if (!ok) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/admin/rsvps`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      const text = await res.text();
      if (!res.ok) throw new Error(text || `HTTP ${res.status}`);

      // ✅ remove deleted docs from UI
      const deletedSet = new Set(ids);
      setData((prev) => prev.filter((r) => !deletedSet.has(r.id)));
      setSelectedIds(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Bulk delete failed");
    } finally {
      setLoading(false);
    }
  }

  function exportCsv() {
    // ✅ One row per RSVP document (group), not per attendee
    const header = ["Group Name", "Email", "Created", "Attendees"].join(",");

    const lines = grouped.map((g) => {
      const created = formatDate(g.rsvp.createdAt) || "";
      const attendeesText =
        g.attendees.length > 0 ? g.attendees.join(" | ") : ""; // or "(No attendees added)"

      const cells = [
        g.rsvp.name ?? "",
        g.rsvp.email ?? "",
        created,
        attendeesText,
      ].map(csvEscape);

      return cells.join(",");
    });

    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `rsvps-groups-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // LOCK SCREEN
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

  // UNLOCKED VIEW
  return (
    <main style={{ maxWidth: 1120, margin: "48px auto", padding: 16, fontFamily: "Arial, sans-serif" }}>
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
            Total submissions: <strong>{totalSubmissions}</strong> · Total attendees:{" "}
            <strong>{totalAttendees}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <button
            onClick={exportCsv}
            disabled={loading || flatRows.length === 0}
            style={{ padding: "10px 14px", cursor: loading || flatRows.length === 0 ? "not-allowed" : "pointer" }}
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
          <h2 style={{ fontSize: 18, marginBottom: 10 }}>Attendee checklist view</h2>

          <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 10 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f6f6f6" }}>
                  <th style={th}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      disabled={loading}
                      onChange={toggleSelectAll}
                      aria-label="Select all RSVP groups"
                    />
                  </th>
                  <th style={th}>Group</th>
                  <th style={th}>Email</th>
                  <th style={th}>Created</th>
                  <th style={th}>#</th>
                  <th style={th}>Attendee</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {(() => {
                  let lastGroup = -1;

                  return flatRows.map((row, idx) => {
                    const isFirstRowOfGroup = row.groupIndex !== lastGroup;
                    if (isFirstRowOfGroup) lastGroup = row.groupIndex;

                    const checked = selectedIds.has(row.rsvpId);

                    return (
                      <tr key={`${row.rsvpId}-${idx}`}>
                        <td style={td}>
                          {isFirstRowOfGroup ? (
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={loading}
                              onChange={() => toggleSelect(row.rsvpId)}
                              aria-label={`Select group ${row.groupIndex}`}
                            />
                          ) : null}
                        </td>

                        <td style={td}>{row.groupIndex}</td>
                        <td style={td}>{row.email}</td>
                        <td style={td}>{formatDate(row.createdAt) || "-"}</td>
                        <td style={td}>{row.attendeeIndex === 0 ? "-" : row.attendeeIndex}</td>
                        <td style={td}>{row.attendeeName}</td>

                        <td style={td}>
                          {isFirstRowOfGroup ? (
                            <button
                              type="button"
                              onClick={() => deleteRsvpById(row.rsvpId)}
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
                          ) : null}
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          <p style={{ marginTop: 10, opacity: 0.7, fontSize: 12 }}>
            “Select all” and checkboxes apply to RSVP groups (each Firestore document). Deleting is a hard delete.
          </p>
        </section>
      )}
    </main>
  );
}