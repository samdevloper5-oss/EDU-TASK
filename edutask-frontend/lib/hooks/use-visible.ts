import { useEffect, useRef, useState } from 'react'

export function useVisible(rootMargin = '200px') {
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    const el = ref.current
    if (el) observer.observe(el)
    return () => { if (el) observer.disconnect() }
  }, [rootMargin])

  return { ref, isVisible }
}
