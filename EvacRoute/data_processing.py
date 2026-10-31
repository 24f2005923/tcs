import networkx as nx
import numpy as np
import math
import osmnx as ox

def get_nearest_node(G, lat, lon):
    """Find the nearest node in the graph to the given coordinates"""
    try:
        # Use OSMnx's built-in get_nearest_node function
        nearest_node = ox.distance.nearest_nodes(G, lon, lat)
        return nearest_node
    except Exception as e:
        # Fallback method if the above fails
        min_distance = float('inf')
        nearest_node = None
        
        for node_id, node_data in G.nodes(data=True):
            if 'x' in node_data and 'y' in node_data:
                node_lon, node_lat = node_data['x'], node_data['y']
                distance = haversine_distance(lat, lon, node_lat, node_lon)
                
                if distance < min_distance:
                    min_distance = distance
                    nearest_node = node_id
        
        return nearest_node

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

def check_if_in_radius(point, center, radius):
    """Check if a point is within the given radius from center"""
    lat1, lon1 = point
    lat2, lon2 = center
    
    # Calculate direct distance
    distance = haversine_distance(lat1, lon1, lat2, lon2)
    
    return distance <= radius

def filter_road_network(G):
    """
    Filter the road network to mark water bodies and other obstacles
    This is a simplified version as detailed water body data might not be available
    """
    # Make a copy of the graph to avoid modifying the original
    G_filtered = G.copy()
    
    # Mark water-adjacent nodes based on OSM tags if available
    for node, data in G_filtered.nodes(data=True):
        # Check for water-related tags
        is_water = False
        
        # Check for explicit water tags
        if 'natural' in data and data['natural'] in ['water', 'coastline', 'wetland', 'bay', 'beach', 'marsh']:
            is_water = True
        
        if 'waterway' in data and data['waterway'] in ['river', 'canal', 'stream', 'ditch', 'dock', 'riverbank']:
            is_water = True
        
        # Additional water-related tags
        if 'water' in data or 'harbour' in data or 'dock' in data:
            is_water = True
            
        # Check for landuse tags related to water
        if 'landuse' in data and data['landuse'] in ['reservoir', 'basin', 'water']:
            is_water = True
            
        data['is_water'] = is_water
    
    # Mark water-crossing edges based on node attributes and edge tags
    for u, v, data in G_filtered.edges(data=True):
        # Check for bridge tags (bridges are OK to cross water)
        is_bridge = 'bridge' in data and data['bridge'] not in ['no', 'false', '0']
        
        # Check if either endpoint is in water
        node_u_in_water = G_filtered.nodes[u].get('is_water', False)
        node_v_in_water = G_filtered.nodes[v].get('is_water', False)
        
        # Mark edge as water crossing if one or both nodes are in water and it's not a bridge
        if (node_u_in_water or node_v_in_water) and not is_bridge:
            data['is_water'] = True
        else:
            data['is_water'] = False
        
        # Additional check for water-related edge tags
        if any(tag in data for tag in ['waterway', 'water', 'natural']):
            if not is_bridge:  # Still allow bridges
                data['is_water'] = True
    
    return G_filtered

def find_exit_nodes(G, disaster_node, disaster_radius):
    """Find nodes that are just outside the disaster radius"""
    disaster_lat, disaster_lon = disaster_node
    exit_nodes = []
    
    # Find pairs of nodes where one is inside and one is outside the radius
    for u, v in G.edges():
        u_data = G.nodes[u]
        v_data = G.nodes[v]
        
        if 'x' in u_data and 'y' in u_data and 'x' in v_data and 'y' in v_data:
            u_distance = haversine_distance(u_data['y'], u_data['x'], disaster_lat, disaster_lon)
            v_distance = haversine_distance(v_data['y'], v_data['x'], disaster_lat, disaster_lon)
            
            # If one node is inside and the other is outside, we found a border
            if (u_distance <= disaster_radius and v_distance > disaster_radius):
                exit_nodes.append(v)
            elif (v_distance <= disaster_radius and u_distance > disaster_radius):
                exit_nodes.append(u)
    
    # Remove duplicates
    exit_nodes = list(set(exit_nodes))
    
    return exit_nodes
