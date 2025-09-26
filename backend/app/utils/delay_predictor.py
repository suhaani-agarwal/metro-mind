import joblib
import os
from typing import List, Dict, Any
from datetime import datetime, timedelta

DELAY_KEYWORDS = [
    "brake", "door", "traction", "signalling", "signal", "fault", "engine", "wheel",
    "axle", "coupler", "bogie", "bearing", "pantograph", "compressor", "pneumatic",
    "air leak", "leak", "vibration", "overheat", "overheating", "wheel flat", "tcms",
    "controller", "converter", "battery", "hv cable", "sensor", "speed sensor"
]

class DelayPredictor:
    def __init__(self, models_dir: str = "."):
        self.models_dir = models_dir
        self.classifier = joblib.load(os.path.join(models_dir, "delay_classifier.pkl"))
        self.regressor = joblib.load(os.path.join(models_dir, "delay_regressor.pkl"))
        self.station_map = {}
        self.weather_map = {}
        self.time_map = {}

    def _init_encoders(self, stations: List[str], weathers: List[str]):
        self.station_map = {s: i for i, s in enumerate(stations)}
        # Ensure consistent weather encoding with training
        ordered_weathers = ["clear", "rain", "storm", "foggy", "hot_sunny"]
        self.weather_map = {w: i for i, w in enumerate(ordered_weathers)}
        self.time_map = {"early_morning": 0, "morning": 1, "noon": 2, "afternoon": 3, "evening": 4, "night": 5}

    def _time_bucket(self, hhmm: str) -> str:
        hour = int(hhmm.split(":")[0])
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

    def _is_delay_relevant_jobcard(self, job_cards: List[Dict[str, Any]]) -> bool:
        for jc in job_cards or []:
            desc = (jc.get("description") or "").lower()
            for k in DELAY_KEYWORDS:
                if k in desc:
                    return True
        return False

    def _extract_delay_causes(self, job_cards: List[Dict[str, Any]], weather: str) -> List[str]:
        causes = []
        relevant = [jc for jc in job_cards or [] if any(k in (jc.get("description") or "").lower() for k in DELAY_KEYWORDS)]
        if relevant:
            top = ", ".join(jc.get("description", "job card") for jc in relevant[:2])
            causes.append(f"job_card:{top}")
        if weather and weather != "clear":
            causes.append(f"weather:{weather}")
        return causes

    def _compute_fatigue_factor(self, config: Dict[str, Any]) -> float:
        """Compute fatigue based on mileage vs thresholds; returns a multiplier >= 1.0"""
        current = config.get("current_mileage", {}) or {}
        thresholds = config.get("maintenance_thresholds", {}) or {}
        if not current or not thresholds:
            return 1.0
        utilizations = []
        for comp, miles in current.items():
            thr = thresholds.get(comp) or 0
            if thr > 0:
                utilizations.append(min(max(miles / thr, 0.0), 1.5))
        if not utilizations:
            return 1.0
        avg_util = sum(utilizations) / len(utilizations)
        # Low effect until 0.75, then ramps up
        if avg_util <= 0.75:
            return 1.0
        # Up to +30% delay at very high utilization
        return 1.0 + min((avg_util - 0.75) * 0.6, 0.3)

    def predict_for_day(self,
                        scheduled_trains: List[Dict[str, Any]],
                        station_timings: List[Dict[str, Any]],
                        weather_by_station: Dict[str, str],
                        train_configs: Dict[str, Any]) -> Dict[str, Any]:
        stations = [s["station"] for s in station_timings]
        self._init_encoders(stations, list(set(weather_by_station.values())))

        results = []
        service_hours = {"start": "07:30", "end": "22:00"}
        service_start_dt = datetime.strptime(service_hours["start"], "%H:%M")
        service_end_dt = datetime.strptime(service_hours["end"], "%H:%M")

        for train in scheduled_trains:
            train_id = train.get("train_id")
            departure_slot = train.get("departure_slot", 1)
            first_departure = datetime.strptime("07:30", "%H:%M") + timedelta(minutes=(departure_slot - 1) * 10)
            # Find train config
            config = next((t for t in train_configs.get("trains", []) if t.get("id") == train_id), {})
            job_cards = config.get("job_cards", [])

            station_events = []
            rotation_count = 0
            current_departure = first_departure
            last_arrival_dt = first_departure

            base_trip_time = station_timings[-1]["cumulative_time"]
            turnaround_time = 8

            while current_departure <= service_end_dt:
                rotation_count += 1
                # forward journey
                fwd_delay_sum = 0.0
                for i, station in enumerate(station_timings):
                    station_name = station["station"]
                    sched_arrival_dt = current_departure + timedelta(minutes=station["cumulative_time"])
                    sched_arrival = sched_arrival_dt.strftime("%H:%M")
                    time_bucket = self._time_bucket(sched_arrival)
                    weather = weather_by_station.get(station_name, "clear")

                    features = [
                        self.station_map.get(station_name, 0),
                        self.weather_map.get(weather, 0),
                        self.time_map.get(time_bucket, 0),
                        1 if self._is_delay_relevant_jobcard(job_cards) else 0
                    ]

                    # Use probability thresholding for sensitivity to maintenance
                    proba = getattr(self.classifier, "predict_proba", None)
                    if proba:
                        p_delay = float(self.classifier.predict_proba([features])[0][1])
                        risk = 1 if p_delay >= 0.4 else 0
                    else:
                        risk = int(self.classifier.predict([features])[0])
                    delay_pred = 0.0
                    causes = []
                    if risk == 1:
                        delay_pred = float(self.regressor.predict([features])[0])
                        # Fatigue multiplier
                        fatigue_mult = self._compute_fatigue_factor(config)
                        delay_pred *= fatigue_mult
                        causes = self._extract_delay_causes(job_cards, weather)
                    else:
                        # If maintenance-relevant issues present and fatigue is high, add small expected delay
                        if self._is_delay_relevant_jobcard(job_cards):
                            fatigue_mult = self._compute_fatigue_factor(config)
                            if fatigue_mult > 1.15:
                                delay_pred = 0.8 * (fatigue_mult - 1.0) * 5.0  # up to ~2 min
                                causes = self._extract_delay_causes(job_cards, weather)

                    # Progressive accumulation for realism
                    progress_ratio = 0.1 if i == 0 else station["cumulative_time"] / base_trip_time
                    effective_delay = delay_pred * progress_ratio

                    expected_arrival_dt = sched_arrival_dt + timedelta(minutes=effective_delay)
                    expected_arrival = expected_arrival_dt.strftime("%H:%M")

                    station_events.append({
                        "station": station_name,
                        "scheduled_arrival": sched_arrival,
                        "expected_arrival": expected_arrival,
                        "delay_minutes": round(effective_delay, 1),
                        "delay_reasons": causes,
                        "delay_probability": round(p_delay, 2) if proba else None,
                        "direction": "forward",
                        "rotation": rotation_count,
                        "sequence": len(station_events) + 1,
                        "next_station_duration": station["next_station_duration"],
                        "cumulative_time": station["cumulative_time"],
                        "significant_delay": effective_delay > 2.0
                    })
                    fwd_delay_sum += effective_delay

                # turnaround at end
                pettah_arrival_dt = current_departure + timedelta(minutes=base_trip_time + fwd_delay_sum)
                return_departure_dt = pettah_arrival_dt + timedelta(minutes=turnaround_time)

                # return journey
                ret_delay_sum = 0.0
                for i, station in enumerate(reversed(station_timings)):
                    station_name = station["station"]
                    return_minutes = base_trip_time - station["cumulative_time"]
                    sched_return_dt = return_departure_dt + timedelta(minutes=return_minutes)
                    sched_return = sched_return_dt.strftime("%H:%M")
                    time_bucket = self._time_bucket(sched_return)
                    weather = weather_by_station.get(station_name, "clear")

                    features = [
                        self.station_map.get(station_name, 0),
                        self.weather_map.get(weather, 0),
                        self.time_map.get(time_bucket, 0),
                        1 if self._is_delay_relevant_jobcard(job_cards) else 0
                    ]

                    # Probability threshold again
                    proba = getattr(self.classifier, "predict_proba", None)
                    if proba:
                        p_delay = float(self.classifier.predict_proba([features])[0][1])
                        risk = 1 if p_delay >= 0.4 else 0
                    else:
                        risk = int(self.classifier.predict([features])[0])
                    delay_pred = 0.0
                    causes = []
                    if risk == 1:
                        delay_pred = float(self.regressor.predict([features])[0])
                        fatigue_mult = self._compute_fatigue_factor(config)
                        delay_pred *= fatigue_mult
                        causes = self._extract_delay_causes(job_cards, weather)
                    else:
                        if self._is_delay_relevant_jobcard(job_cards):
                            fatigue_mult = self._compute_fatigue_factor(config)
                            if fatigue_mult > 1.15:
                                delay_pred = 0.8 * (fatigue_mult - 1.0) * 5.0
                                causes = self._extract_delay_causes(job_cards, weather)

                    progress_ratio = (return_minutes / base_trip_time) if base_trip_time else 0
                    effective_delay = delay_pred * progress_ratio

                    expected_return_dt = sched_return_dt + timedelta(minutes=effective_delay)
                    expected_return = expected_return_dt.strftime("%H:%M")

                    station_events.append({
                        "station": station_name,
                        "scheduled_arrival": sched_return,
                        "expected_arrival": expected_return,
                        "delay_minutes": round(effective_delay, 1),
                        "delay_reasons": causes,
                        "delay_probability": round(p_delay, 2) if proba else None,
                        "direction": "return",
                        "rotation": rotation_count,
                        "sequence": len(station_events) + 1,
                        "next_station_duration": station["next_station_duration"],
                        "cumulative_time": station["cumulative_time"],
                        "significant_delay": effective_delay > 2.0
                    })
                    ret_delay_sum += effective_delay

                # prepare next rotation from Aluva
                aluva_arrival_dt = return_departure_dt + timedelta(minutes=base_trip_time + ret_delay_sum)
                last_arrival_dt = aluva_arrival_dt
                current_departure = aluva_arrival_dt + timedelta(minutes=turnaround_time)

            results.append({
                "train_id": train_id,
                "departure_slot": departure_slot,
                "readiness": train.get("readiness", 0),
                "total_rotations": rotation_count,
                "first_departure": first_departure.strftime("%H:%M"),
                "last_arrival": last_arrival_dt.strftime("%H:%M"),
                "station_events": station_events,
                "train_config": {
                    "job_cards_count": len(job_cards),
                    "high_critical_jobs": len([j for j in job_cards if j.get("criticality") == "high"]),
                    "total_mileage": sum(config.get("current_mileage", {}).values()) if isinstance(config.get("current_mileage"), dict) else 0
                },
                "delay_analysis": {
                    "base_trip_time": base_trip_time,
                    "total_trip_time": base_trip_time * 2,
                    "total_delay": round(sum(e.get("delay_minutes", 0) for e in station_events), 1),
                    "delay_breakdown": {
                        "job_cards": round(sum(e.get("delay_minutes", 0) for e in station_events if any(r.startswith("job_card:") for r in e.get("delay_reasons", []))), 1),
                        "maintenance": 0.0,
                        "weather": round(sum(e.get("delay_minutes", 0) for e in station_events if any(r.startswith("weather:") for r in e.get("delay_reasons", []))), 1),
                    },
                    "delay_reasons": list({reason for e in station_events for reason in e.get("delay_reasons", [])})
                }
            })

        all_events = [ev for tr in results for ev in tr["station_events"]]
        summary = {
            "total_events": len(all_events),
            "delayed_events": len([e for e in all_events if e.get("delay_minutes", 0) > 1.0]),
            "significant_delays": len([e for e in all_events if e.get("significant_delay")]),
            "max_delay": max([e.get("delay_minutes", 0) for e in all_events]) if all_events else 0,
            "avg_delay": round(sum([e.get("delay_minutes", 0) for e in all_events]) / len(all_events), 1) if all_events else 0,
        }

        return {
            "train_schedules": results,
            "summary": summary,
            "service_hours": service_hours,
            "stations": stations,
            "station_timings": station_timings
        }

    def predict_on_schedule(self,
                            baseline_rotation: Dict[str, Any],
                            train_configs: Dict[str, Any],
                            weather_by_station: Dict[str, str]) -> Dict[str, Any]:
        """Augment an existing baseline rotation schedule by predicting delays per event using ML.
        Keeps the original rotation timing (scheduled arrivals, number of rotations, first/last times)."""
        stations = [s for s in baseline_rotation.get("stations", [])]
        # Station timings list of dicts
        station_timings = baseline_rotation.get("station_timings", [])
        self._init_encoders([s if isinstance(s, str) else s.get("station", "") for s in (stations if stations and isinstance(stations[0], str) else [st.get("station", "") for st in station_timings])], list(set(weather_by_station.values())))

        updated_trains = []
        for train in baseline_rotation.get("train_schedules", []):
            train_id = train.get("train_id")
            config = next((t for t in train_configs.get("trains", []) if t.get("id") == train_id), {})
            job_cards = config.get("job_cards", [])
            base_trip_time = 0
            if station_timings:
                base_trip_time = station_timings[-1].get("cumulative_time", 46)

            station_events = []
            for ev in train.get("station_events", []):
                station_name = ev.get("station")
                sched_time = ev.get("scheduled_arrival")
                time_bucket = self._time_bucket(sched_time)
                weather = weather_by_station.get(station_name, "clear")

                features = [
                    self.station_map.get(station_name, 0),
                    self.weather_map.get(weather, 0),
                    self.time_map.get(time_bucket, 0),
                    1 if self._is_delay_relevant_jobcard(job_cards) else 0
                ]

                proba = getattr(self.classifier, "predict_proba", None)
                if proba:
                    p_delay = float(self.classifier.predict_proba([features])[0][1])
                    risk = 1 if p_delay >= 0.4 else 0
                else:
                    p_delay = None
                    risk = int(self.classifier.predict([features])[0])

                delay_pred = 0.0
                causes = []
                fatigue_mult = self._compute_fatigue_factor(config)
                # Add fatigue reason detail if high
                fatigue_reason = None
                if fatigue_mult > 1.15:
                    fatigue_reason = "fatigue: high utilization"

                if risk == 1:
                    delay_pred = float(self.regressor.predict([features])[0]) * fatigue_mult
                    causes = self._extract_delay_causes(job_cards, weather)
                    if fatigue_reason:
                        causes.append(fatigue_reason)
                else:
                    # small delay if strong fatigue and maintenance relevant
                    if self._is_delay_relevant_jobcard(job_cards) and fatigue_mult > 1.15:
                        delay_pred = 0.8 * (fatigue_mult - 1.0) * 5.0
                        causes = self._extract_delay_causes(job_cards, weather)
                        if fatigue_reason:
                            causes.append(fatigue_reason)

                # Progressive accumulation based on baseline cumulative
                cum = ev.get("cumulative_time", 0)
                progress_ratio = 0.1 if cum == 0 else (float(cum) / float(base_trip_time)) if base_trip_time else 1.0
                effective_delay = delay_pred * progress_ratio

                # Compute expected arrival from scheduled
                try:
                    sched_dt = datetime.strptime(sched_time, "%H:%M")
                except:
                    sched_dt = datetime.strptime("07:30", "%H:%M")
                expected_dt = sched_dt + timedelta(minutes=effective_delay)
                expected_str = expected_dt.strftime("%H:%M")

                ev_updated = dict(ev)
                ev_updated["expected_arrival"] = expected_str
                ev_updated["delay_minutes"] = round(effective_delay, 1)
                ev_updated["delay_reasons"] = causes
                ev_updated["delay_probability"] = round(p_delay, 2) if p_delay is not None else None
                station_events.append(ev_updated)

            # Recompute totals
            updated_trains.append({
                **{k: v for k, v in train.items() if k not in ["station_events", "delay_analysis"]},
                "station_events": station_events,
                "delay_analysis": {
                    "base_trip_time": base_trip_time,
                    "total_trip_time": base_trip_time * 2,
                    "total_delay": round(sum(e.get("delay_minutes", 0) for e in station_events), 1),
                    "delay_breakdown": {
                        "job_cards": round(sum(e.get("delay_minutes", 0) for e in station_events if any(r.startswith("job_card:") for r in e.get("delay_reasons", []))), 1),
                        "maintenance": round(sum(e.get("delay_minutes", 0) for e in station_events if any(r.startswith("fatigue:") for r in e.get("delay_reasons", []))), 1),
                        "weather": round(sum(e.get("delay_minutes", 0) for e in station_events if any(r.startswith("weather:") for r in e.get("delay_reasons", []))), 1),
                    },
                    "delay_reasons": list({reason for e in station_events for reason in e.get("delay_reasons", [])})
                }
            })

        all_events = [ev for tr in updated_trains for ev in tr.get("station_events", [])]
        summary = {
            "total_events": len(all_events),
            "delayed_events": len([e for e in all_events if e.get("delay_minutes", 0) > 1.0]),
            "significant_delays": len([e for e in all_events if e.get("significant_delay")]),
            "max_delay": max([e.get("delay_minutes", 0) for e in all_events]) if all_events else 0,
            "avg_delay": round(sum([e.get("delay_minutes", 0) for e in all_events]) / len(all_events), 1) if all_events else 0,
        }

        return {
            **{k: v for k, v in baseline_rotation.items() if k not in ["train_schedules", "summary"]},
            "train_schedules": updated_trains,
            "summary": summary
        }
