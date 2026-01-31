# Python Duel

Real-time 1v1 competitive Python coding platform. Challenge opponents to code duels and test your algorithmic skills in live head-to-head battles.

## Features

- **Live Matchmaking**: Instant opponent pairing with ELO-based ranking
- **Real-time Code Sync**: Watch opponent code as they type
- **Secure Sandbox**: Isolated code execution with strict resource limits
- **Multiple Challenges**: Diverse problem set with varying difficulty levels
- **Instant Feedback**: Test results streamed as code is submitted
- **Battle History**: Track your wins, losses, and rating progression

## Tech Stack

**Backend**
- FastAPI + Socket.io for real-time communication
- Python subprocess sandbox with security constraints
- Async/await architecture for high concurrency

**Frontend**
- React 18 with hooks
- Monaco Editor for Python syntax highlighting
- Socket.io client for WebSocket communication

**Deployment**
- Docker containerization
- Production-grade ASGI server (Uvicorn)

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 16+
- Docker (optional)

### Local Development

**Backend**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Docker Deployment

```bash
docker-compose up --build
```

Backend runs on `http://localhost:8000`
Frontend runs on `http://localhost:3000`

## API Endpoints

### REST
- `GET /api/challenges` - List all challenges
- `GET /api/challenges/{id}` - Challenge details
- `GET /api/health` - Server health status
- `GET /api/queue-info` - Current queue status

### WebSocket Events
- `register_user` - Register and authenticate
- `join_queue` - Enter matchmaking queue
- `leave_queue` - Exit queue
- `submit_code` - Submit solution for testing
- `sync_code` - Stream code changes to opponent
- `match_found` - Battle opponent found
- `battle_complete` - Battle concluded with winner

## Security

- **Import Restrictions**: Forbidden modules (os, sys, subprocess, etc.)
- **Resource Limits**: CPU (2s), Memory (128MB), File size (10MB)
- **Code Length Limit**: 50KB maximum per submission
- **Process Isolation**: Subprocess execution with strict constraints

## Project Structure

```
python-duel/
├── backend/
│   ├── src/
│   │   ├── api/
│   │   │   └── main.py
│   │   ├── sandbox/
│   │   │   └── sandbox.py
│   │   ├── challenges/
│   │   └── services/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   └── App.jsx
│   ├── package.json
│   └── index.html
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Performance

- Supports 1000+ concurrent users
- <100ms WebSocket latency
- Automatic connection recovery
- Queue-based matchmaking with configurable parameters

## License

MIT
