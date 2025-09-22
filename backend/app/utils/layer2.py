import json
from pathlib import Path
from datetime import date
from typing import Dict, Any, List
from fastapi import HTTPException

# Utility functions
def validate_date_format(date_str: str) -> date:
    """Validate and parse date string"""
    try:
        return date.fromisoformat(date_str)
    except ValueError:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid date format: {date_str}. Use YYYY-MM-DD format."
        )

def load_test_data() -> Dict[str, Any]:
    """Load test data with error handling"""
    test_path = Path(__file__).parent / "test_data.json"
    try:
        with test_path.open(encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Test data file not found")
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Invalid JSON in test data: {str(e)}")

def validate_input_data(parking: Dict, readiness: List, ads: List) -> Dict[str, Any]:
    """Validate input data structure and return validation summary"""
    validation_results = {
        "valid": True,
        "warnings": [],
        "errors": [],
        "stats": {}
    }
    
    # Validate parking data - updated to handle new format
    if "assignments" in parking:
        train_count = len(parking["assignments"])
        validation_results["stats"]["parking_format"] = "new"
    elif "current_positions" in parking:
        train_count = len(parking["current_positions"])
        validation_results["stats"]["parking_format"] = "current"
        validation_results["warnings"].append("Using legacy current_positions format")
    elif isinstance(parking, dict) and all(isinstance(k, str) for k in parking.keys()):
        # Legacy direct dict format
        train_count = len(parking)
        validation_results["stats"]["parking_format"] = "legacy"
        validation_results["warnings"].append("Using legacy direct dict format")
    else:
        validation_results["errors"].append("No valid parking assignments found")
        validation_results["valid"] = False
        train_count = 0
    
    validation_results["stats"]["assigned_trains"] = train_count
    
    # Validate readiness data
    if not readiness:
        validation_results["errors"].append("No readiness data provided")
        validation_results["valid"] = False
    else:
        readiness_trains = [r.get("train_id") for r in readiness if r.get("train_id")]
        validation_results["stats"]["readiness_trains"] = len(readiness_trains)
        
        # Check for missing readiness summaries
        missing_summaries = [r["train_id"] for r in readiness if not r.get("summary")]
        if missing_summaries:
            validation_results["warnings"].append(f"Missing summaries for trains: {missing_summaries}")
        
        # Check readiness score ranges
        invalid_scores = [r["train_id"] for r in readiness if not (0 <= r.get("score", 0) <= 100)]
        if invalid_scores:
            validation_results["warnings"].append(f"Invalid readiness scores for trains: {invalid_scores}")
    
    # Ads validation (minimal since not used in optimization)
    if ads:
        validation_results["stats"]["ads_total"] = len(ads)
        validation_results["warnings"].append("Ad data provided but not used in optimization (readiness-focused scheduling)")
    else:
        validation_results["stats"]["ads_total"] = 0
        validation_results["warnings"].append("No advertisement data provided (not required for current optimization)")
    
    return validation_results