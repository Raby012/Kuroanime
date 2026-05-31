import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { BookMarked } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  WATCHING: "text-blue-400",
  COMPLETED: "text-green-400",
  PLANNING: "text-yellow-400",
  DROPPED: "text-red-400",
};

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const watchlist = await prisma.watchlist.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
  });

  const byStatus = {
    WATCHING: watchlist.filter((i) => i.status === "WATCHING"),
    COMPLETED: watchlist.filter((i) => i.status === "COMPLETED"),
    PLANNING: watchlist.filter((i) => i.status === "PLANNING"),
    DROPPED: watchlist.filter((i) => i.status === "DROPPED"),
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
      {/* User header */}
      <div className="flex items-center gap-4 mb-10">
        {session.user?.image && (
          <Image
            src={session.user.image}
            alt={session.user.name || ""}
            width={64}
            height={64}
            className="rounded-full border-2 border-brand"
          />
        )}
        <div>
          <h1 className="font-display text-3xl text-white">{(session.user?.name || "USER").toUpperCase()}</h1>
          <p className="text-gray-500 text-sm">{watchlist.length} anime in list</p>
        </div>
      </div>

      {watchlist.length === 0 && (
        <div className="flex flex-col items-center py-24 text-center">
          <BookMarked size={48} className="text-gray-600 mb-4" />
          <p className="text-white font-display text-2xl mb-2">EMPTY WATCHLIST</p>
          <p className="text-gray-500 mb-6">Start adding anime to track your progress</p>
          <Link href="/" className="bg-brand hover:bg-brand-dark text-white px-6 py-2.5 rounded-full text-sm font-medium transition-colors">
            Browse Anime
          </Link>
        </div>
      )}

      {Object.entries(byStatus).map(([status, items]) =>
        items.length > 0 ? (
          <section key={status} className="mb-10">
            <h2 className="font-display text-xl mb-4 flex items-center gap-2">
              <span className={STATUS_COLORS[status]}>{status}</span>
              <span className="text-gray-600 text-base">({items.length})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {items.map((item) => (
                <Link key={item.id} href={`/anime/${item.anilistId}`} className="anime-card group block">
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden bg-surface-2">
                    {item.image && (
                      <Image src={item.image} alt={item.title} fill className="object-cover" />
                    )}
                  </div>
                  <p className="text-xs text-gray-300 mt-1.5 line-clamp-2">{item.title}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}
