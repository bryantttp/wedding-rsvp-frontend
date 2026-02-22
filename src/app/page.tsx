"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Status =
  | { type: "idle"; message: "" }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export default function HomePage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  // ✅ NEW: just a count (0 = no additional attendees)
  const [additionalCount, setAdditionalCount] = useState<number>(0);

  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });
  const year = useMemo(() => new Date().getFullYear(), []);

  const heroStyle: CSSProperties & {
    "--hero-bg-url"?: string;
    "--hero-photo-url"?: string;
    "--hero-photo-pos"?: string;
    "--hero-photo-scale"?: string;
  } = {
    "--hero-bg-url": "url('/storybook-bg.jpg')",
    "--hero-photo-url": "url('/hero.jpg')",
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const el = entry.target as HTMLElement;
          if (entry.isIntersecting) el.classList.add("is-visible");
          else el.classList.remove("is-visible");
        });
      },
      { threshold: 0.2, rootMargin: "-80px 0px -20% 0px" }
    );

    document.querySelectorAll(".fade-section, .fade-stagger").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus({ type: "loading", message: "Sending your RSVP..." });

    if (!API_BASE) {
      setStatus({ type: "error", message: "Missing NEXT_PUBLIC_API_BASE_URL" });
      return;
    }

    if (!name.trim() || !email.trim()) {
      setStatus({ type: "error", message: "Please fill in name and email." });
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      additionalCount: Number(additionalCount) || 0,
    };

    try {
      const res = await fetch(`${API_BASE}/save-rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const text = await res.text();

      if (!res.ok) {
        setStatus({ type: "error", message: `Error (${res.status}): ${text}` });
        return;
      }

      setStatus({ type: "success", message: "Thank you! Your RSVP has been received 🍯" });

      setName("");
      setEmail("");
      setAdditionalCount(0); // ✅ reset
    } catch {
      setStatus({ type: "error", message: "Network error. Is your backend running?" });
    }
  }

  return (
    <div className="min-h-screen pooh-paper">
      {/* Top Nav (desktop only) */}
      <header className="hidden md:block fixed inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-6xl px-5">
          <nav className="mt-4 flex items-center justify-between rounded-full border border-[#F6C453]/40 bg-white/40 px-5 py-3 backdrop-blur pooh-shadow">
            <div className="text-xs tracking-[0.28em] uppercase text-[#5A3E2B]/80">wedding rsvp</div>

            <div className="hidden gap-6 text-sm text-[#5A3E2B]/80 md:flex">
              <a className="hover:text-[#5A3E2B]" href="#home">
                Home
              </a>
              <a className="hover:text-[#5A3E2B]" href="#venue">
                Venue & Reception
              </a>
            </div>

            <a
              href="#rsvp"
              className="rounded-full bg-[#F6C453] px-4 py-2 text-sm font-semibold text-[#5A3E2B] hover:bg-[#EAB543]"
            >
              RSVP
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section
        id="home"
        className="hero-frame relative flex min-h-[100svh] items-center justify-center px-5 md:pt-24"
        style={heroStyle}
      >
        <div className="hero-window">
          <div className="hero-media" />
          <div className="hero-tint" />
          <div className="hero-glass-ring" />

          <div className="hero-copy">
            <div className="hero-panel">
              <h1 className="font-serif text-3xl leading-tight text-[#5A3E2B] md:text-white sm:text-4xl md:text-6xl">
                Bryant <span className="text-[#F6C453]">&</span> Cindy
              </h1>
            </div>
          </div>
        </div>

        <div className="pointer-events-none absolute bottom-6 inset-x-0 flex justify-center">
          <div className="text-xs tracking-[0.3em] uppercase text-white/70">Scroll</div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5">
        {/* VENUE */}
        <section id="venue" className="fade-section py-20 md:py-28">
          <h2 className="font-serif text-3xl text-[#5A3E2B] md:text-4xl">Venue & Reception</h2>

          <div className="mt-8 grid gap-8 md:grid-cols-2">
            {/* LEFT: DETAILS */}
            <div className="rounded-2xl border border-[#F6C453]/35 bg-white/60 p-6 pooh-shadow">
              <h3 className="text-xl font-semibold text-[#5A3E2B]">Orchard Hotel Singapore</h3>

              <p className="mt-3 text-[#5A3E2B]/80">442 Orchard Road, Singapore 238879</p>

              <p className="mt-4 text-[#5A3E2B]/90">
                <strong>Reception:</strong> 13 June 2026, 6:30 PM
              </p>

              <div className="mt-5 space-y-2 text-[#5A3E2B]/80">
                <p>🍷 Free-flow wine & beer</p>
                <p>🍾 No corkage fee</p>
                <p>🚗 Taxi / Grab recommended (Orchard area)</p>
              </div>

              <a
                href="https://maps.app.goo.gl/1ta7W7Ah5dfdKTHy7"
                target="_blank"
                className="inline-block mt-6 rounded-xl bg-[#F6C453] px-5 py-3 text-sm font-semibold text-[#5A3E2B] hover:bg-[#EAB543]"
              >
                Open in Google Maps
              </a>
            </div>

            {/* RIGHT: GOOGLE MAP */}
            <div className="overflow-hidden rounded-2xl border border-[#F6C453]/35 pooh-shadow">
              <iframe
                src="https://www.google.com/maps?q=Orchard+Hotel+Singapore&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0, minHeight: "360px" }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>

        {/* RSVP */}
        <section id="rsvp" className="fade-section pb-24 pt-10 md:pb-32">
          <div className="fade-stagger rounded-3xl border border-[#F6C453]/40 bg-[#FFF8E7] p-6 text-[#5A3E2B] pooh-shadow md:p-10">
            <h2 className="font-serif text-3xl md:text-4xl">Kindly Let Us Know</h2>
            <p className="mt-3 max-w-2xl text-[#5A3E2B]/80">
              Please RSVP below (name, email, and number of additional guests).
            </p>

            <form onSubmit={onSubmit} className="mt-8 grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <input
                  className="rounded-xl border border-[#F6C453]/60 bg-white px-4 py-3 text-[#5A3E2B] placeholder:text-[#B08968] focus:outline-none focus:ring-2 focus:ring-[#F6C453]"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <input
                  className="rounded-xl border border-[#F6C453]/60 bg-white px-4 py-3 text-[#5A3E2B] placeholder:text-[#B08968] focus:outline-none focus:ring-2 focus:ring-[#F6C453]"
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* ✅ Additional guest count */}
              <div className="rounded-2xl border border-[#F6C453]/35 bg-white/60 p-4 pooh-shadow">
                <div className="mb-3 text-sm tracking-wide text-[#5A3E2B]/70">
                  Additional guests (excluding yourself)
                </div>

                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={10}
                  step={1}
                  value={additionalCount}
                  onChange={(e) => {
                    // allow clearing while typing, then clamp on blur
                    const raw = e.target.value;
                    if (raw === "") {
                      setAdditionalCount(0);
                      return;
                    }

                    const n = Number(raw);
                    if (Number.isNaN(n)) return;

                    // clamp between 0 and 10
                    const clamped = Math.min(10, Math.max(0, Math.trunc(n)));
                    setAdditionalCount(clamped);
                  }}
                  onBlur={() => {
                    // final safety clamp
                    setAdditionalCount((prev) => Math.min(10, Math.max(0, Math.trunc(prev))));
                  }}
                  className="w-full rounded-xl border border-[#F6C453]/60 bg-white px-4 py-3 text-[#5A3E2B] focus:outline-none focus:ring-2 focus:ring-[#F6C453]"
                />
              </div>

              <button
                type="submit"
                disabled={status.type === "loading"}
                className="mt-2 rounded-xl bg-[#F6C453] px-5 py-3 text-[#5A3E2B] font-semibold hover:bg-[#EAB543] disabled:opacity-60"
              >
                {status.type === "loading" ? "Submitting..." : "Submit RSVP"}
              </button>
            </form>

            {status.type !== "idle" && (
              <p className={`mt-4 text-sm ${status.type === "error" ? "text-[#B83A2D]" : "text-[#2F6F3A]"}`}>
                {status.type === "success" ? "✅ " : status.type === "error" ? "❌ " : ""}
                {status.message}
              </p>
            )}
          </div>
        </section>

        <footer className="pb-10 text-center text-xs text-[#5A3E2B]/60">© {year} Wedding RSVP</footer>
      </main>
    </div>
  );
}