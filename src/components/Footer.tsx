import Link from "next/link";
import { ALL_GENRES } from "@/lib/anilist";

export function Footer() {
  return (
    <footer className="border-t border-white/5 bg-surface-1 mt-16">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-brand rounded-md flex items-center justify-center">
                <span className="font-display text-white text-base">K</span>
              </div>
              <span className="font-display text-lg text-white tracking-wide">
                KURO<span className="text-brand">ANIME</span>
              </span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
              Watch anime online free. No ads, fast streams, thousands of titles.
            </p>
          </div>

          {/* Browse */}
          <div>
            <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">Browse</h3>
            <ul className="space-y-2">
              {[
                { label: "Trending", href: "/trending" },
                { label: "Seasonal", href: "/seasonal" },
                { label: "Top Rated", href: "/top" },
                { label: "Schedule", href: "/schedule" },
              ].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-gray-500 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Genres */}
          <div className="col-span-2">
            <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">Genres</h3>
            <div className="flex flex-wrap gap-2">
              {ALL_GENRES.map((g) => (
                <Link
                  key={g}
                  href={`/genre/${encodeURIComponent(g)}`}
                  className="text-xs text-gray-600 hover:text-brand hover:bg-brand/10 px-2 py-1 rounded transition-all"
                >
                  {g}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-700">
            © {new Date().getFullYear()} KuroAnime. For educational purposes only.
          </p>
          <p className="text-xs text-gray-700">
            Powered by{" "}
            <a href="https://anilist.co" target="_blank" rel="noopener" className="text-brand hover:underline">
              AniList
            </a>{" "}
            &{" "}
            <a href="https://github.com/consumet" target="_blank" rel="noopener" className="text-brand hover:underline">
              Consumet
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
