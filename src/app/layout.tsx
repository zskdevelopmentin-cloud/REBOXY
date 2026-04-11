import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { BizProvider } from "../context/BizContext";
import AppShell from "../components/layout/AppShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "REBOXY TRADERS | Tally on Mobile",
  description: "Next-generation business analytics and accounting on your mobile device.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.variable} font-sans antialiased h-full bg-gray-100 dark:bg-black flex items-center justify-center`}>
        <BizProvider>
          <AppShell>
            {children}
          </AppShell>
        </BizProvider>
      </body>
    </html>
  );
}
