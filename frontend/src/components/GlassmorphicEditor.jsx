import React, { useMemo } from 'react'
import Editor from '@monaco-editor/react'
import { motion } from 'framer-motion'

/**
 * GlassmorphicEditor Component
 * Features:
 * - Floating glassmorphic design with backdrop blur
 * - Vertical progress bar that fills as tests pass
 * - Dynamic neon glow border (Cobalt Blue → Acid Green)
 * - Holographic scanlines overlay
 */
export default function GlassmorphicEditor({
  code = '',
  onChange = () => {},
  testsPassed = 0,
  totalTests = 0,
  isReadOnly = false,
  title = 'Code Editor',
  typingSpeed = 0,
}) {
  const testProgress = totalTests > 0 ? (testsPassed / totalTests) * 100 : 0
  const isComplete = testsPassed === totalTests && totalTests > 0

  // Determine border glow color based on progress
  const getBorderGradient = () => {
    if (isComplete) {
      return 'from-acid-neon to-electric-cobalt-bright'
    }
    return 'from-electric-cobalt to-electric-cobalt-bright'
  }

  const getGlowEffect = () => {
    if (isComplete) {
      return 'shadow-glow-neon'
    }
    return 'shadow-glow-cobalt'
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="relative group h-full"
    >
      {/* Animated border glow effect */}
      <div
        className={`absolute -inset-1 bg-gradient-to-r ${getBorderGradient()} rounded-lg blur opacity-50 group-hover:opacity-75 transition duration-300 ${getGlowEffect()}`}
      />

      {/* Main glassmorphic container */}
      <div className="relative bg-surface-glass backdrop-blur-glass border border-electric-cobalt/30 rounded-lg overflow-hidden flex flex-col h-full">
        
        {/* Header with title and progress */}
        <div className="bg-gradient-to-r from-void-black/80 to-terminal-gray/80 backdrop-blur-md px-4 py-3 border-b border-electric-cobalt/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-acid-neon font-mono text-sm font-bold">
              &lt;/&gt;
            </div>
            <h3 className="text-electric-cobalt-bright font-mono text-sm uppercase tracking-wider">
              {title}
            </h3>
          </div>

          {/* Status indicator */}
          <motion.div
            animate={{ opacity: [1, 0.7, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`text-xs font-mono px-2 py-1 rounded border ${
              isComplete
                ? 'border-acid-neon text-acid-neon bg-acid-neon/10'
                : 'border-electric-cobalt text-electric-cobalt bg-electric-cobalt/10'
            }`}
          >
            {isReadOnly ? '◇ READ-ONLY' : '◆ ACTIVE'}
          </motion.div>
        </div>

        {/* Scanlines overlay */}
        <div className="absolute inset-0 pointer-events-none z-20">
          <div className="absolute inset-0 animate-scanlines opacity-5 bg-gradient-to-b from-transparent via-electric-cobalt-bright to-transparent"></div>
        </div>

        {/* Editor container with vertical progress bar */}
        <div className="flex-1 relative flex overflow-hidden">
          {/* Vertical Progress Bar */}
          <div className="w-1 bg-gradient-to-b from-void-darker via-void-black to-void-darker border-r border-electric-cobalt/20 relative">
            <motion.div
              className="absolute top-0 left-0 right-0 bg-gradient-to-b from-electric-cobalt via-electric-cobalt-bright to-acid-neon"
              style={{ height: `${testProgress}%` }}
              initial={{ height: 0 }}
              animate={{ height: `${testProgress}%` }}
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            >
              {/* Pulsing light at the end of progress */}
              {testProgress > 0 && testProgress < 100 && (
                <motion.div
                  animate={{ boxShadow: ['0 0 10px rgba(0, 212, 255, 0.8)', '0 0 20px rgba(57, 255, 20, 0.6)'] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="absolute -right-1 top-0 w-3 h-3 rounded-full bg-electric-cobalt-bright"
                />
              )}
            </motion.div>

            {/* Progress checkpoints */}
            {totalTests > 0 && Array.from({ length: totalTests }).map((_, i) => (
              <div
                key={i}
                className={`absolute left-0 right-0 h-px transition-all duration-300 ${
                  i < testsPassed ? 'bg-acid-neon' : 'bg-electric-cobalt/20'
                }`}
                style={{ top: `${((i + 1) / totalTests) * 100}%` }}
              />
            ))}
          </div>

          {/* Monaco Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              defaultLanguage="python"
              value={code}
              onChange={onChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: 'JetBrains Mono, monospace',
                lineNumbers: 'on',
                folding: true,
                readOnly: isReadOnly,
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                glyphMargin: false,
                lineDecorationsWidth: 0,
                renderLineHighlight: 'none',
                backgroundColor: '#05070f',
              }}
              onMount={(editor) => {
                // Customize syntax highlighting colors for cyberpunk theme
                editor.updateOptions({
                  'bracketPairColorization.enabled': true,
                })
              }}
            />
          </div>
        </div>

        {/* Footer stats */}
        <div className="bg-gradient-to-r from-void-black/80 to-terminal-gray/80 backdrop-blur-md px-4 py-2 border-t border-electric-cobalt/20 flex items-center justify-between text-xs font-mono">
          <div className="flex gap-4">
            <span className="text-electric-cobalt">
              TESTS: <span className="text-acid-neon font-bold">{testsPassed}/{totalTests}</span>
            </span>
            <span className="text-electric-cobalt-bright">
              {isComplete ? '✓ COMPLETE' : `${Math.round(testProgress)}% COMPLETE`}
            </span>
          </div>
          <motion.div
            animate={{ opacity: [1, 0.6, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="text-electric-cobalt-bright/50"
          >
            ⬤ LIVE
          </motion.div>
        </div>
      </div>

      {/* Test completion glow burst */}
      {isComplete && (
        <motion.div
          initial={{ scale: 0.8, opacity: 1 }}
          animate={{ scale: 1.5, opacity: 0 }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="absolute -inset-2 bg-gradient-to-r from-acid-neon to-electric-cobalt-bright rounded-lg blur-xl pointer-events-none opacity-30"
        />
      )}
    </motion.div>
  )
}
