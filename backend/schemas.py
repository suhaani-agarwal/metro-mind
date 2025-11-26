from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class DepotMetadata(BaseModel):
    name: str
    location: str
    cleaning_bays: int | None = None
    maintenance_bays: int
    stabling_tracks: int
    inspection_lines: int
    washing_lines: int
    lifting_bays: int | None = None
    max_capacity_trains: int
    operational_hours: str

class DepotDeepCleaningInput(BaseModel):
    manual_labour_available_today: int

class FitnessCertificateModel(BaseModel):
    department: str
    issue_date: str
    expiry_date: str
    status: str

class JobCardModel(BaseModel):
    id: str
    description: str
    open_date: str
    criticality: str
    estimated_hours: float

# NEW: Schema for frontend branding format (what the frontend actually sends)
class FrontendBrandingModel(BaseModel):
    advertiser: str
    priority: str
    exposure_hours_needed: int

class BrandingContractModel(BaseModel):
    brand: str
    total_exposure_hours: int
    completed_hours: int
    deadline: str
    priority: int
    audience_profile: str  
    preferred_times: str

class BrandingAppendModel(BaseModel):
    train_id: str
    branding: FrontendBrandingModel

class CleaningModel(BaseModel):
    status: str
    type: str
    scheduled_at: str
    manual_labour_count: int
    bay_assigned: str

class StablingModel(BaseModel):
    bay: str | None
    position: str | None
    reception: bool

class FitnessCertificateUpdate(BaseModel):
    issued_at: Optional[str] = None
    valid_until: Optional[str] = None
    status: Optional[str] = None
    renew_rolling_stock: bool = False
    renew_signalling: bool = False
    renew_telecom: bool = False

class BrandingUpdate(BaseModel):
    advertiser: str
    priority: str
    exposure_hours_needed: int

class NightlyUpdateModel(BaseModel):
    train_id: str
    fitness_certificates: Optional[FitnessCertificateUpdate] = None
    branding: Optional[FrontendBrandingModel] = None
    cleaning: Optional[CleaningModel] = None
    stabling: Optional[StablingModel] = None

class ParkingAssignmentModel(BaseModel):
    train_id: str
    bay: str
    position: int
    status: str = "parking"
    arrival_time: Optional[str] = None
    departure_time: Optional[str] = None
    notes: Optional[str] = None

class TrackModel(BaseModel):
    id: str
    capacity: int
    current_trains: List[str]

class DepotLayoutModel(BaseModel):
    parking_tracks: List[TrackModel]
    ibl_bays: List[str]
    exit_points: List[str]
    connections: Dict[str, List[str]]