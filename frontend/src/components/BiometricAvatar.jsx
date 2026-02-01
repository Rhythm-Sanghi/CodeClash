import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

/**
 * BiometricAvatar Component
 * Displays a circular HUD-style avatar with:
 * - Heart Rate (based on typing speed)
 * - Sync Level (progress on challenge completion)
 * - Glowing neon border that pulses
 */
export default function BiometricAvatar({ 
  username, 
  testsPassed = 0, 
  totalTests = 0, 
  isPlayer = true,
  typingSpeed = 0 // CPM (characters per minute)
}) {
  const [heartRate, setHeartRate] = useState(80)
  const syncLevel = totalTests > 0 ? (testsPassed / totalTests) * 100 : 0

  // Simulate heart rate based on typing speed
  useEffect(() => {
    const baseRate = 80
    const maxRate = 160
    const calculatedRate = Math.min(baseRate + (typingSpeed / 10), maxRate)
    setHeartRate(Math.round(calculatedRate))
  }, [typingSpeed])

  const borderColor = syncLevel === 100 ? 'from-electric-cobalt-bright to-acid-neon' : 'from-electric-cobalt to-electric-cobalt-bright'
  const glowColor = syncLevel === 100 ? 'shadow-glow-neon' : 'shadow-glow-cobalt'

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center gap-4"
    >
      {/* Main Avatar Circle */}
      <div className="relative w-40 h-40">
        {/* Outer glowing ring */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className={`absolute inset-0 rounded-full bg-gradient-to-r ${borderColor} p-1 ${glowColor}`}
        >
          {/* Inner avatar container */}
          <div className="w-full h-full rounded-full bg-gradient-to-br from-void-black to-terminal-gray flex flex-col items-center justify-center border border-electric-cobalt/50 relative overflow-hidden">
            
            {/* Holographic scanlines effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 animate-scanlines opacity-10 bg-gradient-to-b from-transparent via-electric-cobalt-bright to-transparent"></div>
            </div>

            {/* Avatar initials */}
            <div className="text-2xl font-bold text-electric-cobalt-bright z-10">
              {username.slice(0, 2).toUpperCase()}
            </div>

            {/* Player indicator */}
            <div className="text-xs text-acid-neon font-mono z-10 mt-2">
              {isPlayer ? '◆ YOU' : '◇ OPP'}
            </div>
          </div>
        </motion.div>

        {/* Progress ring - Sync Level */}
        <svg className="absolute inset-0 w-full h-full -rotate-90" style={{ filter: 'drop-shadow(0 0 10px rgba(0, 212, 255, 0.4))' }}>
          <circle
            cx="80"
            cy="80"
            r="75"
            fill="none"
            stroke="rgba(0, 102, 255, 0.2)"
            strokeWidth="2"
          />
          <motion.circle
            cx="80"
            cy="80"
            r="75"
            fill="none"
            stroke="url(#syncGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            initial={{ strokeDasharray: 471, strokeDashoffset: 471 }}
            animate={{ strokeDashoffset: 471 - (471 * syncLevel) / 100 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          />
          <defs>
            <linearGradient id="syncGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0066ff" />
              <stop offset="100%" stopColor="#39ff14" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Biometric Data Display */}
      <div className="w-full space-y-2 text-center font-mono text-xs">
        {/* Username */}
        <div className="text-electric-cobalt-bright font-bold text-sm">
          {username}
        </div>

        {/* Heart Rate */}
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 0.6, repeat: Infinity }}
          className="flex items-center justify-center gap-2 text-acid-neon"
        >
          <span>♥</span>
          <span>{heartRate} BPM</span>
        </motion.div>

        {/* Sync Level */}
        <div className="flex items-center justify-center gap-2 text-electric-cobalt">
          <span>SYNC</span>
          <motion.div
            animate={{ width: `${syncLevel}%` }}
            className="h-1 bg-gradient-to-r from-electric-cobalt to-acid-neon rounded-full"
            style={{ width: `${Math.min(syncLevel, 100)}%`, minWidth: '20px' }}
            transition={{ duration: 0.3 }}
          />
          <span>{Math.round(syncLevel)}%</span>
        </div>

        {/* Tests Passed Counter */}
        <div className="text-electric-cobalt-bright/70">
          {testsPassed}/{totalTests} TESTS
        </div>
      </div>
    </motion.div>
  )
}
