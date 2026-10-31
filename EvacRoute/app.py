import streamlit as st
import folium
from streamlit_folium import folium_static, st_folium
import osmnx as ox
import networkx as nx
import numpy as np
import matplotlib.pyplot as plt
import math
from evacuation_algorithm import a_star_evacuation
from map_utils import create_base_map, add_disaster_marker, add_person_markers, add_evacuation_paths
from data_processing import get_nearest_node, check_if_in_radius, filter_road_network

# Set page configuration
st.set_page_config(
    page_title="Smart Evacuation Router",
    page_icon="🚨",
    layout="wide"
)

# Initialize session state variables if not already done
if 'disaster_node' not in st.session_state:
    st.session_state.disaster_node = None
if 'disaster_radius' not in st.session_state:
    st.session_state.disaster_radius = 1000  # Default radius in meters
if 'person_nodes' not in st.session_state:
    st.session_state.person_nodes = []
if 'road_network' not in st.session_state:
    st.session_state.road_network = None
if 'center_location' not in st.session_state:
    st.session_state.center_location = [28.6139, 77.2090]  # Default: New Delhi
if 'evacuation_routes' not in st.session_state:
    st.session_state.evacuation_routes = {}
if 'map_initialized' not in st.session_state:
    st.session_state.map_initialized = False

# Title and introduction
st.title("Smart Evacuation Router")
st.markdown("""
This application helps plan evacuation routes during emergency situations.
The system finds optimal paths out of disaster zones while following road networks and avoiding obstacles.
""")

# Sidebar for controls
with st.sidebar:
    st.header("Evacuation Settings")
    
    # Location input
    st.subheader("Set Map Location")
    location_options = {
        "New Delhi": [28.6139, 77.2090],
        "Mumbai": [19.0760, 72.8777],
        "Bangalore": [12.9716, 77.5946],
        "New York": [40.7128, -74.0060],
        "London": [51.5074, -0.1278],
        "Tokyo": [35.6762, 139.6503],
        "Sydney": [-33.8688, 151.2093]
    }
    selected_location = st.selectbox("Select a city", list(location_options.keys()))
    
    # Custom location input
    custom_location = st.checkbox("Use custom coordinates")
    if custom_location:
        lat = st.number_input("Latitude", value=st.session_state.center_location[0], 
                              min_value=-90.0, max_value=90.0, step=0.0001)
        lon = st.number_input("Longitude", value=st.session_state.center_location[1], 
                              min_value=-180.0, max_value=180.0, step=0.0001)
        st.session_state.center_location = [lat, lon]
    else:
        st.session_state.center_location = location_options[selected_location]
    
    # Disaster radius input
    st.subheader("Disaster Settings")
    radius = st.slider("Disaster Impact Radius (meters)", 
                      min_value=100, max_value=5000, value=st.session_state.disaster_radius, step=100)
    st.session_state.disaster_radius = radius
    
    # Clear buttons
    st.subheader("Reset Options")
    if st.button("Clear Disaster Node"):
        st.session_state.disaster_node = None
        st.session_state.evacuation_routes = {}
        st.rerun()
    
    if st.button("Clear Person Nodes"):
        st.session_state.person_nodes = []
        st.session_state.evacuation_routes = {}
        st.rerun()
    
    if st.button("Clear All"):
        st.session_state.disaster_node = None
        st.session_state.person_nodes = []
        st.session_state.evacuation_routes = {}
        st.session_state.map_initialized = False
        st.rerun()

# Check if map needs initialization
if not st.session_state.map_initialized or st.session_state.road_network is None:
    try:
        with st.spinner("Loading road network data... This may take a minute."):
            # Download the street network for the selected area
            G = ox.graph_from_point(
                center_point=st.session_state.center_location, 
                dist=max(5000, st.session_state.disaster_radius * 1.5),
                network_type='drive'
            )
            
            # Filter the network to remove roads through water if that data is available
            G = filter_road_network(G)
            
            # Store the road network in session state
            st.session_state.road_network = G
            st.session_state.map_initialized = True
    except Exception as e:
        st.error(f"Error loading road network: {e}")
        st.error("Please try a different location or check your internet connection.")
        st.stop()

# Direct node placement inputs
st.info("""
**Instructions:**
1. Use the forms below to directly add disaster zone or person nodes.
2. Enter the coordinates and click the respective 'Add' button.
3. The application will automatically calculate evacuation routes for people in the disaster zone.
""")

# Two columns for disaster zone and person nodes
col1, col2 = st.columns(2)

with col1:
    st.markdown("### 📍 Add Disaster Zone")
    disaster_lat = st.number_input("Disaster Latitude", value=st.session_state.center_location[0], format="%.6f", key="disaster_lat")
    disaster_lon = st.number_input("Disaster Longitude", value=st.session_state.center_location[1], format="%.6f", key="disaster_lon")
    
    if st.button("Add Disaster Zone", use_container_width=True):
        st.session_state.disaster_node = (disaster_lat, disaster_lon)
        st.session_state.evacuation_routes = {}  # Reset routes
        
        # Recalculate routes for existing people in danger zone
        if st.session_state.person_nodes:
            for person_lat, person_lon in st.session_state.person_nodes:
                in_radius = check_if_in_radius(
                    (person_lat, person_lon), 
                    st.session_state.disaster_node, 
                    st.session_state.disaster_radius
                )
                
                if in_radius:
                    try:
                        # Find nearest nodes in the road network
                        person_node = get_nearest_node(st.session_state.road_network, person_lat, person_lon)
                        
                        # Find evacuation route
                        route = a_star_evacuation(
                            st.session_state.road_network,
                            person_node,
                            st.session_state.disaster_node,
                            st.session_state.disaster_radius
                        )
                        
                        if route:
                            st.session_state.evacuation_routes[(person_lat, person_lon)] = route
                    except Exception as e:
                        st.error(f"Error calculating route: {e}")
        
        st.success(f"Disaster zone placed at [{disaster_lat:.6f}, {disaster_lon:.6f}]")
        st.rerun()

with col2:
    st.markdown("### 👤 Add Person")
    person_lat = st.number_input("Person Latitude", value=st.session_state.center_location[0], format="%.6f", key="person_lat")
    person_lon = st.number_input("Person Longitude", value=st.session_state.center_location[1], format="%.6f", key="person_lon")
    
    if st.button("Add Person", use_container_width=True):
        new_person = (person_lat, person_lon)
        if new_person not in st.session_state.person_nodes:
            st.session_state.person_nodes.append(new_person)
            
            # Calculate evacuation route if in disaster zone
            if st.session_state.disaster_node:
                in_radius = check_if_in_radius(
                    new_person, 
                    st.session_state.disaster_node, 
                    st.session_state.disaster_radius
                )
                
                if in_radius:
                    with st.spinner("Calculating evacuation route..."):
                        try:
                            # Find nearest nodes in the road network
                            person_node = get_nearest_node(st.session_state.road_network, person_lat, person_lon)
                            
                            # Find evacuation route
                            route = a_star_evacuation(
                                st.session_state.road_network,
                                person_node,
                                st.session_state.disaster_node,
                                st.session_state.disaster_radius
                            )
                            
                            if route:
                                st.session_state.evacuation_routes[(person_lat, person_lon)] = route
                                st.success(f"Person placed at [{person_lat:.6f}, {person_lon:.6f}] with evacuation route")
                            else:
                                st.warning(f"Could not find evacuation route for person at [{person_lat:.6f}, {person_lon:.6f}]")
                        except Exception as e:
                            st.error(f"Error calculating route: {e}")
                else:
                    st.success(f"Person placed at [{person_lat:.6f}, {person_lon:.6f}] (Safe zone)")
            else:
                st.warning("Please add a disaster zone first")
            
            st.rerun()

# Create and display the map
st.markdown("### 🗺️ Evacuation Map")
m = create_base_map(st.session_state.center_location)

# Add disaster marker if any
if st.session_state.disaster_node:
    add_disaster_marker(m, st.session_state.disaster_node, st.session_state.disaster_radius)

# Add person markers if any
if st.session_state.person_nodes:
    add_person_markers(m, st.session_state.person_nodes, 
                      st.session_state.disaster_node, 
                      st.session_state.disaster_radius)

# Add evacuation paths if any
if st.session_state.evacuation_routes:
    add_evacuation_paths(m, st.session_state.evacuation_routes, st.session_state.road_network)

# Display the map
folium_static(m, width=1200, height=600)

# Display evacuation routes statistics
if st.session_state.evacuation_routes:
    st.subheader("Evacuation Routes Summary")
    
    total_nodes = len(st.session_state.person_nodes)
    nodes_in_danger = len(st.session_state.evacuation_routes)
    safe_nodes = total_nodes - nodes_in_danger
    
    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Total People", total_nodes)
    with col2:
        st.metric("People in Danger Zone", nodes_in_danger)
    with col3:
        st.metric("People in Safe Zone", safe_nodes)
    
    # Display route details
    if nodes_in_danger > 0:
        st.markdown("### Evacuation Route Details")
        for idx, ((lat, lon), route) in enumerate(st.session_state.evacuation_routes.items()):
            if route:
                st.markdown(f"**Person {idx+1}** at [{lat:.6f}, {lon:.6f}]")
                st.markdown(f"- Route length: {len(route)} nodes")
                st.markdown(f"- Approximate distance: {len(route) * 20} meters")  # Rough estimate

# Add some information at the bottom
st.markdown("---")
st.markdown("""
### About Smart Evacuation Router

This application implements an evacuation routing system with custom constraints to find optimal routes during emergency situations. The algorithm follows these rules:

1. Routes must lead from the person's location to outside the disaster zone
2. Routes must follow existing road networks
3. Routes must not go through water and should be avoided at any cost
4. The evacuation path should be from the person node to just outside of the disaster zone

The application uses OpenStreetMap data to fetch real road networks for accurate routing.
""")
