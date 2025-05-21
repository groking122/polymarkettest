'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/vote-gravity-calculator', label: 'Vote Gravity' },
  { href: '/vote-gravity-calculator-v2', label: 'Vote Gravity v2' },
  { href: '/vote-gravity-calculator-v1.2', label: 'Smart Edge' },
  { href: '/smart-edge-info', label: 'Smart Edge Info' },
  { href: '/betting-calculator', label: 'Kelly Betting' },
  { href: '/hedge-calculator', label: 'Hedge Calculator' },
];

export default function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="bg-gray-800 text-white shadow-md sticky top-0 z-50">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-blue-400 hover:text-blue-300 transition-colors">
              Polymarket Tools
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>
          {/* Mobile menu button (optional, can be added later) */}
          <div className="md:hidden flex items-center">
            {/* Placeholder for mobile menu button if needed */}
          </div>
        </div>
      </nav>
    </header>
  );
} 