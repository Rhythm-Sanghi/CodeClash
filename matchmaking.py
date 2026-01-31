from dataclasses import dataclass, field
from typing import Dict, List, Optional
from enum import Enum
import uuid
from datetime import datetime


class BattleStatus(Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


@dataclass
class Player:
    user_id: str
    username: str
    elo_rating: int = 1000
    queue_time: datetime = field(default_factory=datetime.utcnow)
    socket_id: str = ""
    
    def __hash__(self):
        return hash(self.user_id)
    
    def __eq__(self, other):
        if isinstance(other, Player):
            return self.user_id == other.user_id
        return False


@dataclass
class BattleRoom:
    room_id: str
    player1: Player
    player2: Player
    challenge_id: str
    status: BattleStatus = BattleStatus.WAITING
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    player1_code: str = ""
    player2_code: str = ""
    player1_tests_passed: int = 0
    player2_tests_passed: int = 0
    total_tests: int = 0
    
    winner_id: Optional[str] = None
    
    def to_dict(self) -> dict:
        return {
            "room_id": self.room_id,
            "player1": {
                "user_id": self.player1.user_id,
                "username": self.player1.username,
                "elo_rating": self.player1.elo_rating,
                "code": self.player1_code,
                "tests_passed": self.player1_tests_passed,
            },
            "player2": {
                "user_id": self.player2.user_id,
                "username": self.player2.username,
                "elo_rating": self.player2.elo_rating,
                "code": self.player2_code,
                "tests_passed": self.player2_tests_passed,
            },
            "challenge_id": self.challenge_id,
            "status": self.status.value,
            "total_tests": self.total_tests,
            "winner_id": self.winner_id,
            "created_at": self.created_at.isoformat(),
        }


class MatchmakingQueue:
    
    def __init__(self):
        self.queue: List[Player] = []
        self.battle_rooms: Dict[str, BattleRoom] = {}
        self.player_to_room: Dict[str, str] = {}
        self.players_in_queue: Dict[str, Player] = {}
    
    def add_to_queue(self, user_id: str, username: str, elo_rating: int = 1000, 
                     socket_id: str = "") -> Player:
        if user_id in self.players_in_queue:
            player = self.players_in_queue[user_id]
            player.socket_id = socket_id
            return player
        
        player = Player(
            user_id=user_id,
            username=username,
            elo_rating=elo_rating,
            socket_id=socket_id
        )
        
        self.queue.append(player)
        self.players_in_queue[user_id] = player
        
        return player
    
    def remove_from_queue(self, user_id: str) -> Optional[Player]:
        if user_id in self.players_in_queue:
            player = self.players_in_queue[user_id]
            self.queue.remove(player)
            del self.players_in_queue[user_id]
            return player
        
        return None
    
    def find_best_match(self, player: Player, elo_tolerance: int = 200) -> Optional[Player]:
        if len(self.queue) < 2:
            return None
        
        remaining_players = [p for p in self.queue if p.user_id != player.user_id]
        
        if not remaining_players:
            return None
        
        best_match = None
        closest_diff = float('inf')
        
        for candidate in remaining_players:
            elo_diff = abs(player.elo_rating - candidate.elo_rating)
            
            if elo_diff < closest_diff and elo_diff <= elo_tolerance:
                closest_diff = elo_diff
                best_match = candidate
        
        if best_match is None and remaining_players:
            best_match = min(remaining_players, 
                           key=lambda p: abs(player.elo_rating - p.elo_rating))
        
        return best_match
    
    def attempt_matchmaking(self, challenge_id: str) -> Optional[BattleRoom]:
        if len(self.queue) < 2:
            return None
        
        player1 = self.queue[0]
        player2 = self.find_best_match(player1)
        
        if player2 is None:
            return None
        
        battle_room = self._create_battle_room(player1, player2, challenge_id)
        
        self.remove_from_queue(player1.user_id)
        self.remove_from_queue(player2.user_id)
        
        self.battle_rooms[battle_room.room_id] = battle_room
        self.player_to_room[player1.user_id] = battle_room.room_id
        self.player_to_room[player2.user_id] = battle_room.room_id
        
        return battle_room
    
    def _create_battle_room(self, player1: Player, player2: Player, 
                           challenge_id: str) -> BattleRoom:
        room_id = f"room_{uuid.uuid4().hex[:12]}"
        
        battle_room = BattleRoom(
            room_id=room_id,
            player1=player1,
            player2=player2,
            challenge_id=challenge_id,
            status=BattleStatus.WAITING
        )
        
        return battle_room
    
    def get_battle_room(self, room_id: str) -> Optional[BattleRoom]:
        return self.battle_rooms.get(room_id)
    
    def get_player_battle_room(self, user_id: str) -> Optional[BattleRoom]:
        room_id = self.player_to_room.get(user_id)
        if room_id:
            return self.get_battle_room(room_id)
        return None
    
    def update_player_code(self, room_id: str, player_id: str, code: str) -> bool:
        battle_room = self.get_battle_room(room_id)
        if not battle_room:
            return False
        
        if player_id == battle_room.player1.user_id:
            battle_room.player1_code = code
        elif player_id == battle_room.player2.user_id:
            battle_room.player2_code = code
        else:
            return False
        
        return True
    
    def update_test_results(self, room_id: str, player_id: str, 
                          tests_passed: int, total_tests: int) -> bool:
        battle_room = self.get_battle_room(room_id)
        if not battle_room:
            return False
        
        battle_room.total_tests = total_tests
        
        if player_id == battle_room.player1.user_id:
            battle_room.player1_tests_passed = tests_passed
        elif player_id == battle_room.player2.user_id:
            battle_room.player2_tests_passed = tests_passed
        else:
            return False
        
        if tests_passed == total_tests:
            self._end_battle(room_id, player_id)
        
        return True
    
    def _end_battle(self, room_id: str, winner_id: str):
        battle_room = self.get_battle_room(room_id)
        if not battle_room:
            return
        
        battle_room.status = BattleStatus.COMPLETED
        battle_room.winner_id = winner_id
        battle_room.completed_at = datetime.utcnow()
    
    def start_battle(self, room_id: str) -> bool:
        battle_room = self.get_battle_room(room_id)
        if not battle_room:
            return False
        
        battle_room.status = BattleStatus.IN_PROGRESS
        battle_room.started_at = datetime.utcnow()
        return True
    
    def get_queue_size(self) -> int:
        return len(self.queue)
    
    def get_queue_info(self) -> dict:
        return {
            "queue_size": len(self.queue),
            "active_battles": len(self.battle_rooms),
            "average_elo": (
                sum(p.elo_rating for p in self.queue) / len(self.queue)
                if self.queue else 0
            ),
        }


matchmaking_system = MatchmakingQueue()
