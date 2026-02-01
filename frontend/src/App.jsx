import React, { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import io from 'socket.io-client'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import BiometricAvatar from './components/BiometricAvatar'
import GlassmorphicEditor from './components/GlassmorphicEditor'
import MatchmakingArena from './components/MatchmakingArena'
import DuelHUD from './components/DuelHUD'
import { CyberpunkTitle, GlitchText, NeonBorder } from './components/CyberpunkFX'
import './App.css'

// Debounce utility function
const debounce = (func, delay) => {
  let timeoutId
  return (...args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

const API_URL = 'https://codeclash-2txe.onrender.com'

export default function App() {
  // User state
  const [userId, setUserId] = useState(null)
  const [username, setUsername] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)

  // Queue and battle state
  const [inQueue, setInQueue] = useState(false)
  const [queuePosition, setQueuePosition] = useState(null)
  const [inBattle, setInBattle] = useState(false)
  const [roomId, setRoomId] = useState(null)

  // Challenge and code state
  const [challenge, setChallenge] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [selectedChallenge, setSelectedChallenge] = useState('palindrome')
  const [userCode, setUserCode] = useState('')
  const [opponentCode, setOpponentCode] = useState('')

  // Battle progress
  const [userTestsPassed, setUserTestsPassed] = useState(0)
  const [opponentTestsPassed, setOpponentTestsPassed] = useState(0)
  const [totalTests, setTotalTests] = useState(0)
  const [battleResult, setBattleResult] = useState(null)

  // Socket and UI state
  const socketRef = useRef(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [opponent, setOpponent] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [typingSpeed, setTypingSpeed] = useState(0)

  // Initialize Socket.io connection
  useEffect(() => {
    if (!socketRef.current) {
      socketRef.current = io(API_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      })

      socketRef.current.on('connect', () => {
        setConnectionStatus('connected')
        console.log('Connected to server:', socketRef.current.id)
      })

      socketRef.current.on('disconnect', () => {
        setConnectionStatus('disconnected')
        console.log('Disconnected from server')
      })

      socketRef.current.on('user_registered', (data) => {
        console.log('✅ user_registered event received:', data)
        setIsRegistered(true)
        addNotification(`Welcome, ${data.username}!`)
      })

      socketRef.current.on('error', (data) => {
        if (data.message && data.message.includes('register')) {
          console.error('❌ Registration error:', data)
        }
      })

      socketRef.current.on('queue_joined', (data) => {
        setInQueue(true)
        setQueuePosition(data.queue_position)
        addNotification(`Joined queue! Position: ${data.queue_position}`)
      })

      socketRef.current.on('queue_left', (data) => {
        setInQueue(false)
        setQueuePosition(null)
        addNotification('Left the queue')
      })

      socketRef.current.on('match_found', (data) => {
        setRoomId(data.room_id)
        setChallenge(data.challenge)
        setOpponent(data.opponent)
        setInQueue(false)
        setInBattle(true)
        setUserCode('')
        setOpponentCode('')
        setUserTestsPassed(0)
        setOpponentTestsPassed(0)
        setTotalTests(data.challenge.test_count)
        setBattleResult(null)
        addNotification(`Match found! Facing ${data.opponent.username}`)
      })

      socketRef.current.on('code_submission', (data) => {
        if (data.user_id === userId) {
          setUserTestsPassed(data.passed_tests)
        } else {
          setOpponentTestsPassed(data.passed_tests)
        }

        addNotification(
          `${data.user_id === userId ? 'You' : 'Opponent'}: ${data.passed_tests}/${data.total_tests} tests passed`
        )

        if (!data.success && data.error) {
          addNotification(`Error: ${data.error}`)
        }
      })

      socketRef.current.on('opponent_code_update', (data) => {
        setOpponentCode(data.code)
      })

      socketRef.current.on('battle_complete', (data) => {
        setBattleResult({
          winner: data.winner_username,
          winner_id: data.winner_id,
          loser: data.loser_username,
          message: data.message,
        })
        setInBattle(false)
        addNotification(data.message)
      })

      socketRef.current.on('error', (data) => {
        addNotification(`Error: ${data.message}`)
      })
    }

    return () => {}
  }, [])

  useEffect(() => {
    fetchChallenges()
  }, [])

  const fetchChallenges = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/challenges`)
      setChallenges(response.data.challenges)
    } catch (error) {
      console.error('Error fetching challenges:', error)
      addNotification('Failed to fetch challenges')
    }
  }

  const handleRegister = () => {
    if (!username.trim()) {
      addNotification('Please enter a username')
      return
    }

    if (!socketRef.current) {
      console.error('Socket not initialized')
      addNotification('Initializing connection...')
      return
    }

    const newUserId = `user_${Date.now()}`
    setUserId(newUserId)
    setIsLoggedIn(true)

    console.log('📤 EMIT register_user event:', {
      user_id: newUserId,
      username: username.trim(),
      socketId: socketRef.current.id,
      connected: socketRef.current.connected
    })
    socketRef.current.emit('register_user', {
      user_id: newUserId,
      username: username.trim(),
      elo_rating: 1000,
    }, (ack) => {
      console.log('📨 register_user acknowledgment:', ack)
    })
  }

  const handleJoinQueue = () => {
    if (!userId) {
      addNotification('Please register first')
      return
    }

    if (!isRegistered) {
      addNotification('Waiting for registration to complete...')
      return
    }

    socketRef.current.emit('join_queue', {
      user_id: userId,
      username: username,
      elo_rating: 1000,
      challenge_id: selectedChallenge,
    })
  }

  const handleLeaveQueue = () => {
    socketRef.current.emit('leave_queue', {
      user_id: userId,
    })
  }

  const handleSubmitCode = () => {
    if (!roomId || !userCode.trim()) {
      addNotification('Enter some code first')
      return
    }

    socketRef.current.emit('submit_code', {
      user_id: userId,
      room_id: roomId,
      code: userCode,
    })
  }

  const debouncedSyncCode = useRef(
    debounce((code) => {
      if (roomId && socketRef.current) {
        socketRef.current.emit('sync_code', {
          user_id: userId,
          room_id: roomId,
          code: code || '',
        })
      }
    }, 500)
  ).current

  const handleCodeChange = (value) => {
    setUserCode(value || '')
    // Calculate typing speed (simplified)
    setTypingSpeed(Math.random() * 100 + 50)
    debouncedSyncCode(value)
  }

  const addNotification = (message) => {
    const id = Date.now()
    setNotifications((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id))
    }, 5000)
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setUserId(null)
    setUsername('')
    setIsRegistered(false)
    if (inQueue) handleLeaveQueue()
  }

  return (
    <div className="min-h-screen bg-void-darker overflow-hidden">
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          // LOGIN SCREEN
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center"
          >
            <MatchmakingArena />

            <div className="relative z-30 w-full h-full flex flex-col items-center justify-center px-4">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="w-full max-w-md"
              >
                <CyberpunkTitle 
                  text="CodeClash" 
                  subtitle="⚡ COMPETITIVE CODING ARENA ⚡"
                />

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="mt-12"
                >
                  <NeonBorder color="mixed" animated={true}>
                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Enter your handle..."
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
                          className="w-full px-4 py-3 bg-void-black/50 border border-electric-cobalt/50 rounded text-electric-cobalt-bright placeholder-electric-cobalt/30 font-mono focus:outline-none focus:border-acid-neon focus:shadow-glow-neon transition"
                        />
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(57, 255, 20, 0.6)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleRegister}
                        className="w-full px-6 py-3 bg-gradient-to-r from-electric-cobalt to-acid-neon text-void-black font-bold rounded uppercase tracking-widest hover:shadow-glow-neon transition"
                      >
                        Initialize Connection
                      </motion.button>

                      <div className="text-center text-xs text-electric-cobalt/60 font-mono pt-2">
                        STATUS: {connectionStatus.toUpperCase()}
                      </div>
                    </div>
                  </NeonBorder>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        ) : inBattle ? (
          // BATTLE SCREEN
          <motion.div
            key="battle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 overflow-auto"
          >
            <MatchmakingArena />

            <div className="relative z-10 min-h-screen flex flex-col">
              {/* DuelHUD Overlay */}
              <DuelHUD
                playerUsername={username}
                playerTestsPassed={userTestsPassed}
                playerTypingSpeed={typingSpeed}
                opponentUsername={opponent?.username || 'Unknown'}
                opponentTestsPassed={opponentTestsPassed}
                totalTests={totalTests}
                challengeName={challenge?.name || ''}
                challengeDescription={challenge?.description || ''}
              />

              {/* Editors in lower section */}
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="relative z-20 mt-96 mx-4 mb-4 grid grid-cols-2 gap-4 max-w-7xl mx-auto"
              >
                {/* Player Editor */}
                <div className="h-96">
                  <GlassmorphicEditor
                    code={userCode}
                    onChange={handleCodeChange}
                    testsPassed={userTestsPassed}
                    totalTests={totalTests}
                    title="Your Code"
                  />
                </div>

                {/* Opponent Editor */}
                <div className="h-96">
                  <GlassmorphicEditor
                    code={opponentCode}
                    onChange={() => {}}
                    testsPassed={opponentTestsPassed}
                    totalTests={totalTests}
                    isReadOnly={true}
                    title="Opponent Code"
                  />
                </div>
              </motion.div>

              {/* Submit button */}
              <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7, duration: 0.6 }}
                className="relative z-20 flex justify-center gap-4 mb-8"
              >
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(0, 212, 255, 0.6)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleSubmitCode}
                  className="px-8 py-3 bg-gradient-to-r from-acid-neon to-electric-cobalt-bright text-void-black font-bold rounded uppercase tracking-widest hover:shadow-glow-neon transition"
                >
                  Submit Solution
                </motion.button>
              </motion.div>

              {/* Battle Result */}
              <AnimatePresence>
                {battleResult && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
                  >
                    <NeonBorder color="acid-neon" animated={true}>
                      <div className="text-center space-y-6">
                        <h2 className="text-4xl font-bold text-acid-neon">BATTLE COMPLETE</h2>
                        <p className="text-2xl text-electric-cobalt-bright">
                          🏆 {battleResult.winner} WINS! 🏆
                        </p>
                        <p className="text-electric-cobalt/80">{battleResult.message}</p>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={handleLogout}
                          className="px-6 py-3 bg-gradient-to-r from-electric-cobalt to-acid-neon text-void-black font-bold rounded uppercase"
                        >
                          Return to Arena
                        </motion.button>
                      </div>
                    </NeonBorder>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : inQueue ? (
          // QUEUE SCREEN
          <motion.div
            key="queue"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex items-center justify-center"
          >
            <MatchmakingArena />

            <div className="relative z-30">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                className="w-24 h-24 border-4 border-electric-cobalt/30 border-t-acid-neon rounded-full mb-8"
              />

              <NeonBorder color="mixed" animated={true}>
                <div className="text-center space-y-6">
                  <h2 className="text-2xl font-bold text-electric-cobalt-bright">
                    SEARCHING FOR OPPONENT
                  </h2>
                  <div className="text-5xl font-bold text-acid-neon font-mono">
                    {queuePosition}
                  </div>
                  <p className="text-electric-cobalt/80">Position in queue</p>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLeaveQueue}
                    className="w-full px-6 py-3 bg-red-600/80 hover:bg-red-600 text-white font-bold rounded uppercase transition"
                  >
                    Leave Queue
                  </motion.button>
                </div>
              </NeonBorder>
            </div>
          </motion.div>
        ) : (
          // MENU SCREEN
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 overflow-auto"
          >
            <MatchmakingArena />

            <div className="relative z-10 min-h-screen py-12 px-4">
              <div className="max-w-4xl mx-auto space-y-8">
                <CyberpunkTitle 
                  text="CodeClash" 
                  subtitle="Select Your Challenge"
                />

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  {challenges.map((challenge, idx) => (
                    <motion.div
                      key={challenge.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + idx * 0.1 }}
                      onClick={() => setSelectedChallenge(challenge.id)}
                      className={`cursor-pointer p-6 rounded-lg border-2 transition ${
                        selectedChallenge === challenge.id
                          ? 'border-acid-neon bg-acid-neon/10 shadow-glow-neon'
                          : 'border-electric-cobalt/50 bg-void-black/50 hover:border-electric-cobalt'
                      }`}
                    >
                      <h3 className="text-lg font-bold text-electric-cobalt-bright mb-2">
                        {challenge.name}
                      </h3>
                      <p className="text-electric-cobalt/70 text-sm mb-3">
                        {challenge.description}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-mono px-3 py-1 rounded border ${
                          challenge.difficulty === 'easy'
                            ? 'border-acid-neon text-acid-neon'
                            : challenge.difficulty === 'medium'
                            ? 'border-yellow-500 text-yellow-500'
                            : 'border-red-500 text-red-500'
                        }`}>
                          {challenge.difficulty.toUpperCase()}
                        </span>
                        <span className="text-acid-neon text-sm font-mono">
                          {challenge.test_count} TESTS
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.6 }}
                  className="flex gap-4 justify-center"
                >
                  <motion.button
                    whileHover={{ scale: 1.05, boxShadow: '0 0 30px rgba(57, 255, 20, 0.6)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleJoinQueue}
                    className="px-8 py-4 bg-gradient-to-r from-acid-neon to-electric-cobalt-bright text-void-black font-bold rounded uppercase tracking-widest"
                  >
                    Find Opponent
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleLogout}
                    className="px-8 py-4 border-2 border-electric-cobalt text-electric-cobalt-bright font-bold rounded uppercase tracking-widest hover:bg-electric-cobalt/10 transition"
                  >
                    Logout
                  </motion.button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications */}
      <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-sm">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 400 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 400 }}
              className="bg-gradient-to-r from-electric-cobalt to-acid-neon/50 backdrop-blur-glass border border-acid-neon/50 text-white px-4 py-3 rounded font-mono text-sm"
            >
              {notif.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
