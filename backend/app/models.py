from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from enum import Enum
from pydantic import BaseModel, Field

class FitnessCertificateStatus(str, Enum):
    VALID = "valid"
    EXPIRED = "expired"

class Department(str, Enum):
    ROLLING_STOCK = "rolling_stock"
    SIGNALLING = "signalling"
    TELECOM = "telecom"

class JobCardCriticality(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TrainStatus(str, Enum):
    IN_SERVICE = "in_service"
    STANDBY = "standby"
    IBL = "ibl"
    CLEANING = "cleaning"
    PARKING = "parking"

class FitnessCertificate(BaseModel):
    department: Department
    issue_date: str
    expiry_date: str
    status: FitnessCertificateStatus

class JobCard(BaseModel):
    id: str
    description: str
    open_date: str
    criticality: JobCardCriticality
    estimated_hours: float

class BrandingContract(BaseModel):
    brand: str
    total_exposure_hours: float
    completed_hours: float
    deadline: str
    priority: int  # 1-10, 10 being highest priority

class MaintenanceThresholds(BaseModel):
    bogie: float  # km
    brake_pad: float  # km
    hvac: float  # km

class Train(BaseModel):
    id: str
    fitness_certificates: Dict[Department, FitnessCertificate]
    job_cards: List[JobCard]
    branding_contracts: List[BrandingContract]
    current_mileage: Dict[str, float]  # bogie, brake_pad, hvac
    maintenance_thresholds: MaintenanceThresholds
    last_deep_cleaning: str
    cleaning_duration: float = 3  # hours
    status: TrainStatus
    current_position: str  # Current bay position

class CleaningSlot(BaseModel):
    id: str
    available: bool
    available_from: str

class ParkingTrack(BaseModel):
    id: str
    capacity: int = 2
    current_trains: List[str]  # Train IDs currently in this track

class DepotLayout(BaseModel):
    parking_tracks: List[ParkingTrack]
    ibl_bays: List[str]
    connections: Dict[str, List[str]]  # adjacency list for bay connections
    exit_points: List[str]  # Points where trains exit for service

class OptimizationInput(BaseModel):
    trains: List[Train]
    cleaning_slots: List[CleaningSlot]
    depot_layout: DepotLayout
    date: str
    required_trains: int  # number of trains needed for service
    standby_trains: int  # number of trains needed on standby
    cleaning_crew_available: int  # number of cleaning crews available



# shivangi
class ScheduleRequest(BaseModel):
    parking: Dict[str, Any] = Field(..., description="Parking bay assignments from Layer 1")
    readiness: List[Dict[str, Any]] = Field(..., description="Train readiness scores and details")
    ads: List[Dict[str, Any]] = Field([], description="Advertisement data (kept for compatibility but not used in optimization)")
    service_day: Optional[str] = Field("weekday", description="Service day type")
    service_date: Optional[str] = Field(None, description="Target service date (YYYY-MM-DD)")

class OptimizationParams(BaseModel):
    max_solver_time: Optional[int] = Field(60, description="Maximum solver time in seconds")
    prioritize_readiness: Optional[bool] = Field(True, description="Prioritize high-readiness trains")
    minimize_shunting: Optional[bool] = Field(True, description="Minimize shunting operations")
    readiness_weight: Optional[int] = Field(1000, description="Weight for readiness optimization")
    shunting_penalty_weight: Optional[int] = Field(5000, description="Weight for shunting penalty")
    position_bonus_weight: Optional[int] = Field(800, description="Weight for position bonus")
    # Deprecated parameters (kept for compatibility)
    enable_ad_optimization: Optional[bool] = Field(False, description="DEPRECATED: Ad optimization removed")
    demographic_weighting: Optional[bool] = Field(False, description="DEPRECATED: Demographic weighting removed")
    ad_revenue_weight: Optional[int] = Field(0, description="DEPRECATED: Ad revenue weight (not used)")
    demographic_weight: Optional[int] = Field(0, description="DEPRECATED: Demographic weight (not used)")

class SwapAnalysisRequest(BaseModel):
    scheduled_train_id: str = Field(..., description="ID of currently scheduled train")
    standby_train_id: str = Field(..., description="ID of standby train to swap in")
    gemini_api_key: Optional[str] = Field(None, description="Optional Gemini API key for AI analysis")