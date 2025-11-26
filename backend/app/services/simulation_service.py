# simulation_service.py
import json
import heapq
from typing import Dict, List, Tuple, Set
from datetime import datetime
from collections import deque

class EnhancedShuntingSimulation:
    def __init__(self, unified_data: dict, output_data: dict, depot_layout: dict):
        self.unified_data = unified_data
        self.output_data = output_data
        self.depot_layout = depot_layout
        self.depot_graph = self.build_depot_graph()
        
    def build_depot_graph(self):
        """Build graph representation of depot with realistic convergence"""
        graph = {}
        
        # Add all tracks and nodes
        tracks = []
        if 'ibl_bays' in self.depot_layout:
            tracks.extend(self.depot_layout['ibl_bays'])
        if 'parking_tracks' in self.depot_layout:
            tracks.extend([t['id'] for t in self.depot_layout['parking_tracks']])
        
        # Build convergence network
        for track in tracks:
            graph[track] = [f"{track}_END"]
            graph[f"{track}_END"] = [track]
        
        # Add convergence nodes (every 2 tracks converge)
        for i in range(0, len(tracks), 2):
            if i + 1 < len(tracks):
                conv_node = f"CONV_L1_{(i//2)+1}"
                graph[f"{tracks[i]}_END"].append(conv_node)
                graph[f"{tracks[i+1]}_END"].append(conv_node)
                graph[conv_node] = [f"{tracks[i]}_END", f"{tracks[i+1]}_END"]
        
        # Add higher level convergence
        # ... implementation for multi-level convergence
        
        return graph
    
    def find_shortest_path(self, start: str, end: str) -> Tuple[int, List[str]]:
        """Find shortest path using BFS"""
        if start == end:
            return 0, [start]
            
        queue = deque([(start, [start])])
        visited = set([start])
        
        while queue:
            current, path = queue.popleft()
            
            for neighbor in self.depot_graph.get(current, []):
                if neighbor == end:
                    return len(path), path + [neighbor]
                
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, path + [neighbor]))
        
        return float('inf'), []
    
    def generate_optimized_moves(self) -> List[Dict]:
        """Generate optimized move sequence considering blocking trains"""
        current_positions = self.get_current_positions()
        target_positions = self.get_target_positions()
        
        moves = []
        occupied_positions = set(current_positions.values())
        
        # Group trains by their target tracks to optimize sequencing
        track_assignments = {}
        for train_id, target_pos in target_positions.items():
            track_id = target_pos.split('-')[0]
            if track_id not in track_assignments:
                track_assignments[track_id] = []
            track_assignments[track_id].append((train_id, target_pos))
        
        # Process moves track by track
        for track_id, assignments in track_assignments.items():
            # Sort by position (position 1 first)
            assignments.sort(key=lambda x: int(x[1].split('-')[1]))
            
            for train_id, target_pos in assignments:
                current_pos = current_positions.get(train_id, "MAIN_LINE")
                
                if current_pos != target_pos:
                    # Check if path is blocked
                    if self.is_path_blocked(current_pos, target_pos, occupied_positions):
                        # Move blocking trains first
                        blocking_trains = self.find_blocking_trains(current_pos, target_pos, current_positions)
                        for blocking_train in blocking_trains:
                            blocking_target = self.find_temp_position(blocking_train, current_positions, occupied_positions)
                            if blocking_target:
                                moves.append(self.create_move_step(blocking_train, current_positions[blocking_train], blocking_target))
                                occupied_positions.remove(current_positions[blocking_train])
                                occupied_positions.add(blocking_target)
                                current_positions[blocking_train] = blocking_target
                    
                    # Now move the actual train
                    moves.append(self.create_move_step(train_id, current_pos, target_pos))
                    if current_pos in occupied_positions:
                        occupied_positions.remove(current_pos)
                    occupied_positions.add(target_pos)
                    current_positions[train_id] = target_pos
        
        return moves
    
    def create_move_step(self, train_id: str, from_pos: str, to_pos: str) -> Dict:
        """Create a move step with path calculation"""
        from_node = from_pos.split('-')[0] if '-' in from_pos else from_pos
        to_node = to_pos.split('-')[0] if '-' in to_pos else to_pos
        
        distance, path = self.find_shortest_path(from_node, to_node)
        
        return {
            "train_id": train_id,
            "from_position": from_pos,
            "to_position": to_pos,
            "path": path,
            "moves_required": distance,
            "duration": max(30, distance * 10),  # Minimum 30 seconds per move
            "description": f"Move {train_id} from {from_pos} to {to_pos}"
        }
    
    def get_current_positions(self) -> Dict[str, str]:
        """Get current positions from unified data"""
        positions = {}
        for train in self.unified_data.get('trains', []):
            if train.get('current_position'):
                positions[train['id']] = train['current_position']
            else:
                positions[train['id']] = "MAIN_LINE"
        return positions
    
    def get_target_positions(self) -> Dict[str, str]:
        """Get target positions from output data"""
        positions = {}
        
        # IBL assignments
        for i, train_id in enumerate(self.output_data.get('trains_to_ibl', [])):
            if i < len(self.depot_layout.get('ibl_bays', [])):
                bay_id = self.depot_layout['ibl_bays'][i]
                positions[train_id] = f"{bay_id}-1"
        
        # Parking assignments
        for assignment in self.output_data.get('parking_assignments', []):
            positions[assignment['train_id']] = f"{assignment['track_id']}-{assignment['position_in_track']}"
        
        return positions
    
    def is_path_blocked(self, from_pos: str, to_pos: str, occupied_positions: Set[str]) -> bool:
        """Check if path is blocked by other trains"""
        # Simplified blocking check - in real implementation, check all nodes along path
        from_track = from_pos.split('-')[0]
        to_track = to_pos.split('-')[0]
        
        # Check if target position is occupied
        if to_pos in occupied_positions:
            return True
            
        # Check intermediate positions (simplified)
        path_nodes = self.find_shortest_path(from_track, to_track)[1]
        for node in path_nodes:
            if any(pos.startswith(node) for pos in occupied_positions):
                return True
                
        return False
    
    def find_blocking_trains(self, from_pos: str, to_pos: str, current_positions: Dict[str, str]) -> List[str]:
        """Find trains blocking the path"""
        blocking = []
        target_track = to_pos.split('-')[0]
        
        # Check if there's a train in position 1 when we need position 2
        if to_pos.endswith('-2'):
            pos1 = f"{target_track}-1"
            for train_id, pos in current_positions.items():
                if pos == pos1:
                    blocking.append(train_id)
                    break
        
        return blocking
    
    def find_temp_position(self, train_id: str, current_positions: Dict[str, str], occupied_positions: Set[str]) -> str:
        """Find temporary position for a blocking train"""
        # Find first available parking spot
        for track in self.depot_layout.get('parking_tracks', []):
            for position in [1, 2]:
                temp_pos = f"{track['id']}-{position}"
                if temp_pos not in occupied_positions:
                    return temp_pos
        return None

# API endpoint to generate simulation
@app.post("/api/generate-simulation")
async def generate_simulation(data: dict):
    try:
        simulator = EnhancedShuntingSimulation(
            data['unified_data'],
            data['output_data'], 
            data['depot_layout']
        )
        
        moves = simulator.generate_optimized_moves()
        
        # Convert to simulation steps
        steps = []
        for i, move in enumerate(moves, 1):
            steps.append({
                "step": i,
                "train_id": move["train_id"],
                "action": "move",
                "from": move["from_position"],
                "to": move["to_position"],
                "path": move["path"],
                "description": move["description"],
                "duration": move["duration"]
            })
        
        return {"steps": steps}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))