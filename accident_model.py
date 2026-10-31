import os
import math
import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple

try:
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.preprocessing import LabelEncoder
    from sklearn.model_selection import train_test_split
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False


def haversine_m(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lon2 - lon1)
    a = (math.sin(dphi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2.0) ** 2)
    return R * (2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a)))


class AccidentRiskPredictor:
    def __init__(self, dataset_path: str = "data/chennai_accident_records.csv"):
        self.dataset_path = dataset_path
        self.is_trained = False
        self.model = None
        self.label_encoders: Dict[str, LabelEncoder] = {}
        self.target_encoder: Optional[LabelEncoder] = None
        self.hotspots: List[Dict[str, Any]] = []
        self.total_accidents = 0
        self.feature_columns: List[str] = []
        self.training_summary: Dict[str, Any] = {
            "status": "UNINITIALIZED",
            "accuracy": 0.0,
            "hotspots_count": 0,
            "records_analyzed": 0,
            "limitations": []
        }
        
        self.load_and_train()

    def _detect_columns(self, df: pd.DataFrame) -> Dict[str, Optional[str]]:
        cols = {c.lower().strip(): c for c in df.columns}
        
        lat_col = next((cols[c] for c in ['latitude', 'lat', 'y', 'coord_lat'] if c in cols), None)
        lon_col = next((cols[c] for c in ['longitude', 'lon', 'lng', 'x', 'coord_lon'] if c in cols), None)
        target_col = next((cols[c] for c in ['risk_level', 'accident_severity', 'severity', 'severity_level'] if c in cols), None)
        weather_col = next((cols[c] for c in ['weather_condition', 'weather', 'weather_desc'] if c in cols), None)
        road_col = next((cols[c] for c in ['road_surface', 'road_condition', 'surface'] if c in cols), None)
        name_col = next((cols[c] for c in ['road_name', 'location', 'place_name', 'junction'] if c in cols), None)
        
        return {
            "lat": lat_col,
            "lon": lon_col,
            "target": target_col,
            "weather": weather_col,
            "road": road_col,
            "road_name": name_col
        }

    def load_and_train(self):
        if not os.path.exists(self.dataset_path):
            self.training_summary["status"] = "DATASET_NOT_FOUND"
            self.training_summary["limitations"].append(
                f"Accident dataset file '{self.dataset_path}' not found on disk. Dynamic risk fallback active."
            )
            return

        try:
            df = pd.read_csv(self.dataset_path)
            if df.empty or len(df) < 5:
                self.training_summary["status"] = "INSUFFICIENT_DATA"
                self.training_summary["limitations"].append("Dataset contains insufficient records for statistical ML modeling.")
                return

            detected = self._detect_columns(df)
            lat_col, lon_col = detected["lat"], detected["lon"]
            
            if not lat_col or not lon_col:
                self.training_summary["status"] = "MISSING_COORDINATES"
                self.training_summary["limitations"].append("Dataset missing geospatial latitude/longitude columns.")
                return

            # Clean coordinates
            df = df.dropna(subset=[lat_col, lon_col])
            df = df[(df[lat_col] >= -90) & (df[lat_col] <= 90) & (df[lon_col] >= -180) & (df[lon_col] <= 180)]
            self.total_accidents = len(df)

            # 1. Compute Historical Hotspots via Spatial Proximity (Clusters within 250m)
            hotspot_map: Dict[str, Dict[str, Any]] = {}
            for _, row in df.iterrows():
                lat, lon = float(row[lat_col]), float(row[lon_col])
                name = str(row[detected["road_name"]]) if detected["road_name"] else "Corridor Zone"
                
                # Check if matches existing cluster
                matched = False
                for h_key, h_data in hotspot_map.items():
                    if haversine_m(lat, lon, h_data["lat"], h_data["lon"]) <= 280.0:
                        h_data["accident_count"] += 1
                        matched = True
                        break
                
                if not matched:
                    hotspot_map[f"spot_{len(hotspot_map)+1}"] = {
                        "id": f"HOTSPOT-{len(hotspot_map)+1:02d}",
                        "name": name,
                        "lat": round(lat, 5),
                        "lon": round(lon, 5),
                        "accident_count": 1
                    }

            # Filter significant hotspots (>= 5 recorded incidents)
            self.hotspots = [
                h for h in hotspot_map.values() if h["accident_count"] >= 4
            ]
            self.hotspots.sort(key=lambda x: x["accident_count"], reverse=True)
            self.training_summary["hotspots_count"] = len(self.hotspots)

            # 2. Prepare Features for Machine Learning Model
            target_col = detected["target"]
            if not target_col or not SKLEARN_AVAILABLE:
                self.training_summary["status"] = "SPATIAL_HEURISTIC_ONLY"
                self.training_summary["limitations"].append("Target severity column or scikit-learn unavailable; using spatial density estimator.")
                return

            # Standardize Target classes to LOW, MEDIUM, HIGH
            def normalize_target(val):
                s = str(val).upper()
                if "HIGH" in s or "FATAL" in s or "GRIEVOUS" in s:
                    return "HIGH"
                elif "MEDIUM" in s or "MODERATE" in s or "SERIOUS" in s:
                    return "MEDIUM"
                else:
                    return "LOW"

            df["ml_target"] = df[target_col].apply(normalize_target)
            
            # Feature extraction
            X = pd.DataFrame()
            X["latitude"] = df[lat_col].astype(float)
            X["longitude"] = df[lon_col].astype(float)

            # Distance to nearest hotspot as an explicit feature
            def min_dist_to_hotspot(r_lat, r_lon):
                if not self.hotspots:
                    return 1000.0
                return min(haversine_m(r_lat, r_lon, h["lat"], h["lon"]) for h in self.hotspots)

            X["dist_to_hotspot_m"] = [min_dist_to_hotspot(lat, lon) for lat, lon in zip(X["latitude"], X["longitude"])]

            # Categorical encoding
            cat_cols = [c for c in [detected["weather"], detected["road"]] if c is not None]
            for c in cat_cols:
                le = LabelEncoder()
                X[c] = le.fit_transform(df[c].astype(str))
                self.label_encoders[c] = le

            self.target_encoder = LabelEncoder()
            y = self.target_encoder.fit_transform(df["ml_target"])
            self.feature_columns = list(X.columns)

            # Train Random Forest Classifier
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            self.model = RandomForestClassifier(n_estimators=100, max_depth=8, random_state=42)
            self.model.fit(X_train, y_train)

            accuracy = float(self.model.score(X_test, y_test))
            self.is_trained = True
            self.training_summary["status"] = "TRAINED_SUCCESS"
            self.training_summary["accuracy"] = round(accuracy * 100, 1)
            self.training_summary["records_analyzed"] = len(df)
            print(f"[AccidentRiskPredictor] Random Forest Model trained successfully! Accuracy: {self.training_summary['accuracy']}% on {len(df)} records.")

        except Exception as e:
            self.training_summary["status"] = "TRAINING_ERROR"
            self.training_summary["limitations"].append(f"Model initialization error: {str(e)}")
            print(f"[AccidentRiskPredictor Error] {e}")

    def predict_point_risk(self, lat: float, lon: float, weather: str = "Flooded Surface", road: str = "Waterlogged") -> Dict[str, Any]:
        """Predict accident risk for a single coordinate."""
        # Find distance to closest known historical hotspot
        closest_hotspot = None
        min_dist = float("inf")
        for h in self.hotspots:
            d = haversine_m(lat, lon, h["lat"], h["lon"])
            if d < min_dist:
                min_dist = d
                closest_hotspot = h

        is_hotspot_zone = (min_dist <= 250.0)

        if not self.is_trained or not self.model:
            # Rule-based fallback if ML model is unavailable
            if is_hotspot_zone:
                return {
                    "risk_level": "HIGH",
                    "risk_score": 0.85,
                    "confidence": 75,
                    "is_hotspot": True,
                    "nearest_hotspot": closest_hotspot["name"] if closest_hotspot else None,
                    "hotspot_dist_m": round(min_dist)
                }
            elif min_dist <= 600.0:
                return {
                    "risk_level": "MEDIUM",
                    "risk_score": 0.55,
                    "confidence": 70,
                    "is_hotspot": False,
                    "nearest_hotspot": closest_hotspot["name"] if closest_hotspot else None,
                    "hotspot_dist_m": round(min_dist)
                }
            else:
                return {
                    "risk_level": "LOW",
                    "risk_score": 0.20,
                    "confidence": 80,
                    "is_hotspot": False,
                    "nearest_hotspot": closest_hotspot["name"] if closest_hotspot else None,
                    "hotspot_dist_m": round(min_dist)
                }

        # Build feature row for model inference
        try:
            row = {
                "latitude": lat,
                "longitude": lon,
                "dist_to_hotspot_m": min_dist
            }
            # Encode categorical features safely
            for col_name, le in self.label_encoders.items():
                val = weather if "weather" in col_name.lower() else road
                if val in le.classes_:
                    row[col_name] = int(le.transform([val])[0])
                else:
                    # Unseen category fallback
                    row[col_name] = 0

            X_pred = pd.DataFrame([row])[self.feature_columns]
            pred_class_idx = self.model.predict(X_pred)[0]
            probs = self.model.predict_proba(X_pred)[0]
            confidence = int(np.max(probs) * 100)
            pred_class = self.target_encoder.inverse_transform([pred_class_idx])[0]

            # High-water / flood condition risk escalator
            if weather in ["Heavy Rain", "Flooded Surface"] and is_hotspot_zone:
                pred_class = "HIGH"
                risk_score = 0.90
            elif pred_class == "HIGH":
                risk_score = 0.82
            elif pred_class == "MEDIUM":
                risk_score = 0.54
            else:
                risk_score = 0.18

            return {
                "risk_level": pred_class,
                "risk_score": risk_score,
                "confidence": max(60, confidence),
                "is_hotspot": is_hotspot_zone,
                "nearest_hotspot": closest_hotspot["name"] if closest_hotspot else None,
                "hotspot_dist_m": round(min_dist)
            }
        except Exception as e:
            return {
                "risk_level": "MEDIUM",
                "risk_score": 0.50,
                "confidence": 60,
                "is_hotspot": is_hotspot_zone,
                "nearest_hotspot": closest_hotspot["name"] if closest_hotspot else None,
                "hotspot_dist_m": round(min_dist)
            }

    def evaluate_route_risk(self, polyline: List[List[float]], weather: str = "Flooded Surface", road: str = "Waterlogged") -> Dict[str, Any]:
        """Evaluate accident risk across an entire convoy route polyline."""
        if not polyline or len(polyline) < 2:
            return {
                "max_risk_level": "LOW",
                "average_risk_score": 0.15,
                "has_high_risk": False,
                "high_risk_points": [],
                "hotspots_intersected": []
            }

        risk_scores = []
        high_risk_points = []
        hotspots_seen = set()

        # Sample every 2nd or 3rd coordinate to balance performance
        sample_step = max(1, len(polyline) // 15)
        for i in range(0, len(polyline), sample_step):
            pt = polyline[i]
            res = self.predict_point_risk(pt[0], pt[1], weather, road)
            risk_scores.append(res["risk_score"])
            
            if res["risk_level"] == "HIGH":
                high_risk_points.append({
                    "pos": pt,
                    "risk_score": res["risk_score"],
                    "confidence": res["confidence"],
                    "hotspot": res["nearest_hotspot"]
                })
            
            if res["is_hotspot"] and res["nearest_hotspot"]:
                hotspots_seen.add(res["nearest_hotspot"])

        avg_score = float(np.mean(risk_scores)) if risk_scores else 0.2
        max_score = float(np.max(risk_scores)) if risk_scores else 0.2

        if max_score >= 0.75 or len(high_risk_points) >= 2:
            overall_level = "HIGH"
        elif max_score >= 0.45 or len(high_risk_points) == 1:
            overall_level = "MEDIUM"
        else:
            overall_level = "LOW"

        return {
            "max_risk_level": overall_level,
            "average_risk_score": round(avg_score, 2),
            "max_risk_score": round(max_score, 2),
            "has_high_risk": (overall_level == "HIGH"),
            "high_risk_points": high_risk_points,
            "hotspots_intersected": list(hotspots_seen)
        }
