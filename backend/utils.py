import json
import shutil
import os
import pandas as pd
from datetime import datetime, timedelta
from config import UPLOAD_DIR, UNIFIED_JSON_PATH, DEPOT_JSON_PATH
import math
import random

# Ensure the upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

def replace_nan_with_none(obj):
    if isinstance(obj, dict):
        return {k: replace_nan_with_none(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [replace_nan_with_none(x) for x in obj]
    elif isinstance(obj, float) and math.isnan(obj):
        return None
    else:
        return obj

def save_uploaded_files(files: dict) -> dict:
    saved_paths = {}
    for key, file in files.items():
        if file and hasattr(file, 'filename') and file.filename:
            file_path = os.path.join(UPLOAD_DIR, f"{key}_{file.filename}")
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            saved_paths[key] = file_path
    return saved_paths

def normalize_tid(tid):
    if tid is None:
        return None
    return str(tid).strip().upper()

def get_train_row(sample_list, train_id):
    norm_train_id = normalize_tid(train_id)
    for row in sample_list:
        tid = normalize_tid(row.get("Train ID") or row.get("train_id") or row.get("trainid"))
        if tid == norm_train_id:
            return row
    return {}

def transform_parsed_data(parsed_data: dict) -> dict:
    """Transform parsed data from file_parser into input_data.json format"""
    transformed = {}
    
    # Transform fitness data - NEW FORMAT with train_id, rolling_stock, signalling, telecom, status
    fitness_data = {}
    for row in parsed_data.get("fitness_sample", []):
        train_id = row.get("train_id")
        if not train_id:
            continue
            
        # Convert from flat format to nested format for input_data.json
        fitness_certs = {}
        
        # Rolling Stock certificate
        if row.get("rolling_stock"):
            issue_date = (datetime.strptime(row["rolling_stock"], "%Y-%m-%d") - timedelta(days=365)).strftime("%Y-%m-%d")
            status = "valid" if datetime.strptime(row["rolling_stock"], "%Y-%m-%d") >= datetime.now() else "expired"
            fitness_certs["rolling_stock"] = {
                "department": "rolling_stock",
                "issue_date": issue_date,
                "expiry_date": row["rolling_stock"],
                "status": status
            }
        
        # Signalling certificate
        if row.get("signalling"):
            issue_date = (datetime.strptime(row["signalling"], "%Y-%m-%d") - timedelta(days=365)).strftime("%Y-%m-%d")
            status = "valid" if datetime.strptime(row["signalling"], "%Y-%m-%d") >= datetime.now() else "expired"
            fitness_certs["signalling"] = {
                "department": "signalling",
                "issue_date": issue_date,
                "expiry_date": row["signalling"],
                "status": status
            }
        
        # Telecom certificate
        if row.get("telecom"):
            issue_date = (datetime.strptime(row["telecom"], "%Y-%m-%d") - timedelta(days=365)).strftime("%Y-%m-%d")
            status = "valid" if datetime.strptime(row["telecom"], "%Y-%m-%d") >= datetime.now() else "expired"
            fitness_certs["telecom"] = {
                "department": "telecom",
                "issue_date": issue_date,
                "expiry_date": row["telecom"],
                "status": status
            }
        
        fitness_data[train_id] = fitness_certs
    
    transformed["fitness"] = fitness_data
    
    # Transform job cards data
    job_cards_data = {}
    for row in parsed_data.get("jobcards_sample", []):
        train_id = row.get("train_id")
        if not train_id:
            continue
            
        if train_id not in job_cards_data:
            job_cards_data[train_id] = []
            
        job_cards_data[train_id].append({
            "id": row.get("job_id", ""),
            "description": row.get("description", ""),
            "open_date": row.get("open_date", ""),
            "criticality": row.get("criticality", "medium"),
            "estimated_hours": float(row.get("estimated_hours", 0))
        })
    transformed["job_cards"] = job_cards_data
    
    # Transform branding contracts data
    branding_data = {}
    for row in parsed_data.get("branding_sample", []):
        train_id = row.get("train_id")
        if not train_id:
            continue
            
        if train_id not in branding_data:
            branding_data[train_id] = []
            
        branding_data[train_id].append({
            "brand": row.get("brand", ""),
            "total_exposure_hours": int(row.get("total_exposure_hours", 0)),
            "completed_hours": int(row.get("completed_hours", 0)),
            "deadline": row.get("deadline", ""),
            "priority": int(row.get("priority", 1)),
            "audience_profile": row.get("audience_profile", "{}"),
            "preferred_times": row.get("preferred_times", "")
        })
    transformed["branding"] = branding_data
    
    # Transform mileage data
    mileage_data = {}
    for row in parsed_data.get("mileage_sample", []):
        train_id = row.get("train_id")
        if not train_id:
            continue
            
        mileage_data[train_id] = {
            "bogie": float(row.get("bogie_mileage", 0)),
            "brake_pad": float(row.get("brake_pad_mileage", 0)),
            "hvac": float(row.get("hvac_mileage", 0))
        }
    transformed["mileage"] = mileage_data
    
    # Transform cleaning data
    cleaning_data = {}
    for row in parsed_data.get("cleaning_sample", []):
        train_id = row.get("train_id")
        if not train_id:
            continue
            
        cleaning_data[train_id] = {
            "last_deep_cleaning": row.get("last_deep_cleaning", ""),
            "cleaning_duration": int(row.get("cleaning_duration", 0))
        }
    transformed["cleaning"] = cleaning_data
    
    # Transform stabling data
    stabling_data = {}
    for row in parsed_data.get("stabling_sample", []):
        train_id = row.get("train_id")
        if not train_id:
            continue
            
        current_bay = row.get("current_bay", "")
        current_position = row.get("current_position", 1)
        
        if current_position is not None:
            try:
                current_position = int(float(current_position))  # Handle both int and float strings
            except (ValueError, TypeError):
                current_position = 1  # Default to 1 if conversion fails
        
        stabling_data[train_id] = {
            "status": row.get("status", "parking"),
            "current_bay": current_bay,
            "current_position": current_position,
            "current_position_full": f"{current_bay}-{current_position}" if current_bay else None
        }
    transformed["stabling"] = stabling_data
    
    return transformed

def build_final_unified_schema(parsed_data: dict):
    """Build unified data in input_data.json format using transformed data"""
    
    # First transform the parsed data into the new format
    transformed_data = transform_parsed_data(parsed_data)
    
    # Get all unique train IDs from transformed data
    train_ids = set()
    for data_type, data_dict in transformed_data.items():
        train_ids.update(data_dict.keys())
    
    trains_data = []
    today_date = datetime.now().strftime("%Y-%m-%d")
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Build depot layout from stabling data
    parking_tracks = {f"PT{i:02d}": [] for i in range(1, 13)}
    ibl_bays = {f"IBL{i:02d}": [] for i in range(1, 6)}
    
    for train_id in sorted(train_ids):
        # Get data directly from transformed data
        fitness_certs = transformed_data.get("fitness", {}).get(train_id, {})
        job_cards = transformed_data.get("job_cards", {}).get(train_id, [])
        branding_contracts = transformed_data.get("branding", {}).get(train_id, [])
        mileage_data = transformed_data.get("mileage", {}).get(train_id, {})
        cleaning_data = transformed_data.get("cleaning", {}).get(train_id, {})
        stabling_data = transformed_data.get("stabling", {}).get(train_id, {})
        
        # Build train object in final format
        train_obj = {
            "id": train_id,
            "fitness_certificates": fitness_certs,
            "job_cards": job_cards,
            "branding_contracts": branding_contracts,
            "current_mileage": mileage_data,
            "maintenance_thresholds": {
                "bogie": 15000,
                "brake_pad": 13000,
                "hvac": 15000
            },
            "last_deep_cleaning": cleaning_data.get("last_deep_cleaning", today_date),
            "cleaning_duration": cleaning_data.get("cleaning_duration", 0),
            "status": stabling_data.get("status", "parking"),
            "current_position": stabling_data.get("current_position_full")
        }
        trains_data.append(train_obj)
        
        # Update depot layout with current trains
        current_bay = stabling_data.get("current_bay", "")
        status = stabling_data.get("status", "parking")
        
        if current_bay and status == "parking" and current_bay.startswith("PT"):
            if current_bay in parking_tracks:
                parking_tracks[current_bay].append(train_id)
        elif current_bay and status == "maintenance" and current_bay.startswith("IBL"):
            if current_bay in ibl_bays:
                ibl_bays[current_bay].append(train_id)
    
    # Create cleaning slots based on cleaning_crew_available (default 3)
    cleaning_slots = []
    cleaning_crew_available = 3  # Default value
    
    for i in range(cleaning_crew_available):
        cleaning_slots.append({
            "id": f"CS{i+1:02d}",
            "available": True,
            "available_from": current_time
        })
    
    # Build final unified data
    final_data = {
        "trains": trains_data,
        "depot_layout": {
            "parking_tracks": [
                {"id": bay_id, "capacity": 2, "current_trains": trains}
                for bay_id, trains in parking_tracks.items()
            ],
            "ibl_bays": [
                {"id": bay_id, "capacity": 1, "current_trains": trains}
                for bay_id, trains in ibl_bays.items()
            ],
            "exit_points": ["EXIT01", "EXIT02"],
            "connections": {
                "PT01": ["PT02", "IBL01", "IBL02", "EXIT01"],
                "PT02": ["PT01", "PT03", "IBL01", "IBL02", "EXIT01"],
                "PT03": ["PT02", "PT04", "IBL01", "IBL02", "EXIT01"],
                "PT04": ["PT03", "PT05", "EXIT01"],
                "PT05": ["PT04", "PT06", "EXIT01"],
                "PT06": ["PT05", "PT07", "EXIT01"],
                "PT07": ["PT06", "PT08", "EXIT02"],
                "PT08": ["PT07", "PT09", "EXIT02"],
                "PT09": ["PT08", "PT10", "EXIT02"],
                "PT10": ["PT09", "PT11", "IBL04", "IBL05", "EXIT02"],
                "PT11": ["PT10", "PT12", "IBL04", "IBL05", "EXIT02"],
                "PT12": ["PT11", "IBL04", "IBL05", "EXIT02"],
                "IBL01": ["IBL02", "PT01", "PT02", "PT03"],
                "IBL02": ["IBL01", "IBL03", "PT01", "PT02", "PT03"],
                "IBL03": ["IBL02", "IBL04", "PT10", "PT11", "PT12"],
                "IBL04": ["IBL03", "IBL05", "PT10", "PT11", "PT12"],
                "IBL05": ["IBL04", "PT10", "PT11", "PT12"],
                "EXIT01": ["PT01", "PT02", "PT03", "PT04", "PT05", "PT06"],
                "EXIT02": ["PT07", "PT08", "PT09", "PT10", "PT11", "PT12"]
            }
        },
        "cleaning_slots": cleaning_slots,
        "cleaning_crew_available": cleaning_crew_available,
        "date": today_date,
        "required_trains": 18,
        "standby_trains": 4
    }

    # Save to unified.json
    with open(UNIFIED_JSON_PATH, "w") as f:
        json.dump(final_data, f, indent=2)

    return final_data

def save_depot_data(depot: dict):
    with open(DEPOT_JSON_PATH, "w") as f:
        json.dump(depot, f, indent=2)
    return depot

def update_cleaning_slots(cleaning_crew_available: int):
    """Update cleaning slots based on available cleaning crew"""
    with open(UNIFIED_JSON_PATH, "r") as f:
        data = json.load(f)
    
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    # Create new cleaning slots
    cleaning_slots = []
    for i in range(cleaning_crew_available):
        cleaning_slots.append({
            "id": f"CS{i+1:02d}",
            "available": True,
            "available_from": current_time
        })
    
    data["cleaning_slots"] = cleaning_slots
    data["cleaning_crew_available"] = cleaning_crew_available
    
    with open(UNIFIED_JSON_PATH, "w") as f:
        json.dump(data, f, indent=2)
    
    return cleaning_slots

def utils_update_train_data(train_update: dict):
    """Update train data in the new input_data.json format"""
    with open(UNIFIED_JSON_PATH) as f:
        data = json.load(f)

    train_id = train_update["id"]
    updated = False

    for train in data["trains"]:
        if train["id"] == train_id:
            # Update fields with new format
            if "fitness_certificates" in train_update:
                train["fitness_certificates"] = train_update["fitness_certificates"]
            
            if "branding_contracts" in train_update:
                if "branding_contracts" not in train:
                    train["branding_contracts"] = []
                # Append new branding contracts
                train["branding_contracts"].extend(train_update["branding_contracts"])
            
            if "last_deep_cleaning" in train_update:
                train["last_deep_cleaning"] = train_update["last_deep_cleaning"]
            
            if "cleaning_duration" in train_update:
                train["cleaning_duration"] = train_update["cleaning_duration"]
            
            if "status" in train_update:
                train["status"] = train_update["status"]
                # Also update depot layout if status changes
                update_depot_layout_for_train(train_id, train_update["status"], train_update.get("current_position"))
            
            if "current_position" in train_update:
                train["current_position"] = train_update["current_position"]
                # Update depot layout
                update_depot_layout_for_train(train_id, train.get("status", "parking"), train_update["current_position"])
            
            updated = True
            break

    if not updated:
        # Create new train
        new_train = {
            "id": train_id,
            "fitness_certificates": train_update.get("fitness_certificates", {}),
            "job_cards": [],
            "branding_contracts": train_update.get("branding_contracts", []),
            "current_mileage": {"bogie": 0, "brake_pad": 0, "hvac": 0},
            "maintenance_thresholds": {"bogie": 15000, "brake_pad": 13000, "hvac": 15000},
            "last_deep_cleaning": train_update.get("last_deep_cleaning", datetime.now().strftime("%Y-%m-%d")),
            "cleaning_duration": train_update.get("cleaning_duration", 0),
            "status": train_update.get("status", "parking"),
            "current_position": train_update.get("current_position")
        }
        data["trains"].append(new_train)
        # Update depot layout for new train
        update_depot_layout_for_train(train_id, new_train["status"], new_train["current_position"])

    with open(UNIFIED_JSON_PATH, "w") as f:
        json.dump(data, f, indent=2)

    return train_update

def update_depot_layout_for_train(train_id: str, status: str, current_position: str):
    """Update depot layout when train status or position changes"""
    with open(UNIFIED_JSON_PATH, "r") as f:
        data = json.load(f)
    
    # Remove train from all parking tracks first
    for track in data["depot_layout"]["parking_tracks"]:
        if train_id in track["current_trains"]:
            track["current_trains"].remove(train_id)
    
    # Add train to appropriate track based on current_position
    if current_position and status == "parking":
        # Extract bay from current_position (e.g., "PT01-1" → "PT01")
        bay_id = current_position.split("-")[0] if "-" in current_position else current_position
        for track in data["depot_layout"]["parking_tracks"]:
            if track["id"] == bay_id and len(track["current_trains"]) < track["capacity"]:
                track["current_trains"].append(train_id)
                break
    
    with open(UNIFIED_JSON_PATH, "w") as f:
        json.dump(data, f, indent=2)