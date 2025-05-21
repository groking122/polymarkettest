"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Calculator, ChevronRight, Brain, LineChart, Divide, Scale } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 md:p-12">
      <div className="max-w-6xl w-full">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-3">Polymarket Tools</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A suite of advanced calculators and analytical tools for Polymarket traders
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Prediction Tools</h2>
            
            <Card className="transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">Vote Gravity Calculator</CardTitle>
                    <CardDescription>Original consensus weight model</CardDescription>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Scale size={20} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p>Calculate weighted YES/NO probability based on trader votes. Assigns equal weight to each side regardless of capital.</p>
              </CardContent>
              <CardFooter>
                <Link href="/vote-gravity-calculator" className="w-full">
                  <Button variant="outline" className="w-full justify-between group">
                    <span>Open Tool</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">Vote Gravity v2</CardTitle>
                    <CardDescription>Enhanced weighted model</CardDescription>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Scale size={20} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p>Improved version with better accuracy and capital-weighted voting system. Supports basic position tracking.</p>
              </CardContent>
              <CardFooter>
                <Link href="/vote-gravity-calculator-v2" className="w-full">
                  <Button variant="outline" className="w-full justify-between group">
                    <span>Open Tool</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">Kelly Betting Calculator</CardTitle>
                    <CardDescription>Optimal bet sizing</CardDescription>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                    <Calculator size={20} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p>Calculate the mathematically optimal bet size for a given edge and bankroll based on the Kelly Criterion.</p>
              </CardContent>
              <CardFooter>
                <Link href="/betting-calculator" className="w-full">
                  <Button variant="outline" className="w-full justify-between group">
                    <span>Open Tool</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">Optimal Hedging Calculator</CardTitle>
                    <CardDescription>Risk management tool</CardDescription>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
                    <Divide size={20} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p>Calculate the optimal hedge for your position to minimize risk or lock in profits based on market price changes.</p>
              </CardContent>
              <CardFooter>
                <Link href="/hedge-calculator" className="w-full">
                  <Button variant="outline" className="w-full justify-between group">
                    <span>Open Tool</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold mb-4">Smart Edge Suite</h2>
            
            <Card className="transition-all hover:shadow-md border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-t-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">Smart Edge</CardTitle>
                      <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full">Premium</span>
                    </div>
                    <CardDescription>Advanced prediction engine</CardDescription>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <Brain size={20} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm pt-4">
                <p className="mb-3">Our most advanced prediction system with trader-weighted consensus, PnL tracking, and multi-factor confidence calibration.</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <span>Conviction weighting</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <span>Dual-edge detection</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <span>Kelly-based sizing</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    <span>CSV import/export</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Link href="/vote-gravity-calculator-v1.2" className="w-full">
                  <Button className="w-full justify-between bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 group">
                    <span>Open Smart Edge</span>
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="transition-all hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl">Smart Edge Documentation</CardTitle>
                    <CardDescription>Comprehensive guide</CardDescription>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <LineChart size={20} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p>Learn how Smart Edge works, understand inputs and outputs, and discover advanced strategies for prediction markets.</p>
              </CardContent>
              <CardFooter>
                <Link href="/smart-edge-info" className="w-full">
                  <Button variant="outline" className="w-full justify-between group">
                    <span>View Documentation</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-900/80 border-dashed border-gray-300 dark:border-gray-700 transition-all hover:shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl text-gray-700 dark:text-gray-300">Coming Soon</CardTitle>
                    <CardDescription>Future tools</CardDescription>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <span className="text-lg font-bold">+</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="text-gray-600 dark:text-gray-400">Stay tuned for more tools including backtesting, trader profiling, and Bayesian probability engines.</p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full text-gray-500 dark:text-gray-400 border-gray-300 dark:border-gray-700" disabled>
                  <span>More tools coming soon</span>
                </Button>
              </CardFooter>
            </Card>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-medium text-blue-800 dark:text-blue-300 text-sm mb-2">Did you know?</h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">
                Smart Edge uses advanced statistical methods to accurately estimate true probabilities in prediction markets, 
                even when individual trader data is noisy or biased.
              </p>
            </div>
          </div>
        </div>

        <footer className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>© 2025 Polymarket Tools • All tools provided for educational and entertainment purposes only</p>
        </footer>
      </div>
    </div>
  );
}
