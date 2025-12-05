
# backend/app/utils/generate_synthetic_delay_data.py
import random
import csv
from datetime import datetime, timedelta
import json

# Load real train configuration
with open('backend/storage/unified.json') as f:
    TRAIN_CONFIGS_ALL = json.load(f)["trains"]

# Config
NUM_TRAINS_TO_SIMULATE = 25
NUM_DAYS = 90  # 3 months
STATIONS = [
    "Aluva", "Pulinchodu", "Companypady", "Ambattukavu", "Muttom", 
    "Kalamassery Town", "Cochin University", "Pathadipalam", "Edappally", 
    "Changampuzha Park", "Palarivattom", "JLN Stadium", "Kaloor", 
    "Town Hall", "M.G Road", "Maharaja's College", "Ernakulam South", 
    "Kadavanthra", "Elamkulam", "Vytilla", "Thaikoodam", "Vadakkekotta", 
    "SN Junction", "Tripunithura Terminal", "Pettah"
]

DELAY_KEYWORDS = [
    "brake", "door", "traction", "signalling", "signal", "fault", 
    "engine", "wheel", "axle", "coupler", "bogie", "bearing", 
    "pantograph", "compressor", "pneumatic", "air leak", "leak", 
    "vibration", "overheat", "overheating", "wheel flat", "tcms",
    "controller", "converter", "battery", "hv cable", "sensor", "speed sensor"
]

random.seed(42)

def get_time_bucket(hour):
    if hour < 5:
        return 'early_morning'
    elif hour < 10:
        return 'morning'
    elif hour < 14:
        return 'noon'
    elif hour < 17:
        return 'afternoon'
    elif hour < 21:
        return 'evening'
    else:
        return 'night'

def get_train_config(train_id):
    return next((tc for tc in TRAIN_CONFIGS_ALL if tc["id"] == train_id), None)

# REALISTIC DELAY DISTRIBUTION (WHAT WE WANT):
# 85%: No delay or minimal delay (0-1 min)
# 10%: Minor delays (1-3 min)
# 4%: Moderate delays (3-5 min)
# 1%: Significant delays (5-10 min)
# <0.1%: Major delays (>10 min)

def generate_realistic_delay(train_cfg, station, hour, weather, is_weekend, prev_cum_delay):
    """Generate realistic delay with proper distribution"""
    
    # Base probability of any delay: 15% chance
    has_delay = random.random() < 0.15
    
    if not has_delay:
        return 0.0, ["Normal operation"]
    
    # Determine delay severity based on realistic distribution
    severity_roll = random.random()
    
    if severity_roll < 0.666:  # 66.6% of delays are minimal (0-1 min)
        base_delay = random.uniform(0.1, 1.0)
    elif severity_roll < 0.933:  # 26.7% are minor (1-3 min)
        base_delay = random.uniform(1.0, 3.0)
    elif severity_roll < 0.99:  # 5.7% are moderate (3-5 min)
        base_delay = random.uniform(3.0, 5.0)
    else:  # 1% are significant (5-8 min)
        base_delay = random.uniform(5.0, 8.0)
    
    # RARELY have major delays (>10 min) - only 0.1% chance
    if random.random() < 0.001:
        base_delay = random.uniform(10.0, 15.0)
    
    delay = base_delay
    causes = []
    
    # Add factors only if they actually exist
    job_cards = train_cfg.get("job_cards", [])
    relevant_jobs = []
    
    # Check for delay-relevant job cards
    for jc in job_cards:
        desc = (jc.get("description", "") or "").lower()
        if any(k in desc for k in DELAY_KEYWORDS):
            relevant_jobs.append(jc)
    
    # Only add job card impact if there are relevant jobs
    if relevant_jobs:
        # Count by criticality
        critical_count = sum(1 for j in relevant_jobs if j.get("criticality") == "critical")
        high_count = sum(1 for j in relevant_jobs if j.get("criticality") == "high")
        
        if critical_count > 0:
            delay += critical_count * random.uniform(0.2, 0.5)
            causes.append(f"Critical job card(s): {critical_count}")
        elif high_count > 0:
            delay += high_count * random.uniform(0.1, 0.3)
            if random.random() < 0.5:  # Only mention sometimes
                causes.append(f"High priority job card(s): {high_count}")
    
    # Weather impact (only for bad weather)
    if weather in ["rain", "storm"]:
        if weather == "storm":
            delay += random.uniform(0.5, 2.0)
            causes.append("Storm conditions")
        elif weather == "rain":
            delay += random.uniform(0.2, 1.0)
            if random.random() < 0.3:  # Only mention sometimes
                causes.append("Rain affecting operations")
    elif weather == "foggy":
        delay += random.uniform(0.1, 0.5)
        if random.random() < 0.2:  # Rarely mention fog
            causes.append("Reduced visibility")
    
    # Peak hour impact
    time_bucket = get_time_bucket(hour)
    if time_bucket in ["morning", "evening"]:
        delay += random.uniform(0.1, 0.3)
        # Only mention if significant
        if random.random() < 0.2:
            causes.append("Peak hour operations")
    
    # Weekend impact (slightly more delays)
    if is_weekend and random.random() < 0.3:
        delay += random.uniform(0.1, 0.4)
    
    # Maintenance wear impact (only if significant)
    current_mileage = train_cfg.get("current_mileage", {})
    thresholds = train_cfg.get("maintenance_thresholds", {})
    
    if current_mileage and thresholds:
        wear_ratios = []
        for comp, miles in current_mileage.items():
            thr = thresholds.get(comp, 10000)
            if thr > 0:
                wear_ratios.append(min(miles / thr, 1.0))
        
        if wear_ratios:
            avg_wear = sum(wear_ratios) / len(wear_ratios)
            if avg_wear > 0.85:  # Only if significantly worn
                wear_impact = (avg_wear - 0.85) * 2
                delay += wear_impact
                if wear_impact > 0.2:
                    causes.append(f"Equipment wear ({avg_wear:.0%})")
    
    # Add small cumulative effect (only 20% of previous delay carries over)
    if prev_cum_delay > 0:
        delay += prev_cum_delay * 0.2
    
    # Cap delays realistically
    if delay > 15:
        delay = 15.0  # Absolute maximum
    elif delay < 0.1:
        delay = 0.0
    
    # Round to 1 decimal place
    delay = round(delay, 1)
    
    # If delay is very small, no specific cause
    if delay < 0.5 and not causes:
        causes = ["Operational adjustment"]
    
    return delay, causes

# Generate synthetic data
rows = []
start_date = datetime(2024, 1, 1)

print("Generating REALISTIC synthetic delay data...")

for day in range(NUM_DAYS):
    current_date = start_date + timedelta(days=day)
    is_weekend = current_date.weekday() >= 5
    month = current_date.month
    
    # Weather based on month
    if month in [6, 7, 8, 9]:  # Monsoon
        weather = random.choices(["clear", "rain", "storm"], weights=[0.4, 0.5, 0.1])[0]
    elif month in [3, 4, 5]:  # Summer
        weather = random.choices(["clear", "hot_sunny", "clear"], weights=[0.7, 0.3, 0.0])[0]
    else:  # Winter
        weather = random.choices(["clear", "foggy", "clear"], weights=[0.8, 0.2, 0.0])[0]
    
    # Process each train
    for train_cfg in TRAIN_CONFIGS_ALL[:NUM_TRAINS_TO_SIMULATE]:
        train_id = train_cfg["id"]
        
        # Each train does 6-8 rotations
        num_rotations = random.randint(6, 8)
        
        for rotation in range(1, num_rotations + 1):
            # Start time
            start_hour = random.randint(6, 18)
            start_minute = random.choice([0, 10, 20, 30, 40, 50])
            dep_time = datetime(current_date.year, current_date.month, 
                               current_date.day, start_hour, start_minute)
            
            cumulative_delay = 0.0
            
            for i, station in enumerate(STATIONS):
                # Scheduled arrival
                sched_arrival_dt = dep_time + timedelta(minutes=i * 2)
                
                # Skip if outside service hours
                if sched_arrival_dt.hour > 22:
                    break
                
                hour = sched_arrival_dt.hour
                
                # Generate realistic delay
                delay_minutes, causes = generate_realistic_delay(
                    train_cfg, station, hour, weather, is_weekend, cumulative_delay
                )
                
                actual_arrival_dt = sched_arrival_dt + timedelta(minutes=delay_minutes)
                
                # Update cumulative delay with decay
                cumulative_delay = (cumulative_delay * 0.8) + delay_minutes
                cumulative_delay = round(cumulative_delay, 1)
                
                # Create row - KEEP SAME FIELDS AS BEFORE
                rows.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "train_id": train_id,
                    "rotation": rotation,
                    "station": station,
                    "scheduled_arrival": sched_arrival_dt.strftime("%H:%M"),
                    "actual_arrival": actual_arrival_dt.strftime("%H:%M"),
                    "delay_minutes": delay_minutes,
                    "delay_risk": int(delay_minutes > 2.0),
                    "weather": weather,
                    "time_bucket": get_time_bucket(hour),
                    "job_cards": ";".join([f"{jc['description']}|{jc['criticality']}" 
                                         for jc in train_cfg.get("job_cards", [])]),
                    "crowd_level": random.randint(1, 5),
                    "is_weekend": int(is_weekend),
                    "cause": ";".join(causes) if causes else "None",
                    "prev_cum_delay": round(cumulative_delay, 1)
                })

# Write to CSV
output_filepath = "backend/app/utils/synthetic_rotation_history.csv"
with open(output_filepath, "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

# Calculate statistics
delays = [r["delay_minutes"] for r in rows]
total = len(delays)

print(f"\n✓ Generated {total:,} rows of realistic synthetic data")
print(f"✓ Delay distribution:")
print(f"  - No delay (0 min): {sum(1 for d in delays if d == 0):,} ({sum(1 for d in delays if d == 0)/total*100:.1f}%)")
print(f"  - Minimal (0-1 min): {sum(1 for d in delays if 0 < d <= 1):,} ({sum(1 for d in delays if 0 < d <= 1)/total*100:.1f}%)")
print(f"  - Minor (1-3 min): {sum(1 for d in delays if 1 < d <= 3):,} ({sum(1 for d in delays if 1 < d <= 3)/total*100:.1f}%)")
print(f"  - Moderate (3-5 min): {sum(1 for d in delays if 3 < d <= 5):,} ({sum(1 for d in delays if 3 < d <= 5)/total*100:.1f}%)")
print(f"  - Significant (5-10 min): {sum(1 for d in delays if 5 < d <= 10):,} ({sum(1 for d in delays if 5 < d <= 10)/total*100:.1f}%)")
print(f"  - Major (>10 min): {sum(1 for d in delays if d > 10):,} ({sum(1 for d in delays if d > 10)/total*100:.1f}%)")
print(f"✓ Average delay: {sum(delays)/total:.2f} minutes")
print(f"✓ Data saved to {output_filepath}")