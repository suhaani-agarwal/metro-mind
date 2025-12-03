from fastapi import APIRouter, UploadFile, File
from services.file_parser import parse_uploaded_files
from schemas import DepotMetadata
from utils import save_uploaded_files, build_final_unified_schema, save_depot_data
from config import UNIFIED_JSON_PATH, HISTORICAL_JSON_PATH
import json
from datetime import datetime

router = APIRouter()

from pydantic import BaseModel

class DepotDeleteRequest(BaseModel):
    name: str

@router.get("/depot")
async def get_all_depots():
    """Get all depots"""
    from utils import get_depots
    return get_depots()

@router.post("/depot")
async def save_depot_metadata(depot: DepotMetadata):
    """Save a new depot"""
    saved_depot = save_depot_data(depot.dict())
    return {"message": "Depot added successfully ✅", "depot": saved_depot}

@router.delete("/depot")
async def remove_depot(request: DepotDeleteRequest):
    """Delete a depot by name"""
    from utils import delete_depot
    success = delete_depot(request.name)
    if success:
        return {"message": "Depot deleted successfully"}
    return {"error": "Depot not found"}, 404

@router.post("/upload")
async def upload_historical_files(
    fitness: UploadFile = File(None),
    jobcards: UploadFile = File(None),
    branding: UploadFile = File(None),
    mileage: UploadFile = File(None),
    cleaning: UploadFile = File(None),
    stabling: UploadFile = File(None)
):
    files_dict = {
        "fitness": fitness,
        "jobcards": jobcards,
        "branding": branding,
        "mileage": mileage,
        "cleaning": cleaning,
        "stabling": stabling,
    }
    
    uploaded_files = {k: v for k, v in files_dict.items() if v is not None and v.filename}
    
    if not uploaded_files:
        return {"message": "No files uploaded"}
    
    # 1️⃣ Save files to uploads folder
    saved_paths = save_uploaded_files(uploaded_files)

    # 2️⃣ Parse the files using existing file_parser (NO CHANGES)
    parsed_data = parse_uploaded_files(saved_paths)

    # 3️⃣ Build final unified JSON schema using transformed data
    final_data = build_final_unified_schema(parsed_data)

    # 4️⃣ Save snapshot in historical_data.json
    today = datetime.now().strftime("%Y-%m-%d")
    snapshot = {
        "date": today,
        "source": "onboarding",
        "data": final_data  # This is now in the new format
    }
    
    try:
        with open(HISTORICAL_JSON_PATH, "r") as f:
            historical = json.load(f)
    except FileNotFoundError:
        historical = []

    historical.append(snapshot)
    with open(HISTORICAL_JSON_PATH, "w") as f:
        json.dump(historical, f, indent=2)
    
    return {"message": "Unified + Historical JSON initialized ✅", "trains_count": len(final_data.get("trains", []))}