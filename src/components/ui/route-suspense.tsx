import React, { Suspense, lazy, ComponentType } from 'react'
import { Loader } from 'lucide-react'

interface RouteSuspenseProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  name?: string
}

export function RouteSuspense({ children, fallback }: RouteSuspenseProps) {
  const defaultFallback = (
    <div className="flex items-center justify-center h-64 text-muted-foreground">
      <Loader className="h-8 w-8 animate-spin text-indigo-500" />
    </div>
  )

  return (
    <Suspense fallback={fallback ?? defaultFallback}>
      {children}
    </Suspense>
  )
}

export function createLazyRoute<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: { fallback?: React.ReactNode; name?: string }
) {
  const LazyComponent = lazy(importFn)
  const { fallback, name } = options ?? {}
  
  return function WrappedComponent(props: React.ComponentProps<T>) {
    return (
      <RouteSuspense fallback={fallback} name={name}>
        <LazyComponent {...props} />
      </RouteSuspense>
    )
  }
}

export function preloadRoute(importFn: () => Promise<any>) {
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => importFn())
  } else {
    setTimeout(() => importFn(), 1000)
  }
}

export const routePreloaders = new Map<string, () => Promise<any>>()

export function registerRoutePreloader(name: string, importFn: () => Promise<any>) {
  routePreloaders.set(name, importFn)
}

export function preloadRouteByName(name: string) {
  const preloader = routePreloaders.get(name)
  if (preloader) preloadRoute(preloader)
}

export function preloadAllRoutes() {
  routePreloaders.forEach(preloadRoute)
}