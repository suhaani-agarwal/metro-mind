from ortools.sat.python import cp_model
from datetime import datetime, timedelta
import json
from typing import List, Dict, Any, Tuple
import math
import logging
from app.models import Train, Department, FitnessCertificateStatus, JobCardCriticality
from app.schemas import ReadinessScore, CleaningAssignment, ParkingAssignment
from app.utils.depot_graph import DepotGraph

logger = logging.getLogger(__name__)

class ScheduleOptimizer:
    def __init__(self, input_data: Dict[str, Any]):
        self.input_data = input_data
        self.trains = input_data["trains"]
        self.cleaning_slots = input_data["cleaning_slots"]
        self.depot_layout = input_data["depot_layout"]
        self.date = input_data["date"]
        self.required_trains = input_data["required_trains"]
        self.standby_trains = input_data["standby_trains"]
        self.cleaning_crew_available = input_data["cleaning_crew_available"]
        self.model = cp_model.CpModel()
        
        # Decision variables
        self.service_vars = {}  # train_id -> BoolVar (1 if in service)
        self.standby_vars = {}  # train_id -> BoolVar (1 if on standby)
        self.ibl_vars = {}      # train_id -> BoolVar (1 if in IBL)
        
        # Handle new IBL bays format (array of objects)
        self.ibl_bays = []
        for bay in self.depot_layout["ibl_bays"]:
            if isinstance(bay, dict):
                self.ibl_bays.append(bay["id"])
            else:
                self.ibl_bays.append(bay)
        
        # Depot graph for pathfinding
        self.depot_graph = DepotGraph(self.depot_layout["connections"])
        
        # Pre-calculate readiness scores for all trains
        self.readiness_scores = {}
        self.readiness_details = {}
        for train in self.trains:
            score, details = self.calculate_readiness_score(train)
            self.readiness_scores[train["id"]] = score
            self.readiness_details[train["id"]] = details
    
    def calculate_readiness_score(self, train: Dict[str, Any]) -> Tuple[float, Dict[str, Any]]:
        """Calculate readiness score for a train (0-100) with detailed breakdown"""
        details = {}
        score_components = {}
        
        # 1. Fitness certificates - if any expired, score is 0
        fitness_score = 100
        expired_certs = []
        for dept, cert in train["fitness_certificates"].items():
            if cert["status"] == FitnessCertificateStatus.EXPIRED.value:
                expired_certs.append(dept)
                fitness_score = 0
        
        if expired_certs:
            details["fitness_certificates"] = f"❌ Expired certificates: {', '.join(expired_certs)}"
        else:
            details["fitness_certificates"] = "✅ All fitness certificates valid"
        score_components["fitness_certificates"] = fitness_score
        
        # 2. Job card criticality
        job_score = 100
        critical_jobs = []
        high_jobs = []
        medium_jobs = []
        low_jobs = []
        
        for job in train["job_cards"]:
            if job["criticality"] == JobCardCriticality.CRITICAL.value:
                critical_jobs.append(f"{job['description']} ({job['estimated_hours']}h)")
                job_score = 0
            elif job["criticality"] == JobCardCriticality.HIGH.value:
                high_jobs.append(f"{job['description']} ({job['estimated_hours']}h)")
                job_score *= 0.5
            elif job["criticality"] == JobCardCriticality.MEDIUM.value:
                medium_jobs.append(f"{job['description']} ({job['estimated_hours']}h)")
                job_score *= 0.75
            elif job["criticality"] == JobCardCriticality.LOW.value:
                low_jobs.append(f"{job['description']} ({job['estimated_hours']}h)")
                job_score *= 0.9
        
        job_details = []
        if critical_jobs:
            job_details.append(f"❌ Critical: {', '.join(critical_jobs)}")
        if high_jobs:
            job_details.append(f"⚠️ High: {', '.join(high_jobs)}")
        if medium_jobs:
            job_details.append(f"🔶 Medium: {', '.join(medium_jobs)}")
        if low_jobs:
            job_details.append(f"🔷 Low: {', '.join(low_jobs)}")
        if not job_details:
            job_details.append("✅ No open job cards")
        
        details["job_cards"] = " | ".join(job_details)
        score_components["job_cards"] = job_score
        
        # 3. Branding priorities
        branding_score = 100
        branding_details = []
        branding_urgency = 0
        
        for contract in train["branding_contracts"]:
            total_hours = contract["total_exposure_hours"]
            completed_hours = contract["completed_hours"]
            remaining_hours = total_hours - completed_hours
            
            # Parse deadline
            deadline = datetime.strptime(contract["deadline"], "%Y-%m-%d")
            days_remaining = (deadline - datetime.now()).days
            
            if days_remaining > 0:
                hours_per_day = remaining_hours / days_remaining
                # If more than 4 hours per day needed, increase priority
                if hours_per_day > 8:
                    branding_score *= 1.5
                    branding_urgency += 2
                    branding_details.append(f"🚨 {contract['brand']}: {hours_per_day:.1f}h/day needed")
                elif hours_per_day > 4:
                    branding_score *= 1.2
                    branding_urgency += 1
                    branding_details.append(f"⚠️ {contract['brand']}: {hours_per_day:.1f}h/day needed")
                else:
                    branding_details.append(f"✅ {contract['brand']}: {hours_per_day:.1f}h/day needed")
            else:
                # Deadline passed
                branding_score *= 0.5
                branding_details.append(f"❌ {contract['brand']}: Deadline passed")
        
        if not branding_details:
            branding_details.append("✅ No branding contracts")
        
        details["branding_contracts"] = " | ".join(branding_details)
        score_components["branding_contracts"] = branding_score
        
        # 4. Mileage balancing
        mileage_score = 100
        mileage_details = []
        mileage = train["current_mileage"]
        thresholds = train["maintenance_thresholds"]
        
        for component in ["bogie", "brake_pad", "hvac"]:
            remaining = thresholds[component] - mileage[component]
            percentage = (remaining / thresholds[component]) * 100
            
            if remaining <= 0:
                mileage_score = 0
                mileage_details.append(f"❌ {component}: Overdue ({mileage[component]}/{thresholds[component]} km)")
            elif remaining < 1000:
                mileage_score *= 0.5
                mileage_details.append(f"🚨 {component}: Critical ({mileage[component]}/{thresholds[component]} km)")
            elif remaining < 2000:
                mileage_score *= 0.7
                mileage_details.append(f"⚠️ {component}: Warning ({mileage[component]}/{thresholds[component]} km)")
            elif remaining < 3000:
                mileage_score *= 0.9
                mileage_details.append(f"🔶 {component}: Notice ({mileage[component]}/{thresholds[component]} km)")
            else:
                mileage_details.append(f"✅ {component}: Good ({mileage[component]}/{thresholds[component]} km)")
        
        details["mileage_balancing"] = " | ".join(mileage_details)
        score_components["mileage_balancing"] = mileage_score
        
        # 5. Cleaning status
        cleaning_score = 100
        last_cleaning = datetime.strptime(train["last_deep_cleaning"], "%Y-%m-%d")
        days_since_cleaning = (datetime.now() - last_cleaning).days
        
        if days_since_cleaning > 7:
            cleaning_score = 50
            details["cleaning_status"] = f"🚨 Cleaning overdue ({days_since_cleaning} days since last cleaning)"
        elif days_since_cleaning > 5:
            cleaning_score = 75
            details["cleaning_status"] = f"⚠️ Cleaning due soon ({days_since_cleaning} days since last cleaning)"
        else:
            details["cleaning_status"] = f"✅ Cleaning not needed yet ({days_since_cleaning} days since last cleaning)"
        
        score_components["cleaning_status"] = cleaning_score
        
        # Calculate final score (weighted average)
        weights = {
            "fitness_certificates": 0.3,
            "job_cards": 0.3,
            "branding_contracts": 0.1,
            "mileage_balancing": 0.2,
            "cleaning_status": 0.1
        }
        
        final_score = 0
        for component, weight in weights.items():
            final_score += score_components[component] * weight
        
        # Apply branding urgency boost
        final_score = min(100, final_score * (1 + branding_urgency * 0.1))
        
        # Ensure score is between 0 and 100
        final_score = max(0, min(100, final_score))
        
        # Create summary with all details
        summary_parts = []
        if fitness_score == 0:
            summary_parts.append("❌ Expired certificates")
        if job_score == 0:
            summary_parts.append("❌ Critical job cards")
        if mileage_score == 0:
            summary_parts.append("❌ Overdue maintenance")
        if branding_urgency > 0:
            summary_parts.append(f"🚀 Branding urgency: {branding_urgency}")
        if final_score > 80:
            summary_parts.append("✅ Excellent condition")
        elif final_score > 60:
            summary_parts.append("🟡 Good condition")
        else:
            summary_parts.append("🔶 Needs attention")
        
        # Combine all details into a single string for display
        all_details = []
        for key, value in details.items():
            all_details.append(value)
        
        details["combined"] = " | ".join(all_details)
        details["summary"] = " | ".join(summary_parts)
        
        return final_score, details
    
    def setup_constraints(self):
        """Set up constraints for the CP-SAT model"""
        # Create decision variables for all trains
        for train in self.trains:
            train_id = train["id"]
            self.service_vars[train_id] = self.model.NewBoolVar(f"service_{train_id}")
            self.standby_vars[train_id] = self.model.NewBoolVar(f"standby_{train_id}")
            self.ibl_vars[train_id] = self.model.NewBoolVar(f"ibl_{train_id}")
        
        # Constraint: Each train must be in exactly one category
        for train in self.trains:
            train_id = train["id"]
            self.model.Add(
                self.service_vars[train_id] + self.standby_vars[train_id] + self.ibl_vars[train_id] == 1
            )
        
        # Constraint: Trains with expired fitness certificates must go to IBL
        for train in self.trains:
            train_id = train["id"]
            has_expired_cert = any(
                cert["status"] == FitnessCertificateStatus.EXPIRED.value 
                for cert in train["fitness_certificates"].values()
            )
            
            if has_expired_cert:
                self.model.Add(self.ibl_vars[train_id] == 1)
        
        # Constraint: Trains with critical job cards must go to IBL
        for train in self.trains:
            train_id = train["id"]
            has_critical_job = any(
                job["criticality"] == JobCardCriticality.CRITICAL.value 
                for job in train["job_cards"]
            )
            
            if has_critical_job:
                self.model.Add(self.ibl_vars[train_id] == 1)
        
        # Constraint: Trains overdue for maintenance must go to IBL
        for train in self.trains:
            train_id = train["id"]
            mileage = train["current_mileage"]
            thresholds = train["maintenance_thresholds"]
            
            overdue = any(
                mileage[component] >= thresholds[component]
                for component in ["bogie", "brake_pad", "hvac"]
            )
            
            if overdue:
                self.model.Add(self.ibl_vars[train_id] == 1)
        
        # Count how many trains are forced to IBL
        forced_to_ibl = sum(1 for train in self.trains if 
            any(cert["status"] == FitnessCertificateStatus.EXPIRED.value for cert in train["fitness_certificates"].values()) or
            any(job["criticality"] == JobCardCriticality.CRITICAL.value for job in train["job_cards"]) or
            any(train["current_mileage"][component] >= train["maintenance_thresholds"][component] 
                for component in ["bogie", "brake_pad", "hvac"])
        )
        
        # Calculate available trains for service and standby
        available_trains = len(self.trains) - forced_to_ibl
        
        # Adjust requirements if not enough trains available
        if available_trains < self.required_trains + self.standby_trains:
            logger.warning(f"Not enough trains available. Required: {self.required_trains + self.standby_trains}, Available: {available_trains}")
            
            # Prioritize service trains over standby
            if available_trains < self.required_trains:
                self.required_trains = available_trains
                self.standby_trains = 0
            else:
                self.standby_trains = available_trains - self.required_trains
        
        # Constraint: Exactly required_trains in service
        self.model.Add(sum(self.service_vars.values()) == self.required_trains)
        
        # Constraint: Exactly standby_trains on standby
        self.model.Add(sum(self.standby_vars.values()) == self.standby_trains)
        
        # Objective: Maximize total readiness score
        readiness_scores = []
        for train in self.trains:
            train_id = train["id"]
            score = self.readiness_scores[train_id]
            
            # Add to objective function with different weights for service vs standby
            readiness_scores.append(self.service_vars[train_id] * int(score * 100))
            readiness_scores.append(self.standby_vars[train_id] * int(score * 50))  # Lower weight for standby
        
        self.model.Maximize(sum(readiness_scores))
    
    def optimize_cleaning_schedule(self, trains_to_clean: List[str]) -> List[CleaningAssignment]:
        """Optimize the cleaning schedule for trains that need cleaning
        
        Multiple crews can work simultaneously based on cleaning_crew_available.
        Each crew handles one train at a time, reducing total schedule time.
        """
        cleaning_assignments = []
        
        if not trains_to_clean:
            return cleaning_assignments
        
        # Sort trains by priority (readiness score descending)
        trains_with_scores = []
        for train_id in trains_to_clean:
            score = self.readiness_scores[train_id]
            trains_with_scores.append((train_id, score))
        
        trains_with_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Track cleaning end time for each crew
        num_crews = self.cleaning_crew_available
        crew_end_times = [datetime.strptime("20:00:00", "%H:%M:%S") for _ in range(num_crews)]  # All start at 8 PM
        crew_assignments = [[] for _ in range(num_crews)]
        
        # Assign trains to crews - each crew takes the next available train
        for train_id, score in trains_with_scores:
            # Find the crew that will be free soonest
            min_end_time_idx = crew_end_times.index(min(crew_end_times))
            
            train = next(t for t in self.trains if t["id"] == train_id)
            duration = train["cleaning_duration"]
            
            start_time = crew_end_times[min_end_time_idx]
            end_time = start_time + timedelta(hours=duration)
            
            # Determine reason for cleaning
            last_cleaning = datetime.strptime(train["last_deep_cleaning"], "%Y-%m-%d")
            days_since_cleaning = (datetime.now() - last_cleaning).days
            
            if days_since_cleaning >= 7:
                reason = "Overdue for cleaning"
            else:
                reason = "Scheduled maintenance cleaning"
            
            assignment = {
                "train_id": train_id,
                "start_time": start_time.strftime("%H:%M:%S"),
                "end_time": end_time.strftime("%H:%M:%S"),
                "crew_assigned": min_end_time_idx + 1,  # Crew numbering starts from 1
                "priority": int(score),
                "reason": reason
            }
            
            cleaning_assignments.append(assignment)
            crew_assignments[min_end_time_idx].append(train_id)
            crew_end_times[min_end_time_idx] = end_time
        
        # Sort by start time for display
        cleaning_assignments.sort(key=lambda x: x["start_time"])
        
        return cleaning_assignments
    
    def get_current_position(self, train: Dict[str, Any]) -> str:
        """Get current position handling null values"""
        current_pos = train.get("current_position")
        if current_pos is None:
            # Assign default position based on status
            if train["status"] == "maintenance":
                # Find which IBL bay this train is in
                for bay in self.depot_layout["ibl_bays"]:
                    bay_id = bay["id"] if isinstance(bay, dict) else bay
                    current_trains = bay.get("current_trains", []) if isinstance(bay, dict) else []
                    if train["id"] in current_trains:
                        return f"{bay_id}-1"
                return "IBL01-1"  # Default IBL position
            elif train["status"] == "parking":
                # Find which parking track this train is in
                for track in self.depot_layout["parking_tracks"]:
                    if train["id"] in track.get("current_trains", []):
                        position = track["current_trains"].index(train["id"]) + 1
                        return f"{track['id']}-{position}"
                return "PT01-1"  # Default parking position
            else:
                return "Unknown"
        return current_pos
    
    def optimize_parking(self, service_trains: List[str], standby_trains: List[str], ibl_trains: List[str]) -> Tuple[List[ParkingAssignment], int]:
        """Optimize parking assignments to minimize shunting - FIXED for IBL capacity"""
        assignments = []
        total_moves = 0
        
        # Get current positions of all trains, handling null values
        current_positions = {}
        for train in self.trains:
            current_positions[train["id"]] = self.get_current_position(train)
        
        # CRITICAL FIX: Handle IBL capacity constraint
        # Only assign the 5 lowest priority trains to IBL, others go to parking
        ibl_capacity = len(self.ibl_bays)  # Maximum 5 IBL bays
        
        if len(ibl_trains) > ibl_capacity:
            # Sort IBL trains by readiness score (lowest scores first for IBL assignment)
            ibl_trains_with_scores = []
            for train_id in ibl_trains:
                score = self.readiness_scores[train_id]
                ibl_trains_with_scores.append((train_id, score))
            
            # Sort by score ascending (lowest scores = highest priority for IBL)
            ibl_trains_with_scores.sort(key=lambda x: x[1])
            
            # Take only the worst 5 trains for IBL
            trains_for_actual_ibl = [train_id for train_id, score in ibl_trains_with_scores[:ibl_capacity]]
            trains_forced_to_parking = [train_id for train_id, score in ibl_trains_with_scores[ibl_capacity:]]
            
            logger.warning(f"IBL capacity exceeded! {len(ibl_trains)} trains need IBL but only {ibl_capacity} slots available.")
            logger.warning(f"Assigning to IBL (lowest readiness): {trains_for_actual_ibl}")
            logger.warning(f"Forcing to parking (higher readiness): {trains_forced_to_parking}")
            
            # Update the IBL trains list to only include those that actually get IBL slots
            ibl_trains = trains_for_actual_ibl
            
            # Add the forced trains to standby (they'll get parking assignments)
            standby_trains.extend(trains_forced_to_parking)
        else:
            trains_forced_to_parking = []
        
        # Assign IBL trains to IBL bays
        for i, train_id in enumerate(ibl_trains):
            if i < len(self.ibl_bays):
                target_bay = self.ibl_bays[i]
                current_position = current_positions.get(train_id, "Unknown")
                
                # Calculate moves required
                current_bay = current_position.split("-")[0] if "-" in current_position else current_position
                moves, path = self.depot_graph.shortest_path(current_bay, target_bay)
                moves_required = moves if moves != float('inf') else 0
                total_moves += moves_required
                
                assignments.append({
                    "train_id": train_id,
                    "track_id": target_bay,
                    "position_in_track": 1,  # IBL bays have single position
                    "moves_required": moves_required,
                    "shunting_path": path
                })
        
        # Assign service and standby trains to parking tracks (including forced IBL trains that couldn't fit)
        non_ibl_trains = service_trains + standby_trains
        
        # Sort trains by readiness score (service trains first, then standby)
        trains_with_scores = []
        for train_id in non_ibl_trains:
            score = self.readiness_scores[train_id]
            trains_with_scores.append((train_id, score))
        
        trains_with_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Assign to parking tracks, prioritizing tracks near exit points
        parking_tracks = self.depot_layout["parking_tracks"]
        exit_points = self.depot_layout["exit_points"]
        
        # Sort tracks by proximity to exit points
        track_distances = []
        for track in parking_tracks:
            min_distance = float('inf')
            for exit_point in exit_points:
                distance, _ = self.depot_graph.shortest_path(track["id"], exit_point)
                min_distance = min(min_distance, distance)
            track_distances.append((track["id"], min_distance))
        
        track_distances.sort(key=lambda x: x[1])
        sorted_tracks = [track[0] for track in track_distances]
        
        # Assign trains to tracks
        track_assignments = {track_id: [] for track_id in sorted_tracks}
        
        for i, (train_id, score) in enumerate(trains_with_scores):
            track_idx = i % len(sorted_tracks)
            track_id = sorted_tracks[track_idx]
            
            if len(track_assignments[track_id]) < 2:  # Track capacity is 2
                track_assignments[track_id].append(train_id)
            else:
                # Find next available track
                assigned = False
                for j in range(len(sorted_tracks)):
                    next_track_idx = (track_idx + j) % len(sorted_tracks)
                    next_track_id = sorted_tracks[next_track_idx]
                    if len(track_assignments[next_track_id]) < 2:
                        track_assignments[next_track_id].append(train_id)
                        assigned = True
                        break
                
                if not assigned:
                    logger.error(f"Could not assign parking for train {train_id} - no available slots!")
        
        # Create parking assignments
        for track_id, train_ids in track_assignments.items():
            for position, train_id in enumerate(train_ids, 1):
                if train_id:  # Skip empty slots
                    current_position = current_positions.get(train_id, "Unknown")
                    
                    # Calculate moves required
                    current_bay = current_position.split("-")[0] if "-" in current_position else current_position
                    moves, path = self.depot_graph.shortest_path(current_bay, track_id)
                    moves_required = moves if moves != float('inf') else 0
                    total_moves += moves_required
                    
                    assignments.append({
                        "train_id": train_id,
                        "track_id": track_id,
                        "position_in_track": position,
                        "moves_required": moves_required,
                        "shunting_path": path
                    })
        
        # Return the updated IBL trains list (only those actually assigned to IBL)
        return assignments, total_moves, ibl_trains
    
    def optimize(self) -> Dict[str, Any]:
        """Run the complete optimization"""
        try:
            logger.info("Setting up constraints...")
            # Set up and solve the CP-SAT model
            self.setup_constraints()
            solver = cp_model.CpSolver()
            
            # Set a time limit for the solver (5 minutes)
            solver.parameters.max_time_in_seconds = 300.0
            
            logger.info("Solving optimization problem...")
            status = solver.Solve(self.model)
            
            if status not in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
                logger.warning("No optimal solution found, using fallback heuristic...")
                return self.fallback_heuristic()
            
            logger.info("Extracting results...")
            # Extract results
            trains_to_service = []
            trains_to_standby = []
            trains_to_ibl = []
            trains_to_clean = []
            
            readiness_scores = []
            
            for train in self.trains:
                train_id = train["id"]
                
                if solver.Value(self.service_vars[train_id]):
                    trains_to_service.append(train_id)
                elif solver.Value(self.standby_vars[train_id]):
                    trains_to_standby.append(train_id)
                elif solver.Value(self.ibl_vars[train_id]):
                    trains_to_ibl.append(train_id)
                
                # Check if train needs cleaning
                last_cleaning = datetime.strptime(train["last_deep_cleaning"], "%Y-%m-%d")
                days_since_cleaning = (datetime.now() - last_cleaning).days
                
                if days_since_cleaning >= 7 and train_id not in trains_to_ibl:
                    trains_to_clean.append(train_id)
                
                # Use pre-calculated readiness score
                readiness_scores.append({
                    "train_id": train_id,
                    "score": self.readiness_scores[train_id],
                    "breakdown": self.get_score_breakdown(train),
                    "details": self.readiness_details[train_id]
                })
            
            logger.info("Optimizing cleaning schedule...")
            # Optimize cleaning schedule
            cleaning_assignments = self.optimize_cleaning_schedule(trains_to_clean)
            
            logger.info("Optimizing parking assignments...")
            # Optimize parking assignments - now returns updated IBL trains list
            parking_assignments, total_moves, updated_ibl_trains = self.optimize_parking(trains_to_service, trains_to_standby, trains_to_ibl)
            # Update parking.json with the assignments
            self.update_parking_json_from_assignments(parking_assignments, updated_ibl_trains)
            
            logger.info("Generating explanation...")
            # Generate explanation
            explanation = self.generate_explanation(
                trains_to_service, trains_to_standby, updated_ibl_trains, readiness_scores
            )
            
            result = {
                "readiness_scores": readiness_scores,
                "cleaning_assignments": cleaning_assignments,
                "parking_assignments": parking_assignments,
                "trains_to_ibl": updated_ibl_trains,  # Use the capacity-limited IBL list
                "trains_to_service": trains_to_service,
                "trains_to_standby": trains_to_standby,
                "explanation": explanation,
                "total_shunting_moves": total_moves,
                "metadata": {
                    "solver_status": "OPTIMAL" if status == cp_model.OPTIMAL else "FEASIBLE",
                    "objective_value": solver.ObjectiveValue(),
                    "wall_time": solver.WallTime(),
                    "required_trains": self.required_trains,
                    "standby_trains": self.standby_trains
                }
            }
            
            logger.info("Optimization completed successfully")
            return result
            
        except Exception as e:
            logger.error(f"Error during optimization: {str(e)}")
            return self.fallback_heuristic()
    
    def fallback_heuristic(self) -> Dict[str, Any]:
        """Fallback heuristic when CP-SAT solver fails - FIXED for IBL capacity"""
        logger.info("Using fallback heuristic...")
        
        # Sort trains by readiness score
        trains_sorted = sorted(self.trains, key=lambda x: self.readiness_scores[x["id"]], reverse=True)
        
        # Identify trains that must go to IBL
        must_go_to_ibl = []
        for train in trains_sorted:
            train_id = train["id"]
            
            # Check fitness certificates
            has_expired_cert = any(
                cert["status"] == FitnessCertificateStatus.EXPIRED.value 
                for cert in train["fitness_certificates"].values()
            )
            
            # Check job cards
            has_critical_job = any(
                job["criticality"] == JobCardCriticality.CRITICAL.value 
                for job in train["job_cards"]
            )
            
            # Check mileage
            mileage = train["current_mileage"]
            thresholds = train["maintenance_thresholds"]
            overdue = any(
                mileage[component] >= thresholds[component]
                for component in ["bogie", "brake_pad", "hvac"]
            )
            
            if has_expired_cert or has_critical_job or overdue:
                must_go_to_ibl.append(train_id)
        
        # CRITICAL FIX: Handle IBL capacity in fallback
        ibl_capacity = len(self.ibl_bays)
        
        if len(must_go_to_ibl) > ibl_capacity:
            # Sort must_go_to_ibl by readiness score (lowest first for IBL)
            ibl_trains_with_scores = []
            for train_id in must_go_to_ibl:
                score = self.readiness_scores[train_id]
                ibl_trains_with_scores.append((train_id, score))
            
            ibl_trains_with_scores.sort(key=lambda x: x[1])  # Sort ascending (lowest scores first)
            
            # Take only the worst trains for IBL
            trains_for_actual_ibl = [train_id for train_id, score in ibl_trains_with_scores[:ibl_capacity]]
            trains_forced_to_parking = [train_id for train_id, score in ibl_trains_with_scores[ibl_capacity:]]
            
            logger.warning(f"Fallback: IBL capacity exceeded! {len(must_go_to_ibl)} need IBL but only {ibl_capacity} slots.")
            logger.warning(f"Fallback: Assigning to IBL: {trains_for_actual_ibl}")
            logger.warning(f"Fallback: Forcing to parking: {trains_forced_to_parking}")
            
            must_go_to_ibl = trains_for_actual_ibl
        else:
            trains_forced_to_parking = []
        
        # Assign trains to service, standby, and IBL
        trains_to_service = []
        trains_to_standby = []
        trains_to_ibl = must_go_to_ibl.copy()
        
        # Assign remaining trains to service and standby based on readiness score
        available_trains = [t for t in trains_sorted if t["id"] not in must_go_to_ibl and t["id"] not in trains_forced_to_parking]
        
        for i, train in enumerate(available_trains):
            if i < self.required_trains:
                trains_to_service.append(train["id"])
            elif i < self.required_trains + self.standby_trains:
                trains_to_standby.append(train["id"])
            else:
                # These go to parking (not IBL since we're at capacity)
                trains_to_standby.append(train["id"])
        
        # Add forced IBL trains to standby (they'll get parking)
        trains_to_standby.extend(trains_forced_to_parking)
        
        # Check if we need to adjust requirements
        if len(trains_to_service) < self.required_trains:
            logger.warning(f"Fallback: Not enough trains for service. Required: {self.required_trains}, Got: {len(trains_to_service)}")
        
        if len(trains_to_standby) < self.standby_trains:
            logger.warning(f"Fallback: Not enough trains for standby. Required: {self.standby_trains}, Got: {len(trains_to_standby)}")
        
        # Identify trains that need cleaning
        trains_to_clean = []
        readiness_scores = []
        
        for train in self.trains:
            train_id = train["id"]
            
            # Check if train needs cleaning
            last_cleaning = datetime.strptime(train["last_deep_cleaning"], "%Y-%m-%d")
            days_since_cleaning = (datetime.now() - last_cleaning).days
            
            if days_since_cleaning >= 7 and train_id not in trains_to_ibl:
                trains_to_clean.append(train_id)
            
            # Use pre-calculated readiness score
            readiness_scores.append({
                "train_id": train_id,
                "score": self.readiness_scores[train_id],
                "breakdown": self.get_score_breakdown(train),
                "details": self.readiness_details[train_id]
            })
        
        # Optimize cleaning schedule
        cleaning_assignments = self.optimize_cleaning_schedule(trains_to_clean)
        
        # Optimize parking assignments (with updated IBL trains list)
        parking_assignments, total_moves, updated_ibl_trains = self.optimize_parking(trains_to_service, trains_to_standby, trains_to_ibl)

        self.update_parking_json_from_assignments(parking_assignments)
        
        # Generate explanation
        explanation = self.generate_explanation(
            trains_to_service, trains_to_standby, updated_ibl_trains, readiness_scores
        )
        
        return {
            "readiness_scores": readiness_scores,
            "cleaning_assignments": cleaning_assignments,
            "parking_assignments": parking_assignments,
            "trains_to_ibl": updated_ibl_trains,  # Use the updated list
            "trains_to_service": trains_to_service,
            "trains_to_standby": trains_to_standby,
            "explanation": explanation,
            "total_shunting_moves": total_moves,
            "metadata": {
                "solver_status": "FALLBACK",
                "objective_value": 0,
                "wall_time": 0,
                "required_trains": self.required_trains,
                "standby_trains": self.standby_trains
            }
        }
    
    def get_score_breakdown(self, train: Dict[str, Any]) -> Dict[str, float]:
        """Get breakdown of readiness score by factor"""
        breakdown = {}
        
        # 1. Fitness certificates
        fitness_score = 100
        for cert in train["fitness_certificates"].values():
            if cert["status"] == FitnessCertificateStatus.EXPIRED.value:
                fitness_score = 0
                break
        breakdown["fitness_certificates"] = fitness_score
        
        # 2. Job cards
        job_score = 100
        for job in train["job_cards"]:
            if job["criticality"] == JobCardCriticality.CRITICAL.value:
                job_score = 0
                break
            elif job["criticality"] == JobCardCriticality.HIGH.value:
                job_score *= 0.5
            elif job["criticality"] == JobCardCriticality.MEDIUM.value:
                job_score *= 0.75
            elif job["criticality"] == JobCardCriticality.LOW.value:
                job_score *= 0.9
        breakdown["job_cards"] = job_score
        
        # 3. Branding contracts
        branding_score = 100
        for contract in train["branding_contracts"]:
            total_hours = contract["total_exposure_hours"]
            completed_hours = contract["completed_hours"]
            remaining_hours = total_hours - completed_hours
            
            deadline = datetime.strptime(contract["deadline"], "%Y-%m-%d")
            days_remaining = (deadline - datetime.now()).days
            
            if days_remaining > 0:
                hours_per_day = remaining_hours / days_remaining
                if hours_per_day > 8:
                    branding_score *= 1.5
                elif hours_per_day > 4:
                    branding_score *= 1.2
        breakdown["branding_contracts"] = branding_score
        
        # 4. Mileage balancing
        mileage_score = 100
        mileage = train["current_mileage"]
        thresholds = train["maintenance_thresholds"]
        
        for component in ["bogie", "brake_pad", "hvac"]:
            remaining = thresholds[component] - mileage[component]
            if remaining <= 0:
                mileage_score = 0
                break
            elif remaining < 1000:
                mileage_score *= 0.5
            elif remaining < 2000:
                mileage_score *= 0.7
            elif remaining < 3000:
                mileage_score *= 0.9
        breakdown["mileage_balancing"] = mileage_score
        
        # 5. Cleaning status
        cleaning_score = 100
        last_cleaning = datetime.strptime(train["last_deep_cleaning"], "%Y-%m-%d")
        days_since_cleaning = (datetime.now() - last_cleaning).days
        
        if days_since_cleaning > 7:
            cleaning_score = 50
        elif days_since_cleaning > 5:
            cleaning_score = 75
        breakdown["cleaning_status"] = cleaning_score
        
        return breakdown
    
    def generate_explanation(self, service_trains: List[str], standby_trains: List[str], 
                            ibl_trains: List[str], readiness_scores: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate detailed explanation of the optimization results"""
        explanation = {
            "summary": f"🚆 Optimization complete. {len(service_trains)} trains selected for service, "
                      f"{len(standby_trains)} for standby, and {len(ibl_trains)} for IBL.",
            "trains_to_ibl_reasons": {},
            "service_train_reasons": {},
            "cleaning_priorities": {},
            "parking_optimization": f"Total shunting moves required: {self.calculate_total_moves(service_trains + standby_trains + ibl_trains)}"
        }
        
        # Explain why trains are going to IBL
        for train_id in ibl_trains:
            train = next(t for t in self.trains if t["id"] == train_id)
            reasons = []
            
            # Check fitness certificates
            for dept, cert in train["fitness_certificates"].items():
                if cert["status"] == FitnessCertificateStatus.EXPIRED.value:
                    reasons.append(f"❌ Expired {dept} fitness certificate")
            
            # Check job cards
            for job in train["job_cards"]:
                if job["criticality"] == JobCardCriticality.CRITICAL.value:
                    reasons.append(f"❌ Critical job card: {job['description']}")
            
            # Check mileage
            mileage = train["current_mileage"]
            thresholds = train["maintenance_thresholds"]
            for component in ["bogie", "brake_pad", "hvac"]:
                if mileage[component] >= thresholds[component]:
                    reasons.append(f"❌ Overdue for {component} maintenance")
            
            explanation["trains_to_ibl_reasons"][train_id] = reasons
        
        # Explain why trains were selected for service
        for train_id in service_trains:
            train = next(t for t in self.trains if t["id"] == train_id)
            score_data = next(rs for rs in readiness_scores if rs["train_id"] == train_id)
            
            reasons = []
            
            # High readiness score
            if score_data["score"] > 80:
                reasons.append("✅ High overall readiness score")
            
            # Branding urgency
            for contract in train["branding_contracts"]:
                total_hours = contract["total_exposure_hours"]
                completed_hours = contract["completed_hours"]
                remaining_hours = total_hours - completed_hours
                
                deadline = datetime.strptime(contract["deadline"], "%Y-%m-%d")
                days_remaining = (deadline - datetime.now()).days
                
                if days_remaining > 0 and remaining_hours / days_remaining > 4:
                    reasons.append(f"⚠️ Urgent branding commitment for {contract['brand']}")
            
            explanation["service_train_reasons"][train_id] = reasons
        
        # Explain cleaning priorities
        for train in self.trains:
            train_id = train["id"]
            if train_id in ibl_trains:
                continue
                
            last_cleaning = datetime.strptime(train["last_deep_cleaning"], "%Y-%m-%d")
            days_since_cleaning = (datetime.now() - last_cleaning).days
            
            if days_since_cleaning >= 7:
                explanation["cleaning_priorities"][train_id] = {
                    "priority": "🚨 High",
                    "reason": f"Last cleaned {days_since_cleaning} days ago (exceeds 7-day threshold)"
                }
            elif days_since_cleaning >= 5:
                explanation["cleaning_priorities"][train_id] = {
                    "priority": "⚠️ Medium",
                    "reason": f"Last cleaned {days_since_cleaning} days ago (approaching 7-day threshold)"
                }
        
        return explanation
    
    def calculate_total_moves(self, train_ids: List[str]) -> int:
        """Calculate total shunting moves required"""
        total_moves = 0
        current_positions = {}
        
        for train in self.trains:
            current_positions[train["id"]] = self.get_current_position(train)
        
        for train_id in train_ids:
            train = next(t for t in self.trains if t["id"] == train_id)
            current_position = current_positions.get(train_id, "Unknown")
            
            # Simplified move calculation
            if "IBL" in current_position and train_id not in self.input_data.get("trains_to_ibl", []):
                total_moves += 2  # Move out of IBL and to parking
            elif "IBL" not in current_position and train_id in self.input_data.get("trains_to_ibl", []):
                total_moves += 2  # Move to IBL
            else:
                total_moves += 1  # Regular repositioning
        
        return total_moves
    
    def update_parking_json_from_assignments(self, parking_assignments: List[Dict[str, Any]], ibl_trains: List[str]) -> None:
        """Update parking.json with assignments from Layer 1 optimization"""
        try:
            from config import PARKING_JSON_PATH
            import os
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(PARKING_JSON_PATH), exist_ok=True)
            
            # Convert parking assignments to parking.json format
            parking_data = []
            current_time = datetime.now().isoformat()
            
            for assignment in parking_assignments:
                # Determine status based on whether train is in IBL list AND assigned to IBL bay
                train_id = assignment["train_id"]
                track_id = assignment["track_id"]
                
                # If train is in IBL trains list AND assigned to IBL bay, set status to maintenance
                if train_id in ibl_trains and track_id.startswith("IBL"):
                    status = "maintenance"
                else:
                    status = "parking"
                
                parking_record = {
                    "train_id": train_id,
                    "bay": track_id,
                    "position": assignment["position_in_track"],
                    "status": status,  # This is the key fix
                    "arrival_time": current_time,
                    "notes": "Assigned from Layer 1 optimization"
                }
                parking_data.append(parking_record)
            
            # Save to parking.json
            with open(PARKING_JSON_PATH, "w") as f:
                json.dump(parking_data, f, indent=2)
                
            logger.info(f"Updated parking.json with {len(parking_data)} assignments")
            
        except Exception as e:
            logger.error(f"Error updating parking.json: {str(e)}")
            # Don't raise the exception to avoid breaking the main optimization