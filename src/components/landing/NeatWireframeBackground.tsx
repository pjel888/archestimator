'use client'

import { useEffect, useRef, useState } from 'react'
import type { NeatConfig, NeatGradient as NeatGradientInstance } from '@firecms/neat'

const NEAT_STATIC_FALLBACK_QUERY = '(prefers-reduced-motion: reduce), (pointer: coarse), (max-width: 767px)'
const NEAT_IDLE_ACTIVATION_TIMEOUT_MS = 1800
const NEAT_TIMEOUT_ACTIVATION_DELAY_MS = 1200

const neatConfig: NeatConfig = {
  colors: [
    { color: '#aa412a', enabled: true, influence: 0.88 },
    { color: '#8c3623', enabled: true, influence: 0.74 },
    { color: '#aa412a', enabled: true, influence: 0.58 },
    { color: '#8d2f21', enabled: true, influence: 0.3 },
    { color: '#fff0df', enabled: false, influence: 0.08 },
    { color: '#2e0ec7', enabled: false },
  ],
  speed: 1.15,
  horizontalPressure: 2.2,
  verticalPressure: 2.8,
  waveFrequencyX: 1.7,
  waveFrequencyY: 2.4,
  waveAmplitude: 3.2,
  shadows: 2.8,
  highlights: 1.2,
  colorBrightness: 0.82,
  colorSaturation: -1.7,
  wireframe: true,
  colorBlending: 8.5,
  backgroundColor: '#aa412a',
  backgroundAlpha: 0,
  grainScale: 0,
  grainSparsity: 0,
  grainIntensity: 0,
  grainSpeed: 0.2,
  resolution: 1.4,
  yOffset: 0,
  yOffsetWaveMultiplier: 1.8,
  yOffsetColorMultiplier: 1.2,
  yOffsetFlowMultiplier: 1.6,
  flowDistortionA: 0.45,
  flowDistortionB: 1.25,
  flowScale: 1.8,
  flowEase: 0.28,
  flowEnabled: true,
  enableProceduralTexture: false,
  domainWarpEnabled: true,
  domainWarpIntensity: 0.18,
  domainWarpScale: 2.6,
  vignetteIntensity: 0,
  bloomIntensity: 0,
  chromaticAberration: 0,
}

export function shouldUseStaticNeatFallback() {
  if (typeof window === 'undefined') return true
  if (typeof window.matchMedia !== 'function') return false

  return window.matchMedia(NEAT_STATIC_FALLBACK_QUERY).matches
}

function scheduleNeatActivation(callback: () => void) {
  if (typeof window.requestIdleCallback === 'function' && typeof window.cancelIdleCallback === 'function') {
    const idleId = window.requestIdleCallback(callback, {
      timeout: NEAT_IDLE_ACTIVATION_TIMEOUT_MS,
    })
    return () => window.cancelIdleCallback(idleId)
  }

  const timeoutId = globalThis.setTimeout(callback, NEAT_TIMEOUT_ACTIVATION_DELAY_MS)
  return () => globalThis.clearTimeout(timeoutId)
}

export function NeatWireframeBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [shouldRenderCanvas, setShouldRenderCanvas] = useState(false)

  useEffect(() => {
    if (shouldUseStaticNeatFallback()) return

    let isCancelled = false
    const cancelActivation = scheduleNeatActivation(() => {
      if (!isCancelled) setShouldRenderCanvas(true)
    })

    return () => {
      isCancelled = true
      cancelActivation()
    }
  }, [])

  useEffect(() => {
    if (!shouldRenderCanvas) return

    const canvas = canvasRef.current
    if (!canvas) return
    const canvasElement = canvas

    let isActive = true
    let gradient: NeatGradientInstance | null = null
    let linkObserver: MutationObserver | null = null
    let observer: IntersectionObserver | null = null

    const removeNeatLink = () => {
      canvasElement.parentElement?.querySelector('a[data-n]')?.remove()
    }

    const handleScroll = () => {
      if (gradient && !gradient.paused) {
        gradient.yOffset = window.scrollY * 0.18
      }
    }

    async function activateNeat() {
      const { NeatGradient } = await import('@firecms/neat')

      if (!isActive || !canvasElement.isConnected) return

      gradient = new NeatGradient({
        ref: canvasElement,
        ...neatConfig,
      })

      removeNeatLink()
      linkObserver = new MutationObserver(removeNeatLink)
      if (canvasElement.parentElement) {
        linkObserver.observe(canvasElement.parentElement, { childList: true })
      }

      window.addEventListener('scroll', handleScroll, { passive: true })

      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (gradient) gradient.paused = !entry.isIntersecting
          })
        },
        { threshold: 0 }
      )
      observer.observe(canvasElement)
    }

    void activateNeat()

    return () => {
      isActive = false
      observer?.disconnect()
      linkObserver?.disconnect()
      window.removeEventListener('scroll', handleScroll)
      gradient?.destroy()
    }
  }, [shouldRenderCanvas])

  return (
    <>
      <style jsx global>{`a[data-n][href*="neat.firecms.co"] { display: none !important; }`}</style>
      {shouldRenderCanvas ? (
        <canvas
          ref={canvasRef}
          className='absolute inset-0 size-full'
          style={{ isolation: 'isolate' }}
          aria-hidden='true'
        />
      ) : (
        <div
          className='absolute inset-0 size-full bg-[linear-gradient(135deg,rgba(242,68,5,0.72),rgba(198,56,4,0.64)_45%,rgba(150,42,3,0.42))]'
          data-neat-static-fallback='true'
          data-testid='neat-static-fallback'
          aria-hidden='true'
        />
      )}
    </>
  )
}
