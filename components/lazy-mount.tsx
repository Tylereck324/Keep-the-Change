'use client'

import { useEffect, useRef, useState } from 'react'

type LazyMountProps = {
  children: React.ReactNode
  fallback?: React.ReactNode
  rootMargin?: string
}

export function LazyMount({ children, fallback = null, rootMargin = '200px' }: LazyMountProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isVisible) return
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [isVisible, rootMargin])

  return <div ref={ref}>{isVisible ? children : fallback}</div>
}
