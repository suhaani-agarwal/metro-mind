from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from .models import TrainStatus, JobCardCriticality

class ReadinessScore(BaseModel):
    train_id: str
    score: float
    breakdown: Dict[str, float]  # scores for each constraint
    details: Dict[str, Any]  # detailed explanations

class CleaningAssignment(BaseModel):
    train_id: str
    start_time: str
    end_time: str
    crew_assigned: int
    priority: int
    reason: str

class ParkingAssignment(BaseModel):
    train_id: str
    track_id: str
    position_in_track: int  # 1 or 2
    moves_required: int  # number of shunting moves needed
    shunting_path: List[str]  # path to follow for shunting

class OptimizationRequest(BaseModel):
    date: str
    required_trains: int = 18
    standby_trains: int = 4
    cleaning_crew_available: int = 3

class OptimizationResponse(BaseModel):
    readiness_scores: List[ReadinessScore]
    cleaning_assignments: List[CleaningAssignment]
    parking_assignments: List[ParkingAssignment]
    trains_to_ibl: List[str]
    trains_to_service: List[str]
    trains_to_standby: List[str]
    explanation: Dict[str, Any]
    metadata: Dict[str, Any]
    total_shunting_moves: int