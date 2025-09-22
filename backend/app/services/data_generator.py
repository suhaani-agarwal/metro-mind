import json
from datetime import datetime, timedelta
import random
from typing import List, Dict, Any
from app.models import (
    Train, FitnessCertificate, Department, FitnessCertificateStatus,
    JobCard, JobCardCriticality, BrandingContract, MaintenanceThresholds,
    TrainStatus, CleaningSlot, ParkingTrack, DepotLayout
)

class DataGenerator:
    def __init__(self):
        self.train_ids = [f"TM{i:03d}" for i in range(1, 26)]
        self.brands = ["Coca-Cola", "Pepsi", "Amazon", "Google", "Microsoft", "Apple", "Samsung"]
        self.job_descriptions = {
            "critical": [
                "Brake system overhaul", "Bogie alignment", "HVAC compressor replacement",
                "Emergency brake repair", "Main power system fault"
            ],
            "high": [
                "Door mechanism adjustment", "Window seal replacement", "Lighting system repair",
                "AC unit maintenance", "Control panel calibration"
            ],
            "medium": [
                "Seat upholstery repair", "Flooring replacement", "Paint touch-up",
                "Interior panel fixing", "Handrail maintenance"
            ],
            "low": [
                "Interior cleaning", "Exterior washing", "Lubrication of moving parts",
                "Minor cosmetic fixes", "Dashboard polishing"
            ]
        }
    
    def generate_fitness_certificates(self) -> Dict[Department, FitnessCertificate]:
        certs = {}
        today = datetime.now()
        
        for dept in Department:
            # Only 10% chance of expired certificate (more realistic)
            if random.random() < 0.1:
                expiry_date = (today - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d")
                status = FitnessCertificateStatus.EXPIRED
            else:
                expiry_date = (today + timedelta(days=random.randint(30, 365))).strftime("%Y-%m-%d")
                status = FitnessCertificateStatus.VALID
                
            issue_date = (today - timedelta(days=random.randint(100, 500))).strftime("%Y-%m-%d")
            
            certs[dept] = {
                "department": dept.value,
                "issue_date": issue_date,
                "expiry_date": expiry_date,
                "status": status.value
            }
            
        return certs
    
    def generate_job_cards(self) -> List[JobCard]:
        job_cards = []
        # More realistic distribution of job cards
        num_jobs = random.choices([0, 1, 2, 3], weights=[0.3, 0.4, 0.2, 0.1])[0]
        
        for i in range(num_jobs):
            # Weighted distribution of criticality
            criticality = random.choices(
                list(JobCardCriticality),
                weights=[0.1, 0.2, 0.3, 0.4]  # More low/medium, fewer critical/high
            )[0]
            
            description = random.choice(self.job_descriptions[criticality.value])
            
            job_cards.append({
                "id": f"JC{random.randint(1000, 9999)}",
                "description": description,
                "open_date": (datetime.now() - timedelta(days=random.randint(1, 30))).strftime("%Y-%m-%d"),
                "criticality": criticality.value,
                "estimated_hours": random.uniform(1, 8)
            })
            
        return job_cards
    
    def generate_branding_contracts(self) -> List[BrandingContract]:
        contracts = []
        # 50% chance of having a branding contract (more realistic)
        if random.random() < 0.5:
            brand = random.choice(self.brands)
            total_hours = random.randint(40, 200)
            completed_hours = random.randint(0, total_hours)
            
            contracts.append({
                "brand": brand,
                "total_exposure_hours": total_hours,
                "completed_hours": completed_hours,
                "deadline": (datetime.now() + timedelta(days=random.randint(7, 60))).strftime("%Y-%m-%d"),
                "priority": random.randint(1, 10)
            })
            
        return contracts
    
    def generate_train(self, train_id: str) -> Train:
        fitness_certs = self.generate_fitness_certificates()
        job_cards = self.generate_job_cards()
        branding_contracts = self.generate_branding_contracts()
        
        # Check if any fitness certificate is expired
        has_expired_cert = any(cert["status"] == FitnessCertificateStatus.EXPIRED.value 
                              for cert in fitness_certs.values())
        
        # Check if any critical job card exists
        has_critical_job = any(job["criticality"] == JobCardCriticality.CRITICAL.value 
                              for job in job_cards)
        
        # More realistic mileage distribution
        current_mileage = {
            "bogie": random.uniform(8000, 14500),
            "brake_pad": random.uniform(6000, 12000),
            "hvac": random.uniform(9000, 15000)
        }
        
        thresholds = {
            "bogie": 15000,
            "brake_pad": 13000,
            "hvac": 15000
        }
        
        # Check if overdue for maintenance
        overdue = any(
            current_mileage[component] >= thresholds[component]
            for component in ["bogie", "brake_pad", "hvac"]
        )
        
        # Determine initial status
        if has_expired_cert or has_critical_job or overdue:
            status = TrainStatus.IBL
        else:
            status = random.choice([TrainStatus.IN_SERVICE, TrainStatus.STANDBY, TrainStatus.PARKING])
        
        # Current position - random parking track
        track_id = f"PT{random.randint(1, 12):02d}"
        position = random.choice([1, 2])
        current_position = f"{track_id}-{position}"
        
        # More trains overdue for cleaning (30% chance)
        days_since_cleaning = random.choices(
            [random.randint(0, 4), random.randint(5, 6), random.randint(7, 10)],
            weights=[0.5, 0.2, 0.3]
        )[0]
        
        last_cleaning = (datetime.now() - timedelta(days=days_since_cleaning)).strftime("%Y-%m-%d")
        
        return {
            "id": train_id,
            "fitness_certificates": fitness_certs,
            "job_cards": job_cards,
            "branding_contracts": branding_contracts,
            "current_mileage": current_mileage,
            "maintenance_thresholds": thresholds,
            "last_deep_cleaning": last_cleaning,
            "cleaning_duration": random.choice([2, 3, 4]),
            "status": status.value,
            "current_position": current_position
        }
    
    def generate_cleaning_slots(self) -> List[CleaningSlot]:
        slots = []
        for i in range(3):  # 3 cleaning slots (in parking bays)
            # 90% chance slot is available
            available = random.random() < 0.9
            available_from = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            slots.append({
                "id": f"CS{i+1:02d}",
                "available": available,
                "available_from": available_from
            })
            
        return slots
    
    def generate_depot_layout(self) -> DepotLayout:
        # Generate parking tracks (12 tracks, each with capacity of 2 trains)
        parking_tracks = []
        for i in range(1, 13):
            track_id = f"PT{i:02d}"
            # Randomly assign 0-2 trains to each track
            num_trains = random.randint(0, 2)
            current_trains = random.sample(self.train_ids, min(num_trains, len(self.train_ids)))
            
            parking_tracks.append({
                "id": track_id,
                "capacity": 2,
                "current_trains": current_trains
            })
        
        # IBL bays
        ibl_bays = [f"IBL{i:02d}" for i in range(1, 6)]
        
        # Exit points
        exit_points = ["EXIT01", "EXIT02"]
        
        # Create connections between tracks and bays (simplified grid layout)
        connections = {}
        all_locations = [track["id"] for track in parking_tracks] + ibl_bays + exit_points
        
        # Create a grid-like connection structure
        for i, location in enumerate(all_locations):
            connections[location] = []
            
            # Connect to neighboring locations
            if "PT" in location:
                track_num = int(location[2:])
                # Connect to adjacent tracks
                if track_num > 1:
                    connections[location].append(f"PT{track_num-1:02d}")
                if track_num < 12:
                    connections[location].append(f"PT{track_num+1:02d}")
                # Connect to IBL bays if nearby
                if track_num <= 3:
                    connections[location].extend(["IBL01", "IBL02"])
                elif track_num >= 10:
                    connections[location].extend(["IBL04", "IBL05"])
                # Connect to exit points
                if track_num <= 6:
                    connections[location].append("EXIT01")
                else:
                    connections[location].append("EXIT02")
            
            elif "IBL" in location:
                ibl_num = int(location[3:])
                # Connect to adjacent IBL bays
                if ibl_num > 1:
                    connections[location].append(f"IBL{ibl_num-1:02d}")
                if ibl_num < 5:
                    connections[location].append(f"IBL{ibl_num+1:02d}")
                # Connect to nearby parking tracks
                if ibl_num <= 2:
                    connections[location].extend(["PT01", "PT02", "PT03"])
                else:
                    connections[location].extend(["PT10", "PT11", "PT12"])
            
            elif "EXIT" in location:
                # Connect exit points to parking tracks
                if location == "EXIT01":
                    connections[location].extend(["PT01", "PT02", "PT03", "PT04", "PT05", "PT06"])
                else:
                    connections[location].extend(["PT07", "PT08", "PT09", "PT10", "PT11", "PT12"])
        
        return {
            "parking_tracks": parking_tracks,
            "ibl_bays": ibl_bays,
            "exit_points": exit_points,
            "connections": connections
        }
    
    def generate_all_data(self) -> Dict[str, Any]:
        trains = [self.generate_train(train_id) for train_id in self.train_ids]
        cleaning_slots = self.generate_cleaning_slots()
        depot_layout = self.generate_depot_layout()
        
        return {
            "trains": trains,
            "cleaning_slots": cleaning_slots,
            "depot_layout": depot_layout,
            "date": datetime.now().strftime("%Y-%m-%d"),
            "required_trains": 18,
            "standby_trains": 4,
            "cleaning_crew_available": 3
        }

if __name__ == "__main__":
    generator = DataGenerator()
    data = generator.generate_all_data()
    
    with open("../data/input_data.json", "w") as f:
        json.dump(data, f, indent=2)
    
    print("Data generated successfully!")