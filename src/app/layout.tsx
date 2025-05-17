import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppHeader from "@/components/AppHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Polymarket Tools",
  description: "A collection of tools for Polymarket users",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-h-screen flex flex-col`}>
        <AppHeader />
        <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
        </main>
      </body>
    </html>
  );
}
