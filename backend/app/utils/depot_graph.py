from typing import List, Dict, Set, Tuple
import heapq

class DepotGraph:
    """Graph representation of the depot layout for pathfinding"""
    
    def __init__(self, connections: Dict[str, List[str]]):
        self.graph = connections
    
    def shortest_path(self, start: str, end: str) -> Tuple[int, List[str]]:
        """Find the shortest path between two bays using Dijkstra's algorithm"""
        if start not in self.graph or end not in self.graph:
            return float('inf'), []
        
        # Initialize distances
        distances = {bay: float('inf') for bay in self.graph}
        distances[start] = 0
        
        # Priority queue: (distance, bay, path)
        queue = [(0, start, [])]
        
        while queue:
            current_dist, current_bay, path = heapq.heappop(queue)
            
            if current_dist > distances[current_bay]:
                continue
                
            new_path = path + [current_bay]
            
            if current_bay == end:
                return current_dist, new_path
                
            for neighbor in self.graph[current_bay]:
                distance = current_dist + 1  # All edges have weight 1
                
                if distance < distances[neighbor]:
                    distances[neighbor] = distance
                    heapq.heappush(queue, (distance, neighbor, new_path))
        
        return float('inf'), []  # No path found
    
    def minimum_moves(self, current_positions: Dict[str, str], target_assignments: Dict[str, str]) -> Dict[str, int]:
        """Calculate minimum moves required for each train to reach target bay"""
        moves_required = {}
        
        for train_id, target_bay in target_assignments.items():
            current_bay = current_positions.get(train_id, "Unknown")
            
            if current_bay == target_bay:
                moves_required[train_id] = 0
            else:
                distance, _ = self.shortest_path(current_bay, target_bay)
                moves_required[train_id] = distance if distance != float('inf') else -1
        
        return moves_required