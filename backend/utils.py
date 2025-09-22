import json
import shutil
import os
from datetime import datetime
from config import UPLOAD_DIR, UNIFIED_JSON_PATH, DEPOT_JSON_PATH
import math

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
            # Use the actual filename from the UploadFile object
            file_path = os.path.join(UPLOAD_DIR, f"{key}_{file.filename}")
            
            # Ensure the upload directory exists
            os.makedirs(UPLOAD_DIR, exist_ok=True)
            
            # Save the file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            saved_paths[key] = file_path

    return saved_paths

def save_preview_data(preview: dict):
    try:
        with open(UNIFIED_JSON_PATH, "r") as f:
            unified = json.load(f)
    except FileNotFoundError:
        unified = {}

    unified["preview"] = preview  # Store preview temporarily

    with open(UNIFIED_JSON_PATH, "w") as f:
        json.dump(unified, f, indent=2)

    return unified

def save_unified_data(data: dict):
    try:
        with open(UNIFIED_JSON_PATH, "r") as f:
            unified = json.load(f)
    except FileNotFoundError:
        unified = {}

    unified["depot"] = data

    with open(UNIFIED_JSON_PATH, "w") as f:
        json.dump(unified, f, indent=2)

    return unified
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

def build_final_unified_schema(parsed_data: dict):
    depot_info = parsed_data.get("depot", {})

    # Collect all unique train IDs
    train_ids = set()
    for sample_key, rows in parsed_data.items():
        if sample_key == "depot":
            continue
        for row in rows:
            tid = normalize_tid(row.get("Train ID") or row.get("train_id") or row.get("trainid"))
            if tid:
                train_ids.add(tid)

    final_data = []
    today_date = datetime.now().strftime("%Y-%m-%d")

    for train_id in sorted(train_ids):
        norm_train_id = normalize_tid(train_id)
        train_obj = {
    "train_id": norm_train_id,
    "date": today_date,
    "fitness_certificates": replace_nan_with_none(get_train_row(parsed_data.get("fitness_sample", []), norm_train_id)),
    "job_cards": replace_nan_with_none([
        row for row in parsed_data.get("jobcards_sample", [])
        if normalize_tid(row.get("Train ID") or row.get("train_id") or row.get("trainid")) == norm_train_id
    ]),
    "branding": replace_nan_with_none(get_train_row(parsed_data.get("branding_sample", []), norm_train_id)),
    "mileage": replace_nan_with_none(get_train_row(parsed_data.get("mileage_sample", []), norm_train_id)),
    "cleaning": replace_nan_with_none(get_train_row(parsed_data.get("cleaning_sample", []), norm_train_id)),
    "stabling": replace_nan_with_none(get_train_row(parsed_data.get("stabling_sample", []), norm_train_id)),
    "depot": replace_nan_with_none(depot_info)
}
        final_data.append(train_obj)

    # Save directly to unified.json
    with open(UNIFIED_JSON_PATH, "w") as f:
        json.dump({"data": final_data}, f, indent=2)

    return final_data
def save_depot_data(depot: dict):
    with open(DEPOT_JSON_PATH, "w") as f:
        json.dump(depot, f, indent=2)
    return depot



def update_train_data(train_update: dict):
    with open(UNIFIED_JSON_PATH) as f:
        data = json.load(f)

    train_id = train_update["train_id"]
    updated = False

    for train in data["data"]:
        if train["train_id"] == train_id:
            # Update manual inputs
            train["fitness_certificates"] = train_update["fitness_certificates"]
            train["branding"] = train_update["branding"]
            train["cleaning"] = train_update["cleaning"]
            train["stabling"] = train_update["stabling"]
            updated = True
            break

    if not updated:
        # If train not found, append as new train entry
        data["data"].append(train_update)

    with open(UNIFIED_JSON_PATH, "w") as f:
        json.dump(data, f, indent=2)

    return train_update 