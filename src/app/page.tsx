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

  const [totalGuests, setTotalGuests] = useState<number>(1);

  const [status, setStatus] = useState<Status>({ type: "idle", message: "" });
  const year = useMemo(() => new Date().getFullYear(), []);

  const MIN_GUESTS = 1;
  const MAX_GUESTS = 10;

  const decGuests = () =>
    setTotalGuests((prev) => Math.max(MIN_GUESTS, prev - 1));

  const incGuests = () =>
    setTotalGuests((prev) => Math.min(MAX_GUESTS, prev + 1));

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

  const [showMobileHashtag, setShowMobileHashtag] = useState(true);

  useEffect(() => {
    const hero = document.getElementById("home");
    if (!hero) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowMobileHashtag(entry.isIntersecting);
      },
      {
        rootMargin: "-80% 0px 0px 0px", // 👈 MAGIC LINE
      }
    );

    observer.observe(hero);

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
        totalGuests: Number(totalGuests) || 1,
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
      setTotalGuests(1);
    } catch {
      setStatus({ type: "error", message: "Network error. Is your backend running?" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen pooh-paper">
      {/* Top Nav (desktop only) */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="mx-auto max-w-6xl px-5">

          <nav className="mt-4 flex items-center justify-between px-5 py-3 md:rounded-full md:border md:border-[#F6C453]/40 md:bg-white/40 md:backdrop-blur md:pooh-shadow">

            {/* 🟡 Hashtag */}
            <div className={`
                  w-full text-center text-xs tracking-[0.28em] uppercase text-[#5A3E2B]/80
                  translate-y-6 transition-opacity duration-500
                  md:translate-y-0 md:w-auto md:text-left md:font-normal md:opacity-100
                  ${showMobileHashtag ? "opacity-100" : "opacity-0 pointer-events-none md:pointer-events-auto"}
                `}>
              #pang定ang
            </div>

            {/* 🔵 Desktop nav links */}
            <div className="hidden md:flex gap-6 text-sm text-[#5A3E2B]/80">
              <a className="hover:text-[#5A3E2B]" href="#home">Home</a>
              <a className="hover:text-[#5A3E2B]" href="#venue">Details</a>
            </div>

            {/* 🟢 Desktop RSVP button */}
            <a
              href="#rsvp"
              className="hidden md:flex rounded-full bg-[#F6C453] px-4 py-2 text-sm font-semibold text-[#5A3E2B] hover:bg-[#EAB543]"
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
                <h1 className="absolute hero-name-left font-fraunces tracking-[0.10em] leading-tight text-[#624a44] md:text-white sm:text-4xl md:text-6xl">
                  BRYANT
                </h1>

                <div className="absolute hero-and flex items-center justify-center gap-4">
                  <div className="h-[1px] w-16 bg-[#7b8b84] md:bg-white hero-and-line" />
                  <p className="font-slight italic text-3xl text-[#624a44] md:text-white sm:text-3xl md:text-4xl hero-and-text">and</p>
                  <div className="h-[1px] w-16 bg-[#7b8b84] md:bg-white hero-and-line" />
                </div>

                <h2 className="absolute font-fraunces tracking-[0.10em] leading-tight text-[#624a44] md:text-white sm:text-4xl md:text-6xl hero-name hero-name-right">
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
          <div>

            <div className="mt-8 grid gap-8 md:grid-cols-2">

              {/* LEFT: DETAILS */}
             <div className="hero-border-details rounded-2xl border border-[#F6C453]/35 bg-white/75 p-6 pooh-shadow">
              {/* List */}
              <ul className="mt-2 space-y-4 text-[#5A3E2B]/80">
                <li className="flex flex-col items-center text-center gap-2">
                  <span className="w-6 text-xl leading-none">🥂</span>
                  <p className="font-pagella font-bold italic text-xl leading-snug tracking-[0.1em]">
                    Reception begins at 6:30pm
                  </p>
                </li>

                <li className="flex flex-col items-center text-center gap-2">
                  <span className="w-6 text-xl leading-none">🍷</span>
                  <p className="font-pagella font-bold italic text-xl leading-snug tracking-[0.1em]">
                    Free-flow wine &amp; beer
                  </p>
                </li>

                <li className="flex flex-col items-center text-center gap-2">
                  <span className="w-6 text-xl leading-none">🍾</span>
                  <p className="font-pagella font-bold italic text-xl leading-snug tracking-[0.1em]">
                    No corkage fee
                  </p>
                </li>

                <li className="flex flex-col items-center text-center gap-2">
                  <span className="w-6 text-xl leading-none">🏨</span>
                  <p className="font-pagella font-bold italic text-xl leading-snug tracking-[0.1em]">
                    Orchard Hotel Singapore
                  </p>
                </li>
              </ul>            
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
          <div className="hero-border-rsvp fade-stagger rounded-3xl border border-[#F6C453]/35 bg-white/75 p-6 text-[#5A3E2B] pooh-shadow md:p-10">
            <h2 className="font-pagella text-[1.25rem] md:text-4xl md:tracking-[0.03em] ">Kindly RSVP by <strong className="font-pagella italic">30 April 2026</strong> ❤️</h2>
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
                <div className="mb-3 text-base md:text-2xl tracking-wide text-[#5A3E2B]/70">
                  Total Guests (Including yourself)
                </div>
                <div>
                  <p className="mt-2 mb-4 text-xs text-[#5A3E2B]/60 italic">
                    We will do our best to accommodate your requested number of guests
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[#F6C453]/60 bg-white px-4 py-3">

                  {/* Decrease */}
                  <button
                    type="button"
                    onClick={() => setTotalGuests((prev) => Math.max(1, prev - 1))}
                    disabled={totalGuests <= 1}
                    className="guest-button flex h-10 w-10 items-center justify-center rounded-lg border border-[#F6C453]/40 bg-[#FFF8E7] text-lg font-semibold text-[#5A3E2B] hover:bg-[#FDF1CF] disabled:opacity-40"
                  >
                    −
                  </button>

                  {/* Current value */}
                  <div className="text-2xl font-semibold text-[#5A3E2B] min-w-[40px] text-center">
                    {totalGuests}
                  </div>

                  {/* Increase */}
                  <button
                    type="button"
                    onClick={() => setTotalGuests((prev) => Math.min(10, prev + 1))}
                    disabled={totalGuests >= 10}
                    className="guest-button flex h-10 w-10 items-center justify-center rounded-lg border border-[#F6C453]/40 bg-[#FFF8E7] text-lg font-semibold text-[#5A3E2B] hover:bg-[#FDF1CF] disabled:opacity-40"
                  >
                    +
                  </button>
                </div>
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