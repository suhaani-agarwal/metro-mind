from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.services.layer1_service import ScheduleOptimizer
from app.services.data_generator import DataGenerator
from app.schemas import OptimizationRequest, OptimizationResponse
from routes import onboarding, nightly
import json
import os
import logging
from typing import Dict, Any, List, Optional
from app.models import ScheduleRequest, OptimizationParams, SwapAnalysisRequest
from app.utils.layer2 import validate_input_data, validate_date_format
from pathlib import Path
import json
from datetime import date, datetime
from app.services.layer2_service import (
    run_layer2_service,
    get_timetable_config,
    generate_departure_slots,
    convert_layer1_to_layer2_format,
    load_layer1_output,
)
from app.services.what_if_service import WhatIfAnalyzer, analyze_train_swap

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Metro-Mind API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load data directory path
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")

app.include_router(onboarding.router, prefix="/api/onboarding", tags=["Onboarding"])
app.include_router(nightly.router, prefix="/api/nightly", tags=["Nightly"])

OVERRIDES_PATH = Path(__file__).parent.parent / "data" / "overrides.json"
SUGGESTIONS_PATH = Path(__file__).parent.parent / "data" / "suggestions.json"

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

@app.get("/")
def home():
    return {"message": "Welcome to MetroMind Backend"}

@app.get("/")
async def root():
    return {"message": "Metro-Mind API is running"}



@app.get("/generate-data")
async def generate_data():
    """Generate synthetic data for testing"""
    try:
        logger.info("Generating synthetic data...")
        generator = DataGenerator()
        data = generator.generate_all_data()
        
        # Save to file
        with open(os.path.join(DATA_DIR, "input_data.json"), "w") as f:
            json.dump(data, f, indent=2)
            
        logger.info("Data generated successfully")
        return {"message": "Data generated successfully", "data": data}
    except Exception as e:
        logger.error(f"Error generating data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/optimize", response_model=OptimizationResponse)
async def optimize_schedule():
    """Optimize the train schedule based on all constraints"""
    try:
        logger.info("Starting optimization...")
        
        # Load input data
        input_path = os.path.join(DATA_DIR, "input_data.json")
        if not os.path.exists(input_path):
            raise HTTPException(status_code=404, detail="Input data not found. Generate data first.")
            
        with open(input_path, "r") as f:
            input_data = json.load(f)
            
        # Run optimization
        optimizer = ScheduleOptimizer(input_data)
        result = optimizer.optimize()
        
        # Save output
        output_path = os.path.join(DATA_DIR, "output.json")
        with open(output_path, "w") as f:
            json.dump(result, f, indent=2)
            
        logger.info("Optimization completed successfully")
        return result
    except Exception as e:
        logger.error(f"Error during optimization: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/results")
async def get_results():
    """Get the latest optimization results"""
    try:
        output_path = os.path.join(DATA_DIR, "output.json")
        if not os.path.exists(output_path):
            raise HTTPException(status_code=404, detail="No results available. Run optimization first.")
            
        with open(output_path, "r") as f:
            results = json.load(f)
            
        return results
    except Exception as e:
        logger.error(f"Error retrieving results: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


#layer2 : 

# Main scheduling endpoint with enhanced validation
@app.post("/schedule")
def schedule(payload: ScheduleRequest):
    """
    Main scheduling endpoint for Layer 2 optimization.
    Focuses on readiness scores and minimal shunting operations.
    """
    try:
        # Validate input data
        validation = validate_input_data(payload.parking, payload.readiness, payload.ads)
        
        if not validation["valid"]:
            raise HTTPException(status_code=400, detail={
                "message": "Invalid input data",
                "errors": validation["errors"]
            })
        
        # Parse service date if provided
        target_date = None
        if payload.service_date:
            target_date = validate_date_format(payload.service_date)
        
        # Run Layer 2 optimization
        result = run_layer2_service(
            parking_json=payload.parking,
            readiness_json=payload.readiness,
            ads_json=payload.ads,  # Passed but ignored by service
            service_day=payload.service_day or "weekday",
            service_date=target_date
        )
        
        # Add validation info to response
        result["input_validation"] = validation
        result["processing_time"] = datetime.now().isoformat()
        result["optimization_focus"] = "Readiness scores and minimal shunting operations"
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

# Enhanced test endpoint with validation
@app.get("/schedule/test")
def schedule_test(service_date: Optional[str] = None):
    """Layer 2 scheduling using actual Layer 1 output (output.json)."""
    try:
        # Load Layer 1 output and convert for validation context
        layer1_output = load_layer1_output()
        converted = convert_layer1_to_layer2_format(layer1_output)

        # Validate converted Layer 1 data
        validation = validate_input_data(
            converted["parking"], 
            converted["readiness"], 
            []
        )

        target_date = None
        if service_date:
            target_date = validate_date_format(service_date)

        # Run Layer 2 optimization using Layer 1 output internally
        result = run_layer2_service(
            service_day="weekday",
            service_date=target_date,
            use_layer1_output=True,
        )

        # Add info
        result["input_validation"] = validation
        result["data_source"] = "Layer 1 Output"
        result["processing_time"] = datetime.now().isoformat()
        result["optimization_focus"] = "Readiness scores and minimal shunting operations"

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Layer 2 scheduling failed: {str(e)}")

# Advanced scheduling with optimization parameters
@app.post("/schedule/advanced")
def schedule_advanced(payload: ScheduleRequest, params: OptimizationParams = None):
    """
    Advanced scheduling endpoint with configurable optimization parameters
    Note: Ad-related parameters are deprecated and ignored
    """
    try:
        # Validate input data
        validation = validate_input_data(payload.parking, payload.readiness, payload.ads)
        
        if not validation["valid"]:
            raise HTTPException(status_code=400, detail={
                "message": "Invalid input data",
                "errors": validation["errors"]
            })
        
        target_date = None
        if payload.service_date:
            target_date = validate_date_format(payload.service_date)
        
        # TODO: Implement custom optimization parameters in layer2_service
        # Currently the weights are hardcoded in the service layer
        result = run_layer2_service(
            parking_json=payload.parking,
            readiness_json=payload.readiness,
            ads_json=payload.ads,
            service_day=payload.service_day or "weekday",
            service_date=target_date
        )
        
        # Add optimization parameters to response
        result["optimization_params"] = params.dict() if params else "default"
        result["input_validation"] = validation
        result["processing_time"] = datetime.now().isoformat()
        result["note"] = "Custom optimization weights not yet implemented in service layer. Ad-related parameters are deprecated."
        result["optimization_focus"] = "Readiness scores and minimal shunting operations"
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Advanced optimization failed: {str(e)}")

# NEW WHAT-IF ANALYSIS ENDPOINTS

@app.get("/whatif/standby-trains")
def get_standby_trains():
    """Get all standby trains using Layer 1 output and current Layer 2 schedule."""
    try:
        layer1_output = load_layer1_output()
        converted = convert_layer1_to_layer2_format(layer1_output)

        # Run optimization to get current schedule
        optimization_result = run_layer2_service(
            service_day="weekday",
            use_layer1_output=True,
        )

        # Initialize analyzer and get standby trains
        analyzer = WhatIfAnalyzer()
        standby_trains = analyzer.get_standby_trains(optimization_result, converted["readiness"])

        return {
            "standby_trains": standby_trains,
            "total_standby": len(standby_trains),
            "scheduled_trains_count": len(optimization_result.get("optimized_assignments", [])),
            "generated_at": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get standby trains: {str(e)}")

@app.get("/whatif/scenarios")
def get_all_swap_scenarios():
    """Get all possible train swap scenarios for analysis using Layer 1 output."""
    try:
        layer1_output = load_layer1_output()
        converted = convert_layer1_to_layer2_format(layer1_output)

        # Run optimization to get current schedule
        optimization_result = run_layer2_service(
            service_day="weekday",
            use_layer1_output=True,
        )

        # Initialize analyzer and get all scenarios
        analyzer = WhatIfAnalyzer()
        scenarios = analyzer.get_all_swap_scenarios(optimization_result, converted["readiness"])

        # Limit to first 20 scenarios to avoid overwhelming response
        limited_scenarios = scenarios[:20]

        return {
            "swap_scenarios": limited_scenarios,
            "total_possible_scenarios": len(scenarios),
            "showing_first": len(limited_scenarios),
            "scheduled_trains": len(optimization_result.get("optimized_assignments", [])),
            "standby_trains": len(analyzer.get_standby_trains(optimization_result, converted["readiness"])),
            "generated_at": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get swap scenarios: {str(e)}")

@app.post("/whatif/analyze")
def analyze_swap(request: SwapAnalysisRequest):
    """Analyze a specific train swap scenario using Layer 1 output."""
    try:
        layer1_output = load_layer1_output()
        converted = convert_layer1_to_layer2_format(layer1_output)

        # Run optimization to get current schedule
        optimization_result = run_layer2_service(
            service_day="weekday",
            use_layer1_output=True,
        )

        # Validate that trains exist
        scheduled_trains = [train["train_id"] for train in optimization_result.get("optimized_assignments", [])]
        all_readiness_trains = [train["train_id"] for train in converted["readiness"]]

        if request.scheduled_train_id not in scheduled_trains:
            raise HTTPException(
                status_code=400, 
                detail=f"Train {request.scheduled_train_id} is not currently scheduled"
            )

        if request.standby_train_id not in all_readiness_trains:
            raise HTTPException(
                status_code=400, 
                detail=f"Train {request.standby_train_id} not found in readiness data"
            )

        if request.standby_train_id in scheduled_trains:
            raise HTTPException(
                status_code=400, 
                detail=f"Train {request.standby_train_id} is already scheduled"
            )

        # Perform the swap analysis
        analysis = analyze_train_swap(
            optimization_result=optimization_result,
            scheduled_train_id=request.scheduled_train_id,
            standby_train_id=request.standby_train_id,
            original_readiness_data=converted["readiness"],
            gemini_api_key=request.gemini_api_key
        )

        return analysis

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Swap analysis failed: {str(e)}")

@app.post("/whatif/analyze-with-data")
def analyze_swap_with_custom_data(
    payload: ScheduleRequest, 
    swap_request: SwapAnalysisRequest
):
    """Analyze train swap scenario with custom input data instead of test data"""
    try:
        # Validate input data
        validation = validate_input_data(payload.parking, payload.readiness, payload.ads)
        
        if not validation["valid"]:
            raise HTTPException(status_code=400, detail={
                "message": "Invalid input data",
                "errors": validation["errors"]
            })
        
        # Run optimization to get current schedule
        target_date = None
        if payload.service_date:
            target_date = validate_date_format(payload.service_date)
        
        optimization_result = run_layer2_service(
            parking_json=payload.parking,
            readiness_json=payload.readiness,
            ads_json=payload.ads,
            service_day=payload.service_day or "weekday",
            service_date=target_date
        )
        
        # Validate that trains exist
        scheduled_trains = [train["train_id"] for train in optimization_result.get("optimized_assignments", [])]
        all_readiness_trains = [train["train_id"] for train in payload.readiness]
        
        if swap_request.scheduled_train_id not in scheduled_trains:
            raise HTTPException(
                status_code=400, 
                detail=f"Train {swap_request.scheduled_train_id} is not currently scheduled"
            )
        
        if swap_request.standby_train_id not in all_readiness_trains:
            raise HTTPException(
                status_code=400, 
                detail=f"Train {swap_request.standby_train_id} not found in readiness data"
            )
        
        if swap_request.standby_train_id in scheduled_trains:
            raise HTTPException(
                status_code=400, 
                detail=f"Train {swap_request.standby_train_id} is already scheduled"
            )
        
        # Perform the swap analysis
        analysis = analyze_train_swap(
            optimization_result=optimization_result,
            scheduled_train_id=swap_request.scheduled_train_id,
            standby_train_id=swap_request.standby_train_id,
            original_readiness_data=payload.readiness,
            gemini_api_key=swap_request.gemini_api_key
        )
        
        # Add input validation to response
        analysis["input_validation"] = validation
        
        return analysis
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Custom swap analysis failed: {str(e)}")

@app.get("/whatif/quick-analysis/{scheduled_train_id}/{standby_train_id}")
def quick_swap_analysis(scheduled_train_id: str, standby_train_id: str):
    """Quick swap analysis using test data - simplified endpoint"""
    try:
        request = SwapAnalysisRequest(
            scheduled_train_id=scheduled_train_id,
            standby_train_id=standby_train_id,
            gemini_api_key=None
        )
        
        return analyze_swap(request)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Quick analysis failed: {str(e)}")

# Get timetable information with departure slots
@app.get("/timetable/info")
def get_timetable_info_endpoint(service_date: Optional[str] = None):
    """Get detailed timetable configuration and departure slots"""
    try:
        target_date = date.today()
        if service_date:
            target_date = validate_date_format(service_date)
        
        timetable_config = get_timetable_config(target_date)
        departure_slots = generate_departure_slots(timetable_config)
        
        return {
            "service_date": target_date.isoformat(),
            "timetable_config": timetable_config,
            "departure_slots": {
                "count": len(departure_slots),
                "slot_numbers": departure_slots,  # [1,2,3,4,5,6,7,8]
                "note": "Departure slots are now simple rankings (1-8) rather than specific times"
            },
            "generated_at": datetime.now().isoformat(),
            "holiday_check": {
                "is_public_holiday": timetable_config["service_type"] == "public_holiday",
                "service_type": timetable_config["service_type"]
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Timetable generation failed: {str(e)}")

# Data validation endpoint
@app.post("/validate")
def validate_data(payload: ScheduleRequest):
    """Validate input data structure without running optimization"""
    try:
        validation = validate_input_data(payload.parking, payload.readiness, payload.ads)
        
        # Add detailed statistics
        validation["detailed_stats"] = {
            "timestamp": datetime.now().isoformat(),
            "parking_analysis": {
                "total_bays": len(payload.parking.get("bays", [])),
                "assigned_trains": validation["stats"].get("assigned_trains", 0),
                "format_type": validation["stats"].get("parking_format", "unknown")
            },
            "readiness_analysis": {
                "train_count": len(payload.readiness),
                "score_stats": {
                    "min": min([r.get("score", 0) for r in payload.readiness]) if payload.readiness else 0,
                    "max": max([r.get("score", 0) for r in payload.readiness]) if payload.readiness else 0,
                    "avg": sum([r.get("score", 0) for r in payload.readiness]) / len(payload.readiness) if payload.readiness else 0
                },
                "has_summaries": sum([1 for r in payload.readiness if r.get("summary")]),
                "has_details": sum([1 for r in payload.readiness if r.get("details")])
            },
            "ad_analysis": {
                "total_ads": len(payload.ads),
                "note": "Ad data is accepted for compatibility but not used in current optimization",
                "optimization_focus": "Readiness scores and minimal shunting operations"
            }
        }
        
        return validation
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

# Automatic schedule generation (enhanced version of the old endpoint)
@app.get("/schedule/auto")
def schedule_auto(service_date: Optional[str] = None, include_debug: bool = False):
    """
    Automatic schedule generation using Layer 1 output and optional debug information
    """
    try:
        target_date = None
        if service_date:
            target_date = validate_date_format(service_date)

        result = run_layer2_service(
            service_day="weekday",
            service_date=target_date,
            use_layer1_output=True,
        )

        if include_debug:
            # Add debug information
            layer1_output = load_layer1_output()
            converted = convert_layer1_to_layer2_format(layer1_output)
            result["debug_info"] = {
                "input_data_stats": validate_input_data(
                    converted["parking"], 
                    converted["readiness"], 
                    []
                ),
                "timetable_used": get_timetable_config(target_date),
                "processing_timestamp": datetime.now().isoformat(),
                "optimization_factors": {
                    "readiness_weighted": True,
                    "ad_revenue_optimized": False,
                    "demographic_targeting": False,
                    "parking_position_optimized": True,
                    "shunting_penalties_applied": True,
                    "shunting_minimization": "Heavy penalty applied"
                }
            }

        result["optimization_focus"] = "Readiness scores and minimal shunting operations"
        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto scheduling failed: {str(e)}")

# Health check with service status
@app.get("/health")
def health_check():
    """Enhanced health check with service capabilities"""
    try:
        # Test if test data is accessible
        test_data_available = Path(__file__).parent / "test_data.json"
        
        # Test timetable generation
        timetable_test = get_timetable_config()
        
        return {
            "status": "healthy",
            "service": "Kochi Metro Layer-2 Scheduler",
            "version": "2.2.0",
            "timestamp": datetime.now().isoformat(),
            "optimization_focus": "Readiness scores and minimal shunting operations",
            "capabilities": {
                "layer2_optimization": True,
                "timetable_generation": True,
                "readiness_score_optimization": True,  # Updated
                "parking_position_optimization": True,
                "shunting_penalty_calculation": True,
                "minimal_shunting_optimization": True,  # New
                "what_if_analysis": True,
                "train_swap_analysis": True,
                "ai_powered_recommendations": True,
                "test_data_available": test_data_available.exists(),
                "holiday_detection": True,
                # Deprecated capabilities
                "demographic_optimization": False,  # Updated
                "ad_revenue_optimization": False,   # Updated
            },
            "timetable_test": {
                "service_type": timetable_test["service_type"],
                "first_service": timetable_test["first_service"],
                "last_service": timetable_test["last_service"]
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

# Get optimization statistics
@app.get("/stats/optimization")
def get_optimization_stats():
    """Get statistics about optimization capabilities"""
    try:
        layer1_output = load_layer1_output()
        converted = convert_layer1_to_layer2_format(layer1_output)
        validation = validate_input_data(
            converted["parking"], 
            converted["readiness"], 
            []
        )
        
        # Get timetable info for today and public holiday
        today_timetable = get_timetable_config(date.today())
        today_slots = generate_departure_slots(today_timetable)
        
        # Get holiday timetable example
        holiday_timetable = {
            "first_service": "06:00",
            "last_service": "22:30",
            "peak_hours": [(8, 20)],
            "peak_headway": 9.75,
            "off_peak_headway": 11,
            "service_type": "public_holiday"
        }
        holiday_slots = generate_departure_slots(holiday_timetable)
        
        return {
            "sample_data_stats": validation["stats"],
            "optimization_capabilities": {
                "max_trains_supported": max(len(today_slots), len(holiday_slots)),
                "timetable_types": ["regular", "public_holiday"],
                "optimization_factors": [
                    "Train readiness scores (primary)",
                    "Parking position optimization", 
                    "Shunting penalty minimization (heavy focus)",
                    "Position-based bonuses for front trains"
                ],
                "what_if_analysis": [
                    "Train swap scenario analysis",
                    "AI-powered impact assessment",
                    "Safety risk evaluation",
                    "Passenger impact analysis",
                    "Maintenance implications"
                ],
                "deprecated_features": [
                    "Ad revenue maximization", 
                    "Demographic time targeting"
                ]
            },
            "schedule_capacity": {
                "regular_day": {
                    "departure_slots": len(today_slots),
                    "service_hours": f"{today_timetable['first_service']} - {today_timetable['last_service']}",
                    "headway_peak": f"{today_timetable['peak_headway']} min",
                    "headway_off_peak": f"{today_timetable['off_peak_headway']} min"
                },
                "public_holiday": {
                    "departure_slots": len(holiday_slots),
                    "service_hours": f"{holiday_timetable['first_service']} - {holiday_timetable['last_service']}",
                    "headway_peak": f"{holiday_timetable['peak_headway']} min",
                    "headway_off_peak": f"{holiday_timetable['off_peak_headway']} min"
                }
            },
            "today_schedule_info": {
                "service_type": today_timetable["service_type"],
                "is_holiday": today_timetable["service_type"] == "public_holiday"
            },
            "optimization_focus": "Readiness scores and minimal shunting operations"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stats generation failed: {str(e)}")

@app.post("/overrides/submit")
def submit_override(payload: Dict[str, Any]):
    """Append an override decision with reasons to overrides.json"""
    try:
        overrides = []
        if OVERRIDES_PATH.exists():
            with OVERRIDES_PATH.open("r", encoding="utf-8") as f:
                overrides = json.load(f)
        # Persist only the two train configurations and reason
        record = {
            "timestamp": datetime.now().isoformat(),
            "from_train": payload.get("scheduled_train_config") or payload.get("scheduled_train_id"),
            "to_train": payload.get("standby_train_config") or payload.get("standby_train_id"),
            "reason": payload.get("reason", "")
        }
        overrides.append(record)
        OVERRIDES_PATH.parent.mkdir(parents=True, exist_ok=True)
        with OVERRIDES_PATH.open("w", encoding="utf-8") as f:
            json.dump(overrides, f, indent=2)
        return {"status": "ok", "count": len(overrides)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save override: {str(e)}")

# In your main.py, update the get_override_suggestions function:

@app.get("/overrides/suggestions")
@app.get("/overrides/suggestions")
def get_override_suggestions():
    """Generate suggested overrides using Gemini by learning from historical override patterns"""
    try:
        # Load current schedule data
        layer1_output = load_layer1_output()
        converted = convert_layer1_to_layer2_format(layer1_output)
        optimization_result = run_layer2_service(
            service_day="weekday",
            use_layer1_output=True,
        )
        
        # Load past overrides - this is the key learning data
        overrides = []
        if OVERRIDES_PATH.exists():
            with OVERRIDES_PATH.open("r", encoding="utf-8") as f:
                overrides = json.load(f)
        
        # If no historical overrides, return empty suggestions (nothing to learn from)
        if not overrides:
            return {
                "status": "no_history",
                "suggestions": [],
                "message": "No historical overrides found. AI needs past decisions to learn patterns.",
                "generated_at": datetime.now().isoformat()
            }
        
        # Prepare current operational data
        current_trains = optimization_result.get("optimized_assignments", [])
        standby_trains = optimization_result.get("standby_trains", [])
        
        # Analyze historical override patterns
        recent_overrides = overrides[-10:]  # Last 10 overrides for pattern analysis
        
        # Try to get AI suggestions based on historical patterns
        try:
            analyzer = WhatIfAnalyzer()
            model = analyzer.model
            
            if model:
                prompt = f"""
You are an AI assistant for Kochi Metro operations. Your task is to analyze the station master's historical override decisions and suggest similar overrides they might want to apply today based on their past reasoning patterns.

CONTEXT:
The current schedule is already optimized by CP-SAT considering all operational constraints. However, station masters sometimes apply manual overrides based on their experience and situational awareness.

HISTORICAL OVERRIDE PATTERNS (last {len(recent_overrides)} decisions):
{json.dumps(recent_overrides, indent=2)}

CURRENT OPERATIONAL SITUATION:
- Scheduled Trains: {len(current_trains)} trains
- Standby Trains: {len(standby_trains)} trains
- Service Type: {optimization_result.get('timetable_info', {}).get('service_type', 'weekday')}

DETAILED CURRENT TRAIN STATUS:
Scheduled Trains (first 8):
{json.dumps([{
    'train_id': t['train_id'],
    'readiness': t.get('readiness', 0),
    'bay': t.get('bay', ''),
    'slot': t.get('departure_slot', 0),
    'needs_shunting': t.get('needs_shunting', False),
    'readiness_summary': t.get('readiness_summary', '')[:100] + '...' if t.get('readiness_summary') else 'No issues'
} for t in current_trains[:8]], indent=2)}

Available Standby Trains:
{json.dumps([{
    'train_id': t['train_id'],
    'readiness': t.get('readiness', 0),
    'bay': t.get('bay', ''),
    'position': t.get('bay_position', 0),
    'readiness_summary': t.get('readiness_summary', '')[:100] + '...' if t.get('readiness_summary') else 'Ready'
} for t in standby_trains[:6]], indent=2)}

YOUR TASK:
Based on the station master's historical override patterns and reasoning, suggest 2-3 overrides (not less than 2) they might want to apply today. Focus on:
1. Similar reasoning patterns from their history
2. Operational situations that mirror past override scenarios
3. Their preferred types of swaps (readiness issues, maintenance concerns, operational efficiency, etc.)

IMPORTANT: Do NOT try to optimize the schedule. The CP-SAT optimization is already perfect. Instead, suggest overrides that align with the human station master's historical decision-making patterns.

Return ONLY valid JSON in this exact format:
{{
    "suggestions": [
        {{
            "from_train": "TR001",
            "to_train": "ST001", 
            "reason": "Similar to your override on 2024-01-15 where you swapped due to critical maintenance alerts. Train TR001 has pending job cards that match your historical concern patterns.",
            "confidence": "high",
            "historical_pattern": "Maintenance urgency",
            "pattern_match": "Similar to override #3 from 2024-01-15"
        }}
    ],
    "analysis": "Brief summary of observed patterns"
}}

Key elements to include in reasons:
- Reference specific historical overrides and their reasoning
- Match the station master's typical concern patterns
- Consider operational context similarities
- Maintain their preferred phrasing and priority areas
"""

                response = model.generate_content(prompt)
                text = response.text
                
                # Clean the response text
                text = text.strip()
                if '```json' in text:
                    text = text.split('```json')[1].split('```')[0]
                elif '```' in text:
                    text = text.split('```')[1].split('```')[0]
                
                data = json.loads(text)
                suggestions = data.get("suggestions", [])
                
                # Add historical context to each suggestion
                for suggestion in suggestions:
                    suggestion['learning_source'] = 'historical_patterns'
                    suggestion['historical_basis'] = f"Based on analysis of {len(recent_overrides)} past overrides"
                
            else:
                suggestions = create_pattern_based_suggestions(recent_overrides, current_trains, standby_trains)
                
        except Exception as e:
            logger.warning(f"Gemini pattern analysis failed: {e}")
            suggestions = create_pattern_based_suggestions(recent_overrides, current_trains, standby_trains)
        
        # Save suggestions
        SUGGESTIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with SUGGESTIONS_PATH.open("w", encoding="utf-8") as f:
            json.dump({
                "suggestions": suggestions, 
                "generated_at": datetime.now().isoformat(),
                "source": "ai_pattern_analysis",
                "historical_basis": f"Analyzed {len(recent_overrides)} past overrides",
                "total_overrides_history": len(overrides)
            }, f, indent=2)
        
        return {
            "status": "ok",
            "suggestions": suggestions,
            "generated_at": datetime.now().isoformat(),
            "historical_basis": f"Based on {len(overrides)} historical overrides",
            "pattern_analysis": True
        }
        
    except Exception as e:
        logger.error(f"Override suggestions error: {e}")
        return {
            "status": "error",
            "suggestions": [],
            "error": str(e),
            "generated_at": datetime.now().isoformat()
        }

def create_fallback_suggestions(optimization_result):
    """Create basic suggestions when AI fails"""
    suggestions = []
    
    try:
        current_trains = optimization_result.get("optimized_assignments", [])
        standby_trains = optimization_result.get("standby_trains", [])
        
        # Simple logic: suggest swapping low-readiness trains with high-readiness standby
        low_readiness_trains = [t for t in current_trains if t.get('readiness', 0) < 80]
        high_readiness_standby = [t for t in standby_trains if t.get('readiness', 0) > 90]
        
        for i in range(min(2, len(low_readiness_trains), len(high_readiness_standby))):
            if i < len(high_readiness_standby):
                suggestions.append({
                    "from_train": low_readiness_trains[i]['train_id'],
                    "to_train": high_readiness_standby[i]['train_id'],
                    "reason": f"Improve readiness from {low_readiness_trains[i].get('readiness', 0)}% to {high_readiness_standby[i].get('readiness', 0)}%",
                    "confidence": "medium"
                })
                
    except Exception as e:
        logger.warning(f"Fallback suggestions failed: {e}")
    
    return suggestions

@app.get("/overrides/suggestions/latest")
def get_latest_override_suggestions():
    """Return last generated override suggestions from suggestions.json"""
    try:
        if not SUGGESTIONS_PATH.exists():
            return {"status": "empty", "suggestions": []}
        with SUGGESTIONS_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return {"status": "ok", "suggestions": data.get("suggestions", []), "generated_at": data.get("generated_at")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read suggestions: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5005)