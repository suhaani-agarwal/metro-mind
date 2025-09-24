from fastapi import APIRouter, HTTPException
from schemas import NightlyUpdateModel, BrandingAppendModel, DepotDeepCleaningInput, ParkingAssignmentModel
from config import UNIFIED_JSON_PATH, HISTORICAL_JSON_PATH, DEPOT_JSON_PATH, PARKING_JSON_PATH
import json
import os
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
            if update.branding and getattr(update.branding, "advertiser", None):
                if isinstance(train.get("branding"), list):
                    train["branding"].append(update.branding.dict())
                else:
                    train["branding"] = update.branding.dict()

            # --- Cleaning validation ---
            if update.cleaning:
                if update.cleaning.type in ["interior", "exterior"]:
                    train["cleaning"] = update.cleaning.dict()
                else:
                    raise HTTPException(status_code=400, detail="Invalid cleaning type. Must be 'interior' or 'exterior'.")

            # --- Stabling validation ---
            if update.stabling:
                if update.stabling.reception and update.stabling.bay:
                    raise HTTPException(status_code=400, detail="Reception and Bay cannot both be set.")
                train["stabling"] = update.stabling.dict()

            train["date"] = today
            updated_train = train
            break

    if not updated_train:
        # New train entry
        if update.stabling and update.stabling.reception and update.stabling.bay:
            raise HTTPException(status_code=400, detail="Reception and Bay cannot both be set.")

        updated_train = {
            "train_id": update.train_id,
            "date": today,
            "fitness_certificates": update.fitness_certificates.dict() if update.fitness_certificates else {},
            "branding": (update.branding.dict() if (update.branding and update.branding.advertiser) else {}),
            "cleaning": (update.cleaning.dict() if (update.cleaning and update.cleaning.type in ["interior", "exterior"]) else {}),
            "stabling": (update.stabling.dict() if update.stabling else {}),
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

# Add a branding configuration to a train
@router.post("/branding/add")
def add_branding(append_req: BrandingAppendModel):
    try:
        with open(UNIFIED_JSON_PATH, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Unified JSON not found")

    found = False
    for train in data.get("data", []):
        if train.get("train_id") == append_req.train_id:
            existing = train.get("branding")
            new_entry = append_req.branding.dict()
            if isinstance(existing, list):
                existing.append(new_entry)
            elif isinstance(existing, dict) and existing:
                train["branding"] = [existing, new_entry]
            else:
                train["branding"] = [new_entry]
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail=f"Train {append_req.train_id} not found")

    with open(UNIFIED_JSON_PATH, "w") as f:
        json.dump(data, f, indent=2)

    return {"message": f"Branding added to train {append_req.train_id}", "branding": new_entry}


# Update depot deep cleaning labour available today
@router.post("/depot/deep-cleaning")
def update_deep_cleaning(body: DepotDeepCleaningInput):
    try:
        with open(DEPOT_JSON_PATH, "r") as f:
            depot = json.load(f)
    except FileNotFoundError:
        depot = {}

    depot["deep_cleaning_labour_available_today"] = body.manual_labour_available_today
    depot["updated_at"] = datetime.now().isoformat()

    with open(DEPOT_JSON_PATH, "w") as f:
        json.dump(depot, f, indent=2)

    return {"message": "Depot deep cleaning updated", "depot": depot}

@router.get("/parking/bays")
def get_parking_bays():
    """Return available parking bays with their capacities"""
    parking_bays = [
        {"bay_id": "PT01", "type": "stabling", "positions": [1, 2]},
        {"bay_id": "PT02", "type": "stabling", "positions": [1, 2]},
        {"bay_id": "PT03", "type": "stabling", "positions": [1, 2]},
        {"bay_id": "PT04", "type": "stabling", "positions": [1, 2]},
        {"bay_id": "PT05", "type": "stabling", "positions": [1, 2]},
        {"bay_id": "PT06", "type": "stabling", "positions": [1, 2]},
        {"bay_id": "PT07", "type": "stabling", "positions": [1, 2]},
        {"bay_id": "PT08", "type": "stabling", "positions": [1, 2]},
        {"bay_id": "PT09", "type": "stabling", "positions": [1, 2]},
        {"bay_id": "PT10", "type": "stabling", "positions": [1, 2]},
        {"bay_id": "PT11", "type": "stabling", "positions": [1, 2]},
        {"bay_id": "PT12", "type": "stabling", "positions": [1, 2]},
        {"bay_id": "IBL01", "type": "maintenance", "positions": [1]},
        {"bay_id": "IBL02", "type": "maintenance", "positions": [1]},
        {"bay_id": "IBL03", "type": "maintenance", "positions": [1]},
        {"bay_id": "IBL04", "type": "maintenance", "positions": [1]},
        {"bay_id": "IBL05", "type": "maintenance", "positions": [1]},
    ]
    return {"bays": parking_bays}

@router.get("/parking/assignments")
def get_parking_assignments():
    """Return all current parking assignments"""
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(PARKING_JSON_PATH), exist_ok=True)
        
        if not os.path.exists(PARKING_JSON_PATH):
            # Create empty parking file if it doesn't exist
            with open(PARKING_JSON_PATH, "w") as f:
                json.dump([], f, indent=2)
            return {"assignments": []}
        
        with open(PARKING_JSON_PATH, "r") as f:
            assignments = json.load(f)
        
        # Filter out departed trains (those with departure_time)
        current_assignments = [a for a in assignments if not a.get("departure_time")]
        return {"assignments": current_assignments}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading parking data: {str(e)}")

@router.post("/parking/assignment")
def create_parking_assignment(assignment: ParkingAssignmentModel):
    """Create a new parking assignment"""
    try:
        # Create directory if it doesn't exist
        os.makedirs(os.path.dirname(PARKING_JSON_PATH), exist_ok=True)
        
        # Validate bay and position
        if not validate_bay_position(assignment.bay, assignment.position):
            raise HTTPException(status_code=400, detail="Invalid bay or position")
        
        # Load existing assignments
        if os.path.exists(PARKING_JSON_PATH):
            with open(PARKING_JSON_PATH, "r") as f:
                assignments = json.load(f)
        else:
            assignments = []
        
        # Check if train already has an active assignment
        for existing in assignments:
            if existing["train_id"] == assignment.train_id and not existing.get("departure_time"):
                raise HTTPException(status_code=400, detail=f"Train {assignment.train_id} already has an active parking assignment")
        
        # Check if position is already occupied
        for existing in assignments:
            if (existing["bay"] == assignment.bay and 
                existing["position"] == assignment.position and 
                not existing.get("departure_time")):
                raise HTTPException(status_code=400, detail=f"Position {assignment.bay}-{assignment.position} is already occupied")
        
        # Add arrival time if not provided
        assignment_dict = assignment.dict()
        if not assignment_dict.get("arrival_time"):
            assignment_dict["arrival_time"] = datetime.now().isoformat()
        
        assignments.append(assignment_dict)
        
        # Save to file
        with open(PARKING_JSON_PATH, "w") as f:
            json.dump(assignments, f, indent=2)
        
        return {"message": "Parking assignment created successfully", "assignment": assignment_dict}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating parking assignment: {str(e)}")

@router.put("/parking/assignment/{train_id}")
def update_parking_assignment(train_id: str, assignment: ParkingAssignmentModel):
    """Update an existing parking assignment"""
    try:
        if not os.path.exists(PARKING_JSON_PATH):
            raise HTTPException(status_code=404, detail="No parking assignments found")
        
        # Validate bay and position
        if not validate_bay_position(assignment.bay, assignment.position):
            raise HTTPException(status_code=400, detail="Invalid bay or position")
        
        with open(PARKING_JSON_PATH, "r") as f:
            assignments = json.load(f)
        
        found = False
        for i, existing in enumerate(assignments):
            if existing["train_id"] == train_id and not existing.get("departure_time"):
                # Check if new position is available (excluding current assignment)
                for other in assignments:
                    if (other["train_id"] != train_id and 
                        other["bay"] == assignment.bay and 
                        other["position"] == assignment.position and 
                        not other.get("departure_time")):
                        raise HTTPException(status_code=400, detail=f"Position {assignment.bay}-{assignment.position} is already occupied")
                
                # Update assignment
                assignment_dict = assignment.dict()
                assignment_dict["arrival_time"] = existing["arrival_time"]  # Keep original arrival time
                assignments[i] = assignment_dict
                found = True
                break
        
        if not found:
            raise HTTPException(status_code=404, detail=f"No active parking assignment found for train {train_id}")
        
        # Save to file
        with open(PARKING_JSON_PATH, "w") as f:
            json.dump(assignments, f, indent=2)
        
        return {"message": f"Parking assignment updated for train {train_id}", "assignment": assignment_dict}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating parking assignment: {str(e)}")

@router.delete("/parking/assignment/{train_id}")
def delete_parking_assignment(train_id: str):
    """Remove a parking assignment (mark as departed)"""
    try:
        if not os.path.exists(PARKING_JSON_PATH):
            raise HTTPException(status_code=404, detail="No parking assignments found")
        
        with open(PARKING_JSON_PATH, "r") as f:
            assignments = json.load(f)
        
        found = False
        for i, assignment in enumerate(assignments):
            if assignment["train_id"] == train_id and not assignment.get("departure_time"):
                assignments[i]["departure_time"] = datetime.now().isoformat()
                found = True
                break
        
        if not found:
            raise HTTPException(status_code=404, detail=f"No active parking assignment found for train {train_id}")
        
        # Save to file
        with open(PARKING_JSON_PATH, "w") as f:
            json.dump(assignments, f, indent=2)
        
        return {"message": f"Parking assignment removed for train {train_id}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing parking assignment: {str(e)}")

# Helper function to validate bay and position
def validate_bay_position(bay: str, position: int) -> bool:
    """Validate that the bay and position combination is valid"""
    try:
        if bay.startswith("PT"):  # Parking tracks
            # Extract the number after "PT"
            track_num_str = bay[2:]
            if not track_num_str.isdigit():
                return False
                
            track_num = int(track_num_str)
            if track_num < 1 or track_num > 12:
                return False
            if position not in [1, 2]:
                return False
                
        elif bay.startswith("IBL"):  # Maintenance bays
            # Extract the number after "IBL"
            bay_num_str = bay[3:]
            if not bay_num_str.isdigit():
                return False
                
            bay_num = int(bay_num_str)
            if bay_num < 1 or bay_num > 5:
                return False
            if position != 1:  # Maintenance bays have only position 1
                return False
        else:
            return False
        
        return True
        
    except (ValueError, IndexError):
        return False

@router.get("/unified-data")
async def get_unified_data():
    try:
        # Use absolute path or verify the current working directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        UNIFIED_JSON_PATH = os.path.join(current_dir, "..", "storage", "unified.json")
        
        with open(UNIFIED_JSON_PATH, 'r') as file:
            data = json.load(file)
        return data
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Data file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON format")