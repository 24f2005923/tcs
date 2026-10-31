import folium
import math
import random

import folium

def create_base_map(center_location):
    """Create a base folium map centered at the given location without any API key."""
    m = folium.Map(
        location=center_location,
        zoom_start=14,
        tiles=None  # Disable default to manage layers cleanly
    )
    
    # 1. Standard OpenStreetMap (Free, keyless)
    folium.TileLayer(
        tiles='https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        name='OpenStreetMap',
        max_zoom=19,
        attr='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    ).add_to(m)
    
    # 2. Esri Light Gray Canvas (Free, keyless - clean light theme)
    folium.TileLayer(
        tiles='https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        name='Light Map (Esri Canvas)',
        max_zoom=16,
        attr='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
    ).add_to(m)

    # 3. Esri Dark Gray Canvas (Free, keyless - clean dark operations theme)
    folium.TileLayer(
        tiles='https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        name='Dark Map (Esri Canvas)',
        max_zoom=16,
        attr='Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'
    ).add_to(m)
    
    # 4. Esri Satellite / Imagery (Free, keyless)
    folium.TileLayer(
        tiles='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        name='Satellite Map',
        max_zoom=19,
        attr='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    ).add_to(m)
    
    # Add layer switcher to map
    folium.LayerControl().add_to(m)
    
    return m

def add_disaster_marker(m, disaster_node, radius):
    """Add disaster marker and impact radius to the map"""
    if not disaster_node:
        return
    
    # Add the disaster marker
    folium.Marker(
        location=disaster_node,
        icon=folium.Icon(color='red', icon='exclamation-circle', prefix='fa'),
        popup=f"Disaster Center<br>Radius: {radius}m"
    ).add_to(m)
    
    # Add the impact radius circle
    folium.Circle(
        location=disaster_node,
        radius=radius,
        color='red',
        fill=True,
        fill_color='red',
        fill_opacity=0.2,
        popup=f"Impact Radius: {radius}m"
    ).add_to(m)

def check_if_in_radius(point, center, radius):
    """Check if a point is within the given radius from center"""
    lat1, lon1 = point
    lat2, lon2 = center
    
    # Convert latitude and longitude from degrees to radians
    lat1, lon1, lat2, lon2 = map(math.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = math.sin(dlat/2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon/2)**2
    c = 2 * math.asin(math.sqrt(a))
    r = 6371000  # Radius of earth in meters
    
    distance = c * r
    return distance <= radius

def add_person_markers(m, person_nodes, disaster_node, disaster_radius):
    """Add person markers to the map"""
    if not person_nodes:
        return
    
    for i, (lat, lon) in enumerate(person_nodes):
        in_radius = False
        if disaster_node:
            in_radius = check_if_in_radius((lat, lon), disaster_node, disaster_radius)
        
        # Choose icon and color based on whether person is in danger zone
        icon_color = 'red' if in_radius else 'green'
        icon_symbol = 'user' if in_radius else 'check'
        popup_text = f"Person {i+1}<br>Status: {'In Danger Zone' if in_radius else 'Safe'}"
        
        folium.Marker(
            location=[lat, lon],
            icon=folium.Icon(color=icon_color, icon=icon_symbol, prefix='fa'),
            popup=popup_text
        ).add_to(m)

def add_evacuation_paths(m, evacuation_routes, G):
    """Add evacuation paths to the map"""
    if not evacuation_routes:
        return
    
    # Generate a list of distinct colors for routes
    colors = ['blue', 'purple', 'orange', 'darkred', 'darkblue', 'darkgreen', 'cadetblue', 
              'darkpurple', 'pink', 'lightblue', 'lightgreen', 'gray', 'black']
    
    for i, ((person_lat, person_lon), route) in enumerate(evacuation_routes.items()):
        if not route:
            continue
        
        # Get path coordinates
        path_coords = []
        for node_id in route:
            node_data = G.nodes[node_id]
            if 'x' in node_data and 'y' in node_data:
                path_coords.append([node_data['y'], node_data['x']])  # [lat, lon]
        
        if not path_coords:
            continue
        
        # Get a color for this route (cycle through the colors list)
        color_idx = i % len(colors)
        route_color = colors[color_idx]
        
        # Add the route path
        folium.PolyLine(
            locations=path_coords,
            color=route_color,
            weight=4,
            opacity=0.8,
            popup=f"Evacuation Route for Person {i+1}"
        ).add_to(m)
        
        # Add arrow markers to indicate direction
        if len(path_coords) >= 2:
            # Add arrow at the midpoint
            midpoint_idx = len(path_coords) // 2
            add_arrow(m, path_coords[midpoint_idx-1], path_coords[midpoint_idx], route_color)
            
            # Add arrow near the end
            if len(path_coords) >= 4:
                end_idx = len(path_coords) - 2
                add_arrow(m, path_coords[end_idx-1], path_coords[end_idx], route_color)

def add_arrow(m, start_point, end_point, color):
    """Add an arrow marker to indicate direction on a path"""
    # Get the angle
    x1, y1 = start_point[1], start_point[0]
    x2, y2 = end_point[1], end_point[0]
    
    angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
    
    # Create the arrow at the end point
    folium.RegularPolygonMarker(
        location=end_point,
        number_of_sides=3,
        radius=6,
        rotation=angle,
        color=color,
        fill=True,
        fill_color=color,
        fill_opacity=0.8
    ).add_to(m)
