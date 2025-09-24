import os

BASE_DIR = os.path.dirname(__file__)
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(BASE_DIR, "storage", "uploads"))
UNIFIED_JSON_PATH = os.getenv("UNIFIED_JSON_PATH", os.path.join(BASE_DIR, "storage", "unified.json"))
DEPOT_JSON_PATH = os.getenv("DEPOT_JSON_PATH", os.path.join(BASE_DIR, "storage", "depot.json"))
HISTORICAL_JSON_PATH = os.getenv("HISTORICAL_JSON_PATH", os.path.join(BASE_DIR, "storage", "historical_data.json"))
PARKING_JSON_PATH = os.getenv("PARKING_JSON_PATH", os.path.join(BASE_DIR, "data", "parking.json"))