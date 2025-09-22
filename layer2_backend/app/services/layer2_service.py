# # layer2_service.py
# from ortools.sat.python import cp_model
# import logging
# from typing import Dict, List, Optional, Any
# import numpy as np

# # Set up logging
# logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)

# class Layer2Optimizer:
#     """
#     Simplified Layer-2 CP-SAT optimization for train scheduling
#     Only considers readiness score and parking geometry
#     """
    
#     def __init__(self):
#         self.model = cp_model.CpModel()
#         self.solver = cp_model.CpSolver()
#         self.solver.parameters.max_time_in_seconds = 30
#         self.solver.parameters.num_search_workers = 8
        
#     def run_layer2(
#         self,
#         readiness_scores: Dict[str, int],  # {train_id: readiness_score (1-10)}
#         initial_parking: Dict[str, str],   # {bay_id: train_id}
#         service_start_time: int = 7,       # 07:00 hrs
#         service_end_time: int = 22,        # 22:00 hrs
#         peak_hours: tuple = (8, 20),       # 08:00-20:00 peak hours
#         headway_peak: int = 9,             # 9 minutes peak headway
#         headway_off_peak: int = 11         # 11 minutes off-peak headway
#     ) -> Dict[str, Any]:
#         """
#         Generate optimal train schedule based on readiness scores and parking geometry
#         """
#         logger.info("Starting Simplified Layer-2 optimization")
        
#         trains = list(readiness_scores.keys())
#         bays = list(initial_parking.keys())
        
#         logger.info(f"Processing {len(trains)} trains, {len(bays)} bays")
        
#         # Generate departure slots based on service hours and headway
#         departure_slots = self._generate_departure_slots(
#             service_start_time, service_end_time, 
#             peak_hours, headway_peak, headway_off_peak
#         )
        
#         # -------------------------
#         # VARIABLES
#         # -------------------------
#         departure_assignments = {}  # d[t, slot] = 1 if train t departs at slot
        
#         for t in trains:
#             for slot_idx, slot_time in enumerate(departure_slots):
#                 departure_assignments[t, slot_idx] = self.model.NewBoolVar(f"d_{t}_{slot_idx}")
        
#         # -------------------------
#         # HARD CONSTRAINTS
#         # -------------------------
#         self._add_hard_constraints(trains, departure_slots, departure_assignments)
        
#         # -------------------------
#         # SOFT CONSTRAINTS
#         # -------------------------
#         objective_terms = self._add_soft_constraints(
#             trains, readiness_scores, departure_slots, departure_assignments
#         )
        
#         # -------------------------
#         # OBJECTIVE
#         # -------------------------
#         if objective_terms:
#             self.model.Maximize(sum(objective_terms))  # Maximize readiness score sum
#         else:
#             logger.warning("No soft constraints added")
        
#         # -------------------------
#         # SOLVE
#         # -------------------------
#         status = self.solver.Solve(self.model)
        
#         if status not in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
#             return self._handle_infeasible_case(trains, readiness_scores)
        
#         # -------------------------
#         # POST-PROCESS
#         # -------------------------
#         return self._process_results(
#             trains, readiness_scores, departure_slots, 
#             departure_assignments, status, initial_parking
#         )
    
#     def _generate_departure_slots(self, start_time, end_time, peak_hours, headway_peak, headway_off_peak):
#         """Generate departure time slots based on Kochi metro schedule"""
#         departure_slots = []
#         current_time = start_time * 60  # Convert to minutes
        
#         while current_time <= end_time * 60:
#             # Check if current time is within peak hours
#             is_peak = peak_hours[0] <= (current_time / 60) < peak_hours[1]
#             headway = headway_peak if is_peak else headway_off_peak
            
#             departure_slots.append(current_time)
#             current_time += headway
        
#         logger.info(f"Generated {len(departure_slots)} departure slots")
#         return departure_slots
    
#     def _add_hard_constraints(self, trains, departure_slots, departure_assignments):
#         """Add hard constraints"""
#         logger.info("Adding hard constraints...")
        
#         # 1. Each train must depart exactly once
#         for t in trains:
#             self.model.Add(sum(departure_assignments[t, slot_idx] 
#                             for slot_idx in range(len(departure_slots))) == 1)
        
#         # 2. Each departure slot can have at most one train
#         for slot_idx in range(len(departure_slots)):
#             self.model.Add(sum(departure_assignments[t, slot_idx] 
#                             for t in trains) <= 1)
    
#     def _add_soft_constraints(self, trains, readiness_scores, departure_slots, departure_assignments):
#         """Add soft constraints - prioritize higher readiness trains for better slots"""
#         logger.info("Adding soft constraints...")
        
#         objective_terms = []
        
#         # Weight earlier slots more (priority for better readiness trains)
#         slot_weights = []
#         for slot_idx in range(len(departure_slots)):
#             # Earlier slots get higher weight (linear decay)
#             weight = len(departure_slots) - slot_idx
#             slot_weights.append(weight)
        
#         for t in trains:
#             readiness = readiness_scores[t]
#             for slot_idx in range(len(departure_slots)):
#                 # Objective: readiness_score * slot_weight
#                 term = self.model.NewIntVar(0, 1000, f"obj_{t}_{slot_idx}")
#                 self.model.Add(term == readiness * slot_weights[slot_idx]).OnlyEnforceIf(
#                     departure_assignments[t, slot_idx])
#                 self.model.Add(term == 0).OnlyEnforceIf(
#                     departure_assignments[t, slot_idx].Not())
#                 objective_terms.append(term)
        
#         return objective_terms
    
#     def _handle_infeasible_case(self, trains, readiness_scores):
#         """Handle infeasible cases"""
#         logger.error("Model is infeasible - providing fallback solution")
        
#         # Simple fallback: sort by readiness score
#         sorted_trains = sorted(trains, key=lambda t: readiness_scores[t], reverse=True)
        
#         return {
#             "schedule": [{"train_id": t, "readiness_score": readiness_scores[t]} 
#                         for t in sorted_trains],
#             "departure_times": [],
#             "solver_status": "INFEASIBLE",
#             "warning": "Using fallback solution (sorted by readiness)"
#         }
    
#     def _process_results(self, trains, readiness_scores, departure_slots, 
#                         departure_assignments, status, initial_parking):
#         """Process and format the solver results"""
#         schedule = []
        
#         # Get departure assignments
#         for slot_idx, slot_time in enumerate(departure_slots):
#             for t in trains:
#                 if self.solver.Value(departure_assignments[t, slot_idx]):
#                     hours = int(slot_time // 60)
#                     minutes = int(slot_time % 60)
#                     departure_str = f"{hours:02d}:{minutes:02d}"
                    
#                     schedule.append({
#                         "train_id": t,
#                         "readiness_score": readiness_scores[t],
#                         "departure_time": departure_str,
#                         "initial_bay": next((b for b, train in initial_parking.items() 
#                                            if train == t), "Unknown"),
#                         "slot_priority": len(departure_slots) - slot_idx  # Higher = better
#                     })
#                     break
        
#         # Sort by departure time
#         schedule.sort(key=lambda x: x["departure_time"])
        
#         logger.info("Optimization completed successfully")
#         return {
#             "schedule": schedule,
#             "total_trains": len(trains),
#             "total_slots": len(departure_slots),
#             "solver_status": "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE",
#             "objective_value": self.solver.ObjectiveValue() if status == cp_model.OPTIMAL else None
#         }

# # Singleton instance
# layer2_optimizer = Layer2Optimizer()

# def run_layer2(*args, **kwargs):
#     return layer2_optimizer.run_layer2(*args, **kwargs)
# layer2_service.py
from ortools.sat.python import cp_model
from typing import Dict, Any, List
from datetime import datetime, date
import json
from pathlib import Path
import holidays

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
    got_priority_slot: bool
) -> Dict[str, Any]:
    """Generate rationale for why this specific train was selected"""
    
    train_readiness = readiness_lookup[train_id]
    train_position = train_positions[train_id]
    train_bay = bay_assignments[train_id]
    
    # Find other trains in same bay for comparison
    same_bay_trains = [t for t in all_valid_trains 
                      if bay_assignments[t] == train_bay and t != train_id]
    
    rationale = {
        "primary_reason": "",
        "secondary_factors": [],
        "readiness_advantage": "",
        "position_advantage": "",
        "shunting_benefit": "",
        "slot_assignment_reason": ""
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
    all_valid_trains: List[str]
) -> Dict[str, Any]:
    """Generate rationale for why this train was NOT selected"""
    
    train_readiness = readiness_lookup[train_id]
    train_position = train_positions[train_id]
    train_bay = bay_assignments[train_id]
    
    # Find selected trains for comparison
    # This would need access to the solver results, but for simplicity:
    # we'll focus on the most likely reasons
    
    rationale = {
        "primary_reason": "",
        "readiness_factor": "",
        "position_factor": "",
        "shunting_factor": "",
        "alternative_selected": ""
    }
    
    # Find other trains in same bay
    same_bay_trains = [t for t in all_valid_trains 
                      if bay_assignments[t] == train_bay and t != train_id]
    
    if train_readiness < 80:
        rationale["primary_reason"] = "low_readiness_score"
        rationale["readiness_factor"] = f"Readiness score ({train_readiness}%) below competitive threshold"
    elif train_position > 2:
        rationale["primary_reason"] = "poor_parking_position"
        rationale["position_factor"] = f"Position #{train_position} in bay {train_bay} would require significant shunting"
        rationale["shunting_factor"] = f"Shunting penalty ({5000} points) made selection uneconomical"
    elif same_bay_trains:
        # Check if there's a better positioned train in same bay
        better_positioned = [t for t in same_bay_trains 
                           if train_positions[t] < train_position]
        if better_positioned:
            rationale["primary_reason"] = "better_alternative_available"
            rationale["alternative_selected"] = f"Train(s) {better_positioned} in same bay had better positions"
    else:
        rationale["primary_reason"] = "insufficient_optimization_score"
        rationale["readiness_factor"] = f"Combined readiness and position score insufficient for top 8 slots"
    
    return rationale

def generate_departure_slots(timetable_config, max_slots=8):
    """Generate exactly 8 departure slots (just slot numbers, no times)"""
    return list(range(1, max_slots + 1))  # Returns [1, 2, 3, 4, 5, 6, 7, 8]

def run_layer2_service(
    parking_json: Dict[str, Any],
    readiness_json: List[Dict[str, Any]],
    ads_json: List[Dict[str, Any]],  # Keep parameter for compatibility but ignore
    service_day: str = "weekday",
    service_date: date = None
) -> Dict[str, Any]:
    """
    Layer 2 optimization: Slot-based train scheduling (1-8 slots)
    Focus on readiness score and minimizing shunting operations
    """
    try:
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
        elif "current_positions" in parking_json:
            for position in parking_json["current_positions"]:
                train_id = position["train_id"]
                bay_id = position["bay_id"]
                pos = position.get("position", 1)
                
                assigned_trains.append(train_id)
                bay_assignments[train_id] = bay_id
                train_positions[train_id] = pos
        else:
            # Legacy format
            assigned_trains = list(parking_json.keys()) if isinstance(parking_json, dict) else []
            bay_assignments = parking_json if isinstance(parking_json, dict) else {}
            # Assign default positions
            for train in assigned_trains:
                train_positions[train] = 1
        
        if not assigned_trains:
            return {"status": "No trains assigned from Layer 1", "error": "Invalid input format"}

        # Create readiness lookup
        readiness_lookup = {}
        readiness_summaries = {}
        for train_data in readiness_json:
            train_id = train_data["train_id"]
            readiness_lookup[train_id] = train_data["score"]
            readiness_summaries[train_id] = {
                "summary": train_data.get("summary", "No summary available"),
                "details": train_data.get("details", {})
            }
        
        valid_trains = [t for t in assigned_trains if t in readiness_lookup]
        
        if not valid_trains:
            return {"status": "No valid trains with both parking and readiness data"}

        # Get timetable configuration and generate 8 slots
        timetable_config = get_timetable_config(service_date)
        departure_slots = generate_departure_slots(timetable_config, max_slots=8)  # [1,2,3,4,5,6,7,8]
        max_trains_to_schedule = 8
        
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
            for slot_num in departure_slots:  # slot_num is 1,2,3,4,5,6,7,8
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
                                    # - train_a is selected AND gets slot_a
                                    # - train_b is selected AND gets slot_b  
                                    # - slot_a < slot_b (train_a leaves before train_b)
                                    # - pos_a > pos_b (train_a is behind train_b)
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
        
        # Optimization weights - SIMPLIFIED AND FOCUSED
        READINESS_WEIGHT = 1000          # High weight for train readiness
        SHUNTING_PENALTY = 5000          # VERY HIGH penalty for shunting operations
        PRIORITY_SLOT_BONUS = 2000       # Bonus for high-readiness trains in priority slots (1-3)
        POSITION_BONUS_WEIGHT = 800      # Bonus for trains in better positions (front of bay)
        
        # 1. Readiness score optimization
        for train in valid_trains:
            readiness_score = int(readiness_lookup[train])
            
            # Base readiness bonus for being selected
            objective_terms.append((readiness_score * READINESS_WEIGHT // 100) * train_selected_vars[train])
            
            for slot_num in departure_slots:
                # Higher bonus for earlier slots (slot 1 gets highest bonus)
                slot_preference = (len(departure_slots) + 1 - slot_num) * readiness_score * 10
                objective_terms.append(slot_preference * departure_vars[train, slot_num])
                
                # Extra bonus for high-readiness trains getting priority slots (1-3)
                if readiness_score >= 90 and slot_num in priority_slots:
                    objective_terms.append(PRIORITY_SLOT_BONUS * departure_vars[train, slot_num])

        # 2. Position-based bonus (trains in front positions get slight preference)
        for train in valid_trains:
            position = train_positions[train]
            # Front position (1) gets highest bonus, decreasing for higher positions
            position_bonus = POSITION_BONUS_WEIGHT // position  # Position 1 gets 800, Position 2 gets 400, etc.
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
                    valid_trains, chosen_slot, needs_shunting, got_priority_slot
                    )
                
                assignment = {
                    "train_id": train,
                    "bay": bay_assignments.get(train, "Unknown"),
                    "bay_position": train_positions.get(train, 1),
                    "readiness": readiness_lookup[train],
                    "readiness_summary": readiness_summaries[train]["summary"],
                    "readiness_details": readiness_summaries[train]["details"],
                    "departure_slot": chosen_slot,
                    "departure_order": chosen_slot,
                    "needs_shunting": needs_shunting,
                    "is_priority_slot": got_priority_slot,
                    "optimization_score": "CP-SAT Optimized",
                    "scheduling_rationale": scheduling_rationale
                }
                
                optimized_assignments.append(assignment)
            else:
                not_selected_rationale = _generate_not_selected_rationale(
                        train, train_positions, bay_assignments, readiness_lookup, valid_trains
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

        # Sort by departure slot (1, 2, 3, 4, 5, 6, 7, 8)
        optimized_assignments.sort(key=lambda x: x["departure_slot"])

        return {
            "solver_status": "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE",
            "objective_value": solver.ObjectiveValue(),
            "optimized_assignments": optimized_assignments,
            "standby_trains": standby_trains,
            "timetable_info": timetable_config,
            "departure_slots": departure_slots,  # [1,2,3,4,5,6,7,8]
            "total_trains_available": len(valid_trains),
            "total_trains_scheduled": len(optimized_assignments),
            "total_standby_trains": len(standby_trains),
            "shunting_operations_required": len(shunting_operations),
            "trains_requiring_shunting": shunting_operations,
            "service_date": service_date.isoformat() if service_date else date.today().isoformat(),
            "optimization_summary": {
                "readiness_weighted": True,
                "ad_revenue_optimized": False,  # REMOVED
                "demographic_targeting": False,  # REMOVED
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
        test_path = Path(__file__).parent.parent / "test_data.json"
        with test_path.open() as f:
            test_data = json.load(f)
        parking_json = test_data["parking"]
        readiness_json = test_data["readiness"]
        ads_json = test_data["ads"]
        service_day = test_data["service_day"]
    
    return run_layer2_service(parking_json, readiness_json, ads_json, service_day)