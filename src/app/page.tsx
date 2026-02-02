"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

type Status =
  | { type: "idle"; message: "" }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

export default function HomePage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [groupNumber, setGroupNumber] = useState<number | "">("");
  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });

  const year = useMemo(() => new Date().getFullYear(), []);

  /**
   * Desktop:
   *  - --hero-bg-url = storybook background (behind everything)
   *  - --hero-photo-url = your photo (inside the window)
   *
   * You can SHIFT the photo crop (desktop only) using:
   *  - --hero-photo-pos: "50% 35%" etc
   *  - --hero-photo-scale: 1.02 ~ 1.12
   */
  const heroStyle: CSSProperties & {
    "--hero-bg-url"?: string;
    "--hero-photo-url"?: string;
    "--hero-photo-pos"?: string;
    "--hero-photo-scale"?: string;
  } = {
    "--hero-bg-url": "url('/storybook-bg.jpg')",
    "--hero-photo-url": "url('/hero.jpg')",

    // ✅ desktop crop tuning (won’t affect mobile because mobile overrides it)
    // "--hero-photo-pos": "50% 45%",
    // "--hero-photo-scale": "1.06",
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

    if (!name.trim() || !email.trim() || groupNumber === "" || Number.isNaN(Number(groupNumber))) {
      setStatus({ type: "error", message: "Please fill in all fields." });
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      groupNumber: Number(groupNumber),
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
      setGroupNumber("");
    } catch {
      setStatus({ type: "error", message: "Network error. Is your backend running on port 8080?" });
    }
  }

  return (
    <div className="min-h-screen pooh-paper">
      {/* Top Nav (desktop only) */}
      <header className="hidden md:block fixed inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-6xl px-5">
          <nav className="mt-4 flex items-center justify-between rounded-full border border-[#F6C453]/40 bg-white/40 px-5 py-3 backdrop-blur pooh-shadow">
            <div className="text-xs tracking-[0.28em] uppercase text-[#5A3E2B]/80">
              wedding rsvp
            </div>

            <div className="hidden gap-6 text-sm text-[#5A3E2B]/80 md:flex">
              <a className="hover:text-[#5A3E2B]" href="#home">Home</a>
              <a className="hover:text-[#5A3E2B]" href="#our-story">Our Story</a>
              <a className="hover:text-[#5A3E2B]" href="#faq">FAQ</a>
              <a className="hover:text-[#5A3E2B]" href="#rsvp">RSVP</a>
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
        {/* “Window” */}
        <div className="hero-window">
          {/* YOUR photo is here (inner div) */}
          <div className="hero-media" />
          <div className="hero-tint" />
          <div className="hero-glass-ring" />

          {/* Text */}
          <div className="hero-copy">
            <div className="hero-panel">
              {/* <p className="text-xs tracking-[0.35em] uppercase text-white/75">
                The Wedding of
              </p> */}

              <h1 className="mt-3 font-serif text-3xl leading-tight text-white">
                Bryant <span className="text-[#F6C453]">&</span> Cindy
              </h1>

              {/* <p className="mt-4 text-sm text-white/75 md:text-base">
                our wedding website <br />
                designed by me, coded by my fiancé ♡
              </p> */}
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="pointer-events-none absolute bottom-6 inset-x-0 flex justify-center">
          <div className="text-xs tracking-[0.3em] uppercase text-white/70">Scroll</div>
        </div>
      </section>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-5">
        {/* Our Story */}
        <section id="our-story" className="fade-section py-20 md:py-28">
          <h2 className="font-serif text-3xl text-[#5A3E2B] md:text-4xl">Once upon a time…</h2>
          <p className="mt-4 max-w-2xl text-[#5A3E2B]/80">
            Write your story here — how you met, the proposal, and what you’re excited about.
          </p>

          <div className="fade-stagger mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[#F6C453]/35 bg-white/60 p-6 pooh-shadow">
              <div className="text-sm tracking-wide text-[#5A3E2B]/70">The day we met</div>
              <div className="mt-2 text-[#5A3E2B]/90">Add a short moment here.</div>
            </div>
            <div className="rounded-2xl border border-[#F6C453]/35 bg-white/60 p-6 pooh-shadow">
              <div className="text-sm tracking-wide text-[#5A3E2B]/70">The proposal</div>
              <div className="mt-2 text-[#5A3E2B]/90">Add a short moment here.</div>
            </div>
            <div className="rounded-2xl border border-[#F6C453]/35 bg-white/60 p-6 pooh-shadow">
              <div className="text-sm tracking-wide text-[#5A3E2B]/70">What we love</div>
              <div className="mt-2 text-[#5A3E2B]/90">Add a short moment here.</div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="fade-section py-20 md:py-28">
          <h2 className="font-serif text-3xl text-[#5A3E2B] md:text-4xl">Things You Might Be Wondering</h2>

          <div className="fade-stagger mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-[#F6C453]/35 bg-white/60 p-6 pooh-shadow">
              <div className="text-sm tracking-wide text-[#5A3E2B]/70">Dress code</div>
              <div className="mt-2 text-[#5A3E2B]/90">Add your dress code (e.g. Semi-formal).</div>
            </div>
            <div className="rounded-2xl border border-[#F6C453]/35 bg-white/60 p-6 pooh-shadow">
              <div className="text-sm tracking-wide text-[#5A3E2B]/70">Venue & timing</div>
              <div className="mt-2 text-[#5A3E2B]/90">Add the venue address and start time.</div>
            </div>
            <div className="rounded-2xl border border-[#F6C453]/35 bg-white/60 p-6 pooh-shadow">
              <div className="text-sm tracking-wide text-[#5A3E2B]/70">Parking / transport</div>
              <div className="mt-2 text-[#5A3E2B]/90">Add your parking instructions.</div>
            </div>
            <div className="rounded-2xl border border-[#F6C453]/35 bg-white/60 p-6 pooh-shadow">
              <div className="text-sm tracking-wide text-[#5A3E2B]/70">Contact</div>
              <div className="mt-2 text-[#5A3E2B]/90">Add who to contact for help.</div>
            </div>
          </div>
        </section>

        {/* RSVP */}
        <section id="rsvp" className="fade-section pb-24 pt-10 md:pb-32">
          <div className="fade-stagger rounded-3xl border border-[#F6C453]/40 bg-[#FFF8E7] p-6 text-[#5A3E2B] pooh-shadow md:p-10">
            <h2 className="font-serif text-3xl md:text-4xl">Kindly Let Us Know</h2>
            <p className="mt-3 max-w-2xl text-[#5A3E2B]/80">
              Please RSVP below. (For now: name, email, and your group number.)
            </p>

            <form onSubmit={onSubmit} className="mt-8 grid gap-4 md:grid-cols-3">
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

              <input
                className="rounded-xl border border-[#F6C453]/60 bg-white px-4 py-3 text-[#5A3E2B] placeholder:text-[#B08968] focus:outline-none focus:ring-2 focus:ring-[#F6C453]"
                placeholder="Group number"
                type="number"
                min={1}
                max={999}
                value={groupNumber}
                onChange={(e) => setGroupNumber(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />

              <button
                type="submit"
                disabled={status.type === "loading"}
                className="md:col-span-3 mt-2 rounded-xl bg-[#F6C453] px-5 py-3 text-[#5A3E2B] font-semibold hover:bg-[#EAB543] disabled:opacity-60"
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

        <footer className="pb-10 text-center text-xs text-[#5A3E2B]/60">
          © {year} Wedding RSVP
        </footer>
      </main>
    </div>
  );
}