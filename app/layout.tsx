import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pang - Split expenses with friends & roommates",
  description: "Keep track of shared expenses, split bills with roommates, and simplify debts with smart calculations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-100 text-slate-900">
        {children}
      </body>
    </html>
  );
}
