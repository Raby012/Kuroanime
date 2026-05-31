export function CardSkeleton() {
  return (
    <div className="w-44 animate-pulse">
      <div className="h-64 rounded-xl skeleton" />
      <div className="h-3 rounded mt-2 skeleton w-4/5" />
      <div className="h-2.5 rounded mt-1.5 skeleton w-2/5" />
    </div>
  );
}

export function CardRowSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="shrink-0">
          <CardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function AnimePageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-72 md:h-96 skeleton rounded-none" />
      <div className="max-w-7xl mx-auto px-4 -mt-40 relative z-10">
        <div className="flex gap-6">
          <div className="w-52 h-72 rounded-xl skeleton shrink-0" />
          <div className="flex-1 pt-20 space-y-3">
            <div className="h-6 skeleton w-1/3 rounded" />
            <div className="h-10 skeleton w-2/3 rounded" />
            <div className="h-4 skeleton w-1/2 rounded" />
            <div className="h-20 skeleton rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
