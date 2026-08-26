import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`pro-skeleton rounded-xl ${className}`} aria-hidden />;
}

export function ListingCardSkeleton() {
  return (
    <div className="rounded-2xl border border-white/[0.09] bg-[#101215] p-2 sm:p-2.5">
      <Skeleton className="aspect-[3/4] w-full rounded-xl" />
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/[0.06] pt-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-2 w-10 rounded" />
          <Skeleton className="h-3.5 w-20 rounded" />
        </div>
        <Skeleton className="h-8 w-8 rounded-lg sm:h-9 sm:w-9" />
      </div>
    </div>
  );
}

export function ListingGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      {Array.from({ length: count }).map((_, index) => (
        <ListingCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function ListRowSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#101215] p-2.5">
          <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-2/3 rounded" />
            <Skeleton className="h-2.5 w-1/3 rounded" />
          </div>
          <Skeleton className="h-7 w-16 rounded-lg" />
        </div>
      ))}
    </div>
  );
}

/** Rasm blur-up bilan yuklanadi: avval xira, keyin aniq. */
export function BlurImage({ src, alt, className = '', ...rest }: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [loaded, setLoaded] = React.useState(false);
  return (
    <span className="relative block h-full w-full overflow-hidden">
      {!loaded && <span className="pro-skeleton absolute inset-0" aria-hidden />}
      <img
        {...rest}
        src={src}
        alt={alt}
        onLoad={() => setLoaded(true)}
        className={`${className} transition-[filter,opacity,transform] duration-500 ${loaded ? 'scale-100 opacity-100 blur-0' : 'scale-105 opacity-0 blur-lg'}`}
      />
    </span>
  );
}
