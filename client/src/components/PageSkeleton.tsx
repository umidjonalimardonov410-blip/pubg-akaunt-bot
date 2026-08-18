/** Sahifa yuklanayotganda ko'rsatiladigan gamer uslubidagi skeleton. */
export default function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8" aria-busy="true" aria-live="polite">
      <div className="space-y-3">
        <div className="skeleton-bar h-3 w-28 rounded-full" />
        <div className="skeleton-bar h-8 w-64 rounded-xl" />
        <div className="skeleton-bar h-3 w-80 rounded-full" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skeleton-bar h-24 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="rounded-2xl border border-white/[0.06] bg-[#0e1013] p-4">
            <div className="skeleton-bar h-40 w-full rounded-xl" />
            <div className="mt-4 space-y-2">
              <div className="skeleton-bar h-4 w-3/4 rounded-full" />
              <div className="skeleton-bar h-3 w-1/2 rounded-full" />
              <div className="skeleton-bar h-9 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
