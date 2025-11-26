from fastapi import APIRouter, HTTPException
from schemas import NightlyUpdateModel, BrandingAppendModel, DepotDeepCleaningInput, ParkingAssignmentModel
from config import UNIFIED_JSON_PATH, HISTORICAL_JSON_PATH, DEPOT_JSON_PATH, PARKING_JSON_PATH
import json
import os
from datetime import datetime, timedelta
from utils import utils_update_train_data

router = APIRouter()

@router.get("/trains")
def get_trains():
    try:
        with open(UNIFIED_JSON_PATH, "r") as f:
            data = json.load(f)
        trains = [train.get("id") for train in data.get("trains", []) if train.get("id")]
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

    for train in data.get("trains", []):
        if train.get("id") == train_id:
            fitness_data = train.get("fitness_certificates", {})
            
            # Check which certificates are expired
            expired_certificates = []
            certificate_details = {}
            
            for cert_type, cert_data in fitness_data.items():
                expiry_date = cert_data.get("expiry_date")
                status = cert_data.get("status", "valid")
                
                certificate_details[cert_type] = {
                    "issue_date": cert_data.get("issue_date", ""),
                    "expiry_date": expiry_date,
                    "status": status,
                    "department": cert_data.get("department", "")
                }
                
                if status == "expired" or (expiry_date and datetime.strptime(expiry_date, "%Y-%m-%d") < datetime.now()):
                    expired_certificates.append(cert_type)
            
            return {
                "certificate_details": certificate_details,
                "has_expired": len(expired_certificates) > 0,
                "expired_certificates": expired_certificates,
                "overall_status": "expired" if expired_certificates else "valid"
            }

    raise HTTPException(status_code=404, detail=f"Train {train_id} not found")

@router.post("/update/train")
def update_train_data(update: NightlyUpdateModel):
    try:
        # Build train_update payload
        train_update = {"id": update.train_id}

        if update.fitness_certificates:
            # Read current train data to get existing certificates
            with open(UNIFIED_JSON_PATH, "r") as f:
                unified_data = json.load(f)
            
            current_train = None
            for train in unified_data.get("trains", []):
                if train.get("id") == update.train_id:
                    current_train = train
                    break
            
            if not current_train:
                raise HTTPException(status_code=404, detail=f"Train {update.train_id} not found")
            
            # Get current fitness certificates
            current_certificates = current_train.get("fitness_certificates", {})
            updated_certificates = current_certificates.copy()
            
            # Only update certificates that are marked for renewal AND have valid dates
            fitness_data = update.fitness_certificates
            
            # Check if we have valid dates for renewal
            has_valid_dates = (fitness_data.issued_at and fitness_data.valid_until and 
                             len(fitness_data.issued_at) > 0 and len(fitness_data.valid_until) > 0)
            
            if has_valid_dates:
                try:
                    # Convert datetime-local format to date format
                    issued_date = fitness_data.issued_at.split('T')[0] if 'T' in fitness_data.issued_at else fitness_data.issued_at
                    valid_until_date = fitness_data.valid_until.split('T')[0] if 'T' in fitness_data.valid_until else fitness_data.valid_until
                    
                    # Validate date format
                    datetime.strptime(issued_date, "%Y-%m-%d")
                    datetime.strptime(valid_until_date, "%Y-%m-%d")
                    
                    # Update certificates based on renew flags
                    if fitness_data.renew_rolling_stock:
                        updated_certificates["rolling_stock"] = {
                            "department": "rolling_stock",
                            "issue_date": issued_date,
                            "expiry_date": valid_until_date,
                            "status": "valid" if datetime.strptime(valid_until_date, "%Y-%m-%d") >= datetime.now() else "expired"
                        }
                    
                    if fitness_data.renew_signalling:
                        updated_certificates["signalling"] = {
                            "department": "signalling",
                            "issue_date": issued_date,
                            "expiry_date": valid_until_date,
                            "status": "valid" if datetime.strptime(valid_until_date, "%Y-%m-%d") >= datetime.now() else "expired"
                        }
                    
                    if fitness_data.renew_telecom:
                        updated_certificates["telecom"] = {
                            "department": "telecom",
                            "issue_date": issued_date,
                            "expiry_date": valid_until_date,
                            "status": "valid" if datetime.strptime(valid_until_date, "%Y-%m-%d") >= datetime.now() else "expired"
                        }
                    
                    train_update["fitness_certificates"] = updated_certificates
                    
                except ValueError as e:
                    raise HTTPException(status_code=400, detail=f"Invalid date format: {str(e)}")
            else:
                # If no valid dates provided, don't update fitness certificates
                pass
        
        if update.branding:
            # Transform frontend branding format to backend format
            branding_contract = {
                "brand": update.branding.advertiser,
                "total_exposure_hours": update.branding.exposure_hours_needed,
                "completed_hours": 0,
                "deadline": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "priority": _convert_priority_to_int(update.branding.priority),
                "audience_profile": "{}",
                "preferred_times": "09:00-18:00"
            }
            train_update["branding_contracts"] = [branding_contract]
        
        if update.cleaning:
            train_update["last_deep_cleaning"] = update.cleaning.scheduled_at
            train_update["cleaning_duration"] = update.cleaning.manual_labour_count
        
        if update.stabling:
            if update.stabling.bay and update.stabling.position:
                train_update["current_position"] = f"{update.stabling.bay}-{update.stabling.position}"
            train_update["status"] = "parking"

        # Only update if there are actual changes
        if len(train_update) > 1:  # More than just the id
            updated_train = utils_update_train_data(train_update)

            # Save historical snapshot
            today = datetime.now().strftime("%Y-%m-%d")
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
        else:
            return {"message": f"No changes to update for train {update.train_id}."}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def _convert_priority_to_int(priority: str) -> int:
    """Convert priority string to integer"""
    priority_map = {
        "low": 1,
        "medium": 5, 
        "high": 10
    }
    return priority_map.get(priority.lower(), 5)

@router.post("/branding/add")
def add_branding(append_req: BrandingAppendModel):
    try:
        with open(UNIFIED_JSON_PATH, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Unified JSON not found")

    found = False
    for train in data.get("trains", []):
        if train.get("id") == append_req.train_id:
            existing = train.get("branding_contracts") or []
            
            # Transform frontend format to backend format
            new_branding_contract = {
                "brand": append_req.branding.advertiser,
                "total_exposure_hours": append_req.branding.exposure_hours_needed,
                "completed_hours": 0,
                "deadline": (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d"),
                "priority": _convert_priority_to_int(append_req.branding.priority),
                "audience_profile": "{}",
                "preferred_times": "09:00-18:00"
            }
            
            if isinstance(existing, list):
                existing.append(new_branding_contract)
                train["branding_contracts"] = existing
            else:
                train["branding_contracts"] = [new_branding_contract]
            found = True
            break

    if not found:
        raise HTTPException(status_code=404, detail=f"Train {append_req.train_id} not found")

    with open(UNIFIED_JSON_PATH, "w") as f:
        json.dump(data, f, indent=2)

    return {"message": f"Branding added to train {append_req.train_id}", "branding": new_branding_contract}


@router.post("/depot/deep-cleaning")
def update_deep_cleaning(body: DepotDeepCleaningInput):
    try:
        # Update unified.json with cleaning crew available and cleaning slots
        from utils import update_cleaning_slots
        
        # Update cleaning slots based on available crew
        cleaning_slots = update_cleaning_slots(body.manual_labour_available_today)
        
        # Also update depot.json if needed
        with open(DEPOT_JSON_PATH, "r") as f:
            depot = json.load(f)
    except FileNotFoundError:
        depot = {}

    depot["deep_cleaning_labour_available_today"] = body.manual_labour_available_today
    depot["updated_at"] = datetime.now().isoformat()

    with open(DEPOT_JSON_PATH, "w") as f:
        json.dump(depot, f, indent=2)

    return {
        "message": "Depot deep cleaning updated", 
        "cleaning_crew_available": body.manual_labour_available_today,
        "cleaning_slots": cleaning_slots
    }

# ... (parking endpoints remain the same)
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
        os.makedirs(os.path.dirname(PARKING_JSON_PATH), exist_ok=True)
        
        if not os.path.exists(PARKING_JSON_PATH):
            with open(PARKING_JSON_PATH, "w") as f:
                json.dump([], f, indent=2)
            return {"assignments": []}
        
        with open(PARKING_JSON_PATH, "r") as f:
            assignments = json.load(f)
        
        current_assignments = [a for a in assignments if not a.get("departure_time")]
        return {"assignments": current_assignments}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading parking data: {str(e)}")

@router.post("/parking/assignment")
def create_parking_assignment(assignment: ParkingAssignmentModel):
    """Create a new parking assignment"""
    try:
        os.makedirs(os.path.dirname(PARKING_JSON_PATH), exist_ok=True)
        
        if not validate_bay_position(assignment.bay, assignment.position):
            raise HTTPException(status_code=400, detail="Invalid bay or position")
        
        if os.path.exists(PARKING_JSON_PATH):
            with open(PARKING_JSON_PATH, "r") as f:
                assignments = json.load(f)
        else:
            assignments = []
        
        for existing in assignments:
            if existing["train_id"] == assignment.train_id and not existing.get("departure_time"):
                raise HTTPException(status_code=400, detail=f"Train {assignment.train_id} already has an active parking assignment")
        
        for existing in assignments:
            if (existing["bay"] == assignment.bay and 
                existing["position"] == assignment.position and 
                not existing.get("departure_time")):
                raise HTTPException(status_code=400, detail=f"Position {assignment.bay}-{assignment.position} is already occupied")
        
        assignment_dict = assignment.dict()
        if not assignment_dict.get("arrival_time"):
            assignment_dict["arrival_time"] = datetime.now().isoformat()
        
        assignments.append(assignment_dict)
        
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
        
        if not validate_bay_position(assignment.bay, assignment.position):
            raise HTTPException(status_code=400, detail="Invalid bay or position")
        
        with open(PARKING_JSON_PATH, "r") as f:
            assignments = json.load(f)
        
        found = False
        for i, existing in enumerate(assignments):
            if existing["train_id"] == train_id and not existing.get("departure_time"):
                for other in assignments:
                    if (other["train_id"] != train_id and 
                        other["bay"] == assignment.bay and 
                        other["position"] == assignment.position and 
                        not other.get("departure_time")):
                        raise HTTPException(status_code=400, detail=f"Position {assignment.bay}-{assignment.position} is already occupied")
                
                assignment_dict = assignment.dict()
                assignment_dict["arrival_time"] = existing["arrival_time"]
                assignments[i] = assignment_dict
                found = True
                break
        
        if not found:
            raise HTTPException(status_code=404, detail=f"No active parking assignment found for train {train_id}")
        
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
        
        with open(PARKING_JSON_PATH, "w") as f:
            json.dump(assignments, f, indent=2)
        
        return {"message": f"Parking assignment removed for train {train_id}"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing parking assignment: {str(e)}")

def validate_bay_position(bay: str, position: int) -> bool:
    """Validate that the bay and position combination is valid"""
    try:
        if bay.startswith("PT"):
            track_num_str = bay[2:]
            if not track_num_str.isdigit():
                return False
            track_num = int(track_num_str)
            if track_num < 1 or track_num > 12:
                return False
            if position not in [1, 2]:
                return False
        elif bay.startswith("IBL"):
            bay_num_str = bay[3:]
            if not bay_num_str.isdigit():
                return False
            bay_num = int(bay_num_str)
            if bay_num < 1 or bay_num > 5:
                return False
            if position != 1:
                return False
        else:
            return False
        return True
    except (ValueError, IndexError):
        return False

@router.get("/unified-data")
async def get_unified_data():
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        UNIFIED_JSON_PATH = os.path.join(current_dir, "..", "storage", "unified.json")
        
        with open(UNIFIED_JSON_PATH, 'r') as file:
            data = json.load(file)
        return data
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Data file not found")
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Invalid JSON format")