import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { AppRoute, PublicRoute } from '../types/marketplace';

interface NavbarProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
}

const NAV_ITEMS: { route: PublicRoute; label: string }[] = [
  { route: 'home', label: 'Home' },
  { route: 'about', label: 'About Us' },
  { route: 'how', label: 'How It Works' },
  { route: 'tasks', label: 'Browse Tasks' },
  { route: 'contact', label: 'Contact' },
];

export function Navbar({ currentRoute, onNavigate }: NavbarProps) {
  const { firebaseUser } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (route: AppRoute) => {
    setMobileOpen(false);
    onNavigate(route);
  };

  return (
    <header className="sticky top-0 z-30 h-[68px] bg-white border-b border-[#dce5f0] shadow-[0_3px_15px_rgba(16,43,80,0.05)]">
      <div className="max-w-[1160px] mx-auto h-full px-5 flex items-center justify-between gap-8">
        {/* Zone 1: Brand wordmark */}
        <button
          type="button"
          onClick={() => handleSelect('home')}
          className="font-display text-[20px] font-bold tracking-tight text-[#172b46] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1265c8]"
        >
          SWAS <span className="text-[#1265c8]">TASKS</span>
        </button>

        {/* Zone 2: Concise single-line nav links (14px medium) */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = currentRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleSelect(item.route)}
                className={`text-[14px] font-medium whitespace-nowrap shrink-0 transition-colors duration-150 pb-0.5 border-b-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1265c8] ${
                  active
                    ? 'text-[#1265c8] border-[#1265c8]'
                    : 'text-[#42556f] border-transparent hover:text-[#0d4fa5] hover:border-[#dce5f0]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary CTA (14px/13px semibold) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => handleSelect(firebaseUser ? 'dashboard' : 'login')}
            className="hidden md:inline-flex items-center justify-center px-4 py-2 swas-btn-text rounded-[9px] swas-btn-primary whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1265c8]"
          >
            {firebaseUser ? 'Workspace' : 'Sign In'}
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-[9px] border border-[#dce5f0] text-[#172b46] bg-white cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-b border-[#dce5f0] px-5 py-4 flex flex-col gap-2 shadow-[0_12px_25px_rgba(16,43,80,0.12)]">
          {NAV_ITEMS.map((item) => {
            const active = currentRoute === item.route;
            return (
              <button
                key={item.route}
                type="button"
                onClick={() => handleSelect(item.route)}
                className={`text-left px-3 py-2.5 rounded-lg text-[13px] font-medium ${
                  active ? 'bg-[#e9f2ff] text-[#1265c8]' : 'text-[#42556f] hover:bg-[#f3f6fa]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => handleSelect(firebaseUser ? 'dashboard' : 'login')}
            className="mt-2 w-full py-2.5 px-4 swas-btn-text rounded-[9px] swas-btn-primary"
          >
            {firebaseUser ? 'Workspace' : 'Sign In'}
          </button>
        </div>
      )}
    </header>
  );
}
