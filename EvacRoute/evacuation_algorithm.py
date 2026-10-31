import networkx as nx
import numpy as np
import math
from queue import PriorityQueue

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371000  # Radius of earth in meters
    return c * r

def is_in_disaster_radius(point, disaster_node, radius, G):
    """Check if a point is within the disaster radius"""
    node = G.nodes[point]
    disaster_lat, disaster_lon = disaster_node
    distance = haversine_distance(node['y'], node['x'], disaster_lat, disaster_lon)
    return distance <= radius

def get_disaster_exit_nodes(G, disaster_node, disaster_radius):
    """
    Find all nodes that are just outside the disaster radius
    These nodes should be:
    1. Connected to nodes inside the disaster zone
    2. Not in water
    3. Just outside the disaster radius (within 100m of the border)
    """
    disaster_lat, disaster_lon = disaster_node
    exit_nodes = []
    
    # Find all nodes that are just outside the disaster zone
    inside_nodes = set()
    outside_nodes = set()
    
    # Buffer distance (how far outside the radius to look for exit nodes, in meters)
    buffer_distance = 100
    
    # First pass to classify nodes as inside or outside
    for node_id, node_data in G.nodes(data=True):
        if 'x' in node_data and 'y' in node_data:
            # Skip water nodes as they can't be exit points
            if node_data.get('is_water', False):
                continue
                
            distance = haversine_distance(node_data['y'], node_data['x'], disaster_lat, disaster_lon)
            
            if distance <= disaster_radius:
                inside_nodes.add(node_id)
            elif distance <= disaster_radius + buffer_distance:
                # Only consider nodes that are just outside (within buffer) as potential exits
                outside_nodes.add(node_id)
    
    # Find boundary nodes (inside nodes that connect to suitable outside nodes)
    boundary_nodes = []
    for inside_node in inside_nodes:
        for neighbor in G.neighbors(inside_node):
            if neighbor in outside_nodes:
                # Check if the edge between them crosses water
                edge_data = G.get_edge_data(inside_node, neighbor, default={})
                if not edge_data.get('is_water', False):
                    outside_node = neighbor
                    boundary_nodes.append((inside_node, outside_node))
    
    # Prioritize exit nodes that are on major roads if possible
    exit_node_candidates = [pair[1] for pair in boundary_nodes]
    
    # Filter out duplicates
    exit_node_candidates = list(set(exit_node_candidates))
    
    # Sort exit nodes by road type importance and distance from disaster border
    # (Higher priority to nodes on major roads just outside the border)
    exit_nodes_with_score = []
    for node_id in exit_node_candidates:
        node_data = G.nodes[node_id]
        
        # Skip if node is in water
        if node_data.get('is_water', False):
            continue
        
        # Calculate distance from disaster border
        distance = haversine_distance(node_data['y'], node_data['x'], disaster_lat, disaster_lon)
        border_distance = distance - disaster_radius
        
        # Score based on proximity to border (closer is better)
        proximity_score = 1 - (border_distance / buffer_distance)
        
        # Check if node is on a major road
        highway_type = "unknown"
        for _, _, edge_data in G.edges(node_id, data=True):
            if 'highway' in edge_data:
                highway_type = edge_data['highway']
                break
        
        # Road type score
        road_score = 0
        major_road_types = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary']
        if highway_type in major_road_types:
            road_score = 0.5
        
        # Calculate final score (higher is better)
        final_score = proximity_score + road_score
        
        exit_nodes_with_score.append((node_id, final_score))
    
    # Sort by score (descending)
    exit_nodes_with_score.sort(key=lambda x: x[1], reverse=True)
    
    # Take the top exit nodes
    max_exit_nodes = 10
    exit_nodes = [node[0] for node in exit_nodes_with_score[:max_exit_nodes]]
    
    # Ensure we have at least one exit node if possible
    if not exit_nodes and exit_node_candidates:
        exit_nodes = [exit_node_candidates[0]]
    
    return exit_nodes

def a_star_evacuation(G, start_node, disaster_node, disaster_radius):
    """
    Implementation of A* algorithm for evacuation routing
    with custom constraints:
    1. Must find path out of disaster zone regardless if person has to pass through disaster zone
    2. Must follow road network to evacuate
    3. Find shortest path to exit disaster zone
    4. Must not go through water and should avoid it at any cost
    """
    if start_node is None:
        return None
    
    # Check if starting node is already outside disaster radius
    if not is_in_disaster_radius(start_node, disaster_node, disaster_radius, G):
        return []  # Already safe
    
    # Get possible exit nodes (nodes just outside the disaster radius)
    exit_nodes = get_disaster_exit_nodes(G, disaster_node, disaster_radius)
    
    if not exit_nodes:
        return None  # No exit nodes found
    
    # Initialize data structures for A*
    open_set = PriorityQueue()
    open_set.put((0, start_node))
    came_from = {}
    g_score = {node: float('inf') for node in G.nodes()}
    g_score[start_node] = 0
    f_score = {node: float('inf') for node in G.nodes()}
    
    # Get disaster coordinates
    disaster_lat, disaster_lon = disaster_node
    
    def heuristic(node):
        """
        Heuristic function for A*:
        1. Primary goal: Distance to the closest exit node
        2. Heavily penalize water areas
        3. Prioritize movement away from disaster center
        """
        node_data = G.nodes[node]
        if 'x' not in node_data or 'y' not in node_data:
            return float('inf')
        
        # Maximum penalty for water nodes
        if node_data.get('is_water', False):
            return float('inf')  # Completely avoid water
        
        # Calculate node's distance from disaster center
        node_to_disaster_distance = haversine_distance(
            node_data['y'], node_data['x'], disaster_lat, disaster_lon
        )
        
        # Calculate minimum distance to any exit node
        min_exit_distance = float('inf')
        for exit_node in exit_nodes:
            exit_data = G.nodes[exit_node]
            if 'x' in exit_data and 'y' in exit_data:
                direct_distance = haversine_distance(
                    node_data['y'], node_data['x'], 
                    exit_data['y'], exit_data['x']
                )
                min_exit_distance = min(min_exit_distance, direct_distance)
        
        # For nodes inside disaster zone, prioritize moving toward exit
        if node_to_disaster_distance <= disaster_radius:
            # Encourage movement toward border
            border_factor = 1.5 * (disaster_radius - node_to_disaster_distance) / disaster_radius
            return min_exit_distance * (1 + border_factor)
        else:
            # For nodes outside disaster zone, no additional penalty needed
            return min_exit_distance
    
    f_score[start_node] = heuristic(start_node)
    open_set_hash = {start_node}
    
    while not open_set.empty():
        _, current = open_set.get()
        open_set_hash.remove(current)
        
        # Check if we've reached an exit node
        if current in exit_nodes:
            # Reconstruct the path
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start_node)
            path.reverse()
            return path
        
        # Check neighbors by following the road network
        for neighbor in G.neighbors(current):
            # Skip water nodes entirely
            if G.nodes[neighbor].get('is_water', False):
                continue
            
            # Get edge data for cost calculation (following the road network)
            edge_data = G.get_edge_data(current, neighbor, default={})
            edge_length = edge_data.get('length', 100)  # Default length if not available
            
            # Extreme penalty for edges going through water - avoid at all costs
            water_penalty = 10000 if edge_data.get('is_water', False) else 1
            
            # Calculate tentative g_score
            tentative_g_score = g_score[current] + edge_length * water_penalty
            
            if tentative_g_score < g_score[neighbor]:
                # This path to neighbor is better than any previous one
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g_score
                f_score[neighbor] = tentative_g_score + heuristic(neighbor)
                
                if neighbor not in open_set_hash:
                    open_set.put((f_score[neighbor], neighbor))
                    open_set_hash.add(neighbor)
    
    # If we get here, no path was found
    return None

def get_path_coordinates(G, path):
    """Convert a path of node IDs to a list of lat/lon coordinates"""
    if not path:
        return []
    
    coordinates = []
    for node_id in path:
        node_data = G.nodes[node_id]
        if 'x' in node_data and 'y' in node_data:
            coordinates.append((node_data['y'], node_data['x']))  # lat, lon
    
    return coordinates
