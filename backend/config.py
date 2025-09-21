import os

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./storage/uploads")
UNIFIED_JSON_PATH = os.getenv("UNIFIED_JSON_PATH", "./storage/unified.json")
DEPOT_JSON_PATH = os.getenv("DEPOT_JSON_PATH", "./storage/depot.json" )
HISTORICAL_JSON_PATH = os.getenv("HISTORICAL_JSON_PATH", "./storage/historical_data.json")
