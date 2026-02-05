"use client";

import { useEffect, useMemo, useState } from "react";

type FirestoreTimestamp = {
  // Firestore admin / JSON can vary a bit depending on how it was serialized
  seconds?: number;
  nanos?: number;
  _seconds?: number;
  _nanoseconds?: number;
};

type Rsvp = {
  id: string;
  name: string;
  email: string;
  groupNumber: number;
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

export default function AdminPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [data, setData] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/admin/rsvps`, {
        method: "GET",
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      const json = (await res.json()) as unknown;

      // minimal runtime safety
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

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<number, Rsvp[]>();

    for (const r of data) {
      const group = Number(r.groupNumber);
      if (!Number.isFinite(group)) continue;
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(r);
    }

    // sort each group by createdAt (if present)
    for (const [, list] of map.entries()) {
      list.sort((a, b) => {
        const am = toMillis(a.createdAt) ?? 0;
        const bm = toMillis(b.createdAt) ?? 0;
        return am - bm;
      });
    }

    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [data]);

  const totalCount = data.length;

  return (
    <main style={{ maxWidth: 980, margin: "48px auto", padding: 16, fontFamily: "Arial, sans-serif" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, margin: 0 }}>Admin — RSVPs</h1>
          <p style={{ marginTop: 6, opacity: 0.75 }}>
            Total submissions: <strong>{totalCount}</strong>
          </p>
        </div>

        <button
          onClick={load}
          disabled={loading}
          style={{
            padding: "10px 14px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {loading && <p>Loading…</p>}
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {!loading && !error && grouped.length === 0 && <p>No RSVPs yet.</p>}

      {!loading &&
        !error &&
        grouped.map(([groupNumber, list]) => (
          <section key={groupNumber} style={{ marginTop: 22 }}>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>
              Group {groupNumber} <span style={{ opacity: 0.7 }}>({list.length})</span>
            </h2>

            <div style={{ overflowX: "auto", border: "1px solid #ddd", borderRadius: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f6f6f6" }}>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Name</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Email</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #ddd" }}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.id}>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{r.name}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>{r.email}</td>
                      <td style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                        {formatDate(r.createdAt) || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
    </main>
  );
}
