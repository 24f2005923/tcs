# EvacRoute – Intelligent Evacuation Route Planner 🚨

EvacRoute is an intelligent evacuation planning system designed to help people safely navigate out of disaster zones using optimal pathfinding techniques.

The system uses real-world road network data from **OpenStreetMap** and applies the **A* (A-star) pathfinding algorithm** to compute the safest route from a person's location to the nearest safe exit outside a disaster area.

The application provides an **interactive map-based interface** where users can simulate disaster zones, add people within affected areas, and visualize evacuation routes in real time.

---

## Features

* Interactive evacuation planning interface
* Disaster zone simulation with adjustable radius
* Multi-person evacuation routing
* Optimal route calculation using the **A* algorithm**
* Real-world road network data using **OpenStreetMap**
* Visualization of routes on an interactive **Folium map**
* Avoidance of water bodies and unsafe routes
* Automatic identification of exit nodes outside the disaster zone

---

## Tech Stack

**Programming Language**

* Python

**Libraries & Tools**

* Streamlit (Web Interface)
* Folium (Map Visualization)
* OSMnx (OpenStreetMap Data)
* NetworkX (Graph Processing)
* NumPy
* Matplotlib

---

## Project Architecture

The project is divided into modular components:

```
EvacRoute
│
├── demo/                      # Screenshots and demo images
│   ├── interface.png
│   ├── evacuation-route.png
│   └── routes_summary.png
│
├── docs/
│   └── project_report.pdf
│
├── app.py                     # Main Streamlit application
├── evacuation_algorithm.py    # A* evacuation routing algorithm
├── data_processing.py         # Graph processing and location utilities
├── map_utils.py               # Map visualization utilities
│
├── README.md
├── requirements.txt           # Python dependencies
└── .gitignore
```

---

## How the System Works

1. The application downloads road network data from **OpenStreetMap** using OSMnx.
2. The road network is converted into a graph using **NetworkX**.
3. A disaster location and impact radius are defined.
4. People are placed within the map.
5. If a person is inside the disaster radius:

   * The system finds the nearest road node.
   * Exit nodes just outside the disaster zone are identified.
   * The **A*** algorithm computes the optimal evacuation route.
6. The evacuation path is displayed on an interactive map.

---

## A* Pathfinding Algorithm

The evacuation routing system is based on the **A* search algorithm**, which finds the most efficient path between nodes in a graph.

The evaluation function used is:

```
f(n) = g(n) + h(n)
```

Where:

* **g(n)** = actual cost from the start node to node *n*
* **h(n)** = heuristic estimate of distance from node *n* to the goal

Additional constraints used in this project:

* Avoid routes passing through water
* Prioritize movement away from the disaster center
* Identify optimal exit nodes near the disaster boundary

---

## Installation

Clone the repository:

```
git clone https://github.com/Omansh-Thakur/EvacRoute.git
cd EvacRoute
```

Install dependencies:

```
pip install -r requirements.txt
```

---

## Running the Application

Start the Streamlit server:

```
streamlit run app.py
```

The application will open in your browser at:

```
http://localhost:8501
```

---

## How to Use

1. Select a city or enter custom coordinates.
2. Add a **Disaster Zone** using latitude and longitude.
3. Add **Person locations** on the map.
4. The system automatically calculates evacuation routes for people inside the disaster area.
5. Routes are displayed on the map along with evacuation statistics.

---

## Example Use Cases

* Urban disaster evacuation planning
* Emergency response simulations
* Smart city safety systems
* Disaster management research
* Educational demonstrations of pathfinding algorithms

---

## Future Improvements

Potential improvements include:

* Integration with real-time disaster data
* Traffic-aware evacuation routing
* AI-based disaster risk prediction
* Multi-agent evacuation simulation
* Mobile application interface

---

## Author

**Omansh Thakur**

- Computer Science Engineering Student
- Interested in AI, Machine Learning, and Intelligent Systems

GitHub: https://github.com/Omansh-Thakur

---

## License

This project is intended for educational and research purposes.


