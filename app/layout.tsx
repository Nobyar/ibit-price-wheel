import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DEFAULT_DESCRIPTION, getMetadataBase } from "@/lib/site";
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
  metadataBase: getMetadataBase(),
  title: {
    default: "IBIT Price Wheel",
    template: "%s",
  },
  description: DEFAULT_DESCRIPTION,
  applicationName: "IBIT Price Wheel",
  openGraph: {
    title: "IBIT Price Wheel",
    description: DEFAULT_DESCRIPTION,
    type: "website",
    siteName: "IBIT Price Wheel",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "IBIT Price Wheel",
    description: DEFAULT_DESCRIPTION,
  },
  robots: { index: true, follow: true },
  appleWebApp: {
    title: "IBIT Wheel",
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
