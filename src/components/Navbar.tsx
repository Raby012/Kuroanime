// src/components/Navbar.tsx  — replace your existing Navbar with this
"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Search, Menu, X, LogOut, Settings, List, User, BookmarkPlus, Compass } from "lucide-react";
import Image from "next/image";

export function Navbar() {
  const { data: session } = useSession();
  const pathname          = usePathname();
  const [menuOpen, setMenuOpen]     = useState(false);
  const [dropOpen, setDropOpen]     = useState(false);
  const [search,   setSearch]       = useState("");
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const navLinks = [
    { href: "/",          label: "Home"     },
    { href: "/trending",  label: "Trending" },
    { href: "/seasonal",  label: "Seasonal" },
    { href: "/browse",    label: "Browse"   },
    { href: "/top",       label: "Top"      },
    { href: "/schedule",  label: "Schedule" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-white/6">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center font-display text-white font-bold text-sm">K</div>
          <span className="font-display text-lg text-white font-bold tracking-wide hidden sm:block">KUROANIME</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1 flex-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                pathname === l.href ? "text-white bg-white/8" : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="flex-1 md:flex-none" />

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <form action="/search" method="get">
            <input
              name="q"
              type="text"
              placeholder="Search anime..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-surface-1 border border-white/8 rounded-xl pl-8 pr-4 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand transition-colors w-44 focus:w-56"
            />
          </form>
        </div>

        {/* Auth section */}
        {session ? (
          <div className="relative" ref={dropRef}>
            <button onClick={() => setDropOpen(!dropOpen)}
              className="flex items-center gap-2 hover:bg-white/5 rounded-xl px-2 py-1.5 transition-colors">
              <div className="w-7 h-7 rounded-full overflow-hidden bg-surface-2 border border-white/10 shrink-0">
                {session.user?.image
                  ? <Image src={session.user.image} alt="" width={28} height={28} className="w-full h-full object-cover" />
                  : <User size={16} className="m-auto mt-1.5 text-gray-500" />
                }
              </div>
              <span className="text-sm text-white hidden sm:block max-w-20 truncate">{session.user?.name?.split(" ")[0]}</span>
            </button>

            {dropOpen && (
              <div className="absolute right-0 top-full mt-2 w-44 bg-surface-1 border border-white/10 rounded-xl shadow-2xl py-1 z-50">
                <Link href="/watchlist" onClick={() => setDropOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                  <List size={14} /> My List
                </Link>
                <Link href="/settings" onClick={() => setDropOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors">
                  <Settings size={14} /> Settings
                </Link>
                <div className="h-px bg-white/8 my-1" />
                <button onClick={() => signOut({ callbackUrl: "/" })}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/auth/signin"
              className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
              Sign In
            </Link>
            <Link href="/auth/signup"
              className="bg-brand hover:bg-brand-dark text-white text-sm font-medium px-3 py-1.5 rounded-xl transition-all">
              Sign Up
            </Link>
          </div>
        )}

        {/* Mobile menu toggle */}
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-gray-400 hover:text-white">
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-surface-1 border-t border-white/8 px-4 py-3 space-y-1">
          {navLinks.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === l.href ? "text-white bg-white/8" : "text-gray-400 hover:text-white"
              }`}>
              {l.label}
            </Link>
          ))}
          <div className="h-px bg-white/8 my-2" />
          {/* Mobile search */}
          <form action="/search" method="get" className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input name="q" type="text" placeholder="Search..." className="w-full bg-surface-2 border border-white/8 rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-brand" />
          </form>
        </div>
      )}
    </nav>
  );
}
