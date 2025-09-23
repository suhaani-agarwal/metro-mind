import random
import csv
from datetime import datetime, timedelta

# Config
NUM_TRAINS = 10
NUM_DAYS = 100
STATIONS = [
    "Aluva", "Pulinchodu", "Companypady", "Ambattukavu", "Muttom", "Kalamassery Town", "Cochin University", "Pathadipalam", "Edappally", "Changampuzha Park", "Palarivattom", "JLN Stadium", "Kaloor", "Town Hall", "M.G Road", "Maharaja's College", "Ernakulam South", "Kadavanthra", "Elamkulam", "Vytilla", "Thaikoodam", "Pettah"
]
TIME_BUCKETS = ["early_morning", "morning", "noon", "afternoon", "evening", "night"]
WEATHER_TYPES = ["clear", "rain", "storm", "foggy", "hot_sunny"]
DELAY_KEYWORDS = ["brake", "door", "traction", "signalling", "fault", "engine", "wheel", "axle", "coupler"]
NON_DELAY_JOBCARDS = ["AC maintenance", "livery replacement", "cleaning", "routine check", "seat repair"]

random.seed(42)

# Helper to bucket time
def get_time_bucket(hour):
    if hour < 6:
        return "early_morning"
    elif hour < 10:
        return "morning"
    elif hour < 14:
        return "noon"
    elif hour < 17:
        return "afternoon"
    elif hour < 21:
        return "evening"
    else:
        return "night"

# Generate synthetic data
rows = []
start_date = datetime(2024, 1, 1)
for day in range(NUM_DAYS):
    date = start_date + timedelta(days=day)
    for train_num in range(NUM_TRAINS):
        train_id = f"TR{train_num+1:03d}"
        # Each train does 8 rotations per day
        for rotation in range(8):
            # Each rotation covers all stations
            dep_time = datetime(date.year, date.month, date.day, 6, 0) + timedelta(minutes=rotation*30)
            for i, station in enumerate(STATIONS):
                sched_arrival = dep_time + timedelta(minutes=i*2)
                hour = sched_arrival.hour
                time_bucket = get_time_bucket(hour)
                # Weather
                weather = random.choices(WEATHER_TYPES, weights=[60, 25, 5, 5, 5])[0]
                # Job cards
                job_cards = []
                # 30% chance of delay-relevant job card
                if random.random() < 0.3:
                    kw = random.choice(DELAY_KEYWORDS)
                    desc = f"{kw} fault detected"
                    job_cards.append(desc)
                # 20% chance of non-delay job card
                if random.random() < 0.2:
                    desc = random.choice(NON_DELAY_JOBCARDS)
                    job_cards.append(desc)
                # Actual delay logic
                delay_relevant = any(any(k in jc for k in DELAY_KEYWORDS) for jc in job_cards)
                weather_severity = 0
                if weather == "clear":
                    weather_severity = 0
                elif weather == "rain":
                    weather_severity = 1
                elif weather == "storm":
                    weather_severity = 2
                elif weather == "foggy":
                    weather_severity = 1
                elif weather == "hot_sunny":
                    weather_severity = 0
                # Delay risk
                delay_risk = 0
                delay_minutes = 0
                cause = ""
                if delay_relevant or weather_severity > 0:
                    # 80% chance of delay if either factor
                    if random.random() < 0.8:
                        delay_risk = 1
                        # Delay minutes: base + weather + job card
                        delay_minutes = random.randint(2, 8) * (1 + weather_severity*0.5)
                        if delay_relevant:
                            cause = f"job_card:{','.join([jc for jc in job_cards if any(k in jc for k in DELAY_KEYWORDS)])}"
                        if weather_severity > 0:
                            if cause:
                                cause += "; "
                            cause += f"weather:{weather}"
                # Scheduled/actual
                actual_arrival = sched_arrival + timedelta(minutes=delay_minutes)
                rows.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "train_id": train_id,
                    "rotation": rotation+1,
                    "station": station,
                    "scheduled_arrival": sched_arrival.strftime("%H:%M"),
                    "actual_arrival": actual_arrival.strftime("%H:%M"),
                    "delay_minutes": round(delay_minutes, 1),
                    "delay_risk": delay_risk,
                    "weather": weather,
                    "time_bucket": time_bucket,
                    "job_cards": ";".join(job_cards),
                    "cause": cause
                })

# Write to CSV
with open("synthetic_rotation_history.csv", "w", newline="") as f:
    writer = csv.DictWriter(f, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)
print(f"Generated {len(rows)} rows of synthetic data.")
