"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Menu, X, BookMarked, User, LogOut } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";
import Image from "next/image";

export function Navbar() {
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-lg shadow-black/20" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center">
            <span className="font-display text-white text-lg">K</span>
          </div>
          <span className="font-display text-xl text-white tracking-wide hidden sm:block">
            KURO<span className="text-brand">ANIME</span>
          </span>
        </Link>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-6 ml-6">
          {[
            { label: "Home", href: "/" },
            { label: "Trending", href: "/trending" },
            { label: "Seasonal", href: "/seasonal" },
            { label: "Top", href: "/top" },
            { label: "Schedule", href: "/schedule" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-gray-400 hover:text-white transition-colors font-medium"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <form onSubmit={handleSearch} className="relative hidden sm:flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search anime..."
            className="w-48 md:w-64 bg-surface-2 border border-white/10 rounded-full py-2 pl-4 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand transition-all"
          />
          <button type="submit" className="absolute right-3 text-gray-400 hover:text-brand transition-colors">
            <Search size={16} />
          </button>
        </form>

        {/* Auth */}
        <div ref={profileRef} className="relative">
          {session ? (
            <>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-brand transition-all"
              >
                {session.user?.image ? (
                  <Image
                    src={session.user.image}
                    alt={session.user.name || "User"}
                    width={32}
                    height={32}
                    className="rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-surface-2 rounded-full flex items-center justify-center">
                    <User size={16} className="text-gray-400" />
                  </div>
                )}
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-12 w-48 glass rounded-xl shadow-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-medium truncate">{session.user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-2 transition-colors"
                    onClick={() => setProfileOpen(false)}
                  >
                    <BookMarked size={15} className="text-brand" /> My Watchlist
                  </Link>
                  <button
                    onClick={() => { signOut(); setProfileOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-surface-2 transition-colors text-left text-red-400"
                  >
                    <LogOut size={15} /> Sign Out
                  </button>
                </div>
              )}
            </>
          ) : (
            <button
              onClick={() => signIn("google")}
              className="bg-brand hover:bg-brand-dark text-white text-sm font-medium px-4 py-2 rounded-full transition-colors"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Mobile menu */}
        <button
          className="md:hidden text-gray-400"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {menuOpen && (
        <div className="md:hidden glass border-t border-white/10 px-4 py-4 flex flex-col gap-3">
          <form onSubmit={handleSearch} className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search anime..."
              className="w-full bg-surface-2 border border-white/10 rounded-full py-2 pl-4 pr-10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand"
            />
            <button type="submit" className="absolute right-3 text-gray-400">
              <Search size={16} />
            </button>
          </form>
          {[
            { label: "Home", href: "/" },
            { label: "Trending", href: "/trending" },
            { label: "Seasonal", href: "/seasonal" },
            { label: "Top", href: "/top" },
            { label: "Schedule", href: "/schedule" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-gray-300 hover:text-white py-1"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
