"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <h1 className="text-3xl font-bold mb-8">Polymarket Tools</h1>
      <div className="flex flex-col gap-4 w-full max-w-md">
        <Link href="/vote-gravity-calculator" className="w-full">
          <Button className="text-lg px-6 py-3 w-full">Vote Gravity Calculator</Button>
        </Link>
        <Link href="/betting-calculator" className="w-full">
          <Button className="text-lg px-6 py-3 w-full">Kelly Betting Calculator</Button>
        </Link>
        <Link href="/hedge-calculator" className="w-full">
          <Button className="text-lg px-6 py-3 w-full">Optimal Hedging Calculator</Button>
        </Link>
      </div>
    </div>
  );
}
