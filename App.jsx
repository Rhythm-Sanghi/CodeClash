import React, { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'
import io from 'socket.io-client'
import axios from 'axios'
import './App.css'

const BACKEND_URL = "https://your-backend-name.onrender.com"

const API_URL = window.location.hostname === "localhost"
  ? "http://localhost:8000"
  : BACKEND_URL

const socketURL = window.location.hostname === "localhost"
  ? "http://localhost:8000"
  : BACKEND_URL

export default function App() {
  const [userId, setUserId] = useState(null)
  const [username, setUsername] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  const [inQueue, setInQueue] = useState(false)
  const [queuePosition, setQueuePosition] = useState(null)
  const [inBattle, setInBattle] = useState(false)
  const [roomId, setRoomId] = useState(null)

  const [challenge, setChallenge] = useState(null)
  const [challenges, setChallenges] = useState([])
  const [selectedChallenge, setSelectedChallenge] = useState('palindrome')
  const [userCode, setUserCode] = useState('')
  const [opponentCode, setOpponentCode] = useState('')

  const [userTestsPassed, setUserTestsPassed] = useState(0)
  const [opponentTestsPassed, setOpponentTestsPassed] = useState(0)
  const [totalTests, setTotalTests] = useState(0)
  const [battleResult, setBattleResult] = useState(null)

  const socketRef = useRef(null)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [opponent, setOpponent] = useState(null)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    socketRef.current = io(socketURL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    })

    socketRef.current.on('connect', () => {
      setConnectionStatus('connected')
    })

    socketRef.current.on('disconnect', () => {
      setConnectionStatus('disconnected')
    })

    socketRef.current.on('connection_response', (data) => {
      console.log('Connected:', data)
    })

    socketRef.current.on('user_registered', (data) => {
      addNotification(`Welcome, ${data.username}!`)
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

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [userId])

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

    const newUserId = `user_${Date.now()}`
    setUserId(newUserId)
    setIsLoggedIn(true)

    socketRef.current.emit('register_user', {
      user_id: newUserId,
      username: username.trim(),
      elo_rating: 1000,
    })
  }

  const handleJoinQueue = () => {
    if (!userId) {
      addNotification('Please register first')
      return
    }

    socketRef.current.emit('join_queue', {
      user_id: userId,
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

  const handleCodeChange = (value) => {
    setUserCode(value || '')

    if (roomId && socketRef.current) {
      socketRef.current.emit('sync_code', {
        user_id: userId,
        room_id: roomId,
        code: value || '',
      })
    }
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
    if (inQueue) handleLeaveQueue()
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🐍 Python Duel</h1>
        <p>Real-time 1v1 Competitive Python Coding</p>
        <div className="header-status">
          <span className={`status-indicator ${connectionStatus}`}></span>
          <span className="status-text">{connectionStatus}</span>
        </div>
      </header>

      <main className="app-main">
        {!isLoggedIn ? (
          <div className="login-container">
            <div className="login-card">
              <h2>Enter the Arena</h2>
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleRegister()}
              />
              <button onClick={handleRegister} className="btn btn-primary">
                Join as Competitor
              </button>
            </div>
          </div>
        ) : inBattle ? (
          <div className="battle-container">
            <div className="battle-info">
              <div className="player-card player-card-self">
                <h3>You</h3>
                <p className="player-name">{username}</p>
                <div className="test-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${totalTests > 0 ? (userTestsPassed / totalTests) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <span className="test-count">
                    {userTestsPassed}/{totalTests} tests
                  </span>
                </div>
              </div>

              <div className="challenge-info">
                <h2>{challenge?.name}</h2>
                <p>{challenge?.description}</p>
                <code className="function-sig">{challenge?.function_signature}</code>
              </div>

              <div className="player-card player-card-opponent">
                <h3>Opponent</h3>
                <p className="player-name">{opponent?.username}</p>
                <div className="test-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${totalTests > 0 ? (opponentTestsPassed / totalTests) * 100 : 0}%`,
                      }}
                    ></div>
                  </div>
                  <span className="test-count">
                    {opponentTestsPassed}/{totalTests} tests
                  </span>
                </div>
              </div>
            </div>

            <div className="editor-section">
              <div className="editor-container">
                <h3>Your Code</h3>
                <Editor
                  height="400px"
                  defaultLanguage="python"
                  value={userCode}
                  onChange={handleCodeChange}
                  theme="vs-dark"
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    folding: true,
                  }}
                />
              </div>

              <div className="editor-container opponent-editor">
                <h3>Opponent's Code (Read-only)</h3>
                <Editor
                  height="400px"
                  defaultLanguage="python"
                  value={opponentCode}
                  theme="vs-dark"
                  options={{
                    readOnly: true,
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: 'on',
                    folding: true,
                  }}
                />
              </div>
            </div>

            <div className="battle-controls">
              <button onClick={handleSubmitCode} className="btn btn-success">
                Submit Solution
              </button>
            </div>

            {battleResult && (
              <div className="battle-result">
                <h2>Battle Complete!</h2>
                <p className="result-message">
                  🏆 <strong>{battleResult.winner}</strong> has won!
                </p>
                <button onClick={handleLogout} className="btn btn-primary">
                  Back to Menu
                </button>
              </div>
            )}
          </div>
        ) : inQueue ? (
          <div className="queue-container">
            <div className="queue-card">
              <h2>Waiting for an opponent...</h2>
              <div className="queue-position">
                <span className="queue-rank">{queuePosition}</span>
                <span className="queue-label">in queue</span>
              </div>
              <button onClick={handleLeaveQueue} className="btn btn-danger">
                Leave Queue
              </button>
            </div>
          </div>
        ) : (
          <div className="menu-container">
            <div className="menu-card">
              <h2>Select Challenge</h2>
              <select
                value={selectedChallenge}
                onChange={(e) => setSelectedChallenge(e.target.value)}
                className="challenge-select"
              >
                {challenges.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.difficulty})
                  </option>
                ))}
              </select>

              <div className="menu-buttons">
                <button onClick={handleJoinQueue} className="btn btn-primary btn-large">
                  Find Opponent
                </button>
                <button onClick={handleLogout} className="btn btn-secondary">
                  Logout
                </button>
              </div>
            </div>

            <div className="challenges-list">
              <h3>Available Challenges</h3>
              <div className="challenge-grid">
                {challenges.map((c) => (
                  <div
                    key={c.id}
                    className={`challenge-card ${selectedChallenge === c.id ? 'active' : ''}`}
                    onClick={() => setSelectedChallenge(c.id)}
                  >
                    <h4>{c.name}</h4>
                    <span className={`difficulty difficulty-${c.difficulty}`}>
                      {c.difficulty}
                    </span>
                    <p>{c.test_count} test cases</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="notifications">
        {notifications.map((notif) => (
          <div key={notif.id} className="notification">
            {notif.message}
          </div>
        ))}
      </div>
    </div>
  )
}
