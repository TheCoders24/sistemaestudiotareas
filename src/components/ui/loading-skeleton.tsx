import { Skeleton } from './skeleton'

export { Skeleton }

export function CardSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-3 w-full" />
    </div>
  )
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function StatsCardSkeleton() {
  return (
    <div className="p-4 space-y-2">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-2 w-full" />
    </div>
  )
}
