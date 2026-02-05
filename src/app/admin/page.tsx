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

      const res = await fetch(`${API_BASE}/admin/rsvps`, {
        method: "GET",
      });

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

  // ✅ do NOT auto-load on mount anymore
  // useEffect(() => {
  //   load();
  // }, []);

  // ✅ load only after unlocking
  useEffect(() => {
    if (unlocked) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  const grouped = useMemo(() => {
    const map = new Map<number, Rsvp[]>();

    for (const r of data) {
      const group = Number(r.groupNumber);
      if (!Number.isFinite(group)) continue;
      if (!map.has(group)) map.set(group, []);
      map.get(group)!.push(r);
    }

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

  // ✅ UNLOCKED VIEW (your original UI)
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
