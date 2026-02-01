import React from 'react'
import { motion } from 'framer-motion'
import BiometricAvatar from './BiometricAvatar'

/**
 * DuelHUD Component
 * Asymmetric, non-grid HUD layout inspired by sci-fi terminals
 * Displays competitor biometric data in a dynamic, floating arrangement
 */
export default function DuelHUD({
  playerUsername,
  playerTestsPassed,
  playerTypingSpeed,
  opponentUsername,
  opponentTestsPassed,
  totalTests,
  challengeName,
  challengeDescription,
}) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: 'easeOut',
      },
    },
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="relative w-full h-screen overflow-hidden bg-void-darker"
    >
      {/* Top-left: Player Avatar */}
      <motion.div
        variants={itemVariants}
        className="absolute top-8 left-8 z-20"
      >
        <BiometricAvatar
          username={playerUsername}
          testsPassed={playerTestsPassed}
          totalTests={totalTests}
          isPlayer={true}
          typingSpeed={playerTypingSpeed}
        />
      </motion.div>

      {/* Top-right: Opponent Avatar */}
      <motion.div
        variants={itemVariants}
        className="absolute top-8 right-8 z-20"
      >
        <BiometricAvatar
          username={opponentUsername}
          testsPassed={opponentTestsPassed}
          totalTests={totalTests}
          isPlayer={false}
        />
      </motion.div>

      {/* Center: Challenge Info Panel */}
      <motion.div
        variants={itemVariants}
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 w-96"
      >
        <div className="relative group">
          {/* Animated glow border */}
          <div className="absolute -inset-1 bg-gradient-to-r from-electric-cobalt via-electric-cobalt-bright to-acid-neon rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-500 animate-pulse-glow" />

          {/* Main panel */}
          <div className="relative bg-surface-glass backdrop-blur-glass border border-electric-cobalt/40 rounded-lg p-6 space-y-4">
            
            {/* Scanlines */}
            <div className="absolute inset-0 pointer-events-none rounded-lg">
              <div className="absolute inset-0 animate-scanlines opacity-5 bg-gradient-to-b from-transparent via-electric-cobalt-bright to-transparent rounded-lg"></div>
            </div>

            {/* Title with glow */}
            <motion.div
              animate={{ textShadow: ['0 0 10px rgba(0, 212, 255, 0.5)', '0 0 20px rgba(57, 255, 20, 0.3)'] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="font-mono text-sm text-acid-neon font-bold tracking-widest"
            >
              ▓▒░ CHALLENGE ░▒▓
            </motion.div>

            {/* Challenge name */}
            <h2 className="text-electric-cobalt-bright text-2xl font-bold font-sans">
              {challengeName}
            </h2>

            {/* Challenge description */}
            <p className="text-electric-cobalt/80 text-sm font-mono leading-relaxed">
              {challengeDescription}
            </p>

            {/* Divider with glow */}
            <div className="h-px bg-gradient-to-r from-transparent via-electric-cobalt to-transparent" />

            {/* Status indicators */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <motion.div
                animate={{ borderColor: ['rgba(0, 102, 255, 0.5)', 'rgba(0, 212, 255, 0.8)'] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="border border-electric-cobalt rounded px-3 py-2 text-center"
              >
                <div className="text-xs font-mono text-electric-cobalt/60">STATUS</div>
                <div className="text-electric-cobalt-bright font-bold">ACTIVE</div>
              </motion.div>

              <motion.div
                animate={{ borderColor: ['rgba(57, 255, 20, 0.5)', 'rgba(57, 255, 20, 0.8)'] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                className="border border-acid-neon rounded px-3 py-2 text-center"
              >
                <div className="text-xs font-mono text-acid-neon/60">TESTS</div>
                <div className="text-acid-neon font-bold">{totalTests}</div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Bottom-left: Battle Timer/Round Info */}
      <motion.div
        variants={itemVariants}
        className="absolute bottom-8 left-8 z-20 font-mono text-sm"
      >
        <div className="bg-surface-glass backdrop-blur-glass border border-electric-cobalt/30 rounded px-4 py-3 space-y-1">
          <div className="text-electric-cobalt/60 text-xs">ROUND</div>
          <motion.div
            animate={{ color: ['rgba(0, 212, 255, 1)', 'rgba(57, 255, 20, 1)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-lg font-bold"
          >
            LIVE
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom-right: Progress Indicator */}
      <motion.div
        variants={itemVariants}
        className="absolute bottom-8 right-8 z-20 font-mono text-sm"
      >
        <div className="bg-surface-glass backdrop-blur-glass border border-acid-neon/30 rounded px-4 py-3 space-y-2">
          <div className="text-acid-neon/60 text-xs">COMPLETION</div>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ width: `${(playerTestsPassed + opponentTestsPassed) / (totalTests * 2) * 100}%` }}
              transition={{ duration: 0.5 }}
              className="h-2 bg-gradient-to-r from-electric-cobalt to-acid-neon rounded-full flex-shrink-0"
              style={{ width: `${(playerTestsPassed + opponentTestsPassed) / (totalTests * 2) * 100}%`, minWidth: '40px' }}
            />
            <div className="text-acid-neon font-bold whitespace-nowrap">
              {Math.round((playerTestsPassed + opponentTestsPassed) / (totalTests * 2) * 100)}%
            </div>
          </div>
        </div>
      </motion.div>

      {/* Floating code snippets in background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Code snippet 1 - top right corner */}
        <motion.div
          animate={{ y: [0, -20, 0], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 6, repeat: Infinity }}
          className="absolute top-24 right-12 text-electric-cobalt/20 font-mono text-xs"
        >
          <div>def solve():</div>
          <div>&nbsp;&nbsp;return True</div>
        </motion.div>

        {/* Code snippet 2 - bottom left corner */}
        <motion.div
          animate={{ y: [0, 20, 0], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 7, repeat: Infinity, delay: 1 }}
          className="absolute bottom-24 left-12 text-acid-neon/20 font-mono text-xs"
        >
          <div>while True:</div>
          <div>&nbsp;&nbsp;compile()</div>
        </motion.div>
      </div>

      {/* Glitch effect on mount */}
      <motion.div
        initial={{ opacity: 1 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="absolute inset-0 bg-gradient-to-r from-electric-cobalt/20 via-transparent to-acid-neon/20 pointer-events-none mix-blend-overlay"
      />
    </motion.div>
  )
}
