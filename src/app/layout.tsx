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
  metadataBase: new URL("https://pangdingang.com"),

  title: "#绑定Ang 💍",
  description: "Join us for Bryant & Cindy's Wedding!",

  openGraph: {
    title: "#绑定Ang 💍",
    description: "Join us for Bryant & Cindy's Wedding!",
    url: "https://pangdingang.com",
    type: "website",
    locale: "en_SG",
    siteName: "#绑定Ang 💍",
    images: [
      {
        url: "https://pangdingang.com/preview.jpg",
        secureUrl: "https://pangdingang.com/preview.jpg",
        width: 1200,
        height: 630,
        alt: "Bryant & Cindy Wedding",
        type: "image/jpeg",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "#绑定Ang 💍",
    description: "Join us for Bryant & Cindy's Wedding!",
    images: ["https://pangdingang.com/preview.jpg"],
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
