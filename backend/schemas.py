from pydantic import BaseModel

class DepotMetadata(BaseModel):
    name: str
    location: str
    cleaning_bays: int
    maintenance_bays: int
    stabling_tracks: int
    inspection_lines: int
    washing_lines: int
    lifting_bays: int
    max_capacity_trains: int
    operational_hours: str  # e.g., "05:00-23:00"

class FitnessModel(BaseModel):
    issued_at: str
    valid_until: str
    status: str

class BrandingModel(BaseModel):
    advertiser: str
    priority: str
    exposure_hours_needed: int

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

class NightlyUpdateModel(BaseModel):
    train_id: str
    fitness_certificates: FitnessModel | None = None
    branding: BrandingModel
    cleaning: CleaningModel
    stabling: StablingModel