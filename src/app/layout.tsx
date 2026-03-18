import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "#绑定Ang",
  description: "RSVP to Bryant and Cindy's Wedding!",

  // ✅ ADD THIS
  openGraph: {
    title: "#绑定Ang 💍",
    description: "Join us for Bryant & Cindy's Wedding!",
    url: "https://pangdingang.com",
    siteName: "Bryant & Cindy Wedding",
    images: [
      {
        url: "https://pangdingang.com/hero.jpg?v=2", // 👈 your image
        width: 1200,
        height: 630,
        alt: "Bryant & Cindy Wedding",
      },
    ],
    locale: "en_SG",
    type: "website",
  },

  // ✅ ADD THIS (for better Telegram / iMessage / Twitter support)
  twitter: {
    card: "summary_large_image",
    title: "#绑定Ang 💍",
    description: "Join us for Bryant & Cindy's Wedding!",
    images: ["https://pangdingang.com/hero.jpg?v=2"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
