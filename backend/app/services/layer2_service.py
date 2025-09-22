from ortools.sat.python import cp_model
from typing import Dict, Any, List
from datetime import datetime, date, timedelta
import json
from pathlib import Path
import holidays
import os

def load_layer1_output() -> Dict[str, Any]:
    """Load the actual output from Layer 1 optimization"""
    try:
        output_path = Path(__file__).parent.parent.parent / "data" / "output.json"
        with open(output_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        # Fallback to test data if output.json doesn't exist
        test_path = Path(__file__).parent.parent / "test_data.json"
        with test_path.open() as f:
            return json.load(f)

def load_parking_override() -> List[Dict[str, Any]]:
    """Optionally load parking.json (synthetic for now) to override parking assignments.
    Expected format: [{"train_id": "TM001", "bay": "PT01", "position": 1}, ...]
    """
    try:
        path = Path(__file__).parent.parent.parent / "data" / "parking.json"
        if path.exists():
            with path.open("r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, list):
                    return data
    except Exception:
        pass
    return []

def convert_layer1_to_layer2_format(layer1_output: Dict[str, Any]) -> Dict[str, Any]:
    """Convert Layer 1 output format to Layer 2 input format"""
    
    # Extract parking assignments from optional parking.json override, else Layer 1
    override = load_parking_override()
    if override:
        parking_assignments = override
    else:
        parking_assignments = []
        for assignment in layer1_output.get("parking_assignments", []):
            parking_assignments.append({
                "train_id": assignment["train_id"],
                "bay": assignment["track_id"],
                "position": assignment["position_in_track"]
            })
    
    # Extract readiness data
    readiness_data = []
    for item in layer1_output.get("readiness_scores", []):
        # Add a top-level summary for validation/UI convenience
        details_dict = item.get("details", {}) or {}
        summary_text = details_dict.get("summary") or details_dict.get("combined") or item.get("summary") or ""
        new_item = dict(item)
        new_item["summary"] = summary_text
        readiness_data.append(new_item)
    
    return {
        "parking": {
            "assignments": parking_assignments,
            "total_shunting_moves": layer1_output.get("total_shunting_moves", 0),
            "optimization_date": layer1_output.get("metadata", {}).get("processing_time", datetime.now().isoformat())
        },
        "readiness": readiness_data,
        "trains_to_service": layer1_output.get("trains_to_service", []),
        "trains_to_standby": layer1_output.get("trains_to_standby", []),
        "trains_to_ibl": layer1_output.get("trains_to_ibl", [])
    }

def get_timetable_config(service_date=None):
    """Get the appropriate timetable configuration based on date"""
    if service_date is None:
        service_date = date.today()
    
    # Check if it's a public holiday in Kerala, India
    try:
        in_holidays = holidays.India(subdiv='KL', years=service_date.year)
        is_public_holiday = service_date in in_holidays
    except:
        # Fallback if holidays package is not available
        is_public_holiday = False
    
    if is_public_holiday:
        # Public holiday timetable
        return {
            "first_service": "06:00",
            "last_service": "22:30",
            "peak_hours": [(8, 20)],  # 08:00-20:00
            "peak_headway": 9.75,     # 9 minutes 45 seconds
            "off_peak_headway": 11,   # 11 minutes
            "service_type": "public_holiday"
        }
    else:
        # Regular day timetable
        return {
            "first_service": "07:30",
            "last_service": "22:30",
            "peak_hours": [(8, 20)],  # 08:00-20:00
            "peak_headway": 9.083,    # 9 minutes 5 seconds
            "off_peak_headway": 9.083, # Same as peak for regular days
            "service_type": "regular"
        }

def _generate_scheduling_rationale(
    train_id: str, 
    train_positions: Dict, 
    bay_assignments: Dict, 
    readiness_lookup: Dict,
    all_valid_trains: List[str],
    chosen_slot: int,
    needs_shunting: bool,
    got_priority_slot: bool,
    layer1_details: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Generate rationale for why this specific train was selected"""
    
    train_readiness = readiness_lookup[train_id]
    train_position = train_positions[train_id]
    train_bay = bay_assignments[train_id]
    
    # Get Layer 1 details if available
    layer1_info = ""
    if layer1_details and train_id in layer1_details:
        details = layer1_details[train_id].get("details", {})
        if "combined" in details:
            # Extract key reasons from Layer 1
            combined = details["combined"]
            if "❌ Expired certificates" in combined:
                layer1_info = "Had expired certificates in Layer 1"
            elif "❌ Critical job card" in combined:
                layer1_info = "Had critical job cards in Layer 1"
            elif "❌ Overdue for" in combined:
                layer1_info = "Was overdue for maintenance in Layer 1"
            elif "🚨" in combined:
                layer1_info = "Had urgent issues in Layer 1"
            elif "⚠️" in combined:
                layer1_info = "Had warnings in Layer 1"
    
    # Find other trains in same bay for comparison
    same_bay_trains = [t for t in all_valid_trains 
                      if bay_assignments[t] == train_bay and t != train_id]
    
    rationale = {
        "primary_reason": "",
        "secondary_factors": [],
        "readiness_advantage": "",
        "position_advantage": "",
        "shunting_benefit": "",
        "slot_assignment_reason": "",
        "layer1_considerations": layer1_info
    }
    
    # Determine primary reason for selection
    if train_readiness >= 90 and got_priority_slot:
        rationale["primary_reason"] = "high_readiness_priority_slot"
        rationale["readiness_advantage"] = f"High readiness ({train_readiness}%) earned priority slot #{chosen_slot}"
    elif train_position == 1 and not needs_shunting:
        rationale["primary_reason"] = "optimal_position_no_shunting"
        rationale["position_advantage"] = f"Front position in bay {train_bay} requires no shunting operations"
        rationale["shunting_benefit"] = "Avoids shunting penalty (5000 points)"
    elif train_readiness >= 85:
        rationale["primary_reason"] = "good_readiness_score"
        rationale["readiness_advantage"] = f"Solid readiness score ({train_readiness}%) met selection threshold"
    else:
        rationale["primary_reason"] = "best_available_option"
    
    # Add secondary factors
    if train_position == 1:
        rationale["secondary_factors"].append(f"Front position bonus: {800} optimization points")
    
    if chosen_slot <= 3:
        rationale["secondary_factors"].append(f"Early departure slot #{chosen_slot} provides ranking advantage")
    
    # Compare with same-bay alternatives
    if same_bay_trains:
        higher_readiness_in_bay = [t for t in same_bay_trains 
                                  if readiness_lookup[t] > train_readiness]
        if higher_readiness_in_bay:
            behind_trains = [t for t in higher_readiness_in_bay 
                           if train_positions[t] > train_position]
            if behind_trains:
                rationale["shunting_benefit"] = f"Selected over higher-readiness trains {behind_trains} due to better position (avoids shunting)"
    
    rationale["slot_assignment_reason"] = f"Assigned slot #{chosen_slot} based on optimization ranking"
    
    return rationale

def _generate_not_selected_rationale(
    train_id: str,
    train_positions: Dict,
    bay_assignments: Dict,
    readiness_lookup: Dict,
    all_valid_trains: List[str],
    layer1_details: Dict[str, Any] = None
) -> Dict[str, Any]:
    """Generate rationale for why this train was NOT selected"""
    
    train_readiness = readiness_lookup[train_id]
    train_position = train_positions[train_id]
    train_bay = bay_assignments[train_id]
    
    # Get Layer 1 details if available
    layer1_info = ""
    if layer1_details and train_id in layer1_details:
        details = layer1_details[train_id].get("details", {})
        summary = details.get("summary", "")
        if "❌ Must go to IBL" in summary:
            layer1_info = "Was assigned to IBL in Layer 1 due to critical issues"
    
    rationale = {
        "primary_reason": "",
        "readiness_factor": "",
        "position_factor": "",
        "shunting_factor": "",
        "alternative_selected": "",
        "layer1_considerations": layer1_info
    }
    
    # Find other trains in same bay
    same_bay_trains = [t for t in all_valid_trains 
                      if bay_assignments[t] == train_bay and t != train_id]
    
    if train_readiness < 70:  # Lower threshold for rejection
        rationale["primary_reason"] = "low_readiness_score"
        rationale["readiness_factor"] = f"Readiness score ({train_readiness}%) below competitive threshold"
    elif train_position > 2:
        rationale["primary_reason"] = "poor_parking_position"
        rationale["position_factor"] = f"Position #{train_position} in bay {train_bay} would require significant shunting"
        rationale["shunting_factor"] = f"Shunting penalty ({5000} points) made selection uneconomical"
    elif same_bay_trains:
        # Check if there's a better positioned train in same bay
        better_positioned = [t for t in same_bay_trains 
                           if train_positions[t] < train_position and readiness_lookup[t] >= train_readiness]
        if better_positioned:
            rationale["primary_reason"] = "better_alternative_available"
            rationale["alternative_selected"] = f"Train(s) {better_positioned} in same bay had better positions and similar/higher readiness"
    else:
        rationale["primary_reason"] = "insufficient_optimization_score"
        rationale["readiness_factor"] = f"Combined readiness and position score insufficient for top 8 slots"
    
    return rationale

def generate_departure_slots(timetable_config, max_slots=10):
    """Generate slot numbers 1..max_slots (default 10)."""
    return list(range(1, max_slots + 1))

def compute_departure_times(timetable_config: Dict[str, Any], departure_slots: List[int]) -> Dict[int, str]:
    """Compute HH:MM departure time for each slot at fixed 10-minute gaps from first_service."""
    try:
        first = timetable_config.get("first_service", "07:30")
        hours, minutes = map(int, first.split(":"))
    except Exception:
        hours, minutes = 7, 30
    start = datetime(2000, 1, 1, hours, minutes)
    slot_to_time = {}
    for slot in sorted(departure_slots):
        dt = start + timedelta(minutes=(slot - 1) * 10)
        slot_to_time[slot] = dt.strftime("%H:%M")
    return slot_to_time

def run_layer2_service(
    parking_json: Dict[str, Any] = None,
    readiness_json: List[Dict[str, Any]] = None,
    ads_json: List[Dict[str, Any]] = None,  # Keep parameter for compatibility but ignore
    service_day: str = "weekday",
    service_date: date = None,
    use_layer1_output: bool = True  # New parameter to use actual Layer 1 output
) -> Dict[str, Any]:
    """
    Layer 2 optimization: Slot-based train scheduling (1-8 slots)
    Focus on readiness score and minimizing shunting operations
    """
    try:
        # Use Layer 1 output if requested and available
        if use_layer1_output:
            try:
                layer1_output = load_layer1_output()
                if layer1_output and "readiness_scores" in layer1_output:
                    converted_data = convert_layer1_to_layer2_format(layer1_output)
                    parking_json = converted_data["parking"]
                    readiness_json = converted_data["readiness"]
                    print("✅ Using actual Layer 1 output data")
            except Exception as e:
                print(f"⚠️ Could not load Layer 1 output, using provided data: {e}")
                use_layer1_output = False
        
        # If no data provided, use Layer 1 output
        if parking_json is None or readiness_json is None:
            layer1_output = load_layer1_output()
            converted_data = convert_layer1_to_layer2_format(layer1_output)
            parking_json = converted_data["parking"]
            readiness_json = converted_data["readiness"]
            use_layer1_output = True
        
        model = cp_model.CpModel()

        # Extract trains and bay information with positions
        assigned_trains = []
        bay_assignments = {}
        train_positions = {}
        
        if "assignments" in parking_json:
            for assignment in parking_json["assignments"]:
                train_id = assignment["train_id"]
                bay_id = assignment["bay"]
                position = assignment.get("position", 1)  # Default to position 1 (front)
                
                assigned_trains.append(train_id)
                bay_assignments[train_id] = bay_id
                train_positions[train_id] = position
        else:
            # Legacy format handling
            assigned_trains = list(parking_json.keys()) if isinstance(parking_json, dict) else []
            bay_assignments = parking_json if isinstance(parking_json, dict) else {}
            # Assign default positions
            for train in assigned_trains:
                train_positions[train] = 1
        
        if not assigned_trains:
            return {"status": "No trains assigned from Layer 1", "error": "Invalid input format"}

        # Create readiness lookup and Layer 1 details lookup
        readiness_lookup = {}
        readiness_summaries = {}
        layer1_details_lookup = {}
        branding_urgency_lookup = {}
        
        for train_data in readiness_json:
            train_id = train_data["train_id"]
            readiness_lookup[train_id] = train_data.get("score", 0)
            details_dict = train_data.get("details", {}) or {}
            summary_text = details_dict.get("summary") or train_data.get("summary") or details_dict.get("combined") or "No summary available"
            readiness_summaries[train_id] = {
                "summary": summary_text,
                "details": details_dict
            }
            layer1_details_lookup[train_id] = train_data
            # Branding urgency derived from breakdown (values >100 indicate urgency)
            breakdown = train_data.get("breakdown", {}) or {}
            branding_score = breakdown.get("branding_contracts", 100)
            branding_urgency_lookup[train_id] = max(0.0, float(branding_score) - 100.0)
        
        valid_trains = [t for t in assigned_trains if t in readiness_lookup]
        
        if not valid_trains:
            return {"status": "No valid trains with both parking and readiness data"}

        # Get timetable configuration and generate 8 slots
        timetable_config = get_timetable_config(service_date)
        # Schedule exactly 10 trains as per requirements
        departure_slots = generate_departure_slots(timetable_config, max_slots=10)
        max_trains_to_schedule = 10
        slot_to_time = compute_departure_times(timetable_config, departure_slots)
        
        print(f"Debug: Valid trains: {len(valid_trains)}, Available slots: {len(departure_slots)}")
        print(f"Debug: Will schedule exactly {max_trains_to_schedule} trains")

        # Group trains by bay for constraint creation
        bay_groups = {}
        for train in valid_trains:
            bay = bay_assignments[train]
            if bay not in bay_groups:
                bay_groups[bay] = []
            bay_groups[bay].append(train)

        # Sort trains within each bay by position for debugging
        for bay in bay_groups:
            bay_groups[bay].sort(key=lambda t: train_positions[t])
            print(f"Debug: Bay {bay} - Trains by position: {[(t, train_positions[t], readiness_lookup[t]) for t in bay_groups[bay]]}")

        # --- CP-SAT DECISION VARIABLES ---
        
        # 1. Primary variable: train to departure slot assignment
        departure_vars = {}
        for train in valid_trains:
            for slot_num in departure_slots:
                departure_vars[train, slot_num] = model.NewBoolVar(f"dep_{train}_slot_{slot_num}")

        # 2. Train selection variable
        train_selected_vars = {}
        for train in valid_trains:
            train_selected_vars[train] = model.NewBoolVar(f"selected_{train}")

        # 3. Shunting variables: whether a train requires shunting to depart
        shunting_vars = {}
        for train in valid_trains:
            shunting_vars[train] = model.NewBoolVar(f"shunt_{train}")

        # 4. Priority slot preference variables (for slots 1-3)
        priority_slot_vars = {}
        priority_slots = [1, 2, 3]  # Top 3 slots are priority
        
        for train in valid_trains:
            priority_slot_vars[train] = model.NewBoolVar(f"priority_{train}")

        # --- CP-SAT CONSTRAINTS ---
        
        # Each selected train gets exactly one departure slot
        for train in valid_trains:
            model.Add(sum(departure_vars[train, slot_num] 
                         for slot_num in departure_slots) == train_selected_vars[train])
        
        # Each slot gets exactly one train
        for slot_num in departure_slots:
            model.Add(sum(departure_vars[train, slot_num] for train in valid_trains) == 1)

        # Exactly 8 trains must be selected
        model.Add(sum(train_selected_vars[train] for train in valid_trains) == max_trains_to_schedule)

        # Priority slot constraint - only for selected trains
        for train in valid_trains:
            # Create helper variable for priority slot assignment
            priority_slot_assigned = model.NewBoolVar(f"priority_assigned_{train}")
            
            # priority_slot_assigned is 1 if train gets any priority slot (1, 2, or 3)
            model.Add(priority_slot_assigned == sum(departure_vars[train, slot_num] 
                                                   for slot_num in priority_slots))
            
            # priority_slot_vars[train] is 1 if train is selected AND gets priority slot
            model.AddBoolAnd([train_selected_vars[train], priority_slot_assigned]).OnlyEnforceIf(priority_slot_vars[train])
            model.AddBoolOr([train_selected_vars[train].Not(), priority_slot_assigned.Not()]).OnlyEnforceIf(priority_slot_vars[train].Not())

        # Parking position and shunting constraints - KEY LOGIC FOR MINIMAL SHUNTING
        for bay, trains_in_bay in bay_groups.items():
            if len(trains_in_bay) <= 1:
                # Single train bays - no shunting needed if selected
                for train in trains_in_bay:
                    # If train is not selected, shunting should be 0
                    model.AddImplication(train_selected_vars[train].Not(), shunting_vars[train].Not())
                    # If train is selected, no shunting needed (single train bay)
                    model.AddImplication(train_selected_vars[train], shunting_vars[train].Not())
                continue
            
            # Multi-train bay constraints - CRITICAL SHUNTING LOGIC
            for train_a in trains_in_bay:
                # If train is not selected, no shunting
                model.AddImplication(train_selected_vars[train_a].Not(), shunting_vars[train_a].Not())
                
                for train_b in trains_in_bay:
                    if train_a == train_b:
                        continue
                    
                    pos_a = train_positions[train_a]
                    pos_b = train_positions[train_b]
                    
                    # If train_a is behind train_b (higher position number)
                    # AND train_a needs to leave before train_b, then train_b needs shunting
                    if pos_a > pos_b:
                        for slot_a in departure_slots:
                            for slot_b in departure_slots:
                                if slot_a < slot_b:  # train_a gets earlier slot (leaves before train_b)
                                    # Create a constraint variable for this specific condition
                                    constraint_var = model.NewBoolVar(f"shunt_constraint_{train_a}_slot_{slot_a}_{train_b}_slot_{slot_b}")
                                    
                                    # constraint_var is true when all conditions are met:
                                    model.Add(constraint_var <= departure_vars[train_a, slot_a])
                                    model.Add(constraint_var <= departure_vars[train_b, slot_b])
                                    model.Add(constraint_var <= train_selected_vars[train_a])
                                    model.Add(constraint_var <= train_selected_vars[train_b])
                                    model.Add(constraint_var >= (departure_vars[train_a, slot_a] + 
                                                               departure_vars[train_b, slot_b] + 
                                                               train_selected_vars[train_a] + 
                                                               train_selected_vars[train_b] - 3))
                                    
                                    # When constraint is active, train_b needs shunting
                                    model.AddImplication(constraint_var, shunting_vars[train_b])

        # --- OBJECTIVE FUNCTION: Focus on readiness and minimize shunting ---
        objective_terms = []
        
        # Optimization weights
        READINESS_WEIGHT = 1000          # High weight for train readiness
        SHUNTING_PENALTY = 5000          # VERY HIGH penalty for shunting operations
        PRIORITY_SLOT_BONUS = 2000       # Bonus for high-readiness trains in priority slots (1-3)
        POSITION_BONUS_WEIGHT = 800      # Bonus for trains in better positions (front of bay)
        BRANDING_URGENCY_WEIGHT = 50     # Low weight; readiness + shunting dominate
        
        # 1. Readiness score optimization
        for train in valid_trains:
            readiness_score = int(readiness_lookup[train])
            
            # Base readiness bonus for being selected
            objective_terms.append((readiness_score * READINESS_WEIGHT // 100) * train_selected_vars[train])
            
            for slot_num in departure_slots:
                # Higher bonus for earlier slots (slot 1 gets highest bonus), scaled by readiness
                early_factor = (len(departure_slots) + 1 - slot_num)
                slot_preference = early_factor * readiness_score * 10
                objective_terms.append(slot_preference * departure_vars[train, slot_num])
                # Branding urgency prefers earlier slots
                branding_urgency = int(branding_urgency_lookup.get(train, 0))
                if branding_urgency > 0:
                    branding_bonus = early_factor * branding_urgency * BRANDING_URGENCY_WEIGHT
                    objective_terms.append(branding_bonus * departure_vars[train, slot_num])
                
                # Extra bonus for high-readiness trains getting priority slots (1-3)
                if readiness_score >= 90 and slot_num in priority_slots:
                    objective_terms.append(PRIORITY_SLOT_BONUS * departure_vars[train, slot_num])

        # 2. Position-based bonus (trains in front positions get slight preference)
        for train in valid_trains:
            position = train_positions[train]
            # Front position (1) gets highest bonus, decreasing for higher positions
            position_bonus = POSITION_BONUS_WEIGHT // position
            objective_terms.append(position_bonus * train_selected_vars[train])

        # 3. HEAVY shunting penalty - this is the key to minimize shunting
        for train in valid_trains:
            objective_terms.append(-SHUNTING_PENALTY * shunting_vars[train])

        # Set the objective
        model.Maximize(sum(objective_terms))

        # --- SOLVE THE MODEL ---
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = 120
        solver.parameters.log_search_progress = False
        
        status = solver.Solve(model)

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return {
                "status": "No feasible solution",
                "solver_status": "INFEASIBLE",
                "error": "Could not find optimal departure schedule"
            }

        # --- BUILD RESULTS - Only include selected trains ---
        optimized_assignments = []
        standby_trains = []
        shunting_operations = []
        
        for train in valid_trains:
            is_selected = solver.Value(train_selected_vars[train]) == 1
            
            if is_selected:
                # Find chosen departure slot
                chosen_slot = next(slot_num for slot_num in departure_slots
                                  if solver.Value(departure_vars[train, slot_num]) == 1)
                
                # Check shunting requirement
                needs_shunting = solver.Value(shunting_vars[train]) == 1
                if needs_shunting:
                    shunting_operations.append({
                        "train_id": train,
                        "bay": bay_assignments.get(train, "Unknown"),
                        "position": train_positions.get(train, 1),
                        "reason": "Train behind this one needs to depart earlier"
                    })
                
                # Get priority slot status
                got_priority_slot = solver.Value(priority_slot_vars[train]) == 1
                scheduling_rationale = _generate_scheduling_rationale(
                    train, train_positions, bay_assignments, readiness_lookup, 
                    valid_trains, chosen_slot, needs_shunting, got_priority_slot,
                    layer1_details_lookup
                )
                # Add branding rationale when applicable
                if branding_urgency_lookup.get(train, 0) > 0 and chosen_slot <= 3:
                    scheduling_rationale["secondary_factors"].append("Branding urgency prioritized for peak exposure")
                
                assignment = {
                    "train_id": train,
                    "bay": bay_assignments.get(train, "Unknown"),
                    "bay_position": train_positions.get(train, 1),
                    "readiness": readiness_lookup[train],
                    "readiness_summary": readiness_summaries[train]["summary"],
                    "readiness_details": readiness_summaries[train]["details"],
                    "departure_slot": chosen_slot,
                    "departure_order": chosen_slot,
                    "departure_time": slot_to_time.get(chosen_slot, None),
                    "needs_shunting": needs_shunting,
                    "is_priority_slot": got_priority_slot,
                    "optimization_score": "CP-SAT Optimized",
                    "scheduling_rationale": scheduling_rationale
                }
                
                optimized_assignments.append(assignment)
            else:
                not_selected_rationale = _generate_not_selected_rationale(
                    train, train_positions, bay_assignments, readiness_lookup, 
                    valid_trains, layer1_details_lookup
                )
                
                # Track standby trains
                standby_trains.append({
                    "train_id": train,
                    "readiness": readiness_lookup[train],
                    "readiness_summary": readiness_summaries[train]["summary"],
                    "bay": bay_assignments.get(train, "Unknown"),
                    "bay_position": train_positions.get(train, 1),
                    "status": "standby",
                    "reason": "Not selected - on standby for the day",
                    "scheduling_rationale": not_selected_rationale
                })

        # Sort by departure slot (1..slot_count)
        optimized_assignments.sort(key=lambda x: x["departure_slot"])

        result = {
            "solver_status": "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE",
            "objective_value": solver.ObjectiveValue(),
            "optimized_assignments": optimized_assignments,
            "standby_trains": standby_trains,
            "timetable_info": timetable_config,
            "departure_slots": departure_slots,
            "total_trains_available": len(valid_trains),
            "total_trains_scheduled": len(optimized_assignments),
            "total_standby_trains": len(standby_trains),
            "shunting_operations_required": len(shunting_operations),
            "trains_requiring_shunting": shunting_operations,
            "service_date": service_date.isoformat() if service_date else date.today().isoformat(),
            "data_source": "Layer 1 Output" if use_layer1_output else "Provided Data",
            "optimization_summary": {
                "readiness_weighted": True,
                "ad_revenue_optimized": False,
                "demographic_targeting": False,
                "parking_position_optimized": True,
                "shunting_constraints": True,
                "shunting_minimization": "Heavy penalty applied",
                "constraint_programming": "Full CP-SAT with logical constraints",
                "slot_count": len(departure_slots),
                "scheduling_method": "Slot-based ranking (1-8)",
                "optimization_method": "Multi-objective: readiness + minimal shunting",
                "selection_summary": {
                    "requested_trains": len(valid_trains),
                    "available_slots": len(departure_slots),
                    "scheduled_trains": len(optimized_assignments),
                    "standby_trains": len(standby_trains),
                    "selection_method": "CP-SAT optimized slot assignment based on readiness and minimal shunting"
                }
            }
        }
        
        return result

    except Exception as e:
        return {
            "status": "Error in Layer 2 CP-SAT optimization",
            "error": str(e),
            "solver_status": "ERROR"
        }
           
# Backward compatibility function
def run_layer2_service_old(parking_json=None, readiness_json=None,
                          ads_json=None, service_day="weekday"):
    """Legacy function for backward compatibility"""
    if parking_json is None:
        # Use Layer 1 output instead of test data
        layer1_output = load_layer1_output()
        converted_data = convert_layer1_to_layer2_format(layer1_output)
        parking_json = converted_data["parking"]
        readiness_json = converted_data["readiness"]
        ads_json = []  # Ads not used
    
    return run_layer2_service(parking_json, readiness_json, ads_json, service_day)