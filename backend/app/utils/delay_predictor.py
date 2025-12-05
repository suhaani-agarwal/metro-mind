# import os
# import logging
# from typing import List, Dict, Any
# from datetime import datetime, timedelta
# from collections import defaultdict # Import defaultdict
# from pathlib import Path # Import Path for absolute path

# import joblib
# import numpy as np
# import pandas as pd # Ensure pandas is imported
# import random # Import random for baseline random delay

# logger = logging.getLogger(__name__)

# DELAY_KEYWORDS = [
#     "brake", "door", "traction", "signalling", "signal", "fault", "engine", "wheel",
#     "axle", "coupler", "bogie", "bearing", "pantograph", "compressor", "pneumatic",
#     "air leak", "leak", "vibration", "overheat", "overheating", "wheel flat", "tcms",
#     "controller", "converter", "battery", "hv cable", "sensor", "speed sensor", "failure",
#     "malfunction", "issue", "critical", "emergency"
# ]

# class DelayPredictor:
#     def __init__(self, models_dir: str = "."):
#         # Prefer explicit models_dir, but fallback to backend/models if not present
#         self.models_dir = models_dir
#         possible_dirs = [models_dir, os.path.join(os.path.dirname(os.path.dirname(__file__)), "models"), os.path.join(os.getcwd(), "backend", "models")]
#         found_dir = None
#         for d in possible_dirs:
#             if d and os.path.exists(d):
#                 found_dir = d
#                 break
#         if not found_dir:
#             found_dir = models_dir

#         # Use absolute path to backend/models directory
#         self.models_dir = Path(__file__).resolve().parent.parent.parent / "models"
#         # Load Regressor and Classifier with graceful fallbacks
#         def _safe_load(name):
#             path = os.path.join(self.models_dir, name)
#             if os.path.exists(path):
#                 try:
#                     return joblib.load(path)
#                 except Exception as e:
#                     logger.warning(f"Failed to load {path}: {e}")
#                     return None
#             else:
#                 logger.warning(f"Model file not found: {path}")
#                 return None

#         self.regressor = _safe_load("gb_regressor.pkl") # Default to gb_regressor
#         self.classifier = _safe_load("delay_classifier.pkl")
#         # Load Encoders
#         self.station_type_encoder = _safe_load("station_type_encoder.pkl")
#         self.time_of_day_encoder = _safe_load("time_of_day_encoder.pkl")
#         self.weather_type_encoder = _safe_load("weather_type_encoder.pkl")
#         # Load feature columns list
#         self.feature_columns = _safe_load("feature_columns.pkl") or []
        
#         # Define station order for station_sequence feature (consistent with training)
#         self.station_order = {
#             'Aluva': 1, 'Pulinchodu': 2, 'Companypady': 3, 'Ambattukavu': 4,
#             'Muttom': 5, 'Kalamassery Town': 6, 'Cochin University': 7,
#             'Pathadipalam': 8, 'Edappally': 9, 'Changampuzha Park': 10,
#             'Palarivattom': 11, 'JLN Stadium': 12, 'Kaloor': 13,
#             'Town Hall': 14, 'M.G Road': 15, "Maharaja's College": 16,
#             'Ernakulam South': 17, 'Kadavanthra': 18, 'Elamkulam': 19,
#             'Vytilla': 20, 'Thaikoodam': 21, 'Vadakkekotta': 22,
#             'SN Junction': 23, 'Tripunithura Terminal': 24, 'Pettah': 25
#         }

#         # Define station types map (consistent with training)
#         self.station_types_map = {
#             'Aluva': 'terminal', 'Pettah': 'terminal', 'Tripunithura Terminal': 'terminal',
#             'Edappally': 'major_interchange', 'Vytilla': 'major_interchange', 'M.G Road': 'major',
#             'Kalamassery Town': 'residential', 'Palarivattom': 'residential', 'JLN Stadium': 'commercial',
#             'Kaloor': 'commercial', 'Town Hall': 'commercial',
#             "Maharaja's College": 'education', 'Ernakulam South': 'major',
#             'Kadavanthra': 'residential', 'Elamkulam': 'residential', 'Thaikoodam': 'residential',
#             'Vadakkekotta': 'residential', 'SN Junction': 'residential',
#             'Pulinchodu': 'local', 'Companypady': 'local', 'Ambattukavu': 'local', 'Muttom': 'local',
#             'Cochin University': 'education', 'Pathadipalam': 'local', 'Changampuzha Park': 'local'
#         }
#     # Define maximum delay values to prevent overflows
#     MAX_EVENT_DELAY_MINUTES = 20.0 # Reduced max event delay
#     MAX_CUMULATIVE_DELAY_MINUTES = 60.0 # Reduced max cumulative delay

#     def _init_encoders(self, stations: List[str], weathers: List[str]):
#         self.station_map = {s: i for i, s in enumerate(stations)}
#         # Ensure a consistent weather order if possible
#         ordered_weathers = sorted(list(set(weathers)))
#         self.weather_map = {w: i for i, w in enumerate(ordered_weathers)}
#         self.time_map = {"early_morning": 0, "morning": 1, "noon": 2, "afternoon": 3, "evening": 4, "night": 5}

#     def _safe_encode(self, encoder, value, default=0):
#         """Safely encode a categorical value even if encoder isn't available."""
#         if encoder is None:
#             return default
#         try:
#             # If the value is not in the encoder's classes, map it to a default/unknown category (e.g., the first class, or 0)
#             if value not in encoder.classes_:
#                 return default # Return default if value is not known
#             res = encoder.transform([value])
#             return int(res[0])
#         except Exception:
#             return default

#     def _time_bucket(self, hhmm: str) -> str:
#         hour = int(hhmm.split(":")[0])
#         if hour < 5:
#             return "early_morning"
#         elif hour < 10:
#             return "morning"
#         elif hour < 14:
#             return "noon"
#         elif hour < 17:
#             return "afternoon"
#         elif hour < 21:
#             return "evening"
#         else:
#             return "night"

#     def _is_delay_relevant_jobcard(self, job_cards: List[Dict[str, Any]]) -> bool:
#         for jc in job_cards or []:
#             desc = (jc.get("description") or "").lower() if isinstance(jc, dict) else str(jc).lower()
#             for k in DELAY_KEYWORDS:
#                 if k in desc:
#                     return True
#         return False

#     def _extract_delay_causes(self, job_cards: List[Dict[str, Any]], weather: str) -> List[str]:
#         causes = []
#         relevant = [jc for jc in job_cards or [] if any(k in ((jc.get("description") or "") if isinstance(jc, dict) else str(jc)).lower() for k in DELAY_KEYWORDS)]
#         if relevant:
#             top = ", ".join((jc.get("description") if isinstance(jc, dict) else str(jc)) for jc in relevant[:2])
#             causes.append(f"job_card:{top}")
#         if weather and weather != "clear":
#             causes.append(f"weather:{weather}")
#         return causes

#     def _compute_fatigue_factor(self, config: Dict[str, Any]) -> float:
#         """Compute fatigue based on mileage vs thresholds; returns a multiplier >= 1.0"""
#         current = config.get("current_mileage", {}) or {}
#         thresholds = config.get("maintenance_thresholds", {}) or {}
#         if not current or not thresholds:
#             return 1.0
#         utilizations = []
#         for comp, miles in current.items():
#             thr = thresholds.get(comp) or 0
#             if thr > 0:
#                 utilizations.append(min(1.0, miles / thr))
#         if not utilizations:
#             return 1.0
#         avg_util = sum(utilizations) / len(utilizations)
#         if avg_util <= 0.75:
#             return 1.0
#         # Up to +30% delay at very high utilization
#         return 1.0 + min((avg_util - 0.75) * 0.6, 0.3)

#     def _get_jobcard_features(self, job_cards: List[Dict[str, Any]]) -> Dict[str, int]:
#         critical_delay_cards = 0
#         high_delay_cards = 0
#         medium_delay_cards = 0

#         for jc in job_cards or []:
#             desc = (jc.get("description") or "").lower()
#             criticality = jc.get("criticality", "low").lower()
            
#             if any(k in desc for k in DELAY_KEYWORDS):
#                 if criticality == 'critical':
#                     critical_delay_cards += 1
#                 elif criticality == 'high':
#                     high_delay_cards += 1
#                 elif criticality == 'medium':
#                     medium_delay_cards += 1
#         return {
#             'critical_delay_jobcards': critical_delay_cards,
#             'high_delay_jobcards': high_delay_cards,
#             'medium_delay_jobcards': medium_delay_cards
#         }

#     def predict_on_schedule(self,
#                             baseline_rotation: Dict[str, Any],
#                             train_configs: List[Dict[str, Any]],
#                             weather_by_station: Dict[str, str],
#                             service_date: str) -> Dict[str, Any]: # Added service_date
#         """Augment an existing baseline rotation schedule by predicting delays per event using ML and cascading them along each train."""
        
#         # Parse service date for is_weekend feature
#         date_obj = datetime.strptime(service_date, "%Y-%m-%d")
#         is_weekend_today = int(date_obj.weekday() >= 5)

#         # Maps for quick lookup
#         train_configs_map = {tc["id"]: tc for tc in train_configs}
#         # Assuming baseline_rotation contains 'station_timings'
#         station_timings_map = {s["station"]: s for s in baseline_rotation.get("station_timings", [])}

#         updated_trains = []

#         for train in baseline_rotation.get("train_schedules", []):
#             train_id = train.get("train_id")
#             config = train_configs_map.get(train_id, {})
#             job_cards = config.get("job_cards", [])

#             # This is cumulative time to the last station (Pettah) from Aluva, for one direction
#             base_trip_time = next((s["cumulative_time"] for s in baseline_rotation.get("station_timings", []) if s["station"] == "Pettah"), 46)

#             cumulative_delay_for_train = 0.0 # This accumulates for the current train across stations
#             station_events = []

#             for ev in train.get("station_events", []):
#                 station_name = ev.get("station")
#                 scheduled_arrival_str = ev.get("scheduled_arrival")
                
#                 # Skip events if essential data is missing
#                 if not station_name or not scheduled_arrival_str:
#                     logger.warning(f"Skipping event due to missing station or scheduled arrival: {ev}")
#                     continue

#                 # Extract features for ML model
#                 try:
#                     sched_arrival_dt = datetime.strptime(scheduled_arrival_str, "%H:%M")
#                     hour = sched_arrival_dt.hour
#                     day_of_week = date_obj.weekday()
#                     is_weekend = is_weekend_today # Use the daily calculated weekend status
#                     station_sequence = self.station_order.get(station_name, 0)
                    
#                     jobcard_features = self._get_jobcard_features(job_cards)
#                     critical_delay_jobcards = jobcard_features['critical_delay_jobcards']
#                     high_delay_jobcards = jobcard_features['high_delay_jobcards']
#                     medium_delay_jobcards = jobcard_features['medium_delay_jobcards'] # Corrected typo
                    
#                     weather_type = weather_by_station.get(station_name, "clear")
#                     # Weather severity map (consistent with training)
#                     weather_severity_map = {
#                         'clear': 0,
#                         'hot_sunny': 0.5,
#                         'foggy': 1,
#                         'rain': 1.5,
#                         'storm': 3,
#                     }
#                     weather_severity = weather_severity_map.get(weather_type, 0)

#                     # Previous cumulative delay from this train's journey
#                     prev_cum_delay = cumulative_delay_for_train

#                     crowd_level = ev.get("crowd_level", 2) # Use actual crowd_level from event if available, else default
#                     rotation_num = ev.get("rotation", 1)

#                     # Categorical features encoding
#                     time_bucket = self._time_bucket(scheduled_arrival_str)
#                     station_type = self.station_types_map.get(station_name, 'other')

#                     # Safely encode categorical features using helper (handles missing encoders)
#                     station_type_encoded = self._safe_encode(self.station_type_encoder, station_type, default=0)
#                     time_of_day_encoded = self._safe_encode(self.time_of_day_encoder, time_bucket, default=2) # Default to noon if unknown
#                     weather_type_encoded = self._safe_encode(self.weather_type_encoder, weather_type, default=0) # Default to clear if unknown

#                     feature_vector_dict = {
#                         'hour': hour, 
#                         'day_of_week': day_of_week, 
#                         'is_weekend': is_weekend,
#                         'station_sequence': station_sequence,
#                         'critical_delay_jobcards': critical_delay_jobcards, 
#                         'high_delay_jobcards': high_delay_jobcards, 
#                         'medium_delay_jobcards': medium_delay_jobcards,
#                         'weather_severity': weather_severity, 
#                         'prev_cum_delay': prev_cum_delay, 
#                         'crowd_level': crowd_level,
#                         'rotation': rotation_num,
#                         'station_type_encoded': station_type_encoded,
#                         'time_of_day_encoded': time_of_day_encoded,
#                         'weather_type_encoded': weather_type_encoded
#                     }
                    
#                     # Ensure features are in the correct order as per training and convert to DataFrame
#                     features_df = pd.DataFrame([feature_vector_dict])
#                     # Ensure all trained columns exist; fill missing with zeros
#                     if self.feature_columns:
#                         for col in self.feature_columns:
#                             if col not in features_df.columns:
#                                 features_df[col] = 0
#                         features_df = features_df[self.feature_columns]

#                     # Predict delay risk (binary classification) with fallback if model absent
#                     pred_prob = None
#                     if self.classifier is not None:
#                         try:
#                             pred_prob = float(self.classifier.predict_proba(features_df)[:, 1][0])
#                         except Exception:
#                             pred_prob = None

#                     if pred_prob is None:
#                         # Simple deterministic heuristic fallback for probability
#                         pred_prob = min(0.99,
#                                         0.02 + critical_delay_jobcards * 0.12 + high_delay_jobcards * 0.06 + medium_delay_jobcards * 0.03 +
#                                         weather_severity * 0.04 + max(0, (crowd_level - 2)) * 0.03 + min(prev_cum_delay / 10.0, 1.0) * 0.02)

#                     pred_label = int(pred_prob > 0.5)

#                     # Predict delay minutes (regression) with fallback
#                     predicted_minutes = 0.0
#                     if pred_label == 1 and self.regressor is not None:
#                         try:
#                             predicted_minutes = float(max(0.5, self.regressor.predict(features_df)[0]))
#                         except Exception:
#                             predicted_minutes = 1.0 + pred_prob * 4.0
#                     elif pred_label == 1:
#                         predicted_minutes = 1.0 + pred_prob * 4.0
#                     elif pred_prob > 0.3:
#                         predicted_minutes = max(0.2, pred_prob * 2)
#                     else:
#                         if random.random() < 0.05:
#                             predicted_minutes = round(random.uniform(0.1, 0.5), 1)
#                         else:
#                             predicted_minutes = 0.0
                    
#                     # Cap individual event predicted minutes to prevent extreme values
#                     predicted_minutes = min(predicted_minutes, self.MAX_EVENT_DELAY_MINUTES)

#                     # Add train-specific factors (fatigue, maintenance status)
#                     fatigue_mult = self._compute_fatigue_factor(config)
#                     # Increase impact of fatigue beyond the ML model's prediction
#                     # Apply general multiplier as well.  The logic here will not add extra delay
#                     # unless fatigue_mult is actually > 1.0, then it adds an *additional* random value.
#                     if fatigue_mult > 1.0: 
#                         predicted_minutes *= fatigue_mult # Apply general multiplier as well
#                         predicted_minutes += (fatigue_mult - 1.0) * random.uniform(0.5, 1.5) # Reduced additive impact

#                     # Add crowd and weather tweaks (small additive)
#                     # These are now additive *after* ML prediction to ensure they always contribute if present
#                     if crowd_level >= 4:
#                         predicted_minutes += 0.3 * (crowd_level - 3) * random.uniform(0.7, 1.0) # Reduced crowd impact
#                     if weather_type != "clear":
#                         predicted_minutes += (0.5 if weather_type in ["rain", "foggy", "heavy_rain", "storm"] else 0.2) * random.uniform(0.7, 1.0) # Reduced weather impact, added heavy_rain, storm
                    
#                     # Final delay for this event, including cascading effect from prior station
#                     # Soften the cascade effect on the current event
#                     final_event_delay = round(predicted_minutes + cumulative_delay_for_train * 0.3, 1) # Reduced cascade factor
                    
#                     # Cap final event delay to prevent it from getting too large
#                     final_event_delay = min(final_event_delay, 60.0) # Cap at 60 minutes for a single event

#                     # Ensure a minimum delay if any reason exists, to prevent rounding to 0
#                     if final_event_delay < 0.1 and (pred_label == 1 or pred_prob > 0.3 or fatigue_mult > 1.0 or crowd_level >=4 or weather_type != "clear"): 
#                         final_event_delay = 0.1 # Ensure at least 0.1 min delay if any risk factor is active

#                     # Update cumulative delay for the next station on this train's journey (decayed, but ensures propagation)
#                     cumulative_delay_for_train = (cumulative_delay_for_train * 0.7) + final_event_delay # Stronger decay but still propagates
#                     # Cap cumulative delay to prevent it from growing infinitely
#                     cumulative_delay_for_train = min(cumulative_delay_for_train, self.MAX_CUMULATIVE_DELAY_MINUTES) # Use defined MAX_CUMULATIVE_DELAY_MINUTES

#                     # Update event with predictions
#                     ev_updated = dict(ev)
#                     ev_updated["expected_arrival"] = (sched_arrival_dt + timedelta(minutes=final_event_delay)).strftime("%H:%M")
#                     ev_updated["delay_minutes"] = final_event_delay
#                     ev_updated["delay_probability"] = round(pred_prob, 2)
#                     ev_updated["significant_delay"] = int(final_event_delay > 2.0) # Convert boolean to int (0 or 1) to ensure JSON serializability

#                     # Generate comprehensive delay reasons
#                     reasons = []
#                     if final_event_delay > 0: # Add all relevant reasons if there is ANY delay
#                         if pred_label == 1 or pred_prob > 0.5: # Explicit ML prediction reason
#                             reasons.append(f"ML_Prediction_Risk: {round(pred_prob*100)}%")
                            
#                         job_card_reasons = [f"JobCard:{jc.get('description', '')} (Criticality:{jc.get('criticality', '')})" 
#                                             for jc in job_cards 
#                                             if any(k in jc.get('description', '').lower() for k in DELAY_KEYWORDS)]
#                         if job_card_reasons: reasons.extend(job_card_reasons)

#                         if fatigue_mult > 1.0: reasons.append(f"Maintenance(Fatigue): x{fatigue_mult:.1f} impact")

#                         # More granular weather reasons
#                         if weather_type == "heavy_rain": reasons.append("Weather:Heavy Rain")
#                         elif weather_type == "moderate_rain": reasons.append("Weather:Moderate Rain")
#                         elif weather_type == "foggy": reasons.append("Weather:Foggy")
#                         elif weather_type == "storm": reasons.append("Weather:Storm")
#                         elif weather_type == "hot_sunny": reasons.append("Weather:Hot Sunny")
#                         elif weather_type != "clear": reasons.append(f"Weather:{weather_type}")


#                         if crowd_level >= 4: reasons.append(f"Crowd: Level {crowd_level}")

#                         if cumulative_delay_for_train > 0.5: reasons.append(f"Cascaded_within_train: +{cumulative_delay_for_train:.1f}min earlier")
                    
#                     ev_updated["delay_reasons"] = list(set(reasons)) # Use set to avoid duplicates
#                     station_events.append(ev_updated)

#                 except Exception as e:
#                     logger.error(f"Error processing event for train {train_id}, station {station_name}: {e}")
#                     # Append original event to avoid breaking the whole schedule, but ensure minimal delay if it failed
#                     failed_event = dict(ev)
#                     failed_event["delay_minutes"] = 0.5 # Default to minimal delay on error
#                     failed_event["delay_reasons"] = [f"Error_in_prediction: {str(e)}"]
#                     failed_event["expected_arrival"] = (sched_arrival_dt + timedelta(minutes=0.5)).strftime("%H:%M")
#                     station_events.append(failed_event)

#             # Update train's overall schedule with predicted events
#             updated_trains.append({
#                 **{k: v for k, v in train.items() if k not in ["station_events", "delay_analysis"]},
#                 "station_events": station_events,
#                 "delay_analysis": self._calculate_delay_analysis(station_events, base_trip_time)
#             })

#         # --- Cross-train propagation by station and time ---
#         # This section ensures that if one train at a station is heavily delayed,
#         # subsequent trains at the same station might also be affected.
        
#         # Flatten events to sort them by scheduled time across all trains and stations
#         flattened_events_for_global_cascade = []
#         for train_idx, tr in enumerate(updated_trains):
#             for event_idx, ev in enumerate(tr.get("station_events", [])):
#                 scheduled_time_str = ev.get("scheduled_arrival")
#                 if scheduled_time_str:
#                     try:
#                         scheduled_minutes = datetime.strptime(scheduled_time_str, "%H:%M").hour * 60 + datetime.strptime(scheduled_time_str, "%H:%M").minute
#                         flattened_events_for_global_cascade.append({
#                             "train_idx": train_idx,
#                             "event_idx": event_idx,
#                             "station": ev.get("station"),
#                             "scheduled_minutes": scheduled_minutes,
#                             "current_delay_minutes": ev.get("delay_minutes", 0),
#                             "original_event": ev
#                         })
#                     except ValueError:
#                         logger.warning(f"Could not parse scheduled_arrival for global cascade: {scheduled_time_str}")
#                         continue

#         # Group by station and sort by scheduled time
#         station_grouped_events = defaultdict(list)
#         for fe in flattened_events_for_global_cascade:
#             station_grouped_events[fe["station"]].append(fe)

#         # Apply station-level cascading delays
#         for station_name, events_at_station in station_grouped_events.items():
#             events_at_station.sort(key=lambda x: x["scheduled_minutes"])
            
#             previous_train_actual_departure_or_arrival_minutes = None
            
#             for current_event_data in events_at_station:
#                 scheduled_minutes_for_this_event = current_event_data["scheduled_minutes"]
#                 current_delay_for_this_event = current_event_data["current_delay_minutes"]
                
#                 # Calculate expected actual time for this event without considering prior train's overrun yet
#                 current_expected_actual_minutes = scheduled_minutes_for_this_event + current_delay_for_this_event

#                 if previous_train_actual_departure_or_arrival_minutes is not None and \
#                    previous_train_actual_departure_or_arrival_minutes > scheduled_minutes_for_this_event:
                    
#                     # There is an overlap/overrun from the previous train at the same station
#                     overrun_minutes = previous_train_actual_departure_or_arrival_minutes - scheduled_minutes_for_this_event
                    
#                     # Add a fraction of the overrun to the current train's delay
#                     # This represents a delay due to track congestion or late platform clearance
#                     additional_delay_from_cascade = overrun_minutes * 0.2 # Reduced cross-train cascade factor
                    
#                     # Update the current event's delay
#                     current_event_data["current_delay_minutes"] = round(current_delay_for_this_event + additional_delay_from_cascade, 1)
                    
#                     # Update the actual event object in `updated_trains`
#                     train_idx = current_event_data["train_idx"]
#                     event_idx = current_event_data["event_idx"]
#                     original_event_obj = updated_trains[train_idx]["station_events"][event_idx]
                    
#                     original_event_obj["delay_minutes"] = current_event_data["current_delay_minutes"]
                    
#                     # Update expected arrival time based on new delay
#                     original_scheduled_dt = datetime.strptime(original_event_obj["scheduled_arrival"], "%H:%M")
#                     original_event_obj["expected_arrival"] = (original_scheduled_dt + timedelta(minutes=original_event_obj["delay_minutes"])).strftime("%H:%M")
                    
#                     # Add cascade reason if not already present
#                     if "Station_Cascade:congestion" not in original_event_obj["delay_reasons"]:
#                         original_event_obj["delay_reasons"].append("Station_Cascade:congestion")
#                         original_event_obj["significant_delay"] = int(original_event_obj.get("delay_minutes", 0) > 2.0) # Ensure int
                    
#                     # Update current_expected_actual_minutes with the new delay
#                     current_expected_actual_minutes = scheduled_minutes_for_this_event + original_event_obj["delay_minutes"]

#                 previous_train_actual_departure_or_arrival_minutes = current_expected_actual_minutes

#         # Re-calculate overall train delay analysis after global cascading
#         for tr in updated_trains:
#             tr["delay_analysis"] = self._calculate_delay_analysis(tr["station_events"], base_trip_time)

#         all_events = [ev for tr in updated_trains for ev in tr.get("station_events", [])]
#         summary = {
#             "total_events": len(all_events),
#             "delayed_events": len([e for e in all_events if e.get("delay_minutes", 0) > 1.0]),
#             "significant_delays": len([e for e in all_events if e.get("significant_delay")]),
#             "max_delay": max([e.get("delay_minutes", 0) for e in all_events]) if all_events else 0,
#             "avg_delay": round(sum([e.get("delay_minutes", 0) for e in all_events]) / len(all_events), 1) if all_events else 0,
#             "causes_distribution": self._get_causes_distribution(all_events)
#         }

#         return {
#             **{k: v for k, v in baseline_rotation.items() if k not in ["train_schedules", "summary"]},
#             "train_schedules": updated_trains,
#             "summary": summary
#         }

#     def _calculate_delay_analysis(self, station_events: List[Dict[str, Any]], base_trip_time: float) -> Dict[str, Any]:
#         total_delay = round(sum(e.get("delay_minutes", 0) for e in station_events), 1)
        
#         delay_breakdown = defaultdict(float)
#         all_reasons = set()
#         for event in station_events:
#             delay = event.get("delay_minutes", 0)
#             for reason in event.get("delay_reasons", []):
#                 if reason.startswith("JobCard:"):
#                     delay_breakdown["job_cards"] += delay
#                 elif reason.startswith("Maintenance:"):
#                     delay_breakdown["maintenance"] += delay
#                 elif reason.startswith("Weather:"):
#                     delay_breakdown["weather"] += delay
#                 elif reason.startswith("Crowd:"):
#                     delay_breakdown["crowd"] += delay
#                 elif reason.startswith("Anomaly:"):
#                     delay_breakdown["anomaly"] += delay
#                 elif reason.startswith("Cascaded_from_previous:") or reason.startswith("Station_Cascade:"):
#                     delay_breakdown["cascading"] += delay
#                 else: # Catch-all for other reasons
#                     delay_breakdown["other"] += delay
#                 all_reasons.add(reason)

#         return {
#             "base_trip_time": base_trip_time,
#             "total_trip_time": base_trip_time * 2,
#             "total_delay": total_delay,
#             "delay_breakdown": {k: round(v, 1) for k,v in delay_breakdown.items()},
#             "delay_reasons": list(all_reasons)
#         }

#     def _get_causes_distribution(self, all_events: List[Dict[str, Any]]) -> Dict[str, float]:
#         cause_counts = defaultdict(float)
#         for event in all_events:
#             delay = event.get("delay_minutes", 0)
#             for reason in event.get("delay_reasons", []) or ["None"]:
#                 # Only attribute delay to primary causes, not just the cascade itself
#                 if "cascade:" not in reason.lower() and "ML_Prediction" not in reason:
#                     cause_counts[reason.split(":")[0]] += delay # Use main category
        
#         total_attributed_delay = sum(cause_counts.values())
#         if total_attributed_delay == 0:
#             return {"None": 100.0}

#         return {k: round((v / total_attributed_delay) * 100, 1) for k, v in cause_counts.items()}


import os
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
from collections import defaultdict
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import random

logger = logging.getLogger(__name__)

DELAY_KEYWORDS = [
    "brake", "door", "traction", "signalling", "signal", "fault", "engine", "wheel",
    "axle", "coupler", "bogie", "bearing", "pantograph", "compressor", "pneumatic",
    "air leak", "leak", "vibration", "overheat", "overheating", "wheel flat", "tcms",
    "controller", "converter", "battery", "hv cable", "sensor", "speed sensor", "failure",
    "malfunction", "issue", "critical", "emergency"
]

class DelayPredictor:
    def __init__(self, models_dir: str = "."):
        # Use absolute path to backend/models directory
        self.models_dir = Path(__file__).resolve().parent.parent.parent / "models"
        
        # Load models and encoders
        def _safe_load(name):
            path = os.path.join(self.models_dir, name)
            if os.path.exists(path):
                try:
                    return joblib.load(path)
                except Exception as e:
                    logger.warning(f"Failed to load {path}: {e}")
                    return None
            else:
                logger.warning(f"Model file not found: {path}")
                return None

        self.regressor = _safe_load("gb_regressor.pkl")
        self.classifier = _safe_load("delay_classifier.pkl")
        self.station_type_encoder = _safe_load("station_type_encoder.pkl")
        self.time_of_day_encoder = _safe_load("time_of_day_encoder.pkl")
        self.weather_type_encoder = _safe_load("weather_type_encoder.pkl")
        self.feature_columns = _safe_load("feature_columns.pkl") or []
        
        # Station information
        self.station_order = {
            'Aluva': 1, 'Pulinchodu': 2, 'Companypady': 3, 'Ambattukavu': 4,
            'Muttom': 5, 'Kalamassery Town': 6, 'Cochin University': 7,
            'Pathadipalam': 8, 'Edappally': 9, 'Changampuzha Park': 10,
            'Palarivattom': 11, 'JLN Stadium': 12, 'Kaloor': 13,
            'Town Hall': 14, 'M.G Road': 15, "Maharaja's College": 16,
            'Ernakulam South': 17, 'Kadavanthra': 18, 'Elamkulam': 19,
            'Vytilla': 20, 'Thaikoodam': 21, 'Vadakkekotta': 22, 'Pettah': 23,
            'SN Junction': 24, 'Tripunithura Terminal': 25
        }

        self.station_types_map = {
            'Aluva': 'terminal', 'Pettah': 'terminal', 'Tripunithura Terminal': 'terminal',
            'Edappally': 'major_interchange', 'Vytilla': 'major_interchange', 'M.G Road': 'major',
            'Kalamassery Town': 'residential', 'Palarivattom': 'residential', 'JLN Stadium': 'commercial',
            'Kaloor': 'commercial', 'Town Hall': 'commercial',
            "Maharaja's College": 'education', 'Ernakulam South': 'major',
            'Kadavanthra': 'residential', 'Elamkulam': 'residential', 'Thaikoodam': 'residential',
            'Vadakkekotta': 'residential', 'SN Junction': 'residential',
            'Pulinchodu': 'local', 'Companypady': 'local', 'Ambattukavu': 'local', 'Muttom': 'local',
            'Cochin University': 'education', 'Pathadipalam': 'local', 'Changampuzha Park': 'local'
        }
        
        # Thresholds for major delays tracking
        self.MAJOR_DELAY_THRESHOLD = 8.0
        self.CASCADE_THRESHOLD = 3.0
        
        # Store for major delays
        self.major_delays = []
        
        # Define maximum delay values
        self.MAX_EVENT_DELAY_MINUTES = 15.0
        self.MAX_CUMULATIVE_DELAY_MINUTES = 25.0
        
        # Realistic delay probability adjustments
        self.BASE_DELAY_PROBABILITY = 0.25  # Increased for more realistic delays
        self.MIN_DELAY_THRESHOLD = 0.3

    def _safe_encode(self, encoder, value, default=0):
        if encoder is None:
            return default
        try:
            if value not in encoder.classes_:
                return default
            res = encoder.transform([value])
            return int(res[0])
        except Exception:
            return default

    def _time_bucket(self, hhmm: str) -> str:
        hour = int(hhmm.split(":")[0])
        if hour < 5:
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

    def _compute_fatigue_factor(self, config: Dict[str, Any]) -> float:
        """Compute fatigue based on mileage vs thresholds"""
        current = config.get("current_mileage", {}) or {}
        thresholds = config.get("maintenance_thresholds", {}) or {}
        if not current or not thresholds:
            return 1.0
        utilizations = []
        for comp, miles in current.items():
            thr = thresholds.get(comp) or 0
            if thr > 0:
                utilizations.append(min(1.0, miles / thr))
        if not utilizations:
            return 1.0
        avg_util = sum(utilizations) / len(utilizations)
        if avg_util <= 0.75:
            return 1.0
        elif avg_util <= 0.85:
            return 1.05
        elif avg_util <= 0.95:
            return 1.15
        else:
            return 1.25

    def _get_jobcard_features(self, job_cards: List[Dict[str, Any]]) -> Dict[str, Any]:
        critical_delay_cards = 0
        high_delay_cards = 0
        medium_delay_cards = 0
        
        # Also get actual job descriptions for reasons
        critical_jobs = []
        high_jobs = []
        medium_jobs = []

        for jc in job_cards or []:
            if not isinstance(jc, dict):
                continue
                
            desc = (jc.get("description") or "").lower()
            criticality = jc.get("criticality", "low").lower()
            
            if any(k in desc for k in DELAY_KEYWORDS):
                if criticality == 'critical':
                    critical_delay_cards += 1
                    critical_jobs.append(jc.get("description", "Critical maintenance"))
                elif criticality == 'high':
                    high_delay_cards += 1
                    high_jobs.append(jc.get("description", "High priority maintenance"))
                elif criticality == 'medium':
                    medium_delay_cards += 1
                    medium_jobs.append(jc.get("description", "Medium priority maintenance"))
        
        return {
            'critical_delay_jobcards': critical_delay_cards,
            'high_delay_jobcards': high_delay_cards,
            'medium_delay_jobcards': medium_delay_cards,
            'critical_jobs': critical_jobs[:2],
            'high_jobs': high_jobs[:2],
            'medium_jobs': medium_jobs[:2]
        }

    def _get_delay_reasons(self, 
                          critical_delay_jobcards: int, 
                          high_delay_jobcards: int,
                          medium_delay_jobcards: int,
                          critical_jobs: List[str],
                          high_jobs: List[str],
                          medium_jobs: List[str],
                          weather_type: str,
                          crowd_level: int,
                          fatigue_mult: float,
                          prev_cum_delay: float,
                          hour: int,
                          station_name: str) -> List[str]:
        """Generate clear, understandable delay reasons"""
        reasons = []
        
        # Job card reasons
        if critical_delay_jobcards > 0:
            if critical_jobs:
                reasons.append(f"Critical maintenance issue: {critical_jobs[0]}")
            else:
                reasons.append("Critical maintenance required - safety inspection needed")
        elif high_delay_jobcards > 0:
            if high_jobs:
                reasons.append(f"High priority maintenance: {high_jobs[0]}")
            else:
                reasons.append("High priority maintenance pending")
        elif medium_delay_jobcards > 0:
            if random.random() < 0.6:
                reasons.append("Medium priority maintenance scheduled")
        
        # Weather reasons
        if weather_type == "storm":
            reasons.append("Severe storm conditions - reduced operating speed")
        elif weather_type == "heavy_rain":
            reasons.append("Heavy rainfall affecting track adhesion and braking")
        elif weather_type == "rain":
            if random.random() < 0.7:
                reasons.append("Rain affecting visibility and braking distance")
        elif weather_type == "foggy":
            if random.random() < 0.5:
                reasons.append("Fog reducing visibility - cautionary speed reduction")
        elif weather_type == "hot_sunny":
            if random.random() < 0.4:
                reasons.append("High ambient temperature affecting equipment cooling")
        
        # Station-specific issues
        if station_name in ["Edappally", "M.G Road", "Vytilla", "Aluva", "Pettah"]:
            if random.random() < 0.3:
                reasons.append(f"High passenger interchange at {station_name} station")
        
        # Peak hour reasons
        if hour in [7, 8, 9]:
            if random.random() < 0.6:
                reasons.append("Morning peak hour - extended passenger boarding time")
        elif hour in [17, 18, 19]:
            if random.random() < 0.6:
                reasons.append("Evening peak hour - station congestion")
        
        # Crowd reasons
        if crowd_level >= 5:
            reasons.append("Very high passenger volume - extended dwell time at station")
        elif crowd_level >= 4:
            if random.random() < 0.8:
                reasons.append(f"High passenger volume - Level {crowd_level} crowding")
        
        # Maintenance fatigue
        if fatigue_mult > 1.2:
            reasons.append(f"Equipment wear and tear - {int((fatigue_mult-1)*100)}% reduced performance")
        elif fatigue_mult > 1.1:
            if random.random() < 0.7:
                reasons.append("Equipment showing signs of wear - minor operational impact")
        
        # Previous delay propagation
        if prev_cum_delay > 4.0:
            reasons.append(f"Accumulated delay from previous stations: {prev_cum_delay:.1f} minutes")
        elif prev_cum_delay > 2.0:
            if random.random() < 0.8:
                reasons.append(f"Delay carried forward: {prev_cum_delay:.1f} minutes")
        
        # Weekend effect
        if datetime.now().weekday() >= 5:
            if random.random() < 0.4:
                reasons.append("Weekend schedule - different operational patterns")
        
        # If no specific reason found, use operational reasons
        if not reasons:
            operational_reasons = [
                "Operational adjustment for schedule coordination",
                "Signal clearance and authorization delay",
                "Platform coordination with connecting services",
                "Scheduled operational pause for safety checks",
                "Track clearance verification"
            ]
            reasons.append(random.choice(operational_reasons))
        
        # Limit to 3 main reasons
        return reasons[:3]

    def _should_predict_delay(self, 
                             critical_delay_jobcards: int,
                             high_delay_jobcards: int,
                             weather_type: str,
                             crowd_level: int,
                             hour: int) -> bool:
        """Decide if we should predict a delay at all"""
        
        base_chance = self.BASE_DELAY_PROBABILITY
        
        # Increase chance for actual issues
        if critical_delay_jobcards > 0:
            base_chance = 0.9
        elif high_delay_jobcards > 0:
            base_chance = 0.7
        elif weather_type in ["storm", "heavy_rain"]:
            base_chance = 0.6
        elif weather_type == "rain":
            base_chance = 0.4
        elif crowd_level >= 4 and hour in [7, 8, 9, 17, 18, 19]:
            base_chance = 0.5
        elif hour in [7, 8, 9, 17, 18, 19]:
            base_chance = 0.35
        
        # Weekend effect
        if datetime.now().weekday() >= 5:
            base_chance *= 1.1
        
        return random.random() < base_chance

    def _get_delay_amount(self, 
                         critical_delay_jobcards: int,
                         high_delay_jobcards: int,
                         weather_type: str,
                         crowd_level: int,
                         fatigue_mult: float,
                         station_name: str,
                         hour: int) -> float:
        """Get realistic delay amount"""
        
        base_delay = 0.0
        
        # Job card impact
        if critical_delay_jobcards > 0:
            base_delay += critical_delay_jobcards * random.uniform(2.0, 5.0)
        elif high_delay_jobcards > 0:
            base_delay += high_delay_jobcards * random.uniform(1.0, 3.0)
        
        # Weather impact
        if weather_type == "storm":
            base_delay += random.uniform(3.0, 7.0)
        elif weather_type == "heavy_rain":
            base_delay += random.uniform(1.5, 4.0)
        elif weather_type == "rain":
            if random.random() < 0.8:
                base_delay += random.uniform(0.5, 2.5)
        elif weather_type == "foggy":
            if random.random() < 0.6:
                base_delay += random.uniform(0.3, 1.8)
        
        # Peak hour impact
        if hour in [7, 8, 9, 17, 18, 19]:
            base_delay += random.uniform(0.5, 1.5)
        
        # Crowd impact
        if crowd_level >= 5:
            base_delay += random.uniform(1.0, 3.0)
        elif crowd_level >= 4:
            base_delay += random.uniform(0.5, 2.0)
        
        # Station-specific delays
        if station_name in ["Edappally", "M.G Road", "Vytilla"]:
            if random.random() < 0.4:
                base_delay += random.uniform(0.3, 1.2)
        
        # Fatigue impact
        if fatigue_mult > 1.0:
            base_delay *= fatigue_mult
        
        # Apply caps
        base_delay = min(base_delay, self.MAX_EVENT_DELAY_MINUTES)
        base_delay = round(base_delay, 1)
        
        if base_delay < self.MIN_DELAY_THRESHOLD:
            return 0.0
        
        return base_delay

    def _track_major_delay(self, delay_event: Dict[str, Any], 
                          affected_trains: List[Dict[str, Any]],
                          cascade_impact: float,
                          service_date: str):
        """Track major delays that cause cascading effects"""
        
        if delay_event.get("delay_minutes", 0) >= self.MAJOR_DELAY_THRESHOLD and affected_trains:
            actual_affected_trains = []
            for train in affected_trains:
                if train.get("train_id") != delay_event.get("train_id"):
                    actual_affected_trains.append(train)
            
            if not actual_affected_trains:
                return
                
            major_delay_record = {
                "timestamp": datetime.now().isoformat(),
                "service_date": service_date,
                "train_id": delay_event.get("train_id", "Unknown"),
                "station": delay_event.get("station", "Unknown"),
                "scheduled_time": delay_event.get("scheduled_arrival", "Unknown"),
                "actual_time": delay_event.get("expected_arrival", "Unknown"),
                "delay_minutes": delay_event.get("delay_minutes", 0),
                "primary_reasons": delay_event.get("delay_reasons", []),
                "impact_level": "MAJOR",
                "cascade_impact_minutes": round(cascade_impact, 1),
                "affected_trains_count": len(actual_affected_trains),
                "affected_trains": actual_affected_trains[:3],
                "impact_description": f"Major delay at {delay_event.get('station')} affecting {len(actual_affected_trains)} subsequent trains",
                "root_cause": self._get_root_cause(delay_event.get("delay_reasons", [])),
                "recommended_actions": self._get_recommendations(delay_event.get("delay_minutes", 0), 
                                                               delay_event.get("delay_reasons", []))
            }
            
            self.major_delays.append(major_delay_record)
            logger.info(f"Major delay: Train {major_delay_record['train_id']} at {major_delay_record['station']} "
                       f"({major_delay_record['delay_minutes']}min)")

    def _get_root_cause(self, reasons: List[str]) -> str:
        if not reasons:
            return "Operational issue"
        
        for reason in reasons:
            if "Critical maintenance" in reason:
                return "Critical equipment failure"
            if "Severe storm" in reason or "Heavy rainfall" in reason:
                return "Severe weather conditions"
            if "High priority maintenance" in reason:
                return "High priority maintenance"
            if "Equipment wear" in reason:
                return "Equipment fatigue"
            if "peak hour" in reason.lower():
                return "Peak hour congestion"
        
        return reasons[0]

    def _get_recommendations(self, delay_minutes: float, reasons: List[str]) -> List[str]:
        recommendations = []
        
        if delay_minutes >= 10:
            recommendations.append("Consider deploying backup train")
            recommendations.append("Notify control center immediately")
        elif delay_minutes >= 8:
            recommendations.append("Adjust following train schedules")
            recommendations.append("Update passenger information systems")
        
        for reason in reasons:
            if "maintenance" in reason.lower():
                recommendations.append("Schedule immediate maintenance inspection")
            if "weather" in reason.lower():
                recommendations.append("Implement weather contingency plan")
            if "crowd" in reason.lower() or "peak" in reason.lower():
                recommendations.append("Deploy additional station staff")
        
        if not recommendations:
            recommendations.append("Monitor situation and adjust as needed")
        
        return recommendations

    def predict_on_schedule(self,
                            baseline_rotation: Dict[str, Any],
                            train_configs: List[Dict[str, Any]],
                            weather_by_station: Dict[str, str],
                            service_date: str) -> Dict[str, Any]:
        
        self.major_delays = []
        date_obj = datetime.strptime(service_date, "%Y-%m-%d")
        is_weekend_today = int(date_obj.weekday() >= 5)
        train_configs_map = {tc["id"]: tc for tc in train_configs}
        updated_trains = []

        # First pass: predict delays for all trains
        for train in baseline_rotation.get("train_schedules", []):
            train_id = train.get("train_id")
            config = train_configs_map.get(train_id, {})
            job_cards = config.get("job_cards", [])

            base_trip_time = next((s["cumulative_time"] for s in baseline_rotation.get("station_timings", []) if s["station"] == "Pettah"), 46)
            cumulative_delay_for_train = 0.0
            station_events = []

            for ev in train.get("station_events", []):
                station_name = ev.get("station")
                scheduled_arrival_str = ev.get("scheduled_arrival")
                
                if not station_name or not scheduled_arrival_str:
                    continue

                try:
                    sched_arrival_dt = datetime.strptime(scheduled_arrival_str, "%H:%M")
                    hour = sched_arrival_dt.hour
                    day_of_week = date_obj.weekday()
                    is_weekend = is_weekend_today
                    station_sequence = self.station_order.get(station_name, 0)
                    
                    jobcard_features = self._get_jobcard_features(job_cards)
                    critical_delay_jobcards = jobcard_features['critical_delay_jobcards']
                    high_delay_jobcards = jobcard_features['high_delay_jobcards']
                    medium_delay_jobcards = jobcard_features['medium_delay_jobcards']
                    critical_jobs = jobcard_features.get('critical_jobs', [])
                    high_jobs = jobcard_features.get('high_jobs', [])
                    medium_jobs = jobcard_features.get('medium_jobs', [])
                    
                    weather_type = weather_by_station.get(station_name, "clear")
                    weather_severity_map = {'clear': 0, 'hot_sunny': 0.3, 'foggy': 0.7, 'rain': 1.2, 'storm': 2.5}
                    weather_severity = weather_severity_map.get(weather_type, 0)

                    prev_cum_delay = cumulative_delay_for_train
                    crowd_level = ev.get("crowd_level", 2)
                    rotation_num = ev.get("rotation", 1)

                    time_bucket = self._time_bucket(scheduled_arrival_str)
                    station_type = self.station_types_map.get(station_name, 'other')

                    station_type_encoded = self._safe_encode(self.station_type_encoder, station_type, default=0)
                    time_of_day_encoded = self._safe_encode(self.time_of_day_encoder, time_bucket, default=2)
                    weather_type_encoded = self._safe_encode(self.weather_type_encoder, weather_type, default=0)

                    # ML prediction (for features only)
                    feature_vector_dict = {
                        'hour': hour, 'day_of_week': day_of_week, 'is_weekend': is_weekend,
                        'station_sequence': station_sequence,
                        'critical_delay_jobcards': critical_delay_jobcards, 
                        'high_delay_jobcards': high_delay_jobcards, 
                        'medium_delay_jobcards': medium_delay_jobcards,
                        'weather_severity': weather_severity, 'prev_cum_delay': prev_cum_delay, 
                        'crowd_level': crowd_level, 'rotation': rotation_num,
                        'station_type_encoded': station_type_encoded,
                        'time_of_day_encoded': time_of_day_encoded,
                        'weather_type_encoded': weather_type_encoded
                    }
                    
                    features_df = pd.DataFrame([feature_vector_dict])
                    if self.feature_columns:
                        for col in self.feature_columns:
                            if col not in features_df.columns:
                                features_df[col] = 0
                        features_df = features_df[self.feature_columns]

                    # Get ML probability (for reference only)
                    pred_prob = 0.0
                    if self.classifier is not None:
                        try:
                            pred_prob = float(self.classifier.predict_proba(features_df)[:, 1][0])
                        except Exception:
                            pred_prob = 0.0

                    # Decide if we should predict a delay
                    should_predict_delay = self._should_predict_delay(
                        critical_delay_jobcards, high_delay_jobcards, 
                        weather_type, crowd_level, hour
                    )
                    
                    if not should_predict_delay:
                        ev_updated = dict(ev)
                        ev_updated["train_id"] = train_id
                        ev_updated["expected_arrival"] = scheduled_arrival_str
                        ev_updated["delay_minutes"] = 0.0
                        ev_updated["delay_probability"] = round(pred_prob, 2)
                        ev_updated["significant_delay"] = 0
                        ev_updated["delay_reasons"] = ["On schedule"]
                        station_events.append(ev_updated)
                        continue

                    # Get delay amount
                    fatigue_mult = self._compute_fatigue_factor(config)
                    predicted_minutes = self._get_delay_amount(
                        critical_delay_jobcards, high_delay_jobcards,
                        weather_type, crowd_level, fatigue_mult,
                        station_name, hour
                    )
                    
                    # Add within-train cascade
                    if prev_cum_delay > 0 and predicted_minutes > 0:
                        predicted_minutes += prev_cum_delay * 0.25
                    
                    # Cap delay
                    predicted_minutes = min(predicted_minutes, self.MAX_EVENT_DELAY_MINUTES)
                    predicted_minutes = round(predicted_minutes, 1)
                    
                    if predicted_minutes < self.MIN_DELAY_THRESHOLD:
                        predicted_minutes = 0.0
                    
                    # Update cumulative delay
                    if predicted_minutes > 0:
                        cumulative_delay_for_train = (cumulative_delay_for_train * 0.8) + predicted_minutes
                        cumulative_delay_for_train = min(cumulative_delay_for_train, self.MAX_CUMULATIVE_DELAY_MINUTES)
                    
                    # Get clear delay reasons
                    delay_reasons = self._get_delay_reasons(
                        critical_delay_jobcards, high_delay_jobcards, medium_delay_jobcards,
                        critical_jobs, high_jobs, medium_jobs,
                        weather_type, crowd_level, fatigue_mult,
                        prev_cum_delay, hour, station_name
                    )
                    
                    # Update event
                    ev_updated = dict(ev)
                    ev_updated["train_id"] = train_id
                    
                    if predicted_minutes > 0:
                        expected_dt = sched_arrival_dt + timedelta(minutes=predicted_minutes)
                        ev_updated["expected_arrival"] = expected_dt.strftime("%H:%M")
                        ev_updated["delay_minutes"] = predicted_minutes
                        ev_updated["delay_reasons"] = delay_reasons
                    else:
                        ev_updated["expected_arrival"] = scheduled_arrival_str
                        ev_updated["delay_minutes"] = 0.0
                        ev_updated["delay_reasons"] = ["On schedule"]
                    
                    ev_updated["delay_probability"] = round(pred_prob, 2)
                    ev_updated["significant_delay"] = int(predicted_minutes > 3.0)
                    station_events.append(ev_updated)

                except Exception as e:
                    logger.error(f"Error for train {train_id}, station {station_name}: {e}")
                    failed_event = dict(ev)
                    failed_event["delay_minutes"] = 0.0
                    failed_event["delay_reasons"] = ["Processing error"]
                    failed_event["expected_arrival"] = scheduled_arrival_str
                    station_events.append(failed_event)

            updated_trains.append({
                **{k: v for k, v in train.items() if k not in ["station_events", "delay_analysis"]},
                "station_events": station_events,
                "delay_analysis": self._calculate_delay_analysis(station_events, base_trip_time)
            })

        # SECOND PASS: Realistic cross-train cascade
        station_grouped_events = defaultdict(list)
        
        for train_idx, tr in enumerate(updated_trains):
            for event_idx, ev in enumerate(tr.get("station_events", [])):
                scheduled_time_str = ev.get("scheduled_arrival")
                if scheduled_time_str:
                    try:
                        scheduled_dt = datetime.strptime(scheduled_time_str, "%H:%M")
                        station_grouped_events[ev.get("station")].append({
                            "train_idx": train_idx,
                            "event_idx": event_idx,
                            "scheduled_dt": scheduled_dt,
                            "scheduled_minutes": scheduled_dt.hour * 60 + scheduled_dt.minute,
                            "current_delay": ev.get("delay_minutes", 0),
                            "event": ev
                        })
                    except ValueError:
                        continue
        
        major_delay_tracker = {}
        
        for station_name, events_at_station in station_grouped_events.items():
            events_at_station.sort(key=lambda x: x["scheduled_minutes"])
            
            previous_train_actual_time = None
            previous_train_info = None
            
            for current_event_data in events_at_station:
                current_scheduled = current_event_data["scheduled_minutes"]
                current_delay = current_event_data["current_delay"]
                current_expected = current_scheduled + current_delay
                
                if previous_train_actual_time is not None:
                    min_headway = 2.0
                    required_gap = previous_train_actual_time + min_headway
                    
                    if current_scheduled < required_gap:
                        wait_time = required_gap - current_scheduled
                        
                        if wait_time > 0.3:
                            cascade_multiplier = 0.4
                            if previous_train_info and previous_train_info["delay"] > 3.0:
                                cascade_multiplier = min(0.7, 0.4 + (previous_train_info["delay"] / 20.0))
                            
                            cascade_delay = wait_time * cascade_multiplier
                            cascade_delay = min(cascade_delay, 6.0)
                            cascade_delay = round(cascade_delay, 1)
                            
                            if cascade_delay >= 0.5:
                                new_delay = current_delay + cascade_delay
                                current_event_data["current_delay"] = round(new_delay, 1)
                                
                                train_idx = current_event_data["train_idx"]
                                event_idx = current_event_data["event_idx"]
                                original_event = updated_trains[train_idx]["station_events"][event_idx]
                                original_event["delay_minutes"] = current_event_data["current_delay"]
                                
                                original_scheduled = datetime.strptime(original_event["scheduled_arrival"], "%H:%M")
                                new_expected = original_scheduled + timedelta(minutes=original_event["delay_minutes"])
                                original_event["expected_arrival"] = new_expected.strftime("%H:%M")
                                
                                cascade_reason = f"Delayed by previous train at {station_name}: +{cascade_delay:.1f}min"
                                if cascade_reason not in str(original_event.get("delay_reasons", [])):
                                    original_event.setdefault("delay_reasons", []).append(cascade_reason)
                                
                                if (previous_train_info and 
                                    previous_train_info["delay"] >= self.MAJOR_DELAY_THRESHOLD and 
                                    cascade_delay >= self.CASCADE_THRESHOLD and
                                    current_event_data["event"].get("train_id") != previous_train_info["train_id"]):
                                    
                                    cascade_key = f"{previous_train_info['train_id']}_{station_name}_{previous_train_info['scheduled_time']}"
                                    
                                    if cascade_key not in major_delay_tracker:
                                        major_delay_tracker[cascade_key] = {
                                            "train_id": previous_train_info["train_id"],
                                            "station": station_name,
                                            "scheduled_time": previous_train_info["scheduled_time"],
                                            "delay_minutes": previous_train_info["delay"],
                                            "delay_reasons": previous_train_info.get("delay_reasons", []),
                                            "affected_trains": [],
                                            "total_cascade_impact": 0
                                        }
                                    
                                    affected_train_info = {
                                        "train_id": current_event_data["event"].get("train_id", "Unknown"),
                                        "station": station_name,
                                        "additional_delay": round(cascade_delay, 1),
                                        "scheduled_time": current_event_data["event"].get("scheduled_arrival", "Unknown"),
                                        "total_delay": round(original_event.get("delay_minutes", 0), 1)
                                    }
                                    
                                    major_delay_tracker[cascade_key]["affected_trains"].append(affected_train_info)
                                    major_delay_tracker[cascade_key]["total_cascade_impact"] += cascade_delay
                        
                        current_expected = current_scheduled + current_event_data["current_delay"]
                
                previous_train_info = {
                    "train_id": current_event_data["event"].get("train_id", "Unknown"),
                    "station": station_name,
                    "scheduled_time": current_event_data["event"].get("scheduled_arrival", "Unknown"),
                    "delay": current_event_data["current_delay"],
                    "delay_reasons": current_event_data["event"].get("delay_reasons", [])
                }
                previous_train_actual_time = current_expected

        for cascade_key, delay_info in major_delay_tracker.items():
            if delay_info["total_cascade_impact"] >= self.CASCADE_THRESHOLD:
                source_event = None
                for tr in updated_trains:
                    if tr.get("train_id") == delay_info["train_id"]:
                        for ev in tr.get("station_events", []):
                            if (ev.get("station") == delay_info["station"] and 
                                ev.get("scheduled_arrival") == delay_info["scheduled_time"]):
                                source_event = ev
                                break
                        if source_event:
                            break
                
                if source_event:
                    self._track_major_delay(
                        delay_event={
                            "train_id": delay_info["train_id"],
                            "station": delay_info["station"],
                            "scheduled_arrival": delay_info["scheduled_time"],
                            "expected_arrival": source_event.get("expected_arrival", "Unknown"),
                            "delay_minutes": source_event.get("delay_minutes", 0),
                            "delay_reasons": source_event.get("delay_reasons", [])
                        },
                        affected_trains=delay_info["affected_trains"],
                        cascade_impact=delay_info["total_cascade_impact"],
                        service_date=service_date
                    )

        for tr in updated_trains:
            tr["delay_analysis"] = self._calculate_delay_analysis(tr["station_events"], base_trip_time)

        all_events = []
        for tr in updated_trains:
            all_events.extend(tr.get("station_events", []))
        
        delayed_events = [e for e in all_events if e.get("delay_minutes", 0) > 0.5]
        significant_delays = [e for e in all_events if e.get("delay_minutes", 0) > 3.0]
        
        summary = {
            "total_events": len(all_events),
            "delayed_events": len(delayed_events),
            "delayed_percentage": round(len(delayed_events) / len(all_events) * 100, 1) if all_events else 0,
            "significant_delays": len(significant_delays),
            "max_delay": max([e.get("delay_minutes", 0) for e in all_events]) if all_events else 0,
            "avg_delay": round(sum([e.get("delay_minutes", 0) for e in all_events]) / len(all_events), 2) if all_events else 0,
            "causes_distribution": self._get_causes_distribution(all_events),
            "major_delays_count": len(self.major_delays),
            "major_delays": self.major_delays
        }

        return {
            **{k: v for k, v in baseline_rotation.items() if k not in ["train_schedules", "summary"]},
            "train_schedules": updated_trains,
            "summary": summary
        }

    
    def _calculate_delay_analysis(self, station_events: List[Dict[str, Any]], base_trip_time: float) -> Dict[str, Any]:
        total_delay = round(sum(e.get("delay_minutes", 0) for e in station_events), 1)
        
        delay_breakdown = defaultdict(float)
        reason_categories = defaultdict(list)
        
        for event in station_events:
            delay = event.get("delay_minutes", 0)
            reasons = event.get("delay_reasons", [])
            
            for reason in reasons:
                # Categorize reasons
                if any(x in reason.lower() for x in ["maintenance", "jobcard", "equipment"]):
                    delay_breakdown["maintenance"] += delay
                    reason_categories["maintenance"].append(reason)
                elif "weather" in reason.lower():
                    delay_breakdown["weather"] += delay
                    reason_categories["weather"].append(reason)
                elif any(x in reason.lower() for x in ["crowd", "peak", "passenger"]):
                    delay_breakdown["crowd"] += delay
                    reason_categories["crowd"].append(reason)
                elif "cascade" in reason.lower() or "delayed by" in reason.lower():
                    delay_breakdown["cascading"] += delay
                    reason_categories["cascading"].append(reason)
                elif "previous station" in reason.lower():
                    delay_breakdown["within_train"] += delay
                    reason_categories["within_train"].append(reason)
                elif "on time" in reason.lower() or delay == 0:
                    delay_breakdown["on_time"] += 0
                else:
                    delay_breakdown["operational"] += delay
                    reason_categories["operational"].append(reason)
        
        # Get unique reasons per category
        unique_reasons = {}
        for category, reasons in reason_categories.items():
            unique_reasons[category] = list(set(reasons))[:5]  # Limit to top 5
        
        return {
            "base_trip_time": base_trip_time,
            "total_trip_time": base_trip_time * 2,
            "total_delay": total_delay,
            "delay_breakdown": {k: round(v, 1) for k,v in delay_breakdown.items()},
            "reason_categories": unique_reasons
        }

    def _get_causes_distribution(self, all_events: List[Dict[str, Any]]) -> Dict[str, float]:
        cause_counts = defaultdict(float)
        total_delay = 0
        
        for event in all_events:
            delay = event.get("delay_minutes", 0)
            if delay <= 0:
                continue
                
            total_delay += delay
            reasons = event.get("delay_reasons", [])
            
            if not reasons or reasons == ["On time"]:
                cause_counts["unknown"] += delay
            else:
                # Use first reason as primary cause
                primary_reason = reasons[0]
                if "maintenance" in primary_reason.lower():
                    cause_counts["maintenance"] += delay
                elif "weather" in primary_reason.lower():
                    cause_counts["weather"] += delay
                elif any(x in primary_reason.lower() for x in ["crowd", "peak", "passenger"]):
                    cause_counts["crowd"] += delay
                elif "cascade" in primary_reason.lower():
                    cause_counts["cascading"] += delay
                else:
                    cause_counts["operational"] += delay
        
        if total_delay == 0:
            return {"on_time": 100.0}
        
        return {k: round((v / total_delay) * 100, 1) for k, v in cause_counts.items()}

    def _get_performance_summary(self, all_events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Get performance metrics"""
        total = len(all_events)
        if total == 0:
            return {}
        
        delays = [e.get("delay_minutes", 0) for e in all_events]
        
        on_time = sum(1 for d in delays if d == 0)
        minor_delays = sum(1 for d in delays if 0 < d <= 2)
        moderate_delays = sum(1 for d in delays if 2 < d <= 5)
        significant_delays = sum(1 for d in delays if d > 5)
        
        return {
            "on_time_percentage": round(on_time / total * 100, 1),
            "minor_delays_percentage": round(minor_delays / total * 100, 1),
            "moderate_delays_percentage": round(moderate_delays / total * 100, 1),
            "significant_delays_percentage": round(significant_delays / total * 100, 1),
            "punctuality_rating": self._get_punctuality_rating(on_time / total)
        }
    
    def _get_punctuality_rating(self, on_time_ratio: float) -> str:
        """Convert on-time ratio to rating"""
        if on_time_ratio >= 0.95:
            return "EXCELLENT"
        elif on_time_ratio >= 0.90:
            return "GOOD"
        elif on_time_ratio >= 0.85:
            return "FAIR"
        elif on_time_ratio >= 0.80:
            return "MODERATE"
        else:
            return "POOR"