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
  // ✅ updated: list of attendees (optional)
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
  groupIndex: number; // 1..N (each RSVP doc is one group)
  email: string;
  createdAt?: FirestoreTimestamp;
  attendeeIndex: number; // 1..k (0 means no attendees)
  attendeeName: string;
};

function csvEscape(value: unknown): string {
  const s = String(value ?? "");
  return `"${s.replace(/"/g, '""')}"`;
}

export default function AdminPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;
  const ADMIN_PASS = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "";

  const [data, setData] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ password gate state
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");

  async function load() {
    // ✅ don't load until unlocked
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

      if (!Array.isArray(json)) {
        throw new Error("Unexpected response format (expected an array).");
      }

      setData(json as Rsvp[]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to load RSVPs";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // ✅ load only after unlocking
  useEffect(() => {
    if (unlocked) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  // ✅ each RSVP doc is ONE group; we display attendee rows under it
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
        // still show a row so the RSVP isn't "invisible"
        rows.push({
          groupIndex: g.groupIndex,
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

  function exportChecklistCSV() {
    if (!flatRows.length) return;

    const header = ["Group", "Email", "Created", "Attendee #", "Attendee"].map(csvEscape).join(",");
    const lines = flatRows.map((r) =>
      [
        r.groupIndex,
        r.email,
        formatDate(r.createdAt) || "",
        r.attendeeIndex === 0 ? "" : r.attendeeIndex,
        r.attendeeName === "(No attendees added)" ? "" : r.attendeeName,
      ]
        .map(csvEscape)
        .join(",")
    );

    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "wedding_rsvp_attendees.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  // ✅ LOCK SCREEN (no data fetch happens here)
  if (!unlocked) {
    return (
      <main
        style={{
          maxWidth: 420,
          margin: "48px auto",
          padding: 16,
          fontFamily: "Arial, sans-serif",
        }}
      >
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

          <button
            type="submit"
            style={{
              marginTop: 12,
              width: "100%",
              padding: "12px 14px",
              cursor: "pointer",
            }}
          >
            Unlock
          </button>

          {error && <p style={{ color: "crimson", marginTop: 12 }}>Error: {error}</p>}
        </form>
      </main>
    );
  }

  const th = { textAlign: "left" as const, padding: 10, borderBottom: "1px solid #ddd" };
  const td = { padding: 10, borderBottom: "1px solid #eee", verticalAlign: "top" as const };

  // ✅ UNLOCKED VIEW
  return (
    <main style={{ maxWidth: 980, margin: "48px auto", padding: 16, fontFamily: "Arial, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>Admin — RSVPs</h1>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            Total submissions: <strong>{totalSubmissions}</strong> · Total attendees:{" "}
            <strong>{totalAttendees}</strong>
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={load}
            disabled={loading}
            style={{ padding: "10px 14px", cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          <button
            onClick={exportChecklistCSV}
            disabled={flatRows.length === 0}
            style={{
              padding: "10px 14px",
              cursor: flatRows.length === 0 ? "not-allowed" : "pointer",
              opacity: flatRows.length === 0 ? 0.6 : 1,
            }}
          >
            Export CSV
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
                  <th style={th}>Group</th>
                  <th style={th}>Email</th>
                  <th style={th}>Created</th>
                  <th style={th}>#</th>
                  <th style={th}>Attendee</th>
                </tr>
              </thead>
              <tbody>
                {flatRows.map((row, idx) => (
                  <tr key={`${row.email}-${idx}`}>
                    <td style={td}>{row.groupIndex}</td>
                    <td style={td}>{row.email}</td>
                    <td style={td}>{formatDate(row.createdAt) || "-"}</td>
                    <td style={td}>{row.attendeeIndex === 0 ? "-" : row.attendeeIndex}</td>
                    <td style={td}>{row.attendeeName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}