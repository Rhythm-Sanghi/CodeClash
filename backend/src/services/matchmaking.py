"""
Matchmaking queue system for pairing users into battle rooms.
Handles user queueing, pairing, and battle room creation.
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from enum import Enum
import uuid
from datetime import datetime
import asyncio


class BattleStatus(Enum):
    """Status of a battle room."""
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


@dataclass
class Player:
    """Represents a player in the queue."""
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
    """Represents a 1v1 battle room."""
    room_id: str
    player1: Player
    player2: Player
    challenge_id: str
    status: BattleStatus = BattleStatus.WAITING
    created_at: datetime = field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    # Player code and progress
    player1_code: str = ""
    player2_code: str = ""
    player1_tests_passed: int = 0
    player2_tests_passed: int = 0
    total_tests: int = 0
    
    # Winner info
    winner_id: Optional[str] = None
    
    def to_dict(self) -> dict:
        """Convert battle room to dictionary."""
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
    """
    Manages the matchmaking queue and battle room creation.
    Uses ELO-based ranking for fair pairings.
    """
    
    def __init__(self):
        self.queue: List[Player] = []
        self.battle_rooms: Dict[str, BattleRoom] = {}
        self.player_to_room: Dict[str, str] = {}  # user_id -> room_id
        self.players_in_queue: Dict[str, Player] = {}  # user_id -> Player
    
    def add_to_queue(self, user_id: str, username: str, elo_rating: int = 1000, 
                     socket_id: str = "") -> Player:
        """
        Add a player to the matchmaking queue.
        Returns the Player object.
        """
        # Check if player already in queue
        if user_id in self.players_in_queue:
            player = self.players_in_queue[user_id]
            player.socket_id = socket_id  # Update socket in case of reconnect
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
        """Remove a player from the queue."""
        if user_id in self.players_in_queue:
            player = self.players_in_queue[user_id]
            self.queue.remove(player)
            del self.players_in_queue[user_id]
            return player
        
        return None
    
    def find_best_match(self, player: Player, elo_tolerance: int = 200) -> Optional[Player]:
        """
        Find the best opponent for a player based on ELO rating.
        Returns the opponent player or None if no suitable match found.
        """
        if len(self.queue) < 2:
            return None
        
        # Remove the searching player from queue temporarily
        remaining_players = [p for p in self.queue if p.user_id != player.user_id]
        
        if not remaining_players:
            return None
        
        # Find player with closest ELO rating within tolerance
        best_match = None
        closest_diff = float('inf')
        
        for candidate in remaining_players:
            elo_diff = abs(player.elo_rating - candidate.elo_rating)
            
            if elo_diff < closest_diff and elo_diff <= elo_tolerance:
                closest_diff = elo_diff
                best_match = candidate
        
        # If no match within tolerance, pick closest one
        if best_match is None and remaining_players:
            best_match = min(remaining_players, 
                           key=lambda p: abs(player.elo_rating - p.elo_rating))
        
        return best_match
    
    def attempt_matchmaking(self, challenge_id: str) -> Optional[BattleRoom]:
        """
        Attempt to create a match for the longest waiting player.
        Returns BattleRoom if a match is made, None otherwise.
        """
        if len(self.queue) < 2:
            return None
        
        # Get the player who's been waiting the longest
        player1 = self.queue[0]
        
        # Find best opponent
        player2 = self.find_best_match(player1)
        
        if player2 is None:
            return None
        
        # Create battle room
        battle_room = self._create_battle_room(player1, player2, challenge_id)
        
        # Remove both players from queue
        self.remove_from_queue(player1.user_id)
        self.remove_from_queue(player2.user_id)
        
        # Register battle room
        self.battle_rooms[battle_room.room_id] = battle_room
        self.player_to_room[player1.user_id] = battle_room.room_id
        self.player_to_room[player2.user_id] = battle_room.room_id
        
        return battle_room
    
    def _create_battle_room(self, player1: Player, player2: Player, 
                           challenge_id: str) -> BattleRoom:
        """Create a new battle room."""
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
        """Retrieve a battle room by ID."""
        return self.battle_rooms.get(room_id)
    
    def get_player_battle_room(self, user_id: str) -> Optional[BattleRoom]:
        """Get the battle room for a specific player."""
        room_id = self.player_to_room.get(user_id)
        if room_id:
            return self.get_battle_room(room_id)
        return None
    
    def update_player_code(self, room_id: str, player_id: str, code: str) -> bool:
        """Update a player's code in a battle room."""
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
        """Update test results for a player."""
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
        
        # Check if someone won
        if tests_passed == total_tests:
            self._end_battle(room_id, player_id)
        
        return True
    
    def _end_battle(self, room_id: str, winner_id: str):
        """End a battle and mark the winner."""
        battle_room = self.get_battle_room(room_id)
        if not battle_room:
            return
        
        battle_room.status = BattleStatus.COMPLETED
        battle_room.winner_id = winner_id
        battle_room.completed_at = datetime.utcnow()
    
    def start_battle(self, room_id: str) -> bool:
        """Start a battle room."""
        battle_room = self.get_battle_room(room_id)
        if not battle_room:
            return False
        
        battle_room.status = BattleStatus.IN_PROGRESS
        battle_room.started_at = datetime.utcnow()
        return True
    
    def get_queue_size(self) -> int:
        """Get current queue size."""
        return len(self.queue)
    
    def get_queue_info(self) -> dict:
        """Get queue statistics."""
        return {
            "queue_size": len(self.queue),
            "active_battles": len(self.battle_rooms),
            "average_elo": (
                sum(p.elo_rating for p in self.queue) / len(self.queue)
                if self.queue else 0
            ),
        }


# Global matchmaking instance
matchmaking_system = MatchmakingQueue()
