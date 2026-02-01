import React, { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

/**
 * MatchmakingArena Component
 * Animated 3D perspective grid background
 * Resembles a digital colosseum with perspective motion
 */
export default function MatchmakingArena() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const width = window.innerWidth
    const height = window.innerHeight

    canvas.width = width
    canvas.height = height

    let animationFrameId
    let time = 0

    const drawGrid = () => {
      // Clear with void black background
      ctx.fillStyle = '#05070f'
      ctx.fillRect(0, 0, width, height)

      // Set up perspective
      const centerX = width / 2
      const centerY = height / 2
      const vanishingPointY = -500

      // Grid parameters
      const gridSize = 50
      const gridRows = 20
      const gridCols = 30
      const depth = 2000
      const speed = 2

      // Moving offset based on time
      const zOffset = (time * speed) % depth

      // Draw grid lines
      ctx.strokeStyle = 'rgba(0, 102, 255, 0.3)' // Electric cobalt
      ctx.lineWidth = 1

      // Horizontal lines (moving toward vanishing point)
      for (let row = 0; row < gridRows; row++) {
        const z = (row * depth) / gridRows - zOffset
        if (z < 0 || z > depth) continue

        const scale = 1 - z / depth
        const offsetY = vanishingPointY + (centerY - vanishingPointY) * scale

        ctx.beginPath()
        ctx.moveTo(centerX - (width / 2) * scale, offsetY)
        ctx.lineTo(centerX + (width / 2) * scale, offsetY)
        ctx.stroke()

        // Add glow effect on closer lines
        if (scale > 0.8) {
          ctx.strokeStyle = 'rgba(0, 212, 255, 0.6)' // Brighter cobalt
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(centerX - (width / 2) * scale, offsetY)
          ctx.lineTo(centerX + (width / 2) * scale, offsetY)
          ctx.stroke()
          ctx.strokeStyle = 'rgba(0, 102, 255, 0.3)'
          ctx.lineWidth = 1
        }
      }

      // Vertical lines (perspective lines to vanishing point)
      for (let col = 0; col < gridCols; col++) {
        const xOffset = -width / 2 + (col / gridCols) * width
        ctx.beginPath()
        ctx.moveTo(centerX + xOffset, centerY)
        ctx.lineTo(centerX + xOffset * 0.2, vanishingPointY)
        ctx.stroke()

        // Add acid green accent lines
        if (col % 5 === 0) {
          ctx.strokeStyle = 'rgba(57, 255, 20, 0.2)' // Acid neon
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(centerX + xOffset, centerY)
          ctx.lineTo(centerX + xOffset * 0.2, vanishingPointY)
          ctx.stroke()
          ctx.strokeStyle = 'rgba(0, 102, 255, 0.3)'
          ctx.lineWidth = 1
        }
      }

      // Draw intersection points with neon glow
      ctx.fillStyle = 'rgba(0, 212, 255, 0.4)'
      for (let row = 1; row < gridRows - 1; row++) {
        const z = (row * depth) / gridRows - zOffset
        if (z < 0 || z > depth) continue

        const scale = 1 - z / depth
        const offsetY = vanishingPointY + (centerY - vanishingPointY) * scale

        for (let col = 2; col < gridCols - 2; col += 3) {
          const xOffset = -width / 2 + (col / gridCols) * width
          const x = centerX + xOffset * scale
          const size = 2 * scale

          ctx.beginPath()
          ctx.arc(x, offsetY, size, 0, Math.PI * 2)
          ctx.fill()

          // Glow effect
          if (scale > 0.7) {
            ctx.fillStyle = 'rgba(57, 255, 20, 0.3)'
            ctx.beginPath()
            ctx.arc(x, offsetY, size * 2, 0, Math.PI * 2)
            ctx.fill()
            ctx.fillStyle = 'rgba(0, 212, 255, 0.4)'
          }
        }
      }

      // Draw horizon line (acid green)
      ctx.strokeStyle = 'rgba(57, 255, 20, 0.5)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(centerX - width / 2, vanishingPointY + 100)
      ctx.lineTo(centerX + width / 2, vanishingPointY + 100)
      ctx.stroke()

      // Draw scanlines overlay
      ctx.strokeStyle = 'rgba(0, 102, 255, 0.05)'
      ctx.lineWidth = 1
      for (let y = 0; y < height; y += 2) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
      }

      time++
      animationFrameId = requestAnimationFrame(drawGrid)
    }

    drawGrid()

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none bg-void-darker">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      
      {/* Additional glitch effect overlays */}
      <motion.div
        animate={{ opacity: [0, 0.1, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute inset-0 bg-gradient-to-b from-electric-cobalt via-transparent to-acid-neon mix-blend-overlay"
      />
      
      {/* Vignette effect */}
      <div className="absolute inset-0 bg-radial-gradient pointer-events-none" 
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(5, 7, 15, 0.8) 100%)'
        }}
      />
    </div>
  )
}
