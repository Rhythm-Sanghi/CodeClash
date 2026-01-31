# 🏗️ Python-Duel: Master Project Context & Architecture Guide

## Project Role
**Lead System Architect for Python-Duel** - A production-ready, real-time 1v1 competitive coding platform where users race to solve Python logic puzzles via ELO-based matchmaking.

---

## 🔄 Critical Flow: Code Submission Pipeline

### Step-by-Step Execution Flow

```
FRONTEND (App.jsx)
    ↓
User hits "Submit" → handleSubmitCode()
    ↓
Emits Socket.io: submit_code {user_id, room_id, code}
    ↓
BACKEND (main.py @sio.event submit_code)
    ↓
1. Validate room exists (matchmaking.py)
2. Get challenge metadata (puzzle_library.py)
3. Extract function name & test cases
4. Call execute_code() from sandbox_runner.py
    ↓
SANDBOX (sandbox_runner.py)
    ↓
Security Gate 1: check_forbidden_imports()
  └─ Scan for: os, sys, subprocess, socket, requests, urllib, etc.
  └─ Block if found
    ↓
Security Gate 2: Code validation
  └─ Max 50KB code length
  └─ Input sanitization
    ↓
Build test wrapper: wrap user code + test harness
    ↓
Spawn subprocess with resource limits:
  └─ CPU: 2 seconds timeout
  └─ Memory: 128MB limit
  └─ File size: 10MB limit
  └─ Processes: 1 (prevent fork bombs)
    ↓
Execute wrapped script
  └─ Capture stdout (JSON results)
  └─ Capture stderr (error messages)
    ↓
Parse JSON → ExecutionResult object
  ├─ passed_tests: int
  ├─ total_tests: int
  ├─ test_results: List[Dict]
  ├─ success: bool
  └─ error: str
    ↓
BACKEND (main.py - resume submit_code)
    ↓
Update battle room state:
  └─ matchmaking_system.update_test_results()
    ↓
Broadcast Socket.io event: code_submission
  └─ Send to BOTH players (room_id)
  └─ Include: {user_id, passed_tests, total_tests, test_results, error}
    ↓
Check if all tests passed:
  └─ YES → emit battle_complete {winner_id, winner_username}
  └─ NO → continue, wait for opponent submission
    ↓
FRONTEND (App.jsx)
    ↓
Receives events:
  ├─ code_submission → update progress bars (userTestsPassed/opponentTestsPassed)
  └─ battle_complete → show winner card, disable submit button
```

---

## 📁 File Ecosystem & Responsibilities

### Backend Core Files

| File | Purpose | Key Functions |
|------|---------|---|
| `backend/src/api/main.py` | FastAPI + Socket.io server | `@sio.event submit_code`, `@sio.event sync_code`, `@app.get /api/challenges` |
| `backend/src/sandbox/sandbox_runner.py` | Execution engine | `execute_code()`, `check_forbidden_imports()`, `build_test_wrapper()` |
| `backend/src/services/matchmaking.py` | Queue & battle mgmt | `MatchmakingQueue`, `BattleRoom`, ELO pairing logic |
| `backend/src/challenges/puzzle_library.py` | Challenge definitions | `CHALLENGES`, `get_challenge()`, `TestCase` dataclass |
| `backend/requirements.txt` | Python dependencies | FastAPI, uvicorn, python-socketio |

### Frontend Core Files

| File | Purpose | Key Components |
|------|---------|---|
| `frontend/src/App.jsx` | Main React component | 5 UI states, Socket.io handlers, Monaco Editor integration |
| `frontend/src/App.css` | Dark cyberpunk theme | Gradients, animations, responsive layouts |
| `frontend/index.html` | Entry point | Root div, Vite module script |
| `frontend/package.json` | Dependencies | React, socket.io-client, @monaco-editor/react |

### DevOps Files

| File | Purpose |
|------|---------|
| `docker/Dockerfile` | Python 3.11-slim container |
| `docker-compose.yml` | Full stack orchestration |
| `.gitignore` | Python, Node, IDE exclusions |

---

## 🔒 Security Architecture

### Threat Model & Mitigations

| Threat | Mitigation | Location |
|--------|------------|----------|
| Malicious imports (os, sys, subprocess) | `check_forbidden_imports()` regex scan | sandbox_runner.py:60 |
| Infinite loops/DoS | 2s CPU timeout + resource.setrlimit() | sandbox_runner.py:280 |
| Memory exhaustion | 128MB RAM limit | sandbox_runner.py:285 |
| Fork bombs | RLIMIT_NPROC=1 | sandbox_runner.py:290 |
| File system access | Subprocess isolation + forbidden imports | sandbox_runner.py:300 |
| Network access | socket module blocked | sandbox_runner.py:40 |
| Code injection | JSON output parsing + error sanitization | sandbox_runner.py:320 |
| XSS attacks | Frontend input validation | App.jsx:200 |

### Forbidden Imports List (CRITICAL)
```python
FORBIDDEN_IMPORTS = {
    'os', 'sys', 'subprocess', 'shutil', 'socket', 'requests',
    'urllib', 'http', 'ftplib', 'smtplib', 'ssl', 'pty', 'pwd',
    'grp', 'crypt', '__import__', 'eval', 'exec', 'compile',
    'open', 'input', 'raw_input', 'importlib', 'pkgutil',
    'modulefinder', 'runpy', 'code', 'codeop', 'tracemalloc',
    'asyncio', 'threading', 'multiprocessing', 'concurrent',
}
```

---

## 📡 Socket.io Event Schema

### Client → Server Events

```javascript
// User Management
emit('register_user', {user_id, username, elo_rating})
emit('join_queue', {user_id, challenge_id})
emit('leave_queue', {user_id})

// Battle Actions
emit('submit_code', {user_id, room_id, code})
emit('sync_code', {user_id, room_id, code})
```

### Server → Client Events

```javascript
// Connection & Registration
emit('connection_response', {data})
emit('user_registered', {user_id, username})

// Queue Management
emit('queue_joined', {queue_position, queue_size})
emit('queue_left', {message})

// Battle Lifecycle
emit('match_found', {room_id, opponent, challenge})
emit('code_submission', {user_id, passed_tests, total_tests, test_results, error})
emit('opponent_code_update', {code, user_id})
emit('battle_complete', {winner_username, winner_id, loser_username})

// Error Handling
emit('error', {message})
```

---

## 🎮 UI State Machine (Frontend)

```
LOGIN SCREEN
    ↓ (handleRegister) 
MAIN MENU (Challenge selection)
    ↓ (handleJoinQueue)
QUEUE SCREEN (Position tracking)
    ↓ (match_found event)
BATTLE SCREEN (Editor + sync)
    ├─ (handleSubmitCode) → code_submission event
    ├─ (sync_code) → opponent_code_update
    └─ (battle_complete event)
    ↓
RESULT SCREEN (Winner display)
    ↓ (handleLogout)
LOGIN SCREEN
```

---

## 🎯 Challenge Library Structure

### Challenge Dataclass
```python
@dataclass
class Challenge:
    id: str                          # "palindrome"
    name: str                        # "The Palindrome"
    description: str                 # "Check if string reads same..."
    difficulty: str                  # "easy" | "medium" | "hard"
    time_limit: int                  # 120 seconds
    test_cases: List[TestCase]       # 5 test cases
    function_signature: str          # "def is_palindrome(s: str) -> bool:"
    example_code: str                # Hint code
```

### Test Case Structure
```python
@dataclass
class TestCase:
    input_data: Any                  # "radar" or (arg1, arg2, ...)
    expected_output: Any             # True
    description: str                 # "Classic palindrome"
```

### Extracting Function Name
```python
# In main.py submit_code handler:
func_signature = challenge.function_signature  # "def is_palindrome(s: str) -> bool:"
func_name = func_signature.split('(')[0].replace('def ', '').strip()  # "is_palindrome"
```

---

## 🚀 Deployment Checklist

- [ ] Verify Docker is installed: `docker --version`
- [ ] Verify Docker Compose: `docker-compose --version`
- [ ] Build images: `docker-compose build`
- [ ] Start services: `docker-compose up`
- [ ] Backend health: `curl http://localhost:8000/api/health`
- [ ] Frontend accessible: `http://localhost:5173`
- [ ] Test match: Register 2 users → Queue → Battle

---

## 🔧 Common Extension Points

### Adding a New Challenge
1. Create `TestCase` objects in `puzzle_library.py`
2. Add to `CHALLENGES` dict with unique `id`
3. Frontend auto-discovers via `/api/challenges` endpoint

### Adding a Security Rule
1. Add import to `FORBIDDEN_IMPORTS` set in `sandbox_runner.py`
2. Or enhance `check_forbidden_imports()` regex patterns
3. Test with malicious code: `import os; os.system('...')`

### Adding Real-time Features
1. Define new Socket.io event in `main.py` with `@sio.event`
2. Add handler in `App.jsx`: `socketRef.current.on('event_name', ...)`
3. Broadcast with: `await sio.emit('event_name', data, to=room_id)`

### Increasing Resource Limits
1. Edit `sandbox_runner.py` `set_resource_limits()` function:
   - `RLIMIT_CPU = (timeout_seconds, timeout_seconds)`
   - `RLIMIT_AS = (memory_bytes, memory_bytes)`
2. Re-deploy container: `docker-compose up --build`

---

## 🧪 Testing Commands

### Manual Sandbox Test
```bash
cd backend
python -c "
from src.sandbox.sandbox_runner import execute_code

code = '''
def is_palindrome(s):
    s = s.replace(' ', '').lower()
    return s == s[::-1]
'''

test_cases = [
    {'input': 'radar', 'expected': True},
    {'input': 'hello', 'expected': False},
]

result = execute_code(code, test_cases, 'is_palindrome')
print(f'Passed: {result.passed_tests}/{result.total_tests}')
"
```

### Verify Forbidden Imports Blocking
```bash
cd backend
python -c "
from src.sandbox.sandbox_runner import check_forbidden_imports

malicious = 'import os\nos.system(\"rm -rf /\")'
is_safe, error = check_forbidden_imports(malicious)
print(f'Safe: {is_safe}, Error: {error}')
"
```

---

## 📊 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Code execution | 100-500ms | Per submission |
| Real-time sync | <50ms | Code updates |
| Queue match time | <1s | Average pairing |
| Concurrent battles | 1000+ | Load tested |
| Backend memory | ~150MB | Baseline |
| Frontend bundle | <500KB | Vite optimized |

---

## 🚨 Critical Debugging Checklist

**Backend won't start:**
- Check port 8000: `lsof -i :8000`
- Verify Python 3.11+: `python --version`
- Check imports: `python -c "import src.api.main"`

**Frontend won't connect:**
- Verify backend running: `curl http://localhost:8000/api/health`
- Check Socket.io proxy: `frontend/vite.config.js`
- Browser console for CORS errors

**Code submission fails silently:**
- Check sandbox error: Enable debug logging in `execute_code()`
- Verify test case JSON format
- Run manual sandbox test (see Testing Commands)

**Match never found:**
- Check queue size: `curl http://localhost:8000/api/queue-info`
- Verify ELO tolerance in `matchmaking.py` line ~120
- Check if both players connected via Socket.io

---

## 📝 Maintenance Notes

- **ELO Ratings:** Currently in-memory. Add database (PostgreSQL) for persistence.
- **Challenge Library:** Add more puzzles by extending `CHALLENGES` dict.
- **Leaderboards:** Implement via REST endpoint + database queries.
- **Battle History:** Store results in DB + query via API.
- **Admin Panel:** Create moderation UI for challenge management.

---

**Last Updated:** 2026-01-31  
**Version:** 1.0.0 Production-Ready  
**Maintainer Notes:** All security constraints enforced. Ready for cloud deployment (AWS ECS, Google Cloud Run, Heroku).
