import React from 'react'
import { motion } from 'framer-motion'

/**
 * GlitchText Component
 * Creates a glitch art effect on text with color separation
 */
export const GlitchText = ({ children, className = '' }) => {
  return (
    <motion.div
      className={`relative inline-block ${className}`}
      whileHover={{ x: [0, -2, 2, -2, 0] }}
      transition={{ duration: 0.3 }}
    >
      {/* Primary text */}
      <div className="text-electric-cobalt-bright relative z-10">
        {children}
      </div>

      {/* Red glitch layer */}
      <motion.div
        animate={{ x: [0, -1, 1, -1, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 2 }}
        className="absolute top-0 left-0 text-red-600 mix-blend-overlay"
        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 40%, 0 40%)' }}
      >
        {children}
      </motion.div>

      {/* Green glitch layer */}
      <motion.div
        animate={{ x: [0, 1, -1, 1, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 0.4, repeat: Infinity, repeatDelay: 2, delay: 0.1 }}
        className="absolute top-0 left-0 text-acid-neon mix-blend-overlay"
        style={{ clipPath: 'polygon(0 60%, 100% 60%, 100% 100%, 0 100%)' }}
      >
        {children}
      </motion.div>
    </motion.div>
  )
}

/**
 * NeonBorder Component
 * Creates a glowing neon border effect with optional animation
 */
export const NeonBorder = ({ children, color = 'electric-cobalt', animated = false }) => {
  const colorMap = {
    'electric-cobalt': 'shadow-glow-cobalt from-electric-cobalt to-electric-cobalt-bright',
    'acid-neon': 'shadow-glow-neon from-acid-neon to-electric-cobalt-bright',
    'mixed': 'shadow-glow-intense from-electric-cobalt via-acid-neon to-electric-cobalt-bright',
  }

  return (
    <div className="relative group">
      <motion.div
        animate={animated ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
        transition={animated ? { duration: 2, repeat: Infinity } : {}}
        className={`absolute -inset-1 bg-gradient-to-r ${colorMap[color]} rounded-lg blur`}
      />
      <div className="relative bg-void-black rounded-lg p-6">
        {children}
      </div>
    </div>
  )
}

/**
 * HolographicScanlines Component
 * Overlay that creates a holographic scanner effect
 */
export const HolographicScanlines = ({ opacity = 0.05 }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-lg">
      <motion.div
        animate={{ backgroundPosition: ['0 0', '0 100%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 opacity-0 animate-scanlines"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, rgba(0, 212, 255, 0.1) 50%, transparent 100%)',
          backgroundSize: '100% 100%',
          opacity,
        }}
      />
    </div>
  )
}

/**
 * CyberpunkTitle Component
 * Stylized title with neon glow and glitch effects
 */
export const CyberpunkTitle = ({ text, subtitle = '' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8 }}
      className="space-y-2 text-center"
    >
      <motion.h1
        animate={{ textShadow: ['0 0 10px rgba(0, 212, 255, 0.5)', '0 0 30px rgba(57, 255, 20, 0.3)', '0 0 10px rgba(0, 212, 255, 0.5)'] }}
        transition={{ duration: 3, repeat: Infinity }}
        className="text-5xl font-bold font-sans text-electric-cobalt-bright tracking-widest"
      >
        {text}
      </motion.h1>
      {subtitle && (
        <p className="text-acid-neon text-sm font-mono tracking-wider">
          {subtitle}
        </p>
      )}
    </motion.div>
  )
}

export default {
  GlitchText,
  NeonBorder,
  HolographicScanlines,
  CyberpunkTitle,
}
