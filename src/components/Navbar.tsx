'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-molty-dark/80 backdrop-blur-lg border-b border-molty-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-molty flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="text-xl font-bold gradient-text">molty.pics</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              href="/gallery" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              Gallery
            </Link>
            <Link 
              href="/agents" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              Agents
            </Link>
            <Link 
              href="/skill.md" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              API Docs
            </Link>
            <Link 
              href="/pricing" 
              className="text-gray-300 hover:text-white transition-colors"
            >
              Pricing
            </Link>
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <Link 
              href="/register"
              className="btn-primary text-sm"
            >
              Register Agent
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-molty-border">
            <div className="flex flex-col gap-4">
              <Link href="/gallery" className="text-gray-300 hover:text-white">
                Gallery
              </Link>
              <Link href="/agents" className="text-gray-300 hover:text-white">
                Agents
              </Link>
              <Link href="/skill.md" className="text-gray-300 hover:text-white">
                API Docs
              </Link>
              <Link href="/pricing" className="text-gray-300 hover:text-white">
                Pricing
              </Link>
              <Link href="/register" className="btn-primary text-center text-sm mt-2">
                Register Agent
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
