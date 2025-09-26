import json
import math
from datetime import datetime, timedelta
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

# Enhanced station timings with inter-station durations
STATION_TIMINGS = [
    {"station": "Aluva", "cumulative_time": 0, "next_station_duration": 2},
    {"station": "Pulinchodu", "cumulative_time": 2, "next_station_duration": 2},
    {"station": "Companypady", "cumulative_time": 4, "next_station_duration": 2},
    {"station": "Ambattukavu", "cumulative_time": 6, "next_station_duration": 2},
    {"station": "Muttom", "cumulative_time": 8, "next_station_duration": 2},
    {"station": "Kalamassery Town", "cumulative_time": 10, "next_station_duration": 2},
    {"station": "Cochin University", "cumulative_time": 12, "next_station_duration": 2},
    {"station": "Pathadipalam", "cumulative_time": 14, "next_station_duration": 3},
    {"station": "Edappally", "cumulative_time": 17, "next_station_duration": 2},
    {"station": "Changampuzha Park", "cumulative_time": 19, "next_station_duration": 5},
    {"station": "Palarivattom", "cumulative_time": 24, "next_station_duration": 3},
    {"station": "JLN Stadium", "cumulative_time": 27, "next_station_duration": 3},
    {"station": "Kaloor", "cumulative_time": 30, "next_station_duration": 2},
    {"station": "Town Hall", "cumulative_time": 32, "next_station_duration": 2},
    {"station": "M.G Road", "cumulative_time": 34, "next_station_duration": 2},
    {"station": "Maharaja's College", "cumulative_time": 36, "next_station_duration": 2},
    {"station": "Ernakulam South", "cumulative_time": 38, "next_station_duration": 2},
    {"station": "Kadavanthra", "cumulative_time": 40, "next_station_duration": 1},
    {"station": "Elamkulam", "cumulative_time": 41, "next_station_duration": 2},
    {"station": "Vytilla", "cumulative_time": 43, "next_station_duration": 2},
    {"station": "Thaikoodam", "cumulative_time": 45, "next_station_duration": 1},
    {"station": "Pettah", "cumulative_time": 46, "next_station_duration": 0}
]

def get_station_timings():
    return STATION_TIMINGS

# Delay-related keyword heuristics
DELAY_KEYWORDS = [
    "brake", "door", "traction", "signalling", "signal", "fault", "engine", "wheel",
    "axle", "coupler", "bogie", "bearing", "pantograph", "compressor", "pneumatic",
    "air leak", "leak", "vibration", "overheat", "overheating", "wheel flat", "tcms",
    "controller", "converter", "battery", "hv cable", "sensor", "speed sensor"
]
NON_DELAY_KEYWORDS = [
    "ac", "air conditioning", "livery", "paint", "clean", "cleaning", "seat", "seat repair",
    "interior", "light", "lighting", "advert", "advertisement", "branding", "vinyl"
]

def get_hourly_weather_forecast(date_str: str) -> Dict[str, Any]:
    """Get hourly weather forecast for more accurate delay predictions"""
    try:
        date_obj = datetime.fromisoformat(date_str)
        month = date_obj.month
        
        # Mock hourly weather patterns
        hourly_forecast = {}
        for hour in range(5, 23):  # From 5 AM to 10 PM
            if month in [6, 7, 8, 9]:  # Monsoon
                if hour in [7, 8, 17, 18]:  # Peak hours - heavier rain
                    hourly_forecast[hour] = {
                        "condition": "heavy_rain",
                        "intensity": "heavy",
                        "visibility": "poor",
                        "delay_multiplier": 1.4
                    }
                else:
                    hourly_forecast[hour] = {
                        "condition": "moderate_rain", 
                        "intensity": "moderate",
                        "visibility": "fair",
                        "delay_multiplier": 1.2
                    }
            elif month in [3, 4, 5]:  # Summer
                if hour in [12, 13, 14]:  # Peak heat
                    hourly_forecast[hour] = {
                        "condition": "hot_sunny",
                        "temperature": "very_high", 
                        "visibility": "excellent",
                        "delay_multiplier": 1.1  # Slight delay due to heat
                    }
                else:
                    hourly_forecast[hour] = {
                        "condition": "sunny",
                        "visibility": "excellent",
                        "delay_multiplier": 0.9
                    }
            else:  # Winter
                if hour in [6, 7, 19, 20]:  # Morning/evening fog
                    hourly_forecast[hour] = {
                        "condition": "foggy",
                        "visibility": "poor",
                        "delay_multiplier": 1.3
                    }
                else:
                    hourly_forecast[hour] = {
                        "condition": "clear",
                        "visibility": "good", 
                        "delay_multiplier": 1.0
                    }
        
        return {
            "date": date_str,
            "hourly_forecast": hourly_forecast,
            "overall_condition": "variable"  # Since it changes hourly
        }
    except:
        # Default forecast
        return {
            "date": date_str,
            "hourly_forecast": {h: {"condition": "normal", "delay_multiplier": 1.0} for h in range(5, 23)},
            "overall_condition": "normal"
        }

def calculate_usage_based_delay(train_config: Dict, trip_hour: int) -> float:
    """Calculate delay based on train usage and job cards - more realistic"""
    delay = 0.0
    current_mileage = train_config.get("current_mileage", {})
    thresholds = train_config.get("maintenance_thresholds", {})
    job_cards = train_config.get("job_cards", [])
    
    # Base usage factor (higher during peak hours)
    peak_hours = [7, 8, 9, 17, 18, 19]
    usage_factor = 1.2 if trip_hour in peak_hours else 1.0
    
    # Calculate component wear delays
    for component, mileage in current_mileage.items():
        threshold = thresholds.get(component, 10000)
        utilization = mileage / threshold if threshold > 0 else 0
        
        # Only cause delay if utilization is high AND there are relevant job cards
        relevant_jobs = [j for j in job_cards if component in j.get("description", "").lower()]
        
        if utilization > 0.85 and relevant_jobs:
            # Higher utilization + relevant job cards = more delay
            delay += (utilization - 0.85) * 10 * usage_factor  # Up to 1.5 min delay
        elif utilization > 0.75:
            # High utilization but no relevant job cards - minor delay
            delay += (utilization - 0.75) * 3 * usage_factor  # Up to 0.75 min delay
    
    return min(delay, 5.0)  # Cap at 5 minutes

def calculate_job_card_impact(job_cards: List[Dict], trip_hour: int) -> Dict[str, Any]:
    """Calculate job card impact with descriptions for significant delays.
    Only consider delay-relevant job cards by description keywords and ignore routine/non-delay tasks."""
    total_delay = 0.0
    delay_details = []
    
    for job in job_cards:
        criticality = job.get("criticality", "low")
        estimated_hours = job.get("estimated_hours", 0)
        description = job.get("description", "")
        desc_lower = description.lower()
        # Filter by relevance
        is_non_delay = any(k in desc_lower for k in NON_DELAY_KEYWORDS)
        is_delay_related = any(k in desc_lower for k in DELAY_KEYWORDS)
        if is_non_delay and not is_delay_related:
            # Ignore purely cosmetic/non-delay tasks (e.g., AC service, livery)
            continue
        
        # Delay increases with criticality and during peak hours
        peak_multiplier = 1.3 if trip_hour in [7, 8, 9, 17, 18, 19] else 1.0
        
        if criticality == "high":
            delay = min(estimated_hours * 0.1 * peak_multiplier, 3.0)  # Max 3 min per high critical job
            total_delay += delay
            if delay > 0.5:  # Only show significant delays
                delay_details.append(f"{description}: +{delay:.1f}min")
        elif criticality == "medium":
            delay = min(estimated_hours * 0.05 * peak_multiplier, 1.5)
            total_delay += delay
            if delay > 1.0:  # Show if delay > 1 min
                delay_details.append(f"{description}: +{delay:.1f}min")
        elif criticality == "low":
            delay = min(estimated_hours * 0.02 * peak_multiplier, 0.5)
            total_delay += delay
            # Don't show low criticality delays in details
    
    return {
        "total_delay": total_delay,
        "details": delay_details,
        "high_critical_count": len([j for j in job_cards if j.get("criticality") == "high"])
    }

def calculate_weather_delay(weather_data: Dict, trip_hour: int, station: str) -> float:
    """Calculate weather delay based on hour and station location"""
    hourly_weather = weather_data.get("hourly_forecast", {}).get(trip_hour, {})
    multiplier = hourly_weather.get("delay_multiplier", 1.0)
    
    # Base delay varies by station (some stations more affected by weather)
    station_delay_factor = 1.0
    if station in ["Pettah", "Thaikoodam", "Vytilla"]:  # Outdoor stations more affected
        station_delay_factor = 1.2
    elif station in ["Aluva", "Edappally"]:  # Major stations
        station_delay_factor = 1.1
    
    condition = hourly_weather.get("condition", "normal")
    base_delay = 0.0
    
    if condition in ["heavy_rain", "stormy"]:
        base_delay = 2.0
    elif condition in ["moderate_rain", "foggy"]:
        base_delay = 1.0
    elif condition == "hot_sunny":
        base_delay = 0.5
    
    return base_delay * multiplier * station_delay_factor

def calculate_trip_delays(train_config: Dict, weather_data: Dict, trip_hour: int, station: str) -> Dict[str, Any]:
    """Calculate all delays for a specific trip hour and station"""
    job_cards = train_config.get("job_cards", [])
    
    usage_delay = calculate_usage_based_delay(train_config, trip_hour)
    job_impact = calculate_job_card_impact(job_cards, trip_hour)
    weather_delay = calculate_weather_delay(weather_data, trip_hour, station)
    
    total_delay = usage_delay + job_impact["total_delay"] + weather_delay
    
    delay_reasons = []
    if usage_delay > 0.5:
        delay_reasons.append(f"Open maintenance Job cards: +{usage_delay:.1f}min")
    
    delay_reasons.extend(job_impact["details"])  # Only significant job delays
    
    if weather_delay > 0.5:
        delay_reasons.append(f"Weather: +{weather_delay:.1f}min")
    
    return {
        "total_delay": total_delay,
        "breakdown": {
            "usage": usage_delay,
            "job_cards": job_impact["total_delay"],
            "weather": weather_delay
        },
        "delay_reasons": delay_reasons,
        "significant_delay": total_delay > 2.0  # Flag for UI
    }

def generate_continuous_rotation(
    scheduled_trains: List[Dict],
    train_configs: Dict, 
    station_timings: List[Dict],
    weather_data: Dict,
    service_date: str
) -> Dict[str, Any]:
    """Generate continuous rotation throughout the day"""
    
    train_schedules = []
    base_trip_time = station_timings[-1]["cumulative_time"]  # 46 minutes to Pettah
    turnaround_time = 8  # minutes at terminal stations
    depot_to_station_time = 5  # minutes from depot to Aluva station
    
    # Service hours: 7:30 AM to 10:00 PM
    service_start = datetime.strptime("07:30", "%H:%M")
    service_end = datetime.strptime("22:00", "%H:%M")
    
    for train in scheduled_trains:
        train_id = train.get("train_id")
        departure_slot = train.get("departure_slot", 1)
        
        # Staggered start times based on slot
        first_departure = service_start + timedelta(minutes=(departure_slot - 1) * 10)
        
        train_config = next((t for t in train_configs.get("trains", []) if t["id"] == train_id), None)
        if not train_config:
            continue
        
        station_events = []
        rotation_count = 0
        current_departure = first_departure
        
        # Generate rotations throughout the day
        while current_departure <= service_end and rotation_count < 8:  # Max 8 rotations per train
            rotation_count += 1
            
            # Forward journey (Aluva to Pettah)
            for i, station in enumerate(station_timings):
                trip_hour = current_departure.hour
                station_name = station["station"]
                
                # Calculate delays for this station
                delays = calculate_trip_delays(train_config, weather_data, trip_hour, station_name)
                
                # Scheduled arrival (without delays)
                scheduled_arrival = current_departure + timedelta(minutes=station["cumulative_time"])
                
                # Progressive delay accumulation
                if i == 0:  # First station - minimal delay
                    current_delay = delays["total_delay"] * 0.1
                else:
                    # Delay increases progressively through the journey
                    progress_ratio = station["cumulative_time"] / base_trip_time
                    current_delay = delays["total_delay"] * progress_ratio
                
                expected_arrival = scheduled_arrival + timedelta(minutes=current_delay)
                
                station_events.append({
                    "station": station_name,
                    "scheduled_arrival": scheduled_arrival.strftime("%H:%M"),
                    "expected_arrival": expected_arrival.strftime("%H:%M"),
                    "delay_minutes": round(current_delay, 1),
                    "delay_reasons": delays["delay_reasons"] if current_delay > 0.5 else [],
                    "direction": "forward",
                    "rotation": rotation_count,
                    "sequence": len(station_events),
                    "next_station_duration": station["next_station_duration"],
                    "cumulative_time": station["cumulative_time"],
                    "significant_delay": delays["significant_delay"] and current_delay > 1.0
                })
            
            # Arrival at Pettah - turnaround time
            pettah_arrival = current_departure + timedelta(minutes=base_trip_time + delays["total_delay"])
            return_departure = pettah_arrival + timedelta(minutes=turnaround_time)
            
            # Return journey (Pettah to Aluva)
            for i, station in enumerate(reversed(station_timings)):
                trip_hour = return_departure.hour
                station_name = station["station"]
                return_time_from_pettah = base_trip_time - station["cumulative_time"]
                
                delays_return = calculate_trip_delays(train_config, weather_data, trip_hour, station_name)
                
                scheduled_return_arrival = return_departure + timedelta(minutes=return_time_from_pettah)
                
                # Progressive delay for return journey
                progress_ratio = return_time_from_pettah / base_trip_time
                current_delay_return = delays_return["total_delay"] * progress_ratio
                
                expected_return_arrival = scheduled_return_arrival + timedelta(minutes=current_delay_return)
                
                station_events.append({
                    "station": station_name,
                    "scheduled_arrival": scheduled_return_arrival.strftime("%H:%M"),
                    "expected_arrival": expected_return_arrival.strftime("%H:%M"),
                    "delay_minutes": round(current_delay_return, 1),
                    "delay_reasons": delays_return["delay_reasons"] if current_delay_return > 0.5 else [],
                    "direction": "return",
                    "rotation": rotation_count,
                    "sequence": len(station_events),
                    "next_station_duration": station["next_station_duration"],
                    "cumulative_time": station["cumulative_time"],
                    "significant_delay": delays_return["significant_delay"] and current_delay_return > 1.0
                })
            
            # Next rotation departure from Aluva
            aluva_arrival = return_departure + timedelta(minutes=base_trip_time + delays_return["total_delay"])
            current_departure = aluva_arrival + timedelta(minutes=turnaround_time)
        
        train_schedules.append({
            "train_id": train_id,
            "departure_slot": departure_slot,
            "readiness": train.get("readiness", 0),
            "total_rotations": rotation_count,
            "station_events": station_events,
            "first_departure": first_departure.strftime("%H:%M"),
            "last_arrival": current_departure.strftime("%H:%M"),
            "train_config": {
                "job_cards_count": len(train_config.get("job_cards", [])),
                "high_critical_jobs": len([j for j in train_config.get("job_cards", []) if j.get("criticality") == "high"]),
                "total_mileage": sum(train_config.get("current_mileage", {}).values())
            }
        })
    
    return {
        "service_date": service_date,
        "weather_conditions": weather_data,
        "total_trains": len(train_schedules),
        "service_hours": {"start": "07:30", "end": "22:00"},
        "train_schedules": train_schedules,
        "stations": [s["station"] for s in station_timings],
        "station_timings": station_timings,
        "summary": generate_summary_statistics(train_schedules)
    }

def generate_summary_statistics(train_schedules):
    """Generate summary statistics for the rotation"""
    all_events = [event for train in train_schedules for event in train["station_events"]]
    delayed_events = [e for e in all_events if e["delay_minutes"] > 1.0]
    significant_delays = [e for e in all_events if e["significant_delay"]]
    
    return {
        "total_events": len(all_events),
        "delayed_events": len(delayed_events),
        "significant_delays": len(significant_delays),
        "max_delay": max([e["delay_minutes"] for e in all_events]) if all_events else 0,
        "avg_delay": round(sum(e["delay_minutes"] for e in all_events) / len(all_events), 1) if all_events else 0
    }

# Update the main function to use continuous rotation
def generate_rotation_schedule(scheduled_trains, train_configs, station_timings, weather_data, service_date):
    return generate_continuous_rotation(scheduled_trains, train_configs, station_timings, weather_data, service_date)

# Update weather function call in main.py endpoint
def get_weather_forecast(date_str: str):
    return get_hourly_weather_forecast(date_str)