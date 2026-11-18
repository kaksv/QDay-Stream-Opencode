import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { APP_URL } from "@/lib/config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "StreamPay — Real-time stablecoin streams on QDay Aevum",
    template: "%s · StreamPay",
  },
  description:
    "Stream tUSD8 by the second on QDay Aevum. Fully funded, non-custodial stablecoin payments with live accrual and withdrawals the recipient controls.",
  applicationName: "StreamPay",
  keywords: [
    "stablecoin streaming",
    "QDay",
    "Aevum",
    "tUSD8",
    "payroll",
    "real-time payments",
    "non-custodial",
  ],
  authors: [{ name: "StreamPay" }],
  openGraph: {
    type: "website",
    siteName: "StreamPay",
    title: "StreamPay — Pay by the second, not by the invoice",
    description:
      "Fully funded stablecoin streams on QDay Aevum Testnet. Money accrues every second; recipients withdraw when they choose.",
    url: APP_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "StreamPay — Real-time stablecoin streams",
    description:
      "Fully funded stablecoin streams on QDay Aevum Testnet. Built with Next.js, wagmi and Foundry.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#070907",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
