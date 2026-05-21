'use client'

import { useEffect } from 'react'

export function ReactScanProvider() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    import('react-scan').then(({ scan }) => {
      scan({
        enabled: true,
        log: true,
        showToolbar: true,
        animationSpeed: 'fast',
        trackUnnecessaryRenders: true,
        dangerouslyForceRunInProduction: false,
      })
    })
  }, [])

  return null
}
