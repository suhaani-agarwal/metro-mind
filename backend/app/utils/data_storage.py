import json
from datetime import datetime
from typing import Dict, Any
from pathlib import Path


class DataStorage:
    def __init__(self, storage_dir: str = "data"):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
    
    def save_results(self, results: Dict[str, Any], prefix: str = "layer1"):
        """Save processing results to JSON file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = self.storage_dir / f"{prefix}_{timestamp}.json"
        
        # Convert any non-serializable objects to strings
        serializable_results = {}
        for key, value in results.items():
            if hasattr(value, 'dict'):  # Pydantic models
                serializable_results[key] = value.dict()
            elif isinstance(value, (list, dict)):
                # Recursively convert any Pydantic models in lists/dicts
                serializable_results[key] = self._make_serializable(value)
            else:
                serializable_results[key] = value
        
        with open(filename, 'w') as f:
            json.dump(serializable_results, f, indent=2, default=str)
        
        print(f"Results saved to {filename}")
        return filename
    
    def _make_serializable(self, obj):
        """Recursively make object serializable"""
        if isinstance(obj, list):
            return [self._make_serializable(item) for item in obj]
        elif isinstance(obj, dict):
            return {k: self._make_serializable(v) for k, v in obj.items()}
        elif hasattr(obj, 'dict'):  # Pydantic models
            return obj.dict()
        else:
            return obj
    
    def load_latest_results(self, prefix: str = "layer1"):
        """Load the latest results file"""
        pattern = f"{prefix}_*.json"
        files = list(self.storage_dir.glob(pattern))
        
        if not files:
            return None
        
        latest_file = max(files, key=lambda f: f.stat().st_mtime)
        
        with open(latest_file, 'r') as f:
            return json.load(f)