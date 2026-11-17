// Enkla pulserande platshållare för laddningslägen — ersätter bar "Laddar…"-text
// på ställen där innehållet annars hoppar till när det kommer in.
export function SkeletonCard() {
  return (
    <div className="card flex items-center gap-3">
      <div className="h-14 w-14 flex-shrink-0 animate-pulse rounded-lg bg-gray-100" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}

export function SkeletonGridCard() {
  return (
    <div className="card flex flex-col gap-2">
      <div className="h-36 w-full animate-pulse rounded-xl bg-gray-100" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-gray-100" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonGridCard key={i} />
      ))}
    </div>
  );
}
