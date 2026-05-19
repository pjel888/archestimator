'use client'

import { useEffect, useRef } from 'react'
import { NeatGradient, type NeatConfig } from '@firecms/neat'

const neatConfig: NeatConfig = {
  colors: [
    { color: '#f26f21', enabled: true, influence: 0.88 },
    { color: '#e65a24', enabled: true, influence: 0.74 },
    { color: '#c9412a', enabled: true, influence: 0.58 },
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
  backgroundColor: '#e96221',
  backgroundAlpha: 0,
  grainScale: 0,
  grainSparsity: 0,
  grainIntensity: 0,
  grainSpeed: 0.2,
  resolution: 1.7,
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

export function NeatWireframeBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gradient = new NeatGradient({
      ref: canvas,
      ...neatConfig,
    })

    const removeNeatLink = () => {
      canvas.parentElement?.querySelector('a[data-n]')?.remove()
    }

    removeNeatLink()
    const linkObserver = new MutationObserver(removeNeatLink)
    if (canvas.parentElement) {
      linkObserver.observe(canvas.parentElement, { childList: true })
    }

    const handleScroll = () => {
      gradient.yOffset = window.scrollY * 0.18
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      linkObserver.disconnect()
      window.removeEventListener('scroll', handleScroll)
      gradient.destroy()
    }
  }, [])

  return (
    <>
      <style jsx global>{`a[data-n][href*="neat.firecms.co"] { display: none !important; }`}</style>
      <canvas
        ref={canvasRef}
        className='absolute inset-0 size-full'
        style={{ isolation: 'isolate' }}
        aria-hidden='true'
      />
    </>
  )
}
