from fastapi import FastAPI, HTTPException
import socketio
from contextlib import asynccontextmanager
import asyncio
from typing import Dict
from datetime import datetime
import logging

from challenges import get_challenge, CHALLENGES
from matchmaking import matchmaking_system, BattleStatus
from sandbox import execute_code

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins=['https://code-clash-aqi2.onrender.com'],
    ping_timeout=60,
    ping_interval=25,
    logger=True,
    engineio_logger=True,
)

connected_users: Dict[str, dict] = {}
socket_to_user: Dict[str, str] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Python-Duel server started")
    yield
    logger.info("Python-Duel server shutting down")


app = FastAPI(
    title="Python-Duel",
    description="Real-time 1v1 competitive Python coding platform",
    version="1.0.0",
    lifespan=lifespan
)

app.mount("/socket.io", socketio.ASGIApp(sio))


@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")
    await sio.emit('connection_response', {'data': 'Connected to server'}, to=sid)


@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")
    user_id = socket_to_user.get(sid)
    if user_id:
        matchmaking_system.remove_from_queue(user_id)
        if user_id in connected_users:
            del connected_users[user_id]
        del socket_to_user[sid]


@sio.event
async def register_user(sid, data):
    try:
        user_id = data.get('user_id')
        username = data.get('username')
        elo_rating = data.get('elo_rating', 1000)

        if not user_id or not username:
            await sio.emit('error', {'message': 'Missing user_id or username'}, to=sid)
            return

        connected_users[user_id] = {
            'socket_id': sid,
            'username': username,
            'elo_rating': elo_rating,
            'connected_at': datetime.utcnow().isoformat()
        }
        socket_to_user[sid] = user_id

        await sio.emit('user_registered', {
            'user_id': user_id,
            'username': username,
            'message': 'User registered successfully'
        }, to=sid)

        logger.info(f"User registered: {user_id} ({username})")

    except Exception as e:
        logger.error(f"Error in register_user: {e}")
        await sio.emit('error', {'message': str(e)}, to=sid)


@sio.event
async def join_queue(sid, data):
    try:
        user_id = data.get('user_id')
        challenge_id = data.get('challenge_id', 'palindrome')

        if user_id not in connected_users:
            await sio.emit('error', {'message': 'User not registered'}, to=sid)
            return

        user_info = connected_users[user_id]

        player = matchmaking_system.add_to_queue(
            user_id=user_id,
            username=user_info['username'],
            elo_rating=user_info['elo_rating'],
            socket_id=sid
        )

        await sio.emit('queue_joined', {
            'user_id': user_id,
            'queue_position': matchmaking_system.queue.index(player) + 1,
            'queue_size': matchmaking_system.get_queue_size(),
            'message': 'Joined matchmaking queue'
        }, to=sid)

        logger.info(f"User {user_id} joined queue. Queue size: {matchmaking_system.get_queue_size()}")

        await attempt_matchmaking(challenge_id)

    except Exception as e:
        logger.error(f"Error in join_queue: {e}")
        await sio.emit('error', {'message': str(e)}, to=sid)


@sio.event
async def leave_queue(sid, data):
    try:
        user_id = data.get('user_id')
        matchmaking_system.remove_from_queue(user_id)

        await sio.emit('queue_left', {
            'user_id': user_id,
            'message': 'Left matchmaking queue'
        }, to=sid)

        logger.info(f"User {user_id} left queue")

    except Exception as e:
        logger.error(f"Error in leave_queue: {e}")
        await sio.emit('error', {'message': str(e)}, to=sid)


async def attempt_matchmaking(challenge_id: str):
    while matchmaking_system.get_queue_size() >= 2:
        battle_room = matchmaking_system.attempt_matchmaking(challenge_id)

        if not battle_room:
            break

        matchmaking_system.start_battle(battle_room.room_id)

        challenge = get_challenge(challenge_id)

        room_data = {
            'room_id': battle_room.room_id,
            'opponent': None,
            'challenge': {
                'id': challenge.id,
                'name': challenge.name,
                'description': challenge.description,
                'difficulty': challenge.difficulty,
                'time_limit': challenge.time_limit,
                'function_signature': challenge.function_signature,
                'test_count': len(challenge.test_cases),
            },
            'message': 'Match found! Battle starting in 3 seconds...'
        }

        p1_data = room_data.copy()
        p1_data['opponent'] = {
            'username': battle_room.player2.username,
            'elo_rating': battle_room.player2.elo_rating
        }
        await sio.emit('match_found', p1_data, to=battle_room.player1.socket_id)

        p2_data = room_data.copy()
        p2_data['opponent'] = {
            'username': battle_room.player1.username,
            'elo_rating': battle_room.player1.elo_rating
        }
        await sio.emit('match_found', p2_data, to=battle_room.player2.socket_id)

        logger.info(f"Match created: {battle_room.player1.username} vs {battle_room.player2.username} "
                   f"(Room: {battle_room.room_id})")


@sio.event
async def submit_code(sid, data):
    try:
        user_id = data.get('user_id')
        room_id = data.get('room_id')
        code = data.get('code', '')

        if not room_id:
            await sio.emit('error', {'message': 'Invalid room_id'}, to=sid)
            return

        battle_room = matchmaking_system.get_battle_room(room_id)
        if not battle_room:
            await sio.emit('error', {'message': 'Battle room not found'}, to=sid)
            return

        matchmaking_system.update_player_code(room_id, user_id, code)

        challenge = get_challenge(battle_room.challenge_id)
        if not challenge:
            await sio.emit('error', {'message': 'Challenge not found'}, to=sid)
            return

        test_cases = [
            {
                'input': tc.input_data if not isinstance(tc.input_data, tuple) else tc.input_data,
                'expected': tc.expected_output
            }
            for tc in challenge.test_cases
        ]

        func_signature = challenge.function_signature
        func_name = func_signature.split('(')[0].replace('def ', '').strip()

        execution_result = execute_code(code, test_cases, func_name, timeout=5)

        matchmaking_system.update_test_results(
            room_id, user_id,
            execution_result.passed_tests,
            execution_result.total_tests
        )

        submission_result = {
            'user_id': user_id,
            'room_id': room_id,
            'passed_tests': execution_result.passed_tests,
            'total_tests': execution_result.total_tests,
            'success': execution_result.success,
            'test_results': execution_result.test_results,
            'error': execution_result.error
        }

        await sio.emit('code_submission', submission_result, to=room_id)

        if execution_result.passed_tests == execution_result.total_tests:
            battle_room = matchmaking_system.get_battle_room(room_id)

            winner = battle_room.player1 if user_id == battle_room.player1.user_id else battle_room.player2
            loser = battle_room.player2 if user_id == battle_room.player1.user_id else battle_room.player1

            winner_data = {
                'winner_username': winner.username,
                'loser_username': loser.username,
                'winner_id': winner.user_id,
                'message': f'{winner.username} has won the battle!'
            }

            await sio.emit('battle_complete', winner_data, to=room_id)
            logger.info(f"Battle complete: {winner.username} won (Room: {room_id})")

        logger.info(f"Code submission: {user_id} - {execution_result.passed_tests}/{execution_result.total_tests} tests passed")

    except Exception as e:
        logger.error(f"Error in submit_code: {e}")
        await sio.emit('error', {'message': str(e)}, to=sid)


@sio.event
async def sync_code(sid, data):
    try:
        user_id = data.get('user_id')
        room_id = data.get('room_id')
        code = data.get('code', '')

        battle_room = matchmaking_system.get_battle_room(room_id)
        if not battle_room:
            return

        matchmaking_system.update_player_code(room_id, user_id, code)

        await sio.emit('opponent_code_update', {
            'code': code,
            'user_id': user_id
        }, to=room_id, skip_sid=sid)

    except Exception as e:
        logger.error(f"Error in sync_code: {e}")


@app.get("/")
async def root():
    return {
        "status": "running",
        "service": "Python-Duel Backend",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }


@app.get("/api/challenges")
async def get_challenges():
    challenges = []
    for challenge_id, challenge in CHALLENGES.items():
        challenges.append({
            'id': challenge.id,
            'name': challenge.name,
            'description': challenge.description,
            'difficulty': challenge.difficulty,
            'time_limit': challenge.time_limit,
            'test_count': len(challenge.test_cases),
        })
    return {"challenges": challenges}


@app.get("/api/challenges/{challenge_id}")
async def get_challenge_detail(challenge_id: str):
    challenge = get_challenge(challenge_id)
    if not challenge:
        raise HTTPException(status_code=404, detail="Challenge not found")

    return {
        'id': challenge.id,
        'name': challenge.name,
        'description': challenge.description,
        'difficulty': challenge.difficulty,
        'time_limit': challenge.time_limit,
        'function_signature': challenge.function_signature,
        'example_code': challenge.example_code,
        'test_count': len(challenge.test_cases),
    }


@app.get("/api/queue-info")
async def queue_info():
    return matchmaking_system.get_queue_info()


@app.get("/api/users/{user_id}")
async def get_user_info(user_id: str):
    if user_id not in connected_users:
        raise HTTPException(status_code=404, detail="User not found or not connected")

    return connected_users[user_id]


@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "connected_users": len(connected_users),
        "queue_size": matchmaking_system.get_queue_size(),
        "active_battles": len(matchmaking_system.battle_rooms),
        "timestamp": datetime.utcnow().isoformat()
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )
