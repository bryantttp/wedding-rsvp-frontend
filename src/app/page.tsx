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
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatus({ type: "loading", message: "Pooh & Piglet are on their way to deliver your RSVP!" });

    try {
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
      setAdditionalCount(0);
    } catch {
      setStatus({ type: "error", message: "Network error. Is your backend running?" });
    } finally {
      setIsSubmitting(false);
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
                Venue
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

          {/* ⭐ DATE SECTION AT BOTTOM OF IMAGE */}
          <div className="hero-date-block">
            <p className="hero-date-top italic tracking-[0.15em]">
              joyfully invite you to<br />
              their wedding celebration
            </p>

            <div className="hero-date-row">
              <div className="hero-date-side hero-date-left">
                <div className="hero-date-line" />
                <span>SATURDAY</span>
              </div>

              <div className="hero-date-center">
                <div className="hero-date-day">13</div>
                <div className="hero-date-year">2026</div>
              </div>

              <div className="hero-date-side hero-date-right">
                <span>JUNE</span>
                <div className="hero-date-line" />
              </div>
            </div>
          </div>

          {/* Names overlay */}
          <div className="hero-copy">
            <div className="hero-panel hero-names">
              <div>
                <h1 className="absolute hero-name-left font-fraunces tracking-[0.10em] leading-tight text-[#624a44] sm:text-4xl md:text-6xl">
                  BRYANT
                </h1>

                <div className="absolute hero-and flex items-center justify-center gap-4">
                  <div className="h-[1px] w-16 bg-[#7b8b84] hero-and-line" />
                  <p className="font-slight italic text-3xl text-[#624a44] sm:text-3xl md:text-4xl hero-and-text">and</p>
                  <div className="h-[1px] w-16 bg-[#7b8b84] hero-and-line" />
                </div>

                <h2 className="absolute font-fraunces tracking-[0.10em] leading-tight text-[#624a44] sm:text-4xl md:text-6xl hero-name hero-name-right">
                  CINDY
                </h2>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-5">
        {/* VENUE */}
        <section id="venue" className="fade-section py-20 md:py-28">

          {/* ✅ SAME SHADE PANEL AS RSVP */}
          <div className="rounded-3xl border border-[#F6C453]/40 bg-[#FFF8E7]/95 p-6 pooh-shadow md:p-10">

            <h2 className="font-fraunces text-3xl text-[#5A3E2B] md:text-4xl">
              Venue
            </h2>

            <div className="mt-8 grid gap-8 md:grid-cols-2">

              {/* LEFT: DETAILS */}
              <div className="rounded-2xl border border-[#F6C453]/35 bg-white/70 p-6 pooh-shadow">
                <h3 className="font-fraunces text-xl font-semibold text-[#5A3E2B]">
                  Orchard Hotel Singapore
                </h3>

                <p className="font-fraunces mt-3 text-[#5A3E2B]/80">
                  442 Orchard Road, Singapore 238879
                </p>

                <div className="font-fraunces mt-5 space-y-2 text-[#5A3E2B]/80">
                  <p>🥂 <strong>Reception</strong> begins at 6:30pm</p>
                  <p>🍽️ <strong>Banquet</strong> starts at 7pm</p>
                  <p>🍷 <strong>Free-flow</strong> wine & beer</p>
                  <p>🍾 <strong>No corkage fee</strong></p>
                </div>
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
          </div>
        </section>

        {/* RSVP */}
        <section id="rsvp" className="fade-section pb-24 pt-10 md:pb-32">
          <div className="fade-stagger rounded-3xl border border-[#F6C453]/40 bg-[#FFF8E7] p-6 text-[#5A3E2B] pooh-shadow md:p-10">
            <h2 className="font-fraunces text-3xl md:text-4xl">Kindly Let Us Know</h2>
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
                disabled={isSubmitting}
                className="mt-2 rounded-xl bg-[#F6C453] px-5 py-3 text-[#5A3E2B] font-semibold hover:bg-[#EAB543] disabled:opacity-60"
              >
                {isSubmitting ? "Submitting..." : "Let's Go!"}
              </button>
            </form>

            {status.type === "loading" && (
                <div className="mt-4 flex items-center justify-center gap-3">
                  <span className="text-sm font-semibold text-[#5A3E2B]">
                    Pooh & Piglet are on their way to deliver your RSVP!
                  </span>
                  <img
                    src="/pooh-walk.gif"
                    alt="Pooh walking"
                    className="h-10 w-auto mix-blend-darken"
                  />
                </div>
              )}

              {status.type === "success" && (
                <p className="mt-4 text-sm text-[#2F6F3A]">
                  ✅ {status.message}
                </p>
              )}

              {status.type === "error" && (
                <p className="mt-4 text-sm text-[#B83A2D]">
                  ❌ {status.message}
                </p>
              )}
          </div>
        </section>

        <footer className="pb-10 text-center text-xs text-[#5A3E2B]/60">© {year} Wedding RSVP</footer>
      </main>
    </div>
  );
}