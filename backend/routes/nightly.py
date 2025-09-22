from fastapi import APIRouter, HTTPException
from backend.schemas import NightlyUpdateModel
from backend.config import UNIFIED_JSON_PATH, HISTORICAL_JSON_PATH
import json
from datetime import datetime

router = APIRouter()

@router.get("/trains")
def get_trains():
    try:
        with open(UNIFIED_JSON_PATH, "r") as f:
            data = json.load(f)
        trains = [train["train_id"] for train in data.get("data", [])]
        return {"trains": trains}
    except FileNotFoundError:
        return {"trains": []}

@router.get("/train/{train_id}/fitness")
def get_fitness(train_id: str):
    try:
        with open(UNIFIED_JSON_PATH, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Unified JSON not found")

    for train in data.get("data", []):
        if train["train_id"] == train_id:
            fitness_data = train.get("fitness_certificates", {})
            # Convert old format to new format for compatibility
            if "Rolling Stock Valid" in fitness_data:
                # Convert old format to new format
                return {
                    "issued_at": "2025-01-01T00:00:00",  # Default value
                    "valid_until": fitness_data.get("Rolling Stock Valid", "2025-01-01"),
                    "status": "valid" if fitness_data.get("Rolling Stock Valid", "2025-01-01") >= datetime.now().strftime("%Y-%m-%d") else "expired"
                }
            return fitness_data

    raise HTTPException(status_code=404, detail=f"Train {train_id} not found")


@router.post("/update/train")
def update_train_data(update: NightlyUpdateModel):
    try:
        with open(UNIFIED_JSON_PATH, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        return {"error": "Unified JSON not found."}

    today = datetime.now().strftime("%Y-%m-%d")
    updated_train = None

    for train in data.get("data", []):
        if train["train_id"] == update.train_id:
            # --- Fitness certificate validation ---
            if update.fitness_certificates:
                prev_valid_until = train.get("fitness_certificates", {}).get("valid_until")
                if prev_valid_until and datetime.fromisoformat(prev_valid_until) >= datetime.now():
                    # still valid → don’t overwrite
                    pass
                else:
                    train["fitness_certificates"] = update.fitness_certificates.dict()

            # --- Branding validation ---
            if update.branding.advertiser:
                train["branding"] = update.branding.dict()

            # --- Cleaning validation ---
            if update.cleaning.type in ["interior", "exterior"]:
                train["cleaning"] = update.cleaning.dict()
            else:
                raise HTTPException(status_code=400, detail="Invalid cleaning type. Must be 'interior' or 'exterior'.")

            # --- Stabling validation ---
            if update.stabling.reception and update.stabling.bay:
                raise HTTPException(status_code=400, detail="Reception and Bay cannot both be set.")
            train["stabling"] = update.stabling.dict()

            train["date"] = today
            updated_train = train
            break

    if not updated_train:
        # New train entry
        if update.stabling.reception and update.stabling.bay:
            raise HTTPException(status_code=400, detail="Reception and Bay cannot both be set.")

        updated_train = {
            "train_id": update.train_id,
            "date": today,
            "fitness_certificates": update.fitness_certificates.dict() if update.fitness_certificates else {},
            "branding": update.branding.dict() if update.branding.advertiser else {},
            "cleaning": update.cleaning.dict() if update.cleaning.type in ["interior", "exterior"] else {},
            "stabling": update.stabling.dict(),
            "job_cards": [],
            "mileage": {},
            "depot": {}
        }
        data["data"].append(updated_train)

    # Save unified.json
    with open(UNIFIED_JSON_PATH, "w") as f:
        json.dump(data, f, indent=2)

    # Save snapshot in historical.json
    snapshot = {
        "date": today,
        "source": "nightly",
        "train_id": update.train_id,
        "data": updated_train
    }

    try:
        with open(HISTORICAL_JSON_PATH, "r") as f:
            historical = json.load(f)
    except FileNotFoundError:
        historical = []

    historical.append(snapshot)
    with open(HISTORICAL_JSON_PATH, "w") as f:
        json.dump(historical, f, indent=2)

    return {"message": f"Train {update.train_id} updated successfully."}

